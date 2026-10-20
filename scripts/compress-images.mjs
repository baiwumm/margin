#!/usr/bin/env node
/**
 * 图片压缩管线 —— 存量批处理、pre-commit 钩子与 CI 校验共用同一实现。
 *
 * 范围：src/data/** 下的 jpg/jpeg/png/webp（gif 动图与 avif 跳过）
 * 策略：
 *   - jpeg：mozjpeg 质量 80
 *   - png：无损 compressionLevel 9 与调色板 quality 85 择优（调色板需小 20% 才采用）
 *   - webp：质量 80
 *   - 通用：按 EXIF 自动摆正、剥离元数据、超过最大宽度等比缩小（普通 2400，画廊 3000）
 * 幂等：压缩收益 <5% 不回写；「压缩后仍 >600KB」在钩子与 --check 下拦截提交，
 *       「已是当前策略最优仍 >600KB」仅提示不拦截（画廊大图属正常形态）。
 *
 * 用法：
 *   pnpm images                                  # 全量处理 src/data
 *   node scripts/compress-images.mjs <file...>   # 只处理指定文件（pre-commit 用）
 *   node scripts/compress-images.mjs --check <file...>  # 干跑：不写盘，有潜在改动或超限时 exit 1（CI 用）
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SCAN_DIR = 'src/data'
const MAX_WIDTH = 2400
const MAX_WIDTH_GALLERY = 3000
const MIN_SAVING = 0.05
const PALETTE_EXTRA_SAVING = 0.2
const OVERSIZE_BYTES = 600 * 1024
const IMAGE_RE = /\.(jpe?g|png|webp)$/i
const CHECK_FLAG = '--check'

const say = (s = '') => process.stdout.write(s + '\n')
const kb = (n) => `${(n / 1024).toFixed(0)}KB`

async function collectImages(dir) {
  const entries = await readdir(dir, { recursive: true })
  return entries.filter((f) => IMAGE_RE.test(f)).map((f) => path.join(dir, f))
}

async function encode(input, file, meta, maxW, pngOpts) {
  let p = sharp(input).rotate()
  if ((meta.width ?? 0) > maxW) {
    p = p.resize({ width: maxW, withoutEnlargement: true })
  }
  const ext = path.extname(file).toLowerCase()
  if (ext === '.png') return p.png({ compressionLevel: 9, ...pngOpts }).toBuffer()
  if (ext === '.webp') return p.webp({ quality: 80 }).toBuffer()
  return p.jpeg({ mozjpeg: true, quality: 80 }).toBuffer()
}

async function bestEncoding(input, file, meta, maxW) {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.png') {
    const lossless = await encode(input, file, meta, maxW, {})
    const palette = await encode(input, file, meta, maxW, {
      palette: true,
      quality: 85,
    })
    return palette.length < lossless.length * (1 - PALETTE_EXTRA_SAVING)
      ? palette
      : lossless
  }
  return encode(input, file, meta, maxW, {})
}

/**
 * @returns {Promise<{ file: string, status: 'written'|'kept'|'skipped'|'error', reason?: string, before?: number, after?: number, oversize?: boolean }>}
 */
async function processOne(file, checkOnly) {
  try {
    const input = await readFile(file)
    const meta = await sharp(input).metadata()
    if ((meta.pages ?? 1) > 1) {
      return { file, status: 'skipped', reason: '动图跳过' }
    }
    const inGalleries = file.split(path.sep).includes('galleries')
    const maxW = inGalleries ? MAX_WIDTH_GALLERY : MAX_WIDTH
    const best = await bestEncoding(input, file, meta, maxW)
    const willWrite = best.length < input.length * (1 - MIN_SAVING)
    const effective = willWrite ? best.length : input.length
    const result = {
      file,
      status: willWrite ? 'written' : 'kept',
      before: input.length,
      after: effective,
      oversize: effective > OVERSIZE_BYTES,
    }
    if (willWrite && !checkOnly) {
      await writeFile(file, best)
    }
    return result
  } catch (err) {
    return { file, status: 'error', reason: err.message }
  }
}

async function main() {
  const checkOnly = process.argv.includes(CHECK_FLAG)
  const targets = process.argv.slice(2).filter((a) => a !== CHECK_FLAG)
  const files =
    targets.length > 0 ? targets : await collectImages(SCAN_DIR)

  if (files.length === 0) {
    say('没有需要处理的图片。')
    return
  }

  const results = []
  for (const file of files) {
    results.push(await processOne(file, checkOnly))
  }

  const written = results.filter((r) => r.status === 'written')
  const errors = results.filter((r) => r.status === 'error')
  // 压了仍超限 = 懒人图，钩子/CI 拦截；已是最优仍超限 = 管线到顶，仅提示
  const blocked = written.filter((r) => r.oversize)
  const overOptimal = results.filter((r) => r.status === 'kept' && r.oversize)
  const skipped = results.filter((r) => r.status === 'skipped')

  for (const r of written) {
    const pct = ((1 - r.after / r.before) * 100).toFixed(0)
    say(`压缩 ${r.file}  ${kb(r.before)} → ${kb(r.after)}（-${pct}%）`)
  }
  for (const r of blocked) {
    say(`超限 ${r.file}  压缩后仍 ${kb(r.after)} > ${kb(OVERSIZE_BYTES)}`)
  }
  for (const r of overOptimal) {
    say(
      `到顶 ${r.file}  已是当前策略最优仍 ${kb(r.after)}（>${kb(OVERSIZE_BYTES)}），仅提示不拦截`,
    )
  }
  for (const r of skipped) {
    say(`跳过 ${r.file}  ${r.reason}`)
  }
  for (const r of errors) {
    say(`失败 ${r.file}  ${r.reason}`)
  }

  const beforeSum = written.reduce((s, r) => s + r.before, 0)
  const afterSum = written.reduce((s, r) => s + r.after, 0)
  say(
    `共 ${results.length} 张：压缩 ${written.length}、保持 ${results.length - written.length - skipped.length - errors.length}、跳过 ${skipped.length}、失败 ${errors.length}` +
      (written.length > 0
        ? `；本次瘦身 ${kb(beforeSum - afterSum)}（${kb(beforeSum)} → ${kb(afterSum)}）`
        : ''),
  )

  if (blocked.length > 0 && (checkOnly || targets.length > 0)) {
    say(
      `存在压缩后仍超限的图片（>${kb(OVERSIZE_BYTES)}），提交被拦截；` +
        `请更换更小的原图，或确认画质后调整压缩参数。`,
    )
    process.exitCode = 1
  }
  if (errors.length > 0) {
    process.exitCode = 1
  }
}

await main()

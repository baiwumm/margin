/**
 * musicPlayer — 音乐播放器卡片的全局客户端逻辑。
 *
 * 统一管理所有 `.music-player` 卡片（文章 MD/MDX 与瞬间 Moment 共用同一套 HTML 结构）：
 * - 复用项目已有的 introAudioStore 全局单例（全站唯一 <audio>）。
 * - 关键设计：多张卡片共享同一个全局 <audio>。**初始化时不调用 getIntroAudioStore**
 *   （否则会把单例的 src 反复切到每张卡，导致状态错乱），只在「点击播放 / 操作进度条」
 *   时才把单例定向到本卡——切到新卡会自动停掉旧卡，天然实现「点别的，其他停止」。
 * - 播放/暂停用卡片自身的 .is-playing 类判断（由全局状态事件精确维护）。
 * - 无音频时播放按钮降级为跳转到平台外链。
 *
 * 用法：在 Layout 的全局脚本里 import 并调用 initMusicPlayers()（astro:page-load 时）。
 */
import {
  getIntroAudioStore,
  INTRO_AUDIO_STATE_EVENT,
  type IntroAudioState,
} from "./introAudioStore";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

function initMusicPlayers(signal?: AbortSignal) {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(".music-player")
  );
  if (cards.length === 0) return;

  cards.forEach(card => {
    if (card.dataset.musicInitialized === "true") return;
    card.dataset.musicInitialized = "true";

    // 调用方（Layout）在每次 astro:page-load 会先 abort 旧控制器再重新初始化。
    // 初始化标记必须随 abort 一并清除，否则重绑会被上面的守卫跳过，
    // 导致首次加载（直接调用 + page-load 双触发）时监听全部失效、控件无响应。
    signal?.addEventListener(
      "abort",
      () => {
        delete card.dataset.musicInitialized;
      },
      { once: true }
    );

    const btn = card.querySelector<HTMLButtonElement>("[data-music-toggle]");
    const audioSrc = card.dataset.audio || "";
    const href = card.dataset.href || "#";
    const label = card.dataset.label || "MUSIC";
    const progressTrack = card.querySelector<HTMLElement>(
      "[data-music-progress]"
    );
    const progressBar = card.querySelector<HTMLElement>("[data-music-bar]");
    const currentEl = card.querySelector<HTMLElement>("[data-music-current]");
    const totalEl = card.querySelector<HTMLElement>("[data-music-total]");

    const hasAudio = Boolean(audioSrc);

    // 无音频：播放按钮直接跳外链
    if (!hasAudio && btn) {
      btn.addEventListener(
        "click",
        () => {
          window.open(href, "_blank", "noopener,noreferrer");
        },
        { signal }
      );
      return;
    }
    if (!hasAudio) return;

    // 惰性获取全局单例（仅在实际需要播放/控制时调用，避免 init 时污染单例 src）
    const getStore = () =>
      getIntroAudioStore({
        src: audioSrc,
        label,
        isStream: false,
        durationHint: 0,
      });

    const setPlayingUI = (playing: boolean) => {
      card.classList.toggle("is-playing", playing);
      btn?.setAttribute("aria-label", playing ? "暂停" : "播放");
      btn?.setAttribute("data-playing", playing ? "true" : "false");
    };

    const render = (state: IntroAudioState) => {
      if (state.src !== audioSrc) {
        // 不是本卡在播：确保本卡显示可播放态（无论是否由本卡触发切歌）
        setPlayingUI(false);
        return;
      }
      setPlayingUI(state.playing);
      const total = state.duration;
      const now = state.currentTime;
      const pct = total > 0 ? (now / total) * 100 : 0;
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (currentEl && currentEl.textContent !== fmt(now)) {
        currentEl.textContent = fmt(now);
      }
      if (totalEl && total > 0 && totalEl.textContent !== fmt(total)) {
        totalEl.textContent = fmt(total);
      }
      if (progressTrack) {
        progressTrack.setAttribute("aria-valuenow", String(Math.floor(now)));
        progressTrack.setAttribute("aria-valuemax", String(Math.max(total, 0)));
      }
    };

    // 播放 / 暂停切换：只认本卡当前是否在播；传别人时单例切源会停旧播新
    btn?.addEventListener(
      "click",
      () => {
        if (card.classList.contains("is-playing")) {
          // 本卡正在播 → 暂停
          getStore().audio.pause();
        } else {
          // 本卡未在播 → 把单例切到本卡并播放（若之前在播别的会自动停掉）
          getStore()
            .audio.play()
            .catch(() => {
              /* 浏览器拦截自动播放：忽略 */
            });
        }
      },
      { signal }
    );

    // 进度条点击跳转
    progressTrack?.addEventListener(
      "click",
      (e: MouseEvent) => {
        const rect = progressTrack.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const audio = getStore().audio;
        if (audio.duration > 0) audio.currentTime = ratio * audio.duration;
      },
      { signal }
    );

    // 进度条键盘跳转
    progressTrack?.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        const audio = getStore().audio;
        const total = audio.duration;
        if (!total || total <= 0) return;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          audio.currentTime = Math.min(audio.currentTime + 5, total);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          audio.currentTime = Math.max(audio.currentTime - 5, 0);
        }
      },
      { signal }
    );

    window.addEventListener(
      INTRO_AUDIO_STATE_EVENT,
      (event: Event) => {
        const custom = event as CustomEvent<IntroAudioState>;
        render(custom.detail);
      },
      { signal }
    );

    // 初始统一显示未播放（若页面加载时已有全局播放，事件会立即同步）
    setPlayingUI(false);
  });
}

export { initMusicPlayers };

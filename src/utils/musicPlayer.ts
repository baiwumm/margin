/**
 * musicPlayer — 音乐播放器卡片的全局客户端逻辑。
 *
 * 统一管理所有 `.music-player` 卡片（文章 MD/MDX 与瞬间 Moment 共用同一套 HTML 结构）：
 * - 复用项目已有的 introAudioStore 全局单例（全站唯一 <audio>，切歌自动停上一首）。
 * - 播放按钮：有 data-audio 则站内播放，无则降级为跳转到平台外链。
 * - 进度条：可点击 / 键盘左右跳转；timeupdate 驱动宽度与计时。
 * - 正在播放的卡片加 .is-playing 类（CSS 负责黑胶旋转），其余回到可播放态。
 *
 * 用法：在 Layout 的全局脚本里 import 并调用 initMusicPlayers()（astro:page-load 时）。
 * 不依赖 React，遵循项目「astro:page-load 初始化 + AbortController 清理」范式。
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

function initMusicPlayers() {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(".music-player")
  );
  if (cards.length === 0) return;

  cards.forEach((card) => {
    if (card.dataset.musicInitialized === "true") return;
    card.dataset.musicInitialized = "true";

    const btn = card.querySelector<HTMLButtonElement>("[data-music-toggle]");
    const audioSrc = card.dataset.audio || "";
    const href = card.dataset.href || "#";
    const label = card.dataset.label || "MUSIC";
    const progressTrack = card.querySelector<HTMLElement>("[data-music-progress]");
    const progressBar = card.querySelector<HTMLElement>("[data-music-bar]");
    const currentEl = card.querySelector<HTMLElement>("[data-music-current]");
    const totalEl = card.querySelector<HTMLElement>("[data-music-total]");

    const hasAudio = Boolean(audioSrc);

    // 无音频：播放按钮直接跳外链
    if (!hasAudio && btn) {
      btn.addEventListener("click", () => {
        window.open(href, "_blank", "noopener,noreferrer");
      });
      return;
    }
    if (!hasAudio) return;

    const store = getIntroAudioStore({
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
        // 不是本卡在播：确保本卡显示可播放态
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

    btn?.addEventListener("click", () => {
      if (store.audio.paused) {
        store.audio.play().catch(() => {
          /* 浏览器拦截自动播放：忽略 */
        });
      } else {
        store.audio.pause();
      }
    });

    // 进度条点击跳转
    progressTrack?.addEventListener("click", (e: MouseEvent) => {
      const rect = progressTrack.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const total = store.audio.duration;
      if (total > 0) store.audio.currentTime = ratio * total;
    });

    // 进度条键盘跳转
    progressTrack?.addEventListener("keydown", (e: KeyboardEvent) => {
      const total = store.audio.duration;
      if (!total || total <= 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        store.audio.currentTime = Math.min(store.audio.currentTime + 5, total);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        store.audio.currentTime = Math.max(store.audio.currentTime - 5, 0);
      }
    });

    window.addEventListener(INTRO_AUDIO_STATE_EVENT, (event: Event) => {
      const custom = event as CustomEvent<IntroAudioState>;
      render(custom.detail);
    });

    render({
      src: store.src,
      label: store.label,
      isStream: store.isStream,
      playing: !store.audio.paused,
      hasStarted: store.hasStarted,
      currentTime: store.audio.currentTime,
      duration: store.audio.duration || 0,
    });
  });
}

export { initMusicPlayers };

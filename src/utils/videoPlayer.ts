/**
 * videoPlayer — 视频播放器卡片的全局客户端逻辑。
 *
 * 统一管理所有 `.video-player` 卡片（文章 MD/MDX 与瞬间 Moment 共用同一套 HTML 结构）：
 * - <video preload="none">：首屏不加载任何视频字节，点击播放时才开始加载。
 * - 单实例互斥：任一卡片开始播放时暂停页面上其他 <video>，并暂停全局音乐单例
 *   （introAudioStore），避免音乐与视频同时出声。
 * - 自定义控制条：播放/暂停、进度（点击跳转 + 键盘左右键）、时间、静音、全屏。
 * - 加载失败降级为「打开原链接」提示块，不影响布局。
 *
 * 与 musicPlayer 相同的原因：.md 的 ::video 指令由 remark 注入为 raw HTML，
 * 组件 scoped 脚本无法覆盖，故统一定义在全局（由 Layout 注册，astro:page-load 时）。
 */

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (secs: number) => {
  if (!Number.isFinite(secs)) return "0:00";
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

function initVideoPlayers(signal?: AbortSignal) {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(".video-player")
  );
  if (cards.length === 0) return;

  cards.forEach(card => {
    if (card.dataset.videoInitialized === "true") return;
    card.dataset.videoInitialized = "true";

    // 调用方（Layout）在每次 astro:page-load 会先 abort 旧控制器再重新初始化，
    // 初始化标记必须随 abort 一并清除（与 musicPlayer 相同的守卫约定）。
    signal?.addEventListener(
      "abort",
      () => {
        delete card.dataset.videoInitialized;
      },
      { once: true }
    );

    const video = card.querySelector<HTMLVideoElement>("video");

    // ── B 站平台卡片：封面 facade，点击展开官方 iframe 播放器 ──
    // iframe 跨域无法用自定义控制条控制，播放器 UI 交给 B 站官方播放器。
    if (card.dataset.embed) {
      const embedToggle = card.querySelector<HTMLButtonElement>(
        "[data-video-embed-toggle]"
      );
      const slot = card.querySelector<HTMLElement>("[data-video-embed-slot]");
      embedToggle?.addEventListener(
        "click",
        () => {
          if (!slot || !card.dataset.embed) return;
          // 与站内播放器互斥：暂停所有视频与音频（含音乐单例）
          document
            .querySelectorAll<HTMLMediaElement>("video, audio")
            .forEach(el => {
              if (!el.paused) el.pause();
            });
          // 幂等：重复点击不重建 iframe
          if (slot.querySelector("iframe")) return;
          const iframe = document.createElement("iframe");
          iframe.src = card.dataset.embed;
          iframe.className = "video-embed-iframe";
          iframe.setAttribute("allowfullscreen", "true");
          iframe.setAttribute("scrolling", "no");
          iframe.allow = "autoplay; fullscreen; encrypted-media";
          slot.appendChild(iframe);
          card.classList.add("is-embedded");
          embedToggle.setAttribute("tabindex", "-1");
        },
        { signal }
      );
      return;
    }

    // 无 src 时不做任何绑定（构建期已保证有 src，这里是运行时兜底）
    if (!video || !video.getAttribute("src")) return;

    const overlay = card.querySelector<HTMLButtonElement>(
      "[data-video-overlay]"
    );
    const toggle = card.querySelector<HTMLButtonElement>("[data-video-toggle]");
    const progressTrack = card.querySelector<HTMLElement>(
      "[data-video-progress]"
    );
    const progressBar = card.querySelector<HTMLElement>("[data-video-bar]");
    const currentEl = card.querySelector<HTMLElement>("[data-video-current]");
    const totalEl = card.querySelector<HTMLElement>("[data-video-total]");
    const muteBtn = card.querySelector<HTMLButtonElement>("[data-video-mute]");
    const fsBtn = card.querySelector<HTMLButtonElement>(
      "[data-video-fullscreen]"
    );

    const setPlayingUI = (playing: boolean) => {
      card.classList.toggle("is-playing", playing);
      toggle?.setAttribute("aria-label", playing ? "暂停" : "播放");
      toggle?.setAttribute("data-playing", playing ? "true" : "false");
      // 播放时覆盖层淡出且不可聚焦，暂停后恢复
      if (overlay) {
        overlay.setAttribute("tabindex", playing ? "-1" : "0");
      }
    };

    const togglePlay = () => {
      if (video.paused || video.ended) {
        video.play().catch(() => {
          /* 浏览器拦截自动播放：忽略 */
        });
      } else {
        video.pause();
      }
    };

    // 覆盖层（未播放时）与控制条按钮均可触发播放/暂停；
    // 播放后覆盖层淡出（pointer-events: none），点击画面本身继续切换
    overlay?.addEventListener("click", togglePlay, { signal });
    toggle?.addEventListener("click", togglePlay, { signal });
    video.addEventListener("click", togglePlay, { signal });

    video.addEventListener(
      "play",
      () => {
        // 单实例互斥：暂停页面上其他视频与全局音乐单例
        document.querySelectorAll("video").forEach(el => {
          if (el !== video) el.pause();
        });
        window.__introAudioStore?.audio.pause();
        setPlayingUI(true);
      },
      { signal }
    );

    video.addEventListener("pause", () => setPlayingUI(false), { signal });
    video.addEventListener("ended", () => setPlayingUI(false), { signal });

    // preload="none" 下时长在首次加载元数据后才可用
    video.addEventListener(
      "loadedmetadata",
      () => {
        if (totalEl) totalEl.textContent = fmt(video.duration);
      },
      { signal }
    );

    video.addEventListener(
      "timeupdate",
      () => {
        const total = video.duration;
        const pct =
          Number.isFinite(total) && total > 0
            ? (video.currentTime / total) * 100
            : 0;
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (currentEl && currentEl.textContent !== fmt(video.currentTime)) {
          currentEl.textContent = fmt(video.currentTime);
        }
        progressTrack?.setAttribute(
          "aria-valuenow",
          String(Math.floor(video.currentTime))
        );
        progressTrack?.setAttribute(
          "aria-valuemax",
          String(Math.max(Number.isFinite(total) ? Math.floor(total) : 0, 0))
        );
      },
      { signal }
    );

    // 加载失败降级：显示「打开原链接」提示块
    video.addEventListener(
      "error",
      () => {
        card.classList.add("is-error");
        card.classList.remove("is-playing");
      },
      { signal }
    );

    // 进度条点击跳转
    progressTrack?.addEventListener(
      "click",
      (e: MouseEvent) => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        const rect = progressTrack.getBoundingClientRect();
        const ratio = Math.min(
          Math.max((e.clientX - rect.left) / rect.width, 0),
          1
        );
        video.currentTime = ratio * video.duration;
      },
      { signal }
    );

    // 进度条键盘跳转
    progressTrack?.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 5, video.duration);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 5, 0);
        }
      },
      { signal }
    );

    // 静音切换（volumechange 同步图标状态，覆盖用户通过系统/快捷键改音量的情况）
    const syncMute = () =>
      muteBtn?.setAttribute("data-muted", video.muted ? "true" : "false");
    muteBtn?.addEventListener(
      "click",
      () => {
        video.muted = !video.muted;
      },
      { signal }
    );
    video.addEventListener("volumechange", syncMute, { signal });

    // 全屏：对整个卡片生效，保留自定义控制条；不支持时静默忽略
    fsBtn?.addEventListener(
      "click",
      () => {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        } else {
          void card.requestFullscreen?.().catch(() => {});
        }
      },
      { signal }
    );
    document.addEventListener(
      "fullscreenchange",
      () => {
        const active = document.fullscreenElement === card;
        card.setAttribute("data-fullscreen", active ? "true" : "false");
        fsBtn?.setAttribute("aria-label", active ? "退出全屏" : "全屏");
      },
      { signal }
    );

    setPlayingUI(false);
    syncMute();
  });
}

export { initVideoPlayers };

/**
 * lightboxGestures — 灯箱手势交互引擎（四处灯箱共用）。
 *
 * PostLightbox（文章正文）/ MomentLightbox（瞬间）/ 画廊详情页 / GalleryEmbed（内嵌画廊）
 * 共用同一套交互：滚轮缩放、双指捏合缩放、拖拽平移、双击缩放还原、按钮旋转、
 * 以及未缩放时的单指水平滑动切换（上一张 / 下一张）。
 *
 * 职责边界：只管理灯箱大图上的手势监听与 transform 状态；open / close、
 * 按钮与键盘绑定、点击背景关闭、滚动锁等仍由各灯箱自行处理。
 * 每次打开新图后由调用方调用 resetTransform() 复位。
 */

// 单指滑动切换的横向位移阈值（px）；横向位移还需明显大于纵向，避免误触
const SWIPE_THRESHOLD = 48;

export interface LightboxGestures {
  zoomBy: (factor: number) => void;
  resetTransform: () => void;
  rotate: () => void;
}

export function attachLightboxGestures(options: {
  img: HTMLImageElement;
  /** 平移范围参照容器（灯箱 dialog 元素） */
  viewport: HTMLElement;
  /** 调用方的清理信号（View Transitions 下随 AbortController 重建） */
  signal: AbortSignal;
  /** 滑动切换回调：1 = 下一张，-1 = 上一张；越界与否由调用方裁决 */
  onSwipe: (direction: 1 | -1) => void;
}): LightboxGestures {
  const { img, viewport, signal, onSwipe } = options;

  // ── 缩放 / 旋转 / 平移状态 ──
  let scale = 1;
  let rotation = 0;
  let tx = 0;
  let ty = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let panStart: { x: number; y: number; tx: number; ty: number } | null = null;
  let swipeStart: { x: number; y: number } | null = null;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function applyTransform(smooth = false) {
    img.style.transition =
      smooth && !reduceMotion ? "transform 0.2s ease-out" : "none";
    img.style.transform = `translate(${tx}px, ${ty}px) rotate(${rotation}deg) scale(${scale})`;
  }

  function resetTransform() {
    scale = 1;
    rotation = 0;
    tx = 0;
    ty = 0;
    img.classList.remove("is-panning");
    applyTransform(true);
  }

  function panRange() {
    const rect = img.getBoundingClientRect();
    return {
      maxX: Math.max((rect.width - viewport.clientWidth) / 2, 0) + 40,
      maxY: Math.max((rect.height - viewport.clientHeight) / 2, 0) + 40,
    };
  }

  function zoomBy(factor: number) {
    const next = Math.min(4, Math.max(1, scale * factor));
    if (next === 1) {
      tx = 0;
      ty = 0;
    }
    scale = next;
    applyTransform(true);
  }

  function rotate() {
    rotation = (rotation + 90) % 360;
    applyTransform(true);
  }

  // 滚轮缩放
  img.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    },
    { passive: false, signal }
  );

  // 双指缩放 + 拖拽平移 + 单指滑动
  img.addEventListener(
    "pointerdown",
    e => {
      img.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      img.style.transition = "none";
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStartDistance = Math.hypot(a.x - b.x, a.y - b.y);
        pinchStartScale = scale;
        panStart = null;
        swipeStart = null;
      } else if (pointers.size === 1 && scale > 1) {
        panStart = { x: e.clientX, y: e.clientY, tx, ty };
        swipeStart = null;
        img.classList.add("is-panning");
      } else if (pointers.size === 1) {
        swipeStart = { x: e.clientX, y: e.clientY };
      }
    },
    { signal }
  );
  img.addEventListener(
    "pointermove",
    e => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      if (pointers.size === 2) {
        const other = [...pointers.entries()].find(
          ([id]) => id !== e.pointerId
        );
        if (other && pinchStartDistance > 0) {
          const [, a] = other;
          const dist = Math.hypot(a.x - e.clientX, a.y - e.clientY);
          const next = Math.min(
            4,
            Math.max(1, pinchStartScale * (dist / pinchStartDistance))
          );
          if (next === 1) {
            tx = 0;
            ty = 0;
          }
          scale = next;
          applyTransform(false);
        }
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      } else if (panStart) {
        const { maxX, maxY } = panRange();
        tx = Math.max(
          -maxX,
          Math.min(maxX, panStart.tx + (e.clientX - panStart.x))
        );
        ty = Math.max(
          -maxY,
          Math.min(maxY, panStart.ty + (e.clientY - panStart.y))
        );
        applyTransform(false);
      } else {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
    },
    { signal }
  );
  const endPointer = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    img.classList.remove("is-panning");
    if (pointers.size < 2) pinchStartDistance = 0;
    if (pointers.size === 1) {
      const [, p] = [...pointers.entries()][0];
      if (scale > 1) {
        panStart = { x: p.x, y: p.y, tx, ty };
        swipeStart = null;
      } else {
        panStart = null;
        swipeStart = { x: p.x, y: p.y };
      }
    } else if (pointers.size === 0) {
      panStart = null;
      swipeStart = null;
    }
  };
  img.addEventListener(
    "pointerup",
    e => {
      // 水平滑动切换：未缩放时单指横向拖动超过阈值且横向明显大于纵向
      if (swipeStart && scale === 1 && pointers.size === 1) {
        const dx = e.clientX - swipeStart.x;
        const dy = e.clientY - swipeStart.y;
        if (
          Math.abs(dx) > SWIPE_THRESHOLD &&
          Math.abs(dx) > Math.abs(dy) * 1.5
        ) {
          onSwipe(dx < 0 ? 1 : -1);
        }
      }
      swipeStart = null;
      endPointer(e);
    },
    { signal }
  );
  img.addEventListener("pointercancel", endPointer, { signal });
  img.addEventListener("lostpointercapture", endPointer, { signal });

  // 双击缩放 / 还原
  img.addEventListener(
    "dblclick",
    () => {
      if (scale > 1) {
        resetTransform();
      } else {
        scale = 2;
        applyTransform(true);
      }
    },
    { signal }
  );

  return { zoomBy, resetTransform, rotate };
}

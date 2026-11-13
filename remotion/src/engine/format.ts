import { useVideoConfig } from "remotion";

/**
 * Format awareness for native multi-aspect production. Everything layout-related should come from here,
 * never from hardcoded 1920×1080 numbers.
 *  - u: 1 unit = 1px at a 1080-wide canvas (scale type & spacing by width so vertical text never overflows)
 *  - safe: platform UI safe-zones in px (9:16 short-form: TikTok/Reels/Shorts chrome at top, caption+buttons at bottom/right)
 */
export const useFormat = () => {
  const { width, height } = useVideoConfig();
  const vertical = height > width * 1.2;
  const square = !vertical && Math.abs(width - height) < width * 0.2;
  const u = width / 1080;
  const safe = vertical
    ? { top: height * 0.11, bottom: height * 0.2, left: width * 0.06, right: width * 0.14 }
    : { top: height * 0.06, bottom: height * 0.08, left: width * 0.05, right: width * 0.05 };
  return { width, height, vertical, square, u, safe, aspect: width / height };
};

/** Vertical-safe content box (absolute-positioned helper styles). */
export const safeBox = (f: ReturnType<typeof useFormat>): React.CSSProperties => ({
  position: "absolute",
  top: f.safe.top,
  bottom: f.safe.bottom,
  left: f.safe.left,
  right: f.safe.right,
});

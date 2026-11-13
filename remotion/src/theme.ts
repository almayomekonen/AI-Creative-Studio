// Studio design tokens. Override per production via props — never hardcode brand colors in scenes.
export const theme = {
  colors: {
    ink: "#0B0B0F",
    paper: "#F4F1EA",
    accent: "#FF4D2E",
    accent2: "#2E6BFF",
    gold: "#E8C26A",
    muted: "#8A8794",
  },
  fonts: {
    display: "Anton",
    serif: "Instrument Serif",
    body: "Inter",
  },
  fps: 30,
} as const;

export type Theme = typeof theme;

export const FORMATS = {
  landscape: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
} as const;
export type FormatName = keyof typeof FORMATS;

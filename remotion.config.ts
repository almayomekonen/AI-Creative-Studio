// Remotion CLI config — tuned for an 8 GB Apple M1 (keep concurrency low).
import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

Config.setPublicDir("remotion/public");
Config.setEntryPoint("remotion/src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(2);
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");

// ── Linux / cloud overrides (macOS behaviour above is unchanged) ─────────────
// GPU-less Linux (cloud sessions): "angle" cannot create a WebGL context, so
// fall back to "swangle" (ANGLE on SwiftShader, CPU) — tested on Lab-Product
// and Lab-Surreal. REMOTION_GL=<swangle|angle|egl|swiftshader|vulkan|angle-egl>
// overrides the renderer on any platform.
const noGpuLinux = process.platform === "linux" && !existsSync("/dev/dri") && !existsSync("/dev/nvidia0");
const GL = process.env.REMOTION_GL ?? (noGpuLinux ? "swangle" : undefined);
if (GL) Config.setChromiumOpenGlRenderer(GL as Parameters<typeof Config.setChromiumOpenGlRenderer>[0]);

// Remotion forces Chrome onto a direct connection (--no-proxy-server). Where
// outbound traffic must go through the environment's HTTPS proxy (cloud
// sessions), drop those flags so Chrome uses the proxy env vars like any other
// process — needed for @remotion/google-fonts. No proxy URL is read or set here.
if (process.platform === "linux" && (process.env.HTTPS_PROXY || process.env.https_proxy)) {
  Config.setChromiumFlags({ "no-proxy-server": false, "proxy-server": false, "proxy-bypass-list": false });
}

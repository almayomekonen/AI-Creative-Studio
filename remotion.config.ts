// Remotion CLI config — tuned for an 8 GB Apple M1 (keep concurrency low).
import { Config } from "@remotion/cli/config";

Config.setPublicDir("remotion/public");
Config.setEntryPoint("remotion/src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(2);
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");

#!/usr/bin/env bash
# Generates license-free synthetic test media (no downloads): a 120 BPM beat bed,
# a synthetic voice line (macOS `say`), and a stand-in talking-head plate.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/remotion/public/test"
mkdir -p "$OUT"
DUR=${1:-16}

# 120 BPM: kick (decaying 55Hz sine) on every beat, hat (noise burst) on off-beats, pad chord.
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "aevalsrc='0.9*sin(2*PI*55*t)*exp(-12*mod(t,0.5))':s=48000:d=$DUR" \
  -f lavfi -i "anoisesrc=d=$DUR:c=white:r=48000:a=0.25" \
  -f lavfi -i "aevalsrc='0.08*(sin(2*PI*220*t)+sin(2*PI*277.18*t)+sin(2*PI*329.63*t))':s=48000:d=$DUR" \
  -filter_complex "[1]volume='if(lt(mod(t-0.25,0.5),0.04),1,0)':eval=frame,highpass=f=6000[hat];[0][hat][2]amix=inputs=3:normalize=0,aformat=channel_layouts=stereo,afade=t=in:d=0.5,afade=t=out:st=$((DUR-1)):d=1[a]" \
  -map "[a]" -c:a pcm_s16le "$OUT/beat120.wav"

# Voice line (offline TTS via macOS) → 48k stereo wav
say -v Samantha -r 175 -o "$OUT/voice.aiff" "Most videos lose the viewer in three seconds. Here is how we keep them watching until the very last frame." 2>/dev/null \
  || say -o "$OUT/voice.aiff" "Most videos lose the viewer in three seconds. Here is how we keep them watching until the very last frame."
ffmpeg -y -hide_banner -loglevel error -i "$OUT/voice.aiff" -ar 48000 -ac 2 "$OUT/voice.wav" && rm -f "$OUT/voice.aiff"

# B-roll stand-ins: animated gradient plates (6s, 1080x1920)
ffmpeg -y -hide_banner -loglevel error -f lavfi -i "gradients=s=1080x1920:d=6:speed=0.02:c0=0xff4d2e:c1=0x2e6bff:c2=0x0b0b0f:n=3,format=yuv420p" -r 30 -c:v libx264 -crf 20 "$OUT/broll_a.mp4"
ffmpeg -y -hide_banner -loglevel error -f lavfi -i "mandelbrot=s=1080x1920:rate=30,trim=duration=6,format=yuv420p" -c:v libx264 -crf 22 "$OUT/broll_b.mp4"
echo "Test assets in $OUT:"; ls -la "$OUT"

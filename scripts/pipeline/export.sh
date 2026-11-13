#!/usr/bin/env bash
# Final export / delivery presets with loudness normalisation.
# Usage: scripts/pipeline/export.sh <input> <preset> <output> [--normalize]
#   presets: master-prores | youtube | social-vertical | social-vertical-60 | web-small | gif-preview | vertical-from-16x9
set -euo pipefail
IN="$1"; PRESET="$2"; OUT="$3"; NORM="${4:-}"
mkdir -p "$(dirname "$OUT")"
AF="anull"
TARGET=-14
[[ "$PRESET" == "master-prores" ]] && TARGET=-16
if [[ "$NORM" == "--normalize" ]] && ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$IN" | grep -q .; then
  # two-pass EBU R128 loudness normalisation
  M=$(ffmpeg -hide_banner -nostats -i "$IN" -af loudnorm=I=$TARGET:TP=-1.5:LRA=11:print_format=json -vn -f null - 2>&1 | awk '/^\{/,/^\}/')
  get(){ echo "$M" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
  AF="loudnorm=I=$TARGET:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000"
fi
case "$PRESET" in
  master-prores)   ffmpeg -y -hide_banner -i "$IN" -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le -af "$AF" -c:a pcm_s24le "$OUT" ;;
  youtube)         ffmpeg -y -hide_banner -i "$IN" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -af "$AF" -c:a aac -b:a 320k "$OUT" ;;
  social-vertical-60) ffmpeg -y -hide_banner -i "$IN" -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=60" -c:v libx264 -preset slow -crf 18 -maxrate 24M -bufsize 48M -pix_fmt yuv420p -movflags +faststart -af "$AF" -c:a aac -b:a 256k -ar 48000 "$OUT" ;;
  social-vertical) ffmpeg -y -hide_banner -i "$IN" -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30" -c:v libx264 -preset slow -crf 19 -maxrate 16M -bufsize 32M -pix_fmt yuv420p -movflags +faststart -af "$AF" -c:a aac -b:a 256k -ar 48000 "$OUT" ;;
  web-small)       ffmpeg -y -hide_banner -i "$IN" -vf "scale=-2:720" -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart -af "$AF" -c:a aac -b:a 128k "$OUT" ;;
  gif-preview)     ffmpeg -y -hide_banner -i "$IN" -vf "fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" "$OUT" ;;
  vertical-from-16x9) # blurred-fill reframe for repurposing landscape to 9:16
                   ffmpeg -y -hide_banner -i "$IN" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,eq=brightness=-0.08[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=30" -c:v libx264 -crf 19 -pix_fmt yuv420p -movflags +faststart -af "$AF" -c:a aac -b:a 256k "$OUT" ;;
  *) echo "unknown preset: $PRESET"; exit 2 ;;
esac
echo "✔ exported $OUT ($PRESET${NORM:+, normalized to $TARGET LUFS})"

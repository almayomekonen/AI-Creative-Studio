# Roadmap & known gaps

## Needs the user
1. **Cloud AI keys** (`.env`): FAL_KEY and/or REPLICATE_API_TOKEN (image→video, image gen), ELEVENLABS_API_KEY (VO/SFX/music). Without them the studio can do everything except generate new photoreal footage/voices.
2. **HyperFrames global skills upgrade** (`npx hyperframes skills update`) — modifies `~/.claude/skills`; needs approval.
3. **Remotion licence** if the studio is a company of more than 3 people.
4. Optional: FFmpeg with libass (e.g. homebrew-ffmpeg tap) for burn-in subtitles directly in ffmpeg — system change, needs approval. Not required.

## Next capabilities to build
- `scripts/py/generate.py`: provider-agnostic cloud generation client (fal/Replicate) reading shotlist.yaml, with cost estimate + dry-run, writing takes into `assets/generated/` (built but gated on keys).
- ElevenLabs VO/SFX helper + automatic sidechain ducking.
- Production comp generator: shotlist.yaml → Remotion timeline scaffold.
- LUT pack in `studio/luts/` + `FilmLook` LUT support.
- Brand-kit loader so `production.yaml` brand flows into Remotion props automatically.
- Visual regression tests (snapshot frames vs. golden images).
- First real production end-to-end to battle-test the gates.

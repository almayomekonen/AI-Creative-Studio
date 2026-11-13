# Hebrew Voiceover Script — Social CRM · "The Employee That Never Sleeps"

**Status:** the rendered film uses a **SCRATCH** voice (macOS "Carmit") for timing and review only. It is **not licensed for commercial use** — record a human (or licensed) voice before publishing.

## Lines, timing and direction
| ID | Starts at | Window | Line (exact) | Direction |
|---|---|---|---|---|
| vo1 | 0:01.20 | ≤ 2.6 s | תדמיינו שיש לכם עובד חדש בעסק... | Intimate, close to the mic, a half-smile. Trail off on "בעסק…". |
| vo2 | 0:05.60 | ≤ 3.6 s | אבל לא סתם עובד. אחד שכבר מכיר את העסק שלכם. | Small pause after "עובד." Confident, warm. |
| vo3a | 0:10.30 | ≤ 1.4 s | הוא מדבר עם הלידים, | Rhythmic — each phrase lands on its picture (1 every 2.5 s). |
| vo3b | 0:12.80 | ≤ 1.4 s | מכין הצעות מחיר, | |
| vo3c | 0:15.30 | ≤ 1.2 s | קובע פגישות, | |
| vo3d | 0:17.80 | ≤ 1.2 s | מפיק קבלות | |
| vo3e | 0:20.30 | ≤ 1.9 s | ומזהה הזדמנויות עסקיות. | Lift on "הזדמנויות". |
| vo4a | 0:23.80 | ≤ 2.5 s | אבל הדבר הכי חשוב שהוא נותן לכם... | Slower. The music drops out here — near whisper. |
| vo4b | 0:26.70 | ≤ 1.8 s | את הזמן שלכם בחזרה. | The emotional peak. Unhurried, warm. |
| vo5 | 0:30.50 | ≤ 4.2 s | Social CRM. העובד החדש שלכם. ישירות בוואטסאפ. | "Social CRM" pronounced in English (סוֹשְׁיָאל סִי-אָר-אֶם). End by 0:34.7. |

## Recording spec
- One WAV per line, named exactly `vo1.wav`, `vo2.wav`, `vo3a.wav` … `vo5.wav`; 48 kHz, 24-bit, mono or stereo; 0.1 s of room tone before and after.
- Put them in `productions/ad-social-crm/vo-final/`.
- Rebuild (captions are re-timed automatically from the new audio; the text stays script-exact):
```bash
node scripts/pipeline/commercial.mjs assets social-crm && node scripts/pipeline/commercial.mjs render social-crm
```

## On-screen typography (not voiced)
- Capability labels: 01 שיחות עם לידים · 02 הצעות מחיר · 03 פגישות · 04 קבלות · 05 הזדמנויות
- Payoff line: את הזמן שלכם בחזרה.
- End card: SocialCRM · העובד החדש שלכם · ישירות בוואטסאפ · פחות להתעסק. יותר להצמיח.

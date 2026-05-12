# Sentinel · Demo Video Production Script

Target: 60-second video. Real-time agent run is ~53s, so this works at 1x. You can also record at 1x then export at 1.5x in editor — 40s video that still shows everything.

## Pre-recording checklist

- [ ] `bun run dev` in sentinel/, server responding at http://localhost:4123/
- [ ] One warm-up agent run done (Next.js compilation lag eliminated)
- [ ] Browser zoomed to 110-125% (text readable on YouTube)
- [ ] Window sized 1440×900 (standard 16:10 — looks clean on Lablab submission)
- [ ] No personal tabs / bookmarks bar visible
- [ ] System notifications muted
- [ ] QuickTime / Loom / OBS set to capture window (not full screen)
- [ ] Mic levels checked if doing voiceover
- [ ] Have INC-002 (auth-service critical) ready as the click target — it has the best mix of metrics+logs+runbook hit

## Recording (single take, ~60s)

### Shot 1 — Hero (0:00 – 0:05)
**Camera**: full window, scrolled to top
**Action**: just sit on the landing page
**Voiceover / overlay text**:
> "When production breaks at 3am, you have minutes — and a single LLM can confidently give the wrong answer."

### Shot 2 — Architecture chip highlight (0:05 – 0:10)
**Camera**: zoom slightly on the header right (Google + Anthropic badges)
**Action**: cursor hovers over the two vendor chips
**Voiceover**:
> "Sentinel runs FOUR phases across TWO vendors — Google Gemini and Anthropic Claude — so the diagnosis is reviewed by a genuinely different bias."

### Shot 3 — Click incident (0:10 – 0:13)
**Camera**: full window
**Action**: click `INC-002 auth-service connection pool exhausted` (critical, red badge)
**Voiceover**:
> "Production incident: auth service connection pool exhausted, 30% login failures, critical."

### Shot 4 — Triage phase live (0:13 – 0:23)
**Camera**: right panel, phase 1 card streaming
**Action**: let it run, mouse hovers over the "📊 queryMetrics" expandable tool call
**Voiceover**:
> "Phase 1: Gemini Flash triages — pulls logs, metrics, deploy history. Tool calls fully transparent."

**Optional**: click to expand one tool call result for 1 second.

### Shot 5 — Investigate phase live (0:23 – 0:40)
**Camera**: right panel, phase 2 card streaming Claude Sonnet text
**Action**: let the diagnosis text stream
**Voiceover**:
> "Phase 2: Claude Sonnet investigates with full tool access — runbook search, deep root-cause reasoning. Notice the specificity — query ID, exact timestamps, pool saturation breakdown."

### Shot 6 — Adversarial review (0:40 – 0:48)
**Camera**: phase 3 card appearing
**Action**: cursor highlights the orange "↘" reviewer chip
**Voiceover**:
> "Phase 3 is the trick: a DIFFERENT vendor reviews Claude's work. Different family of models = different blind spots. Catches what Claude missed."

### Shot 7 — Final report (0:48 – 0:58)
**Camera**: scroll up to show emerald-bordered final report card at top
**Action**: pan down the recommendation list (3-5 items)
**Voiceover**:
> "Final report: root cause stated plainly, confidence honestly calibrated, three to five runnable commands with side-effect warnings."

### Shot 8 — Close (0:58 – 1:00)
**Camera**: full window with MTTR visible
**Action**: cursor highlights the MTTR `53.x s` badge
**Voiceover**:
> "Fifty seconds. That's the new MTTR. Sentinel — autonomous SRE, multi-vendor truth."

**End card** (overlay): `github.com/jackjin1997/sentinel · AI Agent Olympics 2026`

## Post-production

- Optional: speed to 1.25-1.5x for tighter pacing
- Add subtle background music (lofi / synth) at low volume
- Burn captions if voiceover is included (accessibility + judges who watch muted)
- Export 1080p MP4, < 50MB ideal for Lablab upload
- Thumbnail: screenshot of the final report card with "53s" prominent

## Recording tools (free)

- **macOS QuickTime** (Cmd+Shift+5) — built in, no install
- **Loom** — automatic upload + shareable link
- **OBS Studio** — fine control, scene transitions

## Common mistakes to avoid

- Don't record before warm-up run (cold Next.js + cold LLM cache = janky timing)
- Don't show your editor / terminal during the live demo (judges only see the product)
- Don't talk during the final report scroll — let the recommendations speak
- Don't include any personal data on screen (close email/Slack tabs)

## If you run dry on time

Minimum viable cut (35 seconds):
- Shot 1 (hero) — 3s
- Shot 3 (click incident) — 2s  
- Skip directly to Shot 7 (final report) — 25s
- Shot 8 (close + URL) — 5s

Skips the live process but still shows the value. Use only if the live run is too slow on demo day.

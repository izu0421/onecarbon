# One Carbon Technologies — Website

Public marketing site for One Carbon Technologies (trading name of Healthspan Biotics Ltd). Hosts the Brain Health Assessment quiz, early-access product sign-up, PROFILE clinical trial sign-up, research publications, and company story.

---

## Purpose

Convert visitors via a personalised Brain Health Assessment quiz → early-access product purchase or PROFILE trial sign-up. Secondary: establish scientific credibility via the research and how-it-works pages.

---

## Core Concepts

- **1C-01** — the company's probiotic product. Non-GMO, food-grade. Never call it IC-001 or HSB001.
- **One-carbon metabolism** — the metabolic pathway 1C-01 targets; key to the research narrative.
- **PROFILE** — Phase I clinical trial (NCT07457242). Always "Phase I", never Phase II.
- **Healthspan Biotics Ltd** — legal entity. "One Carbon Technologies" / "OneCarbon" is the trading name used on site.

---

## Architecture

- **Frontend:** Static HTML/CSS/JS. No framework, no build step.
- **Backend:** None. All dynamic behaviour is third-party:
  - Forms → Formspree (see form IDs below)
  - Payments → Stripe hosted checkout (buy.stripe.com payment link)
  - Geo-currency → ipapi.co (free tier, fetch on purchase page load)
- **Hosting:** GitHub Pages via `github.com/izu0421/onecarbon`, branch `main`, CNAME `onecarbon.com`
- **CDN / media:** Cloudflare R2 — videos and self-hosted fonts

---

## File Map

```
/
├── index.html            Landing page: hero + Brain Health Assessment quiz + science section
├── research.html         YouTube embed + publications table + Related work from the field
├── how-it-works.html     Step-by-step product explainer
├── our_story.html        Company timeline + team (Dr Yizhou Yu, Suleyman Noordeen)
├── purchase.html         Legacy page — all CTAs now point directly to Stripe
├── contact.html          Contact form → yizhou@onecarbon.com
├── app.html              Longitudinal cognitive tracking app (Firebase, Google Auth)
├── trials-v3.html        PROFILE trial page (Three.js neuron animation, live)
├── trials.html           Legacy trial page (not linked)
├── trials-v2.html        Legacy trial page (not linked)
├── quiz.html             Brain health quiz + cognitive battery (Formspree)
├── blog/                 Blog posts (index.html + individual posts)
├── legal/                privacy.html, tos.html, cookie.html, refund-policy.html
├── css/style.css         Single stylesheet. All CSS custom properties at top.
├── js/
│   ├── main.js           Sticky nav + active nav link highlight
│   └── cognitive-tests.js  Cognitive battery module (7 tasks, bilingual EN/ZH)
├── functions/            Firebase Cloud Functions (Node.js 22, email reminders via Resend)
├── firestore.rules       Firestore security rules (user-scoped read/write)
├── firebase.json         Firebase config (functions + firestore rules)
├── media/                Images, logos, favicon. Videos excluded via .gitignore.
└── CNAME                 onecarbon.com
```

---

## Navigation (all pages)

```
Our Story → Research → How it works → Blog → Contact → [Get early access]
```

Nav is copy-pasted across all pages (no server-side includes). Active link set dynamically in `js/main.js`.

---

## Stripe Payment Links

| Product | Link |
|---------|------|
| 1C-01 Early Access Kit (£30) — homepage | `buy.stripe.com/14A5kD8VHfiifmJ1PEcjS03` |
| 1C-01 Reorder (£27, 10% member discount) — app dashboard | `buy.stripe.com/28EdR96Nz0nodeB51QcjS01` |
| Blood & Stool Biomarker Tracking (£888) — app dashboard | `buy.stripe.com/28EcN59ZLdaagqNdymcjS02` |

All CTAs on `index.html` and `app.html` link directly to Stripe — no intermediate `purchase.html` redirect.

---

## Forms

All forms use **Formspree** with honeypot (`name="_gotcha"`).

| Form | File | Formspree ID |
|------|------|-------------|
| PROFILE sign-up | index.html + trials/index.html | `xqejdjwr` |
| App feedback | app.html | `xqejdjwr` |
| Mailing list | index.html | `xykvdvoy` |
| Quiz (email gate + completion) | index.html (fetch) | `xykvdvoy` |
| Contact | contact.html | `xeedldne` |
| App cognitive quiz | quiz.html | `mjgqkgka` |

All submissions delivered to **yizhou@onecarbon.com**.

> ⚠️ Enable reCAPTCHA + domain allowlist (`onecarbon.com`) in Formspree dashboard for each form.

---

## Brain Health Assessment Quiz (index.html)

7-question interactive quiz embedded in the hero. Collects:
- Q1: Who they're supporting
- Q2: Health goal
- Q3: Symptoms (multi-select)
- Q4: Duration (skipped if no symptoms)
- Sci screens × 2
- Q5: Medications / supplements (multi-select)
- Email gate (optional — 10% off offer)
- Q6: Formal diagnosis
- Q7: Age

Submits to Formspree `xykvdvoy` twice: once on email capture (Q1–Q5), once on completion (all answers). Result page personalises copy based on answers.

---

## Design System

### Colours (`css/style.css :root`)
```css
--accent:       #456BB7;   /* buttons, links */
--accent-dark:  #2f4f8f;   /* hover states */
--bg:           #F7F5F0;   /* warm off-white */
--surface:      #ffffff;
--text:         #1a1a18;
--text-muted:   #555555;
--text-faint:   #888888;
--border:       rgba(0,0,0,0.08);
```

### Fonts
- **DM Sans 500** — headings
- **Outfit 400** — body
- Loaded via Google Fonts + R2 self-hosted fallback

---

## External Dependencies (CDN)
- Font Awesome 6.4.0 — icons
- Google Fonts — DM Sans + Outfit
- Three.js (our_story.html neuron animation)

---

## Team (our_story.html)
| Name | Role |
|------|------|
| Dr Yizhou Yu | Co-Founder |
| Suleyman Noordeen | Medical Lead |

---

## Cognitive Battery (`js/cognitive-tests.js` + `app.html`)

Browser re-implementations of UK Biobank cognitive tasks. Tasks are shuffled on each session. Invoked via `CognitiveTests.start(containerEl, { onProgress, onComplete })`.

### Summary scores (stored as `results.<field>`)

| Field | Task | What is measured | Unit | Direction |
|-------|------|-----------------|------|-----------|
| `cog_rt` | Reaction time ("Snap") | Mean RT across **correct match trials only** (true positives). 10 trials total; misses and false alarms are recorded but excluded from the mean. | ms | lower = better |
| `cog_numeric` | Numeric memory | Longest digit sequence recalled correctly. Starts at 2 digits; each correct recall adds 1 digit; stops on first error. | digits | higher = better |
| `cog_symbol` | Symbol-digit substitution | Count of correct symbol→digit mappings within a **60-second** window. Key has 6 symbol–digit pairings. | count | higher = better |
| `cog_pal` | Paired associate learning | Count of correct recalls out of **6 word pairs**. 15 s study phase; forced-choice recall (3 options per pair). | count (0–6) | higher = better |
| `cog_matrix` | Pattern puzzles | Count of correct answers across **5 matrix puzzles** of increasing difficulty. | count (0–5) | higher = better |
| `cog_tmta` | Trail making A (numeric) | Time to tap circles 1→2→3…→N in order. | ms | lower = better |
| `cog_tmtb` | Trail making B (alternating) | Time to tap circles alternating numbers and letters (1→A→2→B…). | ms | lower = better |

### Raw trial data (stored as `results.<field>_raw`, JSON string)

| Field | Contents |
|-------|----------|
| `cog_rt_raw` | Array of `{ trial, is_match, responded, rt_ms }` — one entry per stimulus including misses and false alarms |
| `cog_numeric_raw` | Array of `{ digits, correct }` — one entry per attempt |
| `cog_symbol_raw` | Array of `{ symbol, correct_digit, chosen, correct, rt_ms }` — one entry per response |
| `cog_pal_raw` | Array of `{ cue, correct_answer, chosen, correct, rt_ms }` — one entry per pair |
| `cog_matrix_raw` | Array of `{ puzzle, correct, rt_ms }` — one entry per puzzle |
| `cog_tmta_raw` | `{ taps: [{ label, elapsed_ms, correct, expected? }], errors, total_ms }` |
| `cog_tmtb_raw` | Same structure as trail A |

### Timing metadata (stored per field)

Each task also stores:
- `<field>_start` — ISO timestamp when the user clicked **Start**
- `<field>_duration_ms` — total wall-clock time from Start click to task completion

### Composite score (computed in `app.html` dashboard)

Each raw metric is normalised to 0–100 and averaged:

```
cog_rt      → clamp(100 − (rt_ms − 200) / 8,      0, 100)   # 200 ms = 100, ~1000 ms = 0
cog_numeric → clamp(max_digits × 10,               0, 100)   # 10 digits = 100
cog_symbol  → clamp(correct × 5,                   0, 100)   # 20 correct = 100
cog_pal     → clamp(correct × 12.5,                0, 100)   # 8 correct = 100 (6-pair task → ~75 max)
cog_matrix  → clamp(correct × 20,                  0, 100)   # 5 correct = 100
cog_tmta    → clamp(100 − (ms − 10000) / 1500,     0, 100)   # 10 s = 100, ~25 s = 0
cog_tmtb    → clamp(100 − (ms − 20000) / 2500,     0, 100)   # 20 s = 100, ~45 s = 0

composite = mean of the 7 normalised scores
```

### Firestore data model (`app.html`)

```
users/{uid}                          # top-level doc: { email, name, lastSeen, probioticStart }
users/{uid}/profile/data             # { name, email, age, sex, ethnicity, education,
                                     #   medical_history[], consent, createdAt }
users/{uid}/sessions/{timestamp}     # {
                                     #   completedAt,
                                     #   results: { cog_rt, cog_numeric, … + _start, _duration_ms, _raw per field },
                                     #   sleep: { hours, quality, daytime_sleepiness, trouble,
                                     #            onset, wake_causes[], mood, stress },
                                     #   probiotic: { probiotic_start_date, probiotic_active,
                                     #               compliance_days, compliance_interval, compliance_pct }
                                     # }
```

### App dashboard features

- **Composite score ring** — click to reveal per-domain sparklines
- **Score over time chart** — relative y-axis, sleep trend overlay (dashed)
- **Sleep health panel** — scored 0–100 from hours/quality/daytime/onset/trouble
- **1C-01 probiotic tracker** — log start date, per-session compliance tiles (dynamic interval)
- **Shop panel** — direct Stripe links for reorder (10% off) and biomarker testing
- **Feedback form** — Formspree, CC'd to yizhou@onecarbon.com
- **Bilingual** — full EN / ZH toggle (window.currentLang shared with cognitive-tests.js)
- **Practice round** — guided interactive practice for first-time users (session 1 only)
- **Post-test results screen** — composite score + 7 domain bars before saving

### Firebase / Cloud Functions

- **Auth:** Firebase Google + email/password
- **Firestore rules:** `firestore.rules` — user-scoped read/write only
- **Cloud Functions:** `functions/index.js` — scheduled email reminders via Resend API, Node.js 22
- **Deploy functions:** `cd functions && npm run deploy`

---

## Deploy
```bash
git add -A && git commit -m "message" && git push origin main
```
Remote: `github.com/izu0421/onecarbon` → branch `main`

---

## Constraints
- No frameworks, no build step — plain HTML/CSS/JS only
- Videos never committed to git — host on Cloudflare R2
- Product name: **1C-01** | Trial: **PROFILE, Phase I** | Company: **OneCarbon**
- All file edits via Edit tool (not sed/bash)

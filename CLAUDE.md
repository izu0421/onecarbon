# One Carbon Technologies Website

## Stack
Static HTML/CSS/JS. No framework. Deployed via GitHub to github.com/izu0421/onecarbon.
Fonts: DM Sans Medium 500 (headings) + Outfit (body) via Google Fonts.
Videos: hosted on Cloudflare R2 — not in git (mp4s are in .gitignore).

## Colours
- --accent: #1f355a
- --accent-dark: #162844
- Original fonts (before DM Sans/Outfit): Fraunces / Figtree

## Pages
- index.html — landing page, hero video (ocean2.mp4 on R2), PROFILE sign-up form
- blog/ — blog index (index.html, 4-per-row card grid) + individual post files (blog-*.html)
- our_story.html — company story + team grid (migrated from team.html)
- research.html — publications table with hover summaries, footnotes
- trials-v3.html — LIVE clinical trials page (full-header Three.js neuron animation); trials.html and trials-v2.html kept in folder but not linked
- quiz.html — REMOVED (was: brain health quiz + cognitive battery). The homepage
  `qz-*` quiz in index.html is unrelated and still live.
- team.html — legacy page, team content now lives in our_story.html
- purchase.html — £30 early-access kit sign-up (Stripe link pending)
- contact.html

## Page formatting defaults
- Content pages use `<header class="page-header">` for the top section — left-aligned, max-width 1200px, matches research.html and profile.html
- Do NOT use `contact-section` for new content pages (that class is centered, max-width 720px, and is only appropriate for forms/contact)
- Blog post pages use `<section class="blog-post-section">` (centered, max-width 720px, long-form reading width)
- Blog posts all have an "In this article" TOC nav box and "In brief" summary box per section (background: #EEF3FB, not --surface which is white-on-white)

## Product / Stripe
- Single offer: **1C-01 Early Access Kit — £30** (60-day early-access programme), on purchase.html
- Stripe Payment Link still to be created; purchase.html CTA currently points to `#`

## Forms
All forms POST to the `submitForm` Cloud Function (`functions/index.js`), which writes to
Firestore `submissions/<form>/entries` and emails a notification via Resend. Formspree is gone.

Client helper: `js/forms.js` — include it after `js/main.js`. Two usages:
- Declarative: `<form data-oc-form="<id>">` — auto-intercepted; `data-oc-sent` sets the success text,
  `data-oc-success` names an element to reveal instead, `data-oc-sent-style` appends inline CSS.
- Programmatic: `OCForms.submit('<id>', {...})` → promise. Used where the page owns the flow.

Form ids (allowlisted in `functions/index.js` → `FORMS`; anything else is rejected):
| id | Used by |
|---|---|
| `profile` | index.html PROFILE sign-up, trials/index.html |
| `newsletter` | index.html footer banner + homepage quiz email capture |
| `contact` | contact.html |
| `quiz` | retired with quiz.html — kept in the allowlist so any cached page still submits |
| `feedback` | app.html in-app feedback |

Keep the `_gotcha` honeypot input on declarative forms — the function checks it and silently
drops bot submissions. Notification recipient is `NOTIFY_TO` in `functions/index.js`.

## Cognitive battery (js/cognitive-tests.js)
Now used only by app.html (quiz.html, its other consumer, was removed).
7 tasks (shuffled order): reaction time, numeric memory, symbol-digit, word-pair memory, pattern puzzles, trail making A & B.
Each task shows instructions + a "Start" button (no auto-countdown).
Results submitted include:
- `cog_<field>` — summary score
- `cog_<field>_start` — ISO timestamp when Start was clicked
- `cog_<field>_duration_ms` — total task duration
- `cog_<field>_raw` — JSON string of trial-level data (individual RTs, per-answer correctness, tap sequences, etc.)

## IP / Patent sensitivity
Blog posts must NOT disclose:
1. Directed evolution or strain selection methods
2. Gut→circulation delivery mechanism details
3. Specific metabolites produced (SAM, folate-cycle intermediates, etc.) as mechanism of action
Safe language: "1C-01 takes a probiotic approach to supporting this pathway. The details of how it works are subject to ongoing scientific and intellectual property development."

## Conventions
- Use Edit tool for all file changes (no sed/bash edits)
- Push with: `git add -A && git commit -m "message" && git push origin main`
- Only one remote in the onecarbon/ directory: `origin = github.com/izu0421/onecarbon` (live site)
- Videos stay off git — they live on Cloudflare R2
- Jake's title: Co-Founder
- Product name: 1C-01 (not IC-001, not HSB001)
- Trial name: PROFILE, Phase I (not Phase II)
- Company name: OneCarbon (nav logo renders as `One<span>Carbon</span>`, plain text uses "OneCarbon")

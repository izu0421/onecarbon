# One Carbon Technologies Website

## Stack
Static HTML/CSS/JS. No framework. Deployed via GitHub to github.com/izu0421/onecarbon.
Fonts: DM Sans Medium 500 (headings) + Outfit (body) via Google Fonts.
Videos: hosted on Cloudflare R2 — not in git (mp4s are in .gitignore).

## Colours
- --accent: #456BB7
- --accent-dark: #2f4f8f
- Original fonts (before DM Sans/Outfit): Fraunces / Figtree

## Pages
- index.html — landing page, hero video (ocean2.mp4 on R2), PROFILE sign-up form
- blog/ — blog index (index.html, 4-per-row card grid) + individual post files (blog-*.html)
- our_story.html — company story + team grid (migrated from team.html)
- research.html — publications table with hover summaries, footnotes
- trials-v3.html — LIVE clinical trials page (full-header Three.js neuron animation); trials.html and trials-v2.html kept in folder but not linked
- quiz.html — brain health quiz + cognitive battery (step-based form → Formspree)
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
All forms use Formspree (data visible at formspree.io dashboard):
- index.html PROFILE sign-up: `https://formspree.io/f/xqejdjwr`
- index.html email capture footer: `https://formspree.io/f/xykvdvoy`
- quiz.html cognitive quiz: `https://formspree.io/f/mjgqkgka`

## Quiz (quiz.html)
- Step-based form, `totalSteps = 5`
- Step 1: About you + email (Google Sign-In pre-fill, Client ID: `1066518482231-0sg31l19mjl8qto2a73u6t3fs2raicb5.apps.googleusercontent.com`)
- Step 2: Supplement use — gates the rest; if user hasn't started 1C-01, Step 5 is skipped
- Step 3: Sleep questions (merged)
- Step 4: More sleep / habits (merged)
- Step 5: 1C-01 experience (only shown if user has started taking it)
- After final step → cognitive battery (`js/cognitive-tests.js`)

## Cognitive battery (js/cognitive-tests.js)
7 tasks (shuffled order): reaction time, numeric memory, symbol-digit, word-pair memory, pattern puzzles, trail making A & B.
Each task shows instructions + a "Start" button (no auto-countdown).
Results submitted to Formspree include:
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

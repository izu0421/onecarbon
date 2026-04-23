# OneCarbon — Codebase Summary

## Stack
Static HTML/CSS/JS. No build step, no framework. Deployed via GitHub Pages.
- **Staging remote:** `https://github.com/izu0421/twocarbon` (branch `main`)
- **Production remote:** `https://github.com/izu0421/onecarbon` (branch `main`)

## File Map

| File | Purpose |
|---|---|
| index.html | Landing page — hero video, recognised-by bar, PROFILE sign-up form |
| blog.html | Blog index — 4-per-row card grid |
| blog-*.html | Four individual blog posts (all AI placeholder text — must be replaced pre-launch) |
| our_story.html | Company story with scroll-driven Three.js neuron animation, real-content timeline with photos, + team grid |
| research.html | Publications table with hover summaries + footnotes |
| profile.html | PROFILE Phase I clinical study detail page |
| team.html | Legacy team page — content now lives in our_story.html |
| purchase.html | Product tiers with live Stripe payment links |
| contact.html | Contact page |
| privacy.html | Privacy policy |
| tos.html | Terms of service |
| cookie.html | Cookie policy |
| refund-policy.html | Refund policy |
| css/style.css | Single stylesheet — ~1,750 lines, CSS custom properties, all page styles |
| js/main.js | Sticky nav shadow on scroll + active nav link highlighting |
| js/config.js | Neuron config export (currently dead code — not imported anywhere; see NOTES.md) |
| NOTES.md | Local dev notes — gitignored, not in repo |
| changelog.md | Per-commit change log — updated with every push |

## Design Tokens (css/style.css `:root`)
```
--accent:      #456BB7   (buttons, links, highlights)
--accent-dark: #2f4f8f
--bg:          #F7F5F0   (warm off-white page background)
--surface:     #ffffff   (cards, nav)
--text:        #1a1a18
--text-muted:  #555555
--text-faint:  #888888
--border:      rgba(0,0,0,0.08)
--radius-sm/md/lg/pill: 10px / 20px / 30px / 100px
```

## Fonts
- Headings: **DM Sans** weight 500 — loaded via Google Fonts
- Body: **Outfit** weight 300–700 — loaded via Google Fonts
- Previous fonts (for reference): Fraunces (headings) / Figtree (body)

## Typography
- Global `h1`: `clamp(2.8rem, 5vw, 5.5rem)`, line-height 1.05
- Global `h2`: `clamp(2rem, 3.5vw, 3.5rem)`
- `h1 em`, `h2 em`: `font-style: normal; color: #1a73e8` (blue accent on italic spans)
- No eyebrow `<div class="eyebrow">` elements anywhere — all removed

## Media
- Videos hosted on Cloudflare R2 (`pub-cab5eb788883425eb6f15fe9339a2279.r2.dev`) — **not in git**
- Hero video on index.html: `ocean4_small.mp4` (R2)
- Team photos, recognition logos, mechanism diagrams: `media/` directory (in git)

## Three.js Neuron (our_story.html)
- Three.js v0.160.0 via unpkg CDN, loaded as ES module
- `<script type="importmap">` in `<head>` — only one, never duplicate
- Config via `TWEAK_DEFAULTS` global object in a non-module `<script>` above the module
- Current colours: outer `#456BB7`, mid `#2f4f8f`, inner `#a8ccf8`, nucleus `#ff6600`
- Canvas fades in/out on scroll via `updateScroll()` in the inline module
- `.neuron-stage` starts at `opacity: 0` in CSS to prevent flash on page load

## Page Layout Conventions
- Content pages: `<header class="page-header">` — left-aligned, max-width 1200px
- Blog posts: `<section class="blog-post-section">` — centered, max-width 720px
- Nav padding: `max(60px, calc((100% - 1200px) / 2 + 60px))` — aligns logo with content at all widths
- Hero (index.html): `min-height: max(560px, calc(100vh - 175px))` — fills viewport so recognised-by bar sits at bottom
- Recognised-by bar: grey (`#efefef`) on all pages; white (`#ffffff`) on index.html only; placed just before `<footer>`

## Key Integrations

**Forms (index.html)**
- PROFILE sign-up submits to `https://formsubmit.co/jake@onecarbon.com`
- Subject line: `"FORM RESPONSE"`
- Fields: Full Name, Email, Location, Age, Any questions?
- Bot protection: hidden `_honey` field

**Payments (purchase.html)**
- Live Stripe links (buy.stripe.com). Four tiers:
  - £499 bundle 3-month (K00): `dRmbIT42y1GD0kA9KD8N203`
  - £250 / 360 pills (K01): `dRm3cn8iObhd3wMe0T8N201`
  - £100 / 120 pills (K02): `9B6dR142yfxt0kA9KD8N202`
  - £30 / 30 pills (K03): `28EeV5gPk995c3if4X8N200`

## Naming Conventions (critical — never deviate)
- Product: **1C-01** (not IC-001, not HSB001)
- Trial: **PROFILE, Phase I** (not Phase II)
- Company: **OneCarbon** (nav logo renders as `One<span>Carbon</span>`, plain text uses "OneCarbon")
- Legal entity: **Healthspan Biotics Ltd** (footer only)
- Jake's title: **Co-Founder**

## Nav Pattern
All pages: logo + links (Blog, Our Story, Research, PROFILE, Contact) + Shop CTA. No Home link.
Nav logo: `One<span>Carbon</span>` | Footer logo: same pattern.

## Pre-launch Content Warning
The following is AI-generated placeholder and **must be replaced before launch:**
- All four blog posts (`blog-*.html`) — titles, body, and summaries on `blog.html`
- Remaining placeholder timeline items in `our_story.html` (2022 scale, today sections still have placeholder text)

## Git / Deploy
```bash
git add <files> && git commit -m "message" && git push origin main
```
Always update `changelog.md` before committing a push.

---

> **See [changelog.md](changelog.md) for a record of specific code changes per commit.**

# One Carbon Technologies — Website

Public marketing and e-commerce site for One Carbon Technologies (trading name of Healthspan Biotics Ltd). Sells 1C-01 probiotic, runs the PROFILE Phase I clinical trial sign-up, and hosts the company's research publications.

---

## Purpose

Convert visitors into product buyers and PROFILE trial applicants. Secondary goals: establish scientific credibility via the research page and team bios.

---

## Core Concepts

- **1C-01** — the company's probiotic product. Non-GMO, food-grade. Never call it IC-001 or HSB001.
- **One-carbon metabolism** — the metabolic pathway 1C-01 targets; key to the research narrative.
- **PROFILE** — Phase I clinical trial (NCT07457242). Always "Phase I", never Phase II.
- **Healthspan Biotics Ltd** — legal entity. "One Carbon Technologies" is the trading name used everywhere on site.

---

## Architecture

- **Frontend:** Static HTML/CSS/JS. No framework, no build step.
- **Backend:** None. All dynamic behaviour is third-party:
  - Forms → formsubmit.co (POST, no server needed)
  - Payments → Stripe hosted checkout (buy.stripe.com links)
  - Geo-currency → ipapi.co (free tier, fetch on purchase page load)
- **Hosting:** GitHub Pages via `github.com/izu0421/onecarbon`, branch `main`, CNAME `onecarbon.com`
- **CDN / media:** Cloudflare R2 (`pub-cab5eb788883425eb6f15fe9339a2279.r2.dev`) — videos and self-hosted fonts

---

## File Map

```
/
├── index.html          Landing page: hero video, stats strip, Recognition section, PROFILE sign-up form
├── research.html       YouTube embed + narrative + publications table (6 papers, hover summaries)
├── profile.html        PROFILE trial detail page + eligibility + sign-up form (same fields as index)
├── team.html           Team grid — 6-col, 3+2 staggered layout, LinkedIn links
├── purchase.html       Product tiers + Stripe links + geo-currency switcher (JS inline)
├── contact.html        General contact form → team@onecarbon.com
├── privacy.html        Privacy policy
├── tos.html            Terms of service
├── cookie.html         Cookie policy
├── refund-policy.html  Refund policy
├── css/style.css       Single stylesheet (~1,650 lines). All CSS custom properties at top.
├── js/main.js          Two IIFEs: sticky nav shadow on scroll + active nav link highlight
├── media/              Team photos, recognition logos (committed). Videos excluded via .gitignore.
└── CNAME               onecarbon.com
```

---

## Key Modules / Patterns

### Navigation (shared across all pages)
```html
<nav class="site-nav">
  <a href="index.html" class="nav-logo">One<span>Carbon</span>&nbsp;Technologies</a>
  <ul class="nav-links"> … <li><a href="purchase.html" class="nav-cta">Shop</a></li> </ul>
</nav>
```
Active link is set dynamically in `js/main.js` by matching `window.location.pathname`.

### Footer (shared across all pages)
Logo text: `One<span>Carbon</span>&nbsp;Technologies`. Legal lines reference Healthspan Biotics Ltd, Company No. 15224752, Cambridge office. Footer links include Refund Policy; nav links do not.

### Forms (index.html and profile.html — identical fields)
- Action: `https://formsubmit.co/jake@onecarbon.com`
- Hidden subject: `FORM RESPONSE`
- Bot honeypot: `<input type="text" name="_honey" style="display:none">`
- Fields: Full Name (required), Email (required), Location, Age (number, 18–120), Any questions? (textarea)
- Contact form (contact.html) sends to `team@onecarbon.com`, fields: Name, Email, Message

### Geo-currency switcher (purchase.html, inline `<script>`)
Fetches `https://ipapi.co/json/` on load. Maps country code → GBP / USD / EUR / AUD / CAD. Updates six price elements by ID. Silently falls back to GBP on error. Stripe links are hardcoded GBP — currency display is cosmetic only.

### Stripe payment links
| SKU | Description | GBP price | Stripe link suffix |
|-----|-------------|-----------|-------------------|
| K00 | Bundle (3-month supply + biomarker testing) | £499 | `dRmbIT42y1GD0kA9KD8N203` |
| K01 | 360 pills (year's supply) | £250 | `dRm3cn8iObhd3wMe0T8N201` |
| K02 | 120 pills (4-month supply) | £100 | `9B6dR142yfxt0kA9KD8N202` |
| K03 | 30 pills (1-month supply) | £30 | `28EeV5gPk995c3if4X8N200` |

Full URLs: `https://buy.stripe.com/<suffix>`

---

## Design System

### Colours (`css/style.css :root`)
```css
--accent:       #456BB7;   /* buttons, links */
--accent-dark:  #2f4f8f;   /* hover states; also purchase.html page bg */
--bg:           #F7F5F0;   /* warm off-white */
--surface:      #ffffff;
--text:         #1a1a18;
--text-muted:   #555555;
--text-faint:   #888888;
--border:       rgba(0,0,0,0.08);
```

### Fonts (self-hosted on R2, `@font-face` in style.css)
- **DM Sans 500** — headings (`h1–h4`)
- **Outfit 400** — body
- R2 font path: `https://pub-cab5eb788883425eb6f15fe9339a2279.r2.dev/fonts/`
- Previous fonts (if ever reverting): Fraunces (headings) / Figtree (body)

### Radii
`--radius-sm: 10px` / `--radius-md: 20px` / `--radius-lg: 30px` / `--radius-pill: 100px`

---

## External Dependencies (CDN)
- Font Awesome 6.4.0 — icons (`fas fa-*`, `fab fa-*`)
- Google Fonts — DM Sans + Outfit (also loaded via @font-face as fallback)

---

## Team (team.html)
| Name | Role |
|------|------|
| Dr Yizhou Yu | Co-Founder |
| Suleyman Noordeen | Medical Lead |
| Laura Galbraith | Co-Founder |
| Jake McMillan | Co-Founder |
| Dr Simon Galbraith | Chair |

---

## Current State
- All Stripe links are **live**
- PROFILE sign-up form is **live** (formsubmit.co active)
- Contact form is **live**
- `media/product_img.png` and `media/mito1.png` referenced in purchase.html — check these exist before launch
- Hero product card on index.html has placeholder text ("Add pills photo here")
- YouTube embed on research.html: `https://www.youtube.com/embed/9UEiBhHuP2o`

---

## Constraints
- No frameworks, no build step — plain HTML/CSS/JS only
- Videos never committed to git — host on Cloudflare R2
- Hero video: `ocean4_small.mp4` on R2
- All file edits via Edit tool (not sed/bash)
- Naming: **1C-01**, **PROFILE**, **Phase I**, **One Carbon Technologies**
- Jake's title: **Co-Founder**

---

## Deploy
```bash
git add -A && git commit -m "message" && git push origin main
```
Remote: `github.com/izu0421/onecarbon` → branch `main`

---

## Style Rules
- CSS custom properties for all colours and radii — never hardcode outside `:root`
- Class names: kebab-case (`hero-left`, `stat-card`, `pub-table`)
- No JS frameworks — vanilla only
- Shared nav and footer must remain identical across all pages (copy-paste, not included)
- `purchase.html` overrides `body` background to `#2f4f8f` via inline `<style>` tag in `<head>`

---

> See [summary.md](summary.md) for a quick-start context reference, and [changelog.md](changelog.md) for per-commit code change history.

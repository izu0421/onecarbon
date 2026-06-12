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
├── research.html         YouTube embed + publications table
├── how-it-works.html     Step-by-step product explainer
├── our_story.html        Company timeline + team (Dr Yizhou Yu, Suleyman Noordeen)
├── purchase.html         Early-access sign-up (£30 kit, Stripe)
├── contact.html          Contact form → yizhou@onecarbon.com
├── trials/index.html     PROFILE trial detail + eligibility + sign-up form
├── blog/                 Blog posts (index.html + individual posts)
├── legal/                privacy.html, tos.html, cookie.html, refund-policy.html
├── draft/                trials-v2.html, trials-v3.html, hero-neuron.html (not live)
├── css/style.css         Single stylesheet. All CSS custom properties at top.
├── js/main.js            Sticky nav + active nav link highlight
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

## Forms

All forms use **Formspree** with honeypot (`name="_gotcha"`).

| Form | File | Formspree ID |
|------|------|-------------|
| PROFILE sign-up | index.html + trials/index.html | `xqejdjwr` |
| Mailing list | index.html | `xykvdvoy` |
| Quiz (email gate + completion) | index.html (fetch) | `xykvdvoy` |
| Contact | contact.html | `xeedldne` |
| Early-access waiting list | purchase.html | `xaqkdkvg` |

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

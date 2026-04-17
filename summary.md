# One Carbon Technologies — Codebase Summary

## Stack
Static HTML/CSS/JS. No build step, no framework. Deployed via GitHub Pages (CNAME: onecarbon.com → izu0421.github.io/onecarbon).

## File Map

| File | Purpose |
|---|---|
| index.html | Landing page — hero video, stats strip, Recognition banner, PROFILE sign-up form |
| research.html | Publications table with hover summaries + footnotes |
| profile.html | PROFILE Phase I clinical study detail page |
| team.html | Team grid (6-column, 3+2 staggered layout) |
| purchase.html | Product tiers with live Stripe payment links |
| contact.html | Contact page |
| privacy.html | Privacy policy |
| tos.html | Terms of service |
| cookie.html | Cookie policy |
| refund-policy.html | Refund policy |
| css/style.css | Single stylesheet — 1,648 lines, CSS custom properties, all page styles |
| js/main.js | Sticky nav shadow on scroll + active nav link highlighting |

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
- Headings: **DM Sans** 500 — self-hosted via Cloudflare R2 (woff2)
- Body: **Outfit** 400 — self-hosted via Cloudflare R2 (woff2)
- R2 font base: `https://pub-cab5eb788883425eb6f15fe9339a2279.r2.dev/fonts/`
- Previous fonts (for reference): Fraunces (headings) / Figtree (body)

## Media
- Videos hosted on Cloudflare R2 (`pub-cab5eb788883425eb6f15fe9339a2279.r2.dev`) — **not in git** (.gitignore excludes mp4s)
- Hero video on index.html: `ocean4_small.mp4` (R2)
- Team photos and recognition logos: `media/` directory (in git)

## Key Integrations

**Forms (index.html)**
- PROFILE sign-up submits to `https://formsubmit.co/jake@onecarbon.com`
- Subject line: `"FORM RESPONSE"`
- Fields: Full Name, Email, Location, Age, Any questions?
- Honeypot bot protection via hidden field (`_honeypot`)

**Payments (purchase.html)**
- Live Stripe links (buy.stripe.com). Four tiers:
  - £499 bundle 3-month (K00): `dRmbIT42y1GD0kA9KD8N203`
  - £250 / 360 pills (K01): `dRm3cn8iObhd3wMe0T8N201`
  - £100 / 120 pills (K02): `9B6dR142yfxt0kA9KD8N202`
  - £30 / 30 pills (K03): `28EeV5gPk995c3if4X8N200`

## Naming Conventions (critical — never deviate)
- Product: **1C-01** (not IC-001, not HSB001)
- Trial: **PROFILE, Phase I** (not Phase II)
- Company: **One Carbon Technologies** (everywhere, including nav and footer)
- Jake's title: **Co-Founder**

## Nav & Footer Pattern
All pages share the same nav and footer HTML snippet. Nav logo and footer logo both read:
`One<span>Carbon</span>&nbsp;Technologies`
Nav CTA link: `purchase.html` (labelled "Shop")

## Git / Deploy
```bash
git add -A && git commit -m "message" && git push origin main
```
Remote: `https://github.com/izu0421/onecarbon` → branch `main`

---

> **See [changelog.md](changelog.md) for a record of specific code changes per commit.**

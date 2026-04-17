# Changelog

Record specific code changes after each commit. Most recent first.

---

## 2451887 — recognition banner
- Added "Recognised By" section to `index.html` between the stats strip and PROFILE CTA
- Section contains logos: Forbes, Falling Walls, Launchpad, Trin Brad (stored in `media/`)
- Supporting CSS added to `css/style.css` under `/* ── Recognised By section ── */`

## 1abcb5e — live payment links, bot honeypot, minor labelling tweaks
- `purchase.html`: replaced placeholder Stripe links with live `buy.stripe.com` URLs for all four tiers (K00–K03)
- `index.html`: added `_honeypot` hidden field to PROFILE sign-up form for bot protection
- Minor label/copy tweaks across pages

## 8654aff — privacy policy, ToS, price changes, research tweaks, footer expansion
- Added `privacy.html` and `tos.html`
- Updated product prices in `purchase.html`
- Footer HTML expanded across pages (links to legal pages)
- `research.html`: partial content updates (WIP at time of commit)

## 96d0716 / c0384fe / f3d899a / d211faa — CNAME churn
- GitHub Pages CNAME file created and deleted multiple times during domain setup
- Final state: CNAME = `onecarbon.com`

## 2239d43 — eyebrow text colour → white
- `css/style.css`: changed eyebrow/label text colour to white on dark hero sections

## c82b13a / 805f760 — font migration to DM Sans 500
- Replaced Syne with DM Sans Medium 500 for all headings
- Fonts self-hosted on Cloudflare R2 (woff2) — eliminates Google Fonts flash
- `@font-face` declarations added to top of `css/style.css`
- Previous fonts: Fraunces (headings) / Figtree (body) — noted in style.css header comment

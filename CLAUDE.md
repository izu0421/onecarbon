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
- research.html — publications table with hover summaries, footnotes
- profile.html — PROFILE clinical study page
- team.html — team grid (6-column, 3+2 staggered layout)
- purchase.html — product tiers with Stripe links
- contact.html

## Product / Stripe
- £499 bundle (3-month): K00
- £250 (360 pills): K01
- £100 (120 pills): K02
- £30 (30 pills): K03

## Forms
- PROFILE sign-up form on index.html submits to jake@onecarbon.com via formsubmit.co
- Subject line: "FORM RESPONSE"
- Fields: Full Name, Email, Location, Age, Any questions?

## Conventions
- Use Edit tool for all file changes (no sed/bash edits)
- Push with: git add -A && git commit -m "message" && git push origin main
- Videos stay off git — they live on Cloudflare R2
- Jake's title: Co-Founder
- Product name: 1C-01 (not IC-001, not HSB001)
- Trial name: PROFILE, Phase I (not Phase II)
- Company name: One Carbon Technologies (everywhere, including nav and footer)

# Mobile Readiness Checklist

## Navigation (all pages)
- [x] Add hamburger menu at ≤600px (button HTML + CSS + JS toggle) — 18 pages updated
- [ ] Test hamburger on all pages (logo + button in one row, links expand below)

## Per-page fixes

### index.html
- [ ] Recognised-by bar: uses inline `position:absolute` with `flex` — verify it doesn't overflow on narrow screens

### trials-v3.html
- [x] Remove `white-space: nowrap` from `.profile-header-text h1` — overflows on phones

### our_story.html
- [x] Stack `.tl-item` vertically on mobile
- [x] Make `.tl-content` fluid
- [x] Make `.tl-photo` percentage-based widths
- [x] Hide sticky neuron canvas on mobile

### purchase.html
- [x] `.pills-options` 3-column grid → 1 column at ≤600px

### research.html
- [x] Un-float video so it stacks above text on mobile

## Global CSS (style.css)
- [x] `.footer-bottom` 2-column grid → single column at ≤600px
- [ ] Audit all fixed `padding: 0 60px` sections that aren't already in the responsive overrides
- [ ] Verify minimum page width is comfortable at 320px (iPhone SE)

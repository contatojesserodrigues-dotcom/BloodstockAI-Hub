# BloodstockAI Design System

## Font
- **Primary:** Inter (300, 400, 500, 600, 700)
- Google Fonts: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap`
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

## Color Palette (Landing / Global)

| Token | HSL | Hex approx | Usage |
|-------|-----|------------|-------|
| Navy Deep | 222 47% 11% | #0F172A | Primary, buttons, footer bg |
| Navy Light | 222 40% 18% | #1E293B | Hover states |
| Gold | 43 76% 48% | #C9A84C | Accent, secondary, CTAs |
| Gold Light | 45 72% 63% | #E5C76B | Gradients |
| Background | 0 0% 100% | #FFFFFF | Page bg |
| Foreground | 222 47% 11% | #0F172A | Text |
| Muted | 210 16% 96% | #F3F4F6 | Subtle bg |
| Muted FG | 222 16% 38% | #525866 | Body text |
| Border | 220 13% 88% | #DDE1E6 | Borders |
| Silver | 0 0% 71% | #B5B5B5 | Decorative |

## Dashboard Theme (`.dashboard-light`)
- Background: #F8FAFC
- Sidebar: white, 240px (w-60)
- Active nav: #0F172A bg, white text
- Gold accent: #C58A2B
- Text primary: #111827
- Text muted: #6B7280
- Border: #E5E7EB

## Typography Scale
- h1: clamp(2.25rem, 5vw, 3.5rem) / font-semibold / tracking -0.035em
- h2: clamp(1.75rem, 3.5vw, 2.75rem) / font-semibold
- Eyebrow: 11px uppercase tracking 0.14–0.25em, gold
- Body: 14–17px, leading 1.6–1.75
- Nav links: 13px font-normal

## Border Radius
- Default: 0.625rem (10px)
- Cards: rounded-xl (12px)
- Buttons: rounded-lg (8px)

## Shadows
- Card: `0 1px 2px hsl(222 47% 11% / 0.03), 0 4px 16px -4px hsl(222 47% 11% / 0.06)`
- Premium: `0 1px 2px hsl(222 47% 11% / 0.04), 0 8px 24px -8px hsl(222 47% 11% / 0.08)`

## Button Variants
- `premium`: navy bg, white text
- `outline`: border, transparent bg
- `ghost`: muted text, hover bg
- `hero`: transparent with border

## File Structure
```
css/index.css          — All CSS variables & themes
config/tailwind.config.ts
pages/Index.tsx        — Landing page composition
pages/Dashboard.tsx    — Dashboard shell (sidebar + header)
components/Header.tsx
components/Footer.tsx
components/landing/*     — All landing sections
components/ui/button.tsx, card.tsx
lib/cn-nav.ts          — Nav link styles
```

# BloodstockAI Design System - Figma Ready

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | #0A0A0B | Main background |
| bg-surface | #141416 | Sidebar, panels |
| bg-card | rgba(255,255,255,0.04) | Glass cards |
| border | rgba(255,255,255,0.08) | Borders, dividers |
| accent | #8B1538 | BloodstockAI burgundy |
| accent-light | #A91D45 | Hover states |
| text-primary | #F5F5F7 | Headings, body |
| text-muted | rgba(245,245,247,0.5) | Secondary text |

## Typography

- Font: Inter (fallback: SF Pro, system-ui)
- Headings: font-light, tracking-tight
- Body: 13-14px
- Labels: 11px uppercase, tracking-wider
- Terminal: monospace 13px

## Spacing

- Base unit: 4px
- Card padding: 20px (p-5)
- Section gap: 24px (gap-6)
- Container max-width: 1600px

## Components

### Glass Card
- Background: white 4% opacity
- Border: 1px white 8%
- Backdrop blur: xl
- Border radius: 16px (rounded-2xl)

### Primary Button
- Background: #8B1538
- Hover: #A91D45
- Radius: 12px
- Padding: 8px 16px
- Text: 14px medium white

### Ghost Button
- Border: 1px white 8%
- Background: transparent
- Hover: border white 20%

### Status Badges
- Idle: white 5%
- Researching: blue 10%
- Writing: violet 10%
- Waiting Approval: amber 10%
- Completed: emerald 10%
- Error: red 10%

### Agent Avatar
- Circle, initials, custom color per agent
- Sizes: 32px, 40px, 56px

### Room Layout (Office View)
- Grid: 3 columns desktop, 2 tablet, 1 mobile
- Each room card contains agent sub-cards
- Agent actions: Chat, Task, Logs, Approve

### Terminal View
- Monospace feed
- Timestamp in burgundy with glow
- Agent name white 90%
- Message white 50%
- Live pulse dot emerald

### Approval Card
- Agent avatar + title
- Risk badge (low/medium/high)
- Message preview in dark panel
- Approve / Edit / Reject actions

### Pipeline Board
- Horizontal scroll columns
- 12 stages
- Count badge + value bar

### Login Screen (Admin)
- Split layout: 420px brand sidebar (desktop) + centered form panel
- Left: same branding as app Sidebar (logo, Virtual HUB, feature glass cards)
- Right: glass login card, bs-heading, bs-input fields, bs-btn-primary
- Background: #0A0A0B with burgundy gradient orbs and radial accents
- Security notice card with ShieldCheck icon
- Mobile: stacked — logo header + form only

## Figma Export Prompt

```
Create a dark-mode SaaS dashboard for BloodstockAI Agent HUB.
Style: Apple + Linear + Superhuman. Deep charcoal #0A0A0B background,
burgundy #8B1538 accent, glassmorphism cards, Inter typography, thin borders.
Include: virtual office room grid, agent cards with status badges,
live terminal feed, approval queue, CRM pipeline kanban, CEO dashboard.
Professional executive feel - NOT childish Sims style.
```

## Motion

- Page enter: fade + translateY 12px, 300ms
- Card hover: border brighten, bg lighten
- Terminal lines: fade in 300ms
- Live dot: pulse 2s infinite
- Use Framer Motion for room cards stagger

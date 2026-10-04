# Branding

**Κατάσταση:** Ενεργό
**Τελευταία ενημέρωση:** 2026-09-11

## Πού μπαίνει κάθε αρχείο

Πηγή: [`brand/minimum/README-where-goes-what.txt`](../../../brand/minimum/README-where-goes-what.txt)

| Θέση | Αρχείο |
|---|---|
| Website / app header σε ανοιχτό φόντο | Horizontal **light** |
| Header / footer / hero σε σκούρα ελιά | Horizontal **dark** |
| Login / register | Stacked: σήμα πάνω, wordmark κάτω |
| App icon (store / home screen) | `oleachron-app-icon-dark.png` |
| Κάρτα APK στη landing | `oleachron-app-icon-light.png` |
| Favicon / compact chrome | `oleachron-favicon-mark.png` |
| Splash | Horizontal dark σε `#29382A` (deep grove) |

## Tagline

The story of every olive tree lives on.

## Χρώματα (Oleachron colour system)

| Όνομα | Hex | Χρήση |
|---|---|---|
| Oleachron olive | `#536D42` | Primary buttons, active navigation, important status |
| Soft sage | `#9AAA85` | Decorative highlights, previous-year charts |
| Olive leaf | `#71845B` | Dark-theme primary accent |
| Deep grove | `#29382A` | Premium dark surfaces |
| Warm stone | `#D9D5C8` | Borders on marketing surfaces |
| Limestone | `#F7F6F0` | Light page canvas (not pure white) |
| Header paper | `#FBFAF6` | Top chrome |
| Sage wash | `#F0F1E7` | Sidebar |
| Ivory card | `#FFFDF9` | Primary cards |
| Olive-gold | `#B09A63` | Logo details, harvest/premium accents only |

Gold: logo, harvest result highlight, premium/historical milestone, tiny divider — never buttons, nav, or large backgrounds **outside harvest mode**.

Runtime tokens: [`frontend/src/styles/theme.css`](../../../frontend/src/styles/theme.css). Mobile runtime tokens: [`mobile/src/theme/colors.ts`](../../../mobile/src/theme/colors.ts) + [`mobile/src/theme/themes.ts`](../../../mobile/src/theme/themes.ts). Harvest campaign swap: [`frontend/src/styles/harvest-mode.css`](../../../frontend/src/styles/harvest-mode.css). Brand mirror: [`brand/brand-tokens.css`](../../../brand/brand-tokens.css).

## Harvest mode (campaign live)

When `data-harvest-mode` is `active` or `paused`, chrome, cards, and the app canvas switch to the harvest palettes. Buttons and nav stay harvest-olive; wheat gold is highlight; terracotta is harvest fruit.

### Light

| Name | Hex | Use |
|---|---|---|
| Background | `#F6F1E7` | Page canvas |
| Surface | `#FFF9F2` | Header, cards |
| Surface soft | `#EEE4D6` | Sidebar, secondary fills |
| Primary olive | `#6B6A3C` | Buttons, active nav, links |
| Earth brown | `#7A5A3A` | Harvest ink / deep gold |
| Terracotta | `#B77357` | Harvest events, warm accent |
| Wheat gold | `#C8A06A` | Live harvest chip, nav tick, highlight |
| Text | `#2F2A23` | Primary text |
| Muted text | `#7B7367` | Secondary text |
| Border | `#DDD2C3` | Dividers |

### Dark

| Name | Hex | Use |
|---|---|---|
| Background | `#17130F` | Page canvas |
| Surface | `#221B16` | Sidebar, cards |
| Surface soft | `#2D241D` | Header, popovers, secondary fills |
| Primary olive | `#8D8A53` | Buttons, active nav, links |
| Earth brown | `#A07A58` | Natural accent |
| Terracotta | `#C18667` | Harvest events, warm accent |
| Wheat gold | `#D0A56B` | Live harvest chip, nav tick, highlight |
| Text | `#F2EBDD` | Primary text |
| Muted text | `#B6AA9B` | Secondary text |
| Border | `#43372D` | Dividers |

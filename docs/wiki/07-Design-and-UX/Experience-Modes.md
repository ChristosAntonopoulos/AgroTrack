# Experience modes (retired)

**Status:** Retired  
**Last updated:** 2026-09-11

## Summary

Oleachron no longer offers Everyday / Simple vs Full picture as a product mode. Everyone gets a single UI (the former Full surface). Comfort settings remain independent: text size and larger buttons in Settings.

## What was removed

- First-run experience chooser (`/experience`, mobile chooser)
- Header / field / Settings Simple–Full toggles
- Everyday widget catalog and path filters
- Full-only route gates (reports / data-sources now use role gates only)
- Full-picture onramp banner

## What remains

- Font scale and large controls (`ExperienceModeProvider` / mobile `PreferencesContext` — names kept for comfort prefs)
- Backend may still store unused `experienceMode` / `experienceModeChosen` on user preferences for older clients; new clients do not read or write them for UI

## Related

- [Design Principles](./Design-Principles.md)
- [Accessibility](./Accessibility.md)

# Design Principles

**Status:** Draft
**Owner:** TBD
**Last Updated:** TBD

## Purpose

A short list of rules that guide every design decision in AgroTrack.

## Principles

1. **Designed for the field, not the office.** If it can't be used outside on a phone with one hand and a bit of mud on the screen, it's not done.
2. **One main action per screen.** New users should always know what to do next.
3. **Show the field's reality.** Lifecycle stage, current tasks, latest activity — at a glance.
4. **Plain words.** No agronomic jargon unless the user asked for it. No technical jargon ever.
5. **Fast is a feature.** Slow apps are abandoned, especially on mobile data.
6. **Show, don't ask.** Pre-fill what we know. Don't make the user re-enter the same thing.
7. **Forgiving by default.** Confirm destructive actions. Make it easy to undo.
8. **Consistent over clever.** Same patterns across screens beat individually brilliant solutions.

## What we avoid

- Long forms.
- Modal stacking (one modal opening another).
- Branded sounds, splash animations, marketing inside the product.
- Patterns that punish slow connections.

## Mobile-first checklist

- Big tap targets.
- One-thumb reach for primary actions.
- Forms that work in landscape and portrait.
- Network errors handled gracefully (retry, save draft locally if simple).

## Open Questions

- Do we need a dark mode for outdoor visibility?
- Do we add voice input for activity logging?

## Next Actions

- Review every wireframe against these principles
- Update the principles after the first round of user testing

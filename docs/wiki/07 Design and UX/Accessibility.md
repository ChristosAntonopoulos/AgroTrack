# Accessibility

**Status:** Draft
**Owner:** TBD
**Last Updated:** TBD

## Purpose

How we make AgroTrack usable by as many people as possible. Practical, not legalistic, at our current stage.

## Baseline goals (MVP)

- Color contrast meets standard readability levels.
- Font sizes are large enough on phones without zoom.
- All buttons and form elements are reachable by keyboard.
- Images have alt text.
- Forms have proper labels.
- Error messages explain what to fix.

## Out of scope right now

- Full WCAG 2.1 AA audit.
- Screen reader certification.
- Translations into multiple languages.

These come as we grow. We do not promise full compliance at MVP — but we don't actively hurt accessibility either.

## Practical checks during build

| Check | When |
|---|---|
| Color contrast | At design time |
| Tap target size | At design time |
| Keyboard nav for main flows | Before pilot |
| Alt text for images | Always |
| Form labels | Always |

## Open Questions

- When do we commit to a formal accessibility standard?
- Do we offer larger font modes earlier than expected?

## Next Actions

- Run a quick contrast check on whatever we have today
- Add an accessibility item to the [Definition of Done](../06%20Scrum%20and%20Delivery/Definition%20of%20Done.md) once basics are in place

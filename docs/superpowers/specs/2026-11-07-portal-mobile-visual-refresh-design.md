# Portal-wide Mobile Visual Refresh — Design

## Summary

Unify mobile presentation across every routed surface (Admin, Ticket Admin, Ticket Center, Resolver, Approver, Login, Invigilator/Workforce, Track) with shared layout primitives, stronger card hierarchy, and readable charts/tables—without changing brand colors or fonts.

## Decisions

- **Scope B:** Staff + public routes.
- **Depth:** Visual refresh (shared layouts + hierarchy), not clip-fixes alone.
- **Brand:** Keep slate/neutral tokens in `src/index.css`. Quiet Analytics chart language.
- **Tables:** Card list below `md`; desktop table at `md+`. Wide inner tables use `overflow-x-auto`.
- **Breakpoint:** `useIsMobile` @ 768px for charts; Tailwind `sm`/`md` for layout.

## Shared kit

| Piece | Purpose |
|-------|---------|
| `PageShell` | `container` + `min-w-0` + `overflow-x-hidden` + `space-y-4 md:space-y-6` |
| Metric card / grid classes | Compact mobile type; 2-col grids; dense strips may snap-scroll |
| Tab trigger class | `text-xs` wrap on phone; `md:whitespace-nowrap` |
| Truncation | Titles truncate / line-clamp; meta `min-w-0`; numbers `tabular-nums` |
| Chart helpers | Shared bar/pie label + margin helpers |
| Modal shell | `max-h-[90dvh]`, `w-[min(96vw,…)]`, internal scroll |

## Acceptance (~375px)

- No horizontal page scroll (inner table scroll OK).
- Names and numbers readable (truncate + title where needed).
- Cards: title → badges → meta → actions.
- Charts: bar/pie counts visible; axis labels ellipsized.
- Tabs fit 2-col without overflow; modals usable; desktop unchanged.

## Out of scope

- Brand recolor / dark-mode redesign.
- Data/fetch changes.
- Unrouted legacy pages.
- Production DB / commit unless requested.

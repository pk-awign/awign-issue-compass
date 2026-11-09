# Analytics Quiet Restyle — Design

## Summary

Restyle `AdvancedAnalytics` to a calmer admin palette: neutral cards by default; colour reserved for attention states (Open, SLA breached, Unassigned). Charts keep distinct series colours for readability.

## Rules

- KPI cards: plain `Card`, default number colour, muted icon circles
- Attention: Open / SLA breached / Unassigned may use destructive or muted-red accents
- No pastel gradient fills on metric tiles
- Breakdown chips / top-performer rows: `bg-muted/50` + outline badges
- Chart bar fills: single slate/primary family (not rainbow per chart)
- Role badges in tables may keep light semantic colour (resolver/approver) as small labels only

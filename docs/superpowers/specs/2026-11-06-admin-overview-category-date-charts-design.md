# Admin overview category & created-by-date charts

## Goal

Show **Tickets by Category** and **Tickets Created by Date** on the Admin Overview tab, directly beneath the six status cards, matching Ticket Center chart look.

## Decisions

- Charts respect the same Overview `AnalyticsDateFilter` (date range + include archived) as the six cards.
- Data comes from extended `TicketAnalytics` (same payload as the cards), not a separate fetch.
- Portal tickets only (admin analytics path), not Ticket Center combined rows.
- Placement: under the six cards, above Quick Actions; stacked vertically.

## Out of scope

- Extracting a shared chart package with Ticket Center.
- Adding these charts to Ticket Admin’s separate Quick Actions overview.
- Changing Analytics tab charts.

# RIPPLR Orchestrator

A B2B **inventory orchestration** platform for RIPPLR's **Distribution-as-a-Service (DaaS)** —
keeping D2C and FMCG brands always-in-stock across **Quick-Commerce, Modern Trade, General Trade
and E-Commerce**, fed directly from Ripplr's Multi-Fulfillment Center (MFC) network.

This implements the product described in the Ripplr DaaS / Green-Channel / OutNIF decks:
a control tower that sees brand inventory at every MFC and every downstream channel, forecasts
demand, and auto-raises replenishment orders before a stockout happens.

## What it does

- **SLA Command Center** — live KPIs against the Ripplr SLA charter: Fill Rate (≥97%),
  Out-of-Stock (≤2%), Inventory Accuracy (≥99%), Forecast Accuracy (≥92%), plus at-risk coverage.
- **Demand & Forecast** — a dependency-free demand forecaster (EWMA level + linear trend +
  day-of-week seasonality) per SKU × channel, with a projected stockout date, a 7-day forecast
  curve, and a **back-tested accuracy** score (predict the last 7 days from prior data → MAPE).
- **Channel Orchestration** — forecast-projected days-of-cover for every SKU × channel, with a
  **Green-Channel** view (D2C SKUs that feed q-commerce platforms — Blinkit, Zepto, Swiggy
  Instamart, BigBasket Now — directly from MFCs on a 12h TAT, bypassing appointment bottlenecks).
- **Replenishment engine (VMI)** — refreshes forecasts, then raises prioritised PO suggestions
  ~lead-time *ahead* of the projected stockout, allocates MFC stock, and drives the lifecycle:
  `SUGGESTED → APPROVED → DISPATCHED → DELIVERED`. Dispatch moves units out of the MFC onto the shelf.
- **Reverse Logistics** — returns flow back from channels into MFC returns zones:
  `INITIATED → IN_QC (23-point) → DISPOSITIONED → CLOSED`. A **Resell** disposition restocks MFC
  inventory; every disposition (Resell / Refurbish / Recycle / Dispose) books recovered value.
  Tracks restock rate, value recovered, QC TAT, and a return-reasons quality loop shared with brands.
- **Cross-Border Corridor (OutNIF)** — India → UAE → KSA → EU/US trade lanes with the deck's lane
  economics (traditional vs OutNIF cost & transit, ~28% cost / ~33% transit saving), plus a
  Shipsy-style control tower that books containers and advances them through the milestone timeline
  (`BOOKED → CONSOLIDATING → IN_TRANSIT → CUSTOMS → AT_HUB → OUT_FOR_DELIVERY → DELIVERED`).
- **MFC Inventory** — source-of-truth stock (on-hand / allocated / available / in-transit / safety)
  across seven MFCs (Bangalore, Hyderabad, Chennai, Mumbai, Pune, Delhi NCR, Ahmedabad).
- **Brands & Onboarding** — onboard a brand in seconds; portfolio view with SKU counts.

## Tech stack

| Layer    | Choice                                            |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS   |
| Backend  | Next.js Route Handlers (REST API)                 |
| Data     | Prisma ORM + SQLite (zero external services)      |
| Engine   | `src/lib/orchestration.ts` (cover + replenishment)|

## Getting started

```bash
npm install
npm run setup     # prisma generate + db push + seed demo data
npm run dev       # http://localhost:3000
```

`npm run setup` creates `prisma/dev.db`, applies the schema, and seeds realistic demo data
(Happilo, Fogg, Wild Stone, NIVEA, Set Wet across the MFC and channel network). Some channels are
deliberately seeded below target cover so the engine has work to do — hit **Run Orchestration
Engine** on the dashboard.

To reset the data at any time: `npm run db:reset`.

## API

| Method | Route                          | Purpose                                  |
| ------ | ------------------------------ | ---------------------------------------- |
| GET    | `/api/sla`                     | SLA Command Center summary               |
| GET    | `/api/cover`                   | Forecast-projected days-of-cover         |
| GET    | `/api/forecast`                | Per-signal forecast detail + back-test   |
| POST   | `/api/orchestrate`             | Run the forecast-driven VMI engine       |
| GET    | `/api/replenishment`           | List replenishment orders                |
| PATCH  | `/api/replenishment/:id`       | Advance an order (`status` in body)      |
| GET    | `/api/inventory`               | MFC inventory lines                      |
| GET    | `/api/mfcs`                    | MFCs with load summary                   |
| GET    | `/api/channels`                | Channels                                 |
| GET    | `/api/skus`                    | SKUs (for return logging)                |
| GET/POST | `/api/brands`                | List / onboard brands                    |
| GET/POST | `/api/returns`               | List / log returns                       |
| GET    | `/api/returns/summary`         | Reverse-logistics analytics              |
| PATCH  | `/api/returns/:id`             | Advance / disposition a return           |
| GET    | `/api/corridor`                | Lane economics + corridor summary        |
| GET/POST | `/api/shipments`             | List / book cross-border shipments       |
| PATCH  | `/api/shipments/:id`           | Advance a shipment milestone             |

## Data model

`Brand → Sku → Inventory (per MFC)` on the supply side; `Sku → ChannelStock (per Channel)` on the
demand side; `ReplenishmentOrder` links an MFC to a channel for a SKU. See `prisma/schema.prisma`.

## Roadmap (from the decks, not yet built)

- Real platform integrations (Blinkit/Zepto/Amazon APIs) replacing the simulated channel sync.
- Collection (AR) and Delivery (last-mile) app surfaces.

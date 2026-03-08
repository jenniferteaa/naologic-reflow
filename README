# Naologic Production Schedule Reflow

A production scheduling engine built in TypeScript that reschedules work orders when disruptions occur in a manufacturing facility. The system resolves conflicts while respecting dependencies, shift hours, and maintenance windows.

---

## Quick Start

```bash
npm install
npm run dev       # run with sample data
npm test          # run test suite
```

---

## Project Structure

```
src/
├── reflow/
│   ├── reflow.service.ts        # Main scheduling algorithm
│   ├── constraint-checker.ts   # Validation utilities (topo sort, assertions)
│   ├── reflow.service.test.ts  # Jest test suite
│   └── types.ts                # TypeScript type definitions
├── utils/
│   └── date-utils.ts           # Shift-aware date helpers (Luxon)
├── data/
│   ├── sample-data.ts          # Small dataset (15 work orders, 6 work centers)
│   └── large-work-orders.json  # Large dataset (1000 work orders)
└── index.ts                    # Entry point - runs both scenarios
```

---

## Algorithm Approach

The reflow engine processes work orders in four stages:

### 1. Blocked Window Construction
Before scheduling begins, the engine builds a blocked time map per work center by combining:
- Static maintenance windows defined on the work center
- Maintenance work orders (`isMaintenance: true`), which are treated as immovable blocked intervals

Blocked intervals are then sorted by start time and validated for overlaps — overlapping blocks throw an explicit error identifying both sources.

### 2. Dependency Graph & Topological Sort (DAG)
Work order dependencies are modeled as a Directed Acyclic Graph. Kahn's algorithm produces a topological ordering, guaranteeing every parent work order is scheduled before any of its children. Circular dependencies and missing parent references both throw explicit errors immediately.

The queue is re-sorted by original start time whenever new nodes become ready, making output deterministic across runs.

### 3. Earliest Start Calculation
For each work order in topological order, the engine computes the earliest valid start time as the maximum of three constraints:

- **Original start date** — work orders are never pulled earlier than planned (stability heuristic)
- **Parent completion time** — all dependencies must finish first
- **Work center availability** — the machine must be free from the previous work order

### 4. Shift & Maintenance Aware Placement
Two core date utilities handle the real complexity:

- `nextWorkingInstant` — snaps a candidate time forward to the next valid working moment, skipping blocked windows and non-shift hours
- `addWorkingMinutes` — walks forward through the calendar consuming only working minutes, pausing at shift boundaries and maintenance blocks, resuming at the next valid slot

**Example:** A 120-minute work order starting Monday at 4PM (shift ends 5PM):
- Works 60 minutes Monday 4PM–5PM
- Pauses overnight
- Resumes Tuesday 8AM
- Completes Tuesday 9AM

---

## Work Centers

| ID    | Shift Hours              | Maintenance |
|-------|--------------------------|-------------|
| TX320 | Mon–Fri 8AM–5PM          | Wed 12PM–2PM |
| FX240 | Mon–Fri 7AM–4PM          | None |
| PZ510 | Mon–Fri 9AM–6PM          | Thu 10AM–11:30AM |
| KX100 | Mon–Fri 6AM–2PM          | Fri 6AM–7AM |
| MZ750 | Mon–Fri 10AM–7PM         | None |
| RQ430 | Mon–Fri 8AM–4PM, Sat 9AM–1PM | Sat 2PM–4PM |

---

## Design Decisions

**Do-not-pull-earlier heuristic**
The spec requires a valid schedule but doesn't define how much the schedule should change. I chose to never move a work order earlier than its original start date. This minimizes churn and keeps the output as close to the original schedule as possible.

**Maintenance work orders as blocked windows**
Maintenance work orders are added directly to the work center's blocked interval list alongside static maintenance windows. This means the same shift-aware date logic handles both automatically, without special casing throughout the algorithm.

**Soft allow, hard guard for maintenance dependencies**
The spec doesn't address what happens when a maintenance work order has dependencies. I allow it, but throw an explicit error if those dependencies finish after the maintenance start time — failing fast rather than producing a silently invalid schedule.

**Overlap detection on blocked windows**
After sorting blocked intervals, the engine checks for overlaps between maintenance windows and maintenance work orders. If two blocks overlap on the same work center, an error is thrown identifying both sources by type and ID.

**Queue re-sorting on every node addition**
The topological sort queue is re-sorted by original start time whenever new nodes become ready. This keeps the output deterministic at the cost of repeated sorting.

```
// @upgrade: replace repeated queue.sort() with a min-heap priority queue
// Current: O(n log n) re-sort on every node addition
// Upgrade: O(log n) insertion for better performance at very large scale
```

**UTC everywhere**
All dates are parsed and stored as UTC. The `dt()` helper also handles extended-hour timestamps (e.g. `T24:30:00Z`) that Luxon does not parse natively.

---

## Test Scenarios

```bash
npm test
```

The test suite covers four scenarios:

**Scenario 1 — Dependency Cascade**
One delayed work order cascades downstream. Verifies each child is scheduled after its parent completes.

**Scenario 2 — Maintenance Window Conflict**
A work order spanning a maintenance window is correctly split — work pauses during the blocked period and resumes after. Verifies no work order starts inside a maintenance window.

**Scenario 3 — Shift Boundary Spillover**
A work order starting late in the day runs out of shift hours and spills into the next working day. Verifies end times never exceed shift boundaries.

**Scenario 4 — Circular Dependency Detection**
Two work orders that depend on each other trigger a clear error immediately.

---

## Output Format

```typescript
{
  updatedWorkOrders: WorkOrderDoc[];  // Full schedule with updated dates
  changes: WorkOrderChange[];          // What moved and why
  explanation: string;                 // High-level summary
}
```

Each change record:
```typescript
{
  workOrderId: string;
  oldStartDate: string;
  oldEndDate: string;
  newStartDate: string;
  newEndDate: string;
  reason: string; // e.g. "dependency delay, work center conflict, shift/maintenance constraints"
}
```

---

## Known Limitations & Future Improvements

```typescript
// @upgrade: tie-breaking logic for same-start-time work orders
// If two orders compete for the same resource at the same time:
// 1. Run shortest duration first if gap > 50% of largest window
// 2. Prioritize order with most downstream dependencies if durations similar

// @upgrade: optimization metrics
// - Total delay introduced: Σ(new_end - original_end)
// - Work center utilization: total working minutes / total available shift minutes
// - Idle time analysis per work center

// @upgrade: impossible schedule detection
// Explicitly identify and report when constraints cannot be satisfied
// e.g. maintenance window longer than available shift time

// @upgrade: setup time handling
// Work orders could include setupTimeMinutes counted as working time before production starts
```

---

## Dependencies

- [Luxon](https://moment.github.io/luxon/) — date/time manipulation
- [ts-jest](https://kulshekhar.github.io/ts-jest/) — TypeScript Jest runner
- [tsx](https://github.com/privatenumber/tsx) — TypeScript execution

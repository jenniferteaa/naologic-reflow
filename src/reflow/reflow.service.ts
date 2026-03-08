import { DateTime } from "luxon";
import {
  addWorkingMinutes,
  dt,
  nextWorkingInstant,
  toISO,
  WorkCenterLike,
} from "../utils/date-utils";
import {
  ReflowInput,
  ReflowResult,
  WorkCenterDoc,
  WorkOrderChange,
  WorkOrderDoc,
} from "./types";
import {
  assertMaintenanceTiming,
  assertWorkCentersExist,
  topoSortWorkOrders,
} from "./constraint-checker";

type IntervalBlock = {
  start: DateTime;
  end: DateTime;
  reason?: string;
  sourceType: "workCenterMaintenance" | "workOrderMaintenance";
  sourceId: string;
};

// @upgrade: tie-breaking logic for same-start-time work orders
// If two orders compete for the same resource at the same time:
// 1. Run shortest duration first if gap > 50% of largest window
// 2. Prioritize order with most downstream dependencies if durations similar

export class ReflowService {
  reflow(input: ReflowInput): ReflowResult {
    const workOrders = input.workOrders;
    const workCenters = input.workCenters;

    const woById = new Map<string, WorkOrderDoc>();
    for (const wo of workOrders) woById.set(wo.docId, wo);

    const wcById = new Map<string, WorkCenterDoc>();
    for (const wc of workCenters) wcById.set(wc.docId, wc);

    assertWorkCentersExist(workOrders, workCenters);

    // --- Build blocked windows per work center (maintenanceWindows + fixed maintenance work orders)
    // maintenanceWindows blocked on the work centers
    const wcRuntime = new Map<string, WorkCenterLike>();
    for (const wc of workCenters) {
      const blocked: IntervalBlock[] = [];

      for (const [idx, mw] of wc.data.maintenanceWindows.entries()) {
        blocked.push({
          start: dt(mw.startDate),
          end: dt(mw.endDate),
          reason: mw.reason ?? "workCenterMaintenance",
          sourceType: "workCenterMaintenance",
          sourceId: `${wc.docId}:maintenanceWindow:${idx}`,
        });
      }

      wcRuntime.set(wc.docId, { shifts: wc.data.shifts, blocked });
    }

    // Add fixed maintenance work orders as blocked time on their work center
    // assuming that maintenance from the workCenter and the workOrder do not coincide
    for (const wo of workOrders) {
      if (!wo.data.isMaintenance) continue;
      const wc = wcRuntime.get(wo.data.workCenterId); // assuming that the work order maintenances are the same as work center maintenacnes
      if (!wc)
        throw new Error(
          `Unknown workCenterId on work order ${wo.docId}: ${wo.data.workCenterId}`,
        );
      wc.blocked.push({
        start: dt(wo.data.startDate),
        end: dt(wo.data.endDate),
        reason: "fixedWorkOrderMaintenance",
        sourceType: "workOrderMaintenance",
        sourceId: wo.docId,
      });
    }

    // Sort blocked intervals (important for fast scanning) and reject overlaps
    for (const [wcId, wc] of wcRuntime.entries()) {
      wc.blocked.sort((a, b) => a.start.toMillis() - b.start.toMillis());
      for (let i = 1; i < wc.blocked.length; i += 1) {
        const prev = wc.blocked[i - 1];
        const cur = wc.blocked[i];
        if (cur.start < prev.end) {
          throw new Error(
            `Overlapping maintenance blocks on work center ${wcId}: ` +
              `${toISO(prev.start)}-${toISO(prev.end)} (${prev.sourceType} ${prev.sourceId}) ` +
              `overlaps ${toISO(cur.start)}-${toISO(cur.end)} (${cur.sourceType} ${cur.sourceId})`,
          );
        }
      }
    }

    // --- Dependency ordering (topo sort)
    const topo = topoSortWorkOrders(workOrders, (a, b) => {
      return (
        dt(woById.get(a)!.data.startDate).toMillis() -
        dt(woById.get(b)!.data.startDate).toMillis()
      );
    });

    // --- Scheduling
    const wcNextFree = new Map<string, DateTime>(); // latest scheduled end per work center
    const woEnd = new Map<string, DateTime>(); // computed end times
    const woStart = new Map<string, DateTime>(); // computed start times

    // Initialize with existing fixed maintenance work orders affecting nextFree (optional):
    // We'll just rely on blocked windows, and nextFree starts at -infinity.
    // assuming 2 maintenance windows do not coincide
    const updated: WorkOrderDoc[] = [];
    const changes: WorkOrderChange[] = [];

    for (const woId of topo) {
      const wo = woById.get(woId)!;
      const wcId = wo.data.workCenterId;
      const wc = wcRuntime.get(wcId);
      if (!wc)
        throw new Error(
          `Unknown workCenterId on work order ${wo.docId}: ${wcId}`,
        );

      const oldStart = dt(wo.data.startDate);
      const oldEnd = dt(wo.data.endDate);

      // parent completion constraint
      let parentMaxEnd: DateTime | null = null;
      for (const p of wo.data.dependsOnWorkOrderIds ?? []) {
        const pe = woEnd.get(p);
        if (!pe)
          throw new Error(
            `Internal error: parent ${p} of ${woId} not scheduled yet`,
          );
        if (!parentMaxEnd || pe > parentMaxEnd) parentMaxEnd = pe;
      }

      // Fixed maintenance work orders do not move
      if (wo.data.isMaintenance) {
        if (parentMaxEnd) {
          assertMaintenanceTiming(
            woId,
            oldStart.toMillis(),
            parentMaxEnd.toMillis(),
          );
        }
        woStart.set(woId, oldStart);
        woEnd.set(woId, oldEnd);

        // keep nextFree updated if this is later than current (helps avoid overlap for non-maintenance)
        const nf = wcNextFree.get(wcId);
        if (!nf || oldEnd > nf) wcNextFree.set(wcId, oldEnd);

        updated.push(wo);
        continue;
      }

      const wcFree =
        wcNextFree.get(wcId) ?? DateTime.fromMillis(0, { zone: "utc" }); // epoch as baseline

      // Do-not-pull-earlier heuristic (keeps schedule close to original)
      let earliest = oldStart;
      if (parentMaxEnd && parentMaxEnd > earliest) earliest = parentMaxEnd;
      if (wcFree > earliest) earliest = wcFree;

      const newStart = nextWorkingInstant(wc, earliest);
      const newEnd = addWorkingMinutes(wc, newStart, wo.data.durationMinutes);

      woStart.set(woId, newStart);
      woEnd.set(woId, newEnd);
      wcNextFree.set(wcId, newEnd);

      const moved =
        newStart.toMillis() !== oldStart.toMillis() ||
        newEnd.toMillis() !== oldEnd.toMillis();
      if (moved) {
        const reasonParts: string[] = [];
        if (parentMaxEnd && parentMaxEnd > oldStart)
          reasonParts.push("dependency delay");
        if (wcFree > oldStart) reasonParts.push("work center conflict");
        // shifts/maintenance are implicit; keep explanation simple
        reasonParts.push("shift/maintenance constraints");

        changes.push({
          workOrderId: woId,
          oldStartDate: toISO(oldStart),
          oldEndDate: toISO(oldEnd),
          newStartDate: toISO(newStart),
          newEndDate: toISO(newEnd),
          reason: reasonParts.join(", "),
        });
      }

      updated.push({
        ...wo,
        data: {
          ...wo.data,
          startDate: toISO(newStart),
          endDate: toISO(newEnd),
        },
      });
    }

    return {
      updatedWorkOrders: updated,
      changes,
      explanation:
        "Reflow scheduled work orders in dependency order, resolving work center conflicts, then applying shift hours and blocked maintenance windows. Maintenance work orders were treated as fixed blocks.",
    };
  }
}

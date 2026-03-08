import { workCenters } from "../data/sample-data";
import { ReflowService } from "./reflow.service";
import { WorkOrderDoc } from "./types";

const service = new ReflowService();

// ─── Scenario 1: Dependency Cascade ───────────────────────────────────────────
describe("Scenario 1: Dependency Cascade", () => {
  const workOrders: WorkOrderDoc[] = [
    {
      docId: "WO-A",
      docType: "workOrder",
      data: {
        workOrderNumber: "WO-A",
        manufacturingOrderId: "MO1",
        workCenterId: "FX240",
        startDate: "2026-03-03T08:00:00Z",
        endDate: "2026-03-03T09:00:00Z",
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    },
    {
      docId: "WO-B",
      docType: "workOrder",
      data: {
        workOrderNumber: "WO-B",
        manufacturingOrderId: "MO1",
        workCenterId: "TX320",
        // intentionally scheduled before WO-A finishes - reflow should fix this
        startDate: "2026-03-03T08:30:00Z",
        endDate: "2026-03-03T10:00:00Z",
        durationMinutes: 90,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["WO-A"],
      },
    },
    {
      docId: "WO-C",
      docType: "workOrder",
      data: {
        workOrderNumber: "WO-C",
        manufacturingOrderId: "MO1",
        workCenterId: "PZ510",
        startDate: "2026-03-03T09:00:00Z",
        endDate: "2026-03-03T10:30:00Z",
        durationMinutes: 90,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["WO-B"],
      },
    },
  ];

  it("should schedule WO-B after WO-A completes", () => {
    const result = service.reflow({ workOrders, workCenters });
    const woA = result.updatedWorkOrders.find((w) => w.docId === "WO-A")!;
    const woB = result.updatedWorkOrders.find((w) => w.docId === "WO-B")!;

    expect(new Date(woB.data.startDate).getTime()).toBeGreaterThanOrEqual(
      new Date(woA.data.endDate).getTime(),
    );
  });

  it("should schedule WO-C after WO-B completes", () => {
    const result = service.reflow({ workOrders, workCenters });
    const woB = result.updatedWorkOrders.find((w) => w.docId === "WO-B")!;
    const woC = result.updatedWorkOrders.find((w) => w.docId === "WO-C")!;

    expect(new Date(woC.data.startDate).getTime()).toBeGreaterThanOrEqual(
      new Date(woB.data.endDate).getTime(),
    );
  });

  it("should record changes for moved work orders", () => {
    const result = service.reflow({ workOrders, workCenters });
    const movedIds = result.changes.map((c) => c.workOrderId);

    // WO-B and WO-C should have moved due to dependency cascade
    expect(movedIds).toContain("WO-B");
    expect(movedIds).toContain("WO-C");
  });
});

// ─── Scenario 2: Maintenance Window Conflict ──────────────────────────────────
describe("Scenario 2: Maintenance Window Conflict", () => {
  // TX320 has maintenance 2026-03-04T12:00:00Z -> 14:00:00Z
  // This work order starts at 10am and runs 180 mins - walks right into it
  const workOrders: WorkOrderDoc[] = [
    {
      docId: "S2-WO1",
      docType: "workOrder",
      data: {
        workOrderNumber: "S2-WO1",
        manufacturingOrderId: "MO2",
        workCenterId: "TX320",
        startDate: "2026-03-04T10:00:00Z",
        endDate: "2026-03-04T13:00:00Z",
        durationMinutes: 180,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    },
    {
      docId: "S2-WO2",
      docType: "workOrder",
      data: {
        workOrderNumber: "S2-WO2",
        manufacturingOrderId: "MO2",
        workCenterId: "TX320",
        startDate: "2026-03-04T13:00:00Z",
        endDate: "2026-03-04T14:30:00Z",
        durationMinutes: 90,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["S2-WO1"],
      },
    },
  ];

  it("should not schedule any work during TX320 maintenance window", () => {
    const result = service.reflow({ workOrders, workCenters });

    const maintenanceStart = new Date("2026-03-04T12:00:00Z").getTime();
    const maintenanceEnd = new Date("2026-03-04T14:00:00Z").getTime();

    for (const wo of result.updatedWorkOrders) {
      if (wo.data.workCenterId !== "TX320") continue;

      const start = new Date(wo.data.startDate).getTime();
      const end = new Date(wo.data.endDate).getTime();

      // A work order that starts before maintenance and ends after is OK
      // because the algorithm pauses work during the window.
      // What's NOT allowed is a work order that starts INSIDE the window.
      const startsInsideMaintenance =
        start >= maintenanceStart && start < maintenanceEnd;

      expect(startsInsideMaintenance).toBe(false);
    }
  });

  it("should push S2-WO1 end past the maintenance window", () => {
    const result = service.reflow({ workOrders, workCenters });
    const wo1 = result.updatedWorkOrders.find((w) => w.docId === "S2-WO1")!;
    const maintenanceEnd = new Date("2026-03-04T14:00:00Z").getTime();

    expect(new Date(wo1.data.endDate).getTime()).toBeGreaterThan(
      maintenanceEnd,
    );
  });

  it("should schedule S2-WO2 after S2-WO1 completes", () => {
    const result = service.reflow({ workOrders, workCenters });
    const wo1 = result.updatedWorkOrders.find((w) => w.docId === "S2-WO1")!;
    const wo2 = result.updatedWorkOrders.find((w) => w.docId === "S2-WO2")!;

    expect(new Date(wo2.data.startDate).getTime()).toBeGreaterThanOrEqual(
      new Date(wo1.data.endDate).getTime(),
    );
  });
});

// ─── Scenario 3: Shift Boundary Spillover ─────────────────────────────────────
describe("Scenario 3: Shift Boundary Spillover", () => {
  // FX240 shift ends at 16:00 - this order starts late and must spill to next day
  const workOrders: WorkOrderDoc[] = [
    {
      docId: "S3-WO1",
      docType: "workOrder",
      data: {
        workOrderNumber: "S3-WO1",
        manufacturingOrderId: "MO1",
        workCenterId: "FX240",
        startDate: "2026-03-03T15:00:00Z",
        endDate: "2026-03-03T17:00:00Z",
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    },
    {
      docId: "S3-WO2",
      docType: "workOrder",
      data: {
        workOrderNumber: "S3-WO2",
        manufacturingOrderId: "MO1",
        workCenterId: "FX240",
        startDate: "2026-03-03T17:00:00Z",
        endDate: "2026-03-03T18:00:00Z",
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["S3-WO1"],
      },
    },
  ];

  it("should not schedule work outside FX240 shift hours (7am-4pm)", () => {
    const result = service.reflow({ workOrders, workCenters });

    for (const wo of result.updatedWorkOrders) {
      if (wo.data.workCenterId !== "FX240") continue;

      const start = new Date(wo.data.startDate);
      const end = new Date(wo.data.endDate);

      // end hour should never exceed 16 (4pm) on any given day
      // we check the end time is not past shift end on same day as it starts
      const endHourUTC = end.getUTCHours();
      const endMinUTC = end.getUTCMinutes();
      const pastShift = endHourUTC > 16 || (endHourUTC === 16 && endMinUTC > 0);

      expect(pastShift).toBe(false);
    }
  });

  it("should spill S3-WO1 into next working day", () => {
    const result = service.reflow({ workOrders, workCenters });
    const wo1 = result.updatedWorkOrders.find((w) => w.docId === "S3-WO1")!;

    const endDate = new Date(wo1.data.endDate);
    // started March 3, should end March 4
    expect(endDate.getUTCDate()).toBe(4);
  });

  it("should schedule S3-WO2 after S3-WO1 completes", () => {
    const result = service.reflow({ workOrders, workCenters });
    const wo1 = result.updatedWorkOrders.find((w) => w.docId === "S3-WO1")!;
    const wo2 = result.updatedWorkOrders.find((w) => w.docId === "S3-WO2")!;

    expect(new Date(wo2.data.startDate).getTime()).toBeGreaterThanOrEqual(
      new Date(wo1.data.endDate).getTime(),
    );
  });
});

// ─── Scenario 4: Circular Dependency Detection ────────────────────────────────
describe("Scenario 4: Circular Dependency Detection", () => {
  const workOrders: WorkOrderDoc[] = [
    {
      docId: "CYC-A",
      docType: "workOrder",
      data: {
        workOrderNumber: "CYC-A",
        manufacturingOrderId: "MO1",
        workCenterId: "FX240",
        startDate: "2026-03-03T08:00:00Z",
        endDate: "2026-03-03T09:00:00Z",
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["CYC-B"],
      },
    },
    {
      docId: "CYC-B",
      docType: "workOrder",
      data: {
        workOrderNumber: "CYC-B",
        manufacturingOrderId: "MO1",
        workCenterId: "TX320",
        startDate: "2026-03-03T09:00:00Z",
        endDate: "2026-03-03T10:00:00Z",
        durationMinutes: 60,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["CYC-A"],
      },
    },
  ];

  it("should throw an error when circular dependency is detected", () => {
    expect(() => service.reflow({ workOrders, workCenters })).toThrow(
      /[Cc]ircular/,
    );
  });
});

// ─── Scenario 5: Maintenance Window vs Maintenance Work Order ────────────────
describe("Scenario 5: Maintenance Window vs Maintenance Work Order", () => {
  const workOrders: WorkOrderDoc[] = [
    {
      docId: "MW-WO-1",
      docType: "workOrder",
      data: {
        workOrderNumber: "MW-WO-1",
        manufacturingOrderId: "MO1",
        workCenterId: "TX320",
        // overlaps TX320 maintenance window (12:00-14:00 on 2026-03-04)
        startDate: "2026-03-04T13:00:00Z",
        endDate: "2026-03-04T15:00:00Z",
        durationMinutes: 120,
        isMaintenance: true,
        dependsOnWorkOrderIds: [],
      },
    },
  ];

  it("should throw with details on WC vs WO maintenance overlap", () => {
    try {
      service.reflow({ workOrders, workCenters });
      throw new Error("Expected overlap error");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toMatch(/Overlapping maintenance blocks/);
      expect(message).toMatch(/TX320/);
      expect(message).toMatch(/maintenanceWindow:0/);
      expect(message).toMatch(/MW-WO-1/);
    }
  });
});

// ─── Scenario 6: Maintenance Work Order vs Maintenance Work Order ────────────
describe("Scenario 6: Maintenance Work Order vs Maintenance Work Order", () => {
  const workOrders: WorkOrderDoc[] = [
    {
      docId: "MWO-A",
      docType: "workOrder",
      data: {
        workOrderNumber: "MWO-A",
        manufacturingOrderId: "MO1",
        workCenterId: "FX240",
        startDate: "2026-03-05T10:00:00Z",
        endDate: "2026-03-05T12:00:00Z",
        durationMinutes: 120,
        isMaintenance: true,
        dependsOnWorkOrderIds: [],
      },
    },
    {
      docId: "MWO-B",
      docType: "workOrder",
      data: {
        workOrderNumber: "MWO-B",
        manufacturingOrderId: "MO1",
        workCenterId: "FX240",
        startDate: "2026-03-05T11:30:00Z",
        endDate: "2026-03-05T13:00:00Z",
        durationMinutes: 90,
        isMaintenance: true,
        dependsOnWorkOrderIds: [],
      },
    },
  ];

  it("should throw with details on WO vs WO maintenance overlap", () => {
    try {
      service.reflow({ workOrders, workCenters });
      throw new Error("Expected overlap error");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toMatch(/Overlapping maintenance blocks/);
      expect(message).toMatch(/FX240/);
      expect(message).toMatch(/MWO-A/);
      expect(message).toMatch(/MWO-B/);
    }
  });
});

import {
  ManufacturingOrderDoc,
  WorkCenterDoc,
  WorkOrderDoc,
} from "../reflow/types";

export const workCenters: WorkCenterDoc[] = [
  {
    docId: "TX320",
    docType: "workCenter",
    data: {
      name: "TX320",
      shifts: [
        { dayOfWeek: 1, startHour: 8, endHour: 17 },
        { dayOfWeek: 2, startHour: 8, endHour: 17 },
        { dayOfWeek: 3, startHour: 8, endHour: 17 },
        { dayOfWeek: 4, startHour: 8, endHour: 17 },
        { dayOfWeek: 5, startHour: 8, endHour: 17 },
      ],
      maintenanceWindows: [
        {
          startDate: "2026-03-04T12:00:00Z",
          endDate: "2026-03-04T14:00:00Z",
          reason: "maintenance",
        },
      ],
    },
  },
  {
    docId: "FX240",
    docType: "workCenter",
    data: {
      name: "FX240",
      shifts: [
        { dayOfWeek: 1, startHour: 7, endHour: 16 },
        { dayOfWeek: 2, startHour: 7, endHour: 16 },
        { dayOfWeek: 3, startHour: 7, endHour: 16 },
        { dayOfWeek: 4, startHour: 7, endHour: 16 },
        { dayOfWeek: 5, startHour: 7, endHour: 16 },
      ],
      maintenanceWindows: [],
    },
  },
  {
    docId: "PZ510",
    docType: "workCenter",
    data: {
      name: "PZ510",
      shifts: [
        { dayOfWeek: 1, startHour: 9, endHour: 18 },
        { dayOfWeek: 2, startHour: 9, endHour: 18 },
        { dayOfWeek: 3, startHour: 9, endHour: 18 },
        { dayOfWeek: 4, startHour: 9, endHour: 18 },
        { dayOfWeek: 5, startHour: 9, endHour: 18 },
      ],
      maintenanceWindows: [
        {
          startDate: "2026-03-05T10:00:00Z",
          endDate: "2026-03-05T11:30:00Z",
        },
      ],
    },
  },
  {
    docId: "KX100",
    docType: "workCenter",
    data: {
      name: "KX100",
      shifts: [
        { dayOfWeek: 1, startHour: 6, endHour: 14 },
        { dayOfWeek: 2, startHour: 6, endHour: 14 },
        { dayOfWeek: 3, startHour: 6, endHour: 14 },
        { dayOfWeek: 4, startHour: 6, endHour: 14 },
        { dayOfWeek: 5, startHour: 6, endHour: 14 },
      ],
      maintenanceWindows: [
        {
          startDate: "2026-03-06T06:00:00Z",
          endDate: "2026-03-06T07:00:00Z",
          reason: "weekly inspection",
        },
      ],
    },
  },
  {
    docId: "MZ750",
    docType: "workCenter",
    data: {
      name: "MZ750",
      shifts: [
        { dayOfWeek: 1, startHour: 10, endHour: 19 },
        { dayOfWeek: 2, startHour: 10, endHour: 19 },
        { dayOfWeek: 3, startHour: 10, endHour: 19 },
        { dayOfWeek: 4, startHour: 10, endHour: 19 },
        { dayOfWeek: 5, startHour: 10, endHour: 19 },
      ],
      maintenanceWindows: [],
    },
  },
  {
    docId: "RQ430",
    docType: "workCenter",
    data: {
      name: "RQ430",
      shifts: [
        { dayOfWeek: 1, startHour: 8, endHour: 16 },
        { dayOfWeek: 2, startHour: 8, endHour: 16 },
        { dayOfWeek: 3, startHour: 8, endHour: 16 },
        { dayOfWeek: 4, startHour: 8, endHour: 16 },
        { dayOfWeek: 5, startHour: 8, endHour: 16 },
        { dayOfWeek: 6, startHour: 9, endHour: 13 }, // Saturday half day
      ],
      maintenanceWindows: [
        {
          startDate: "2026-03-07T14:00:00Z",
          endDate: "2026-03-07T16:00:00Z",
          reason: "equipment calibration",
        },
      ],
    },
  },
];

export const manufacturingOrders: ManufacturingOrderDoc[] = [
  {
    docId: "MO1",
    docType: "manufacturingOrder",
    data: {
      manufacturingOrderNumber: "MO-1001",
      itemId: "BICYCLE",
      quantity: 100,
      dueDate: "2026-03-20",
    },
  },
  {
    docId: "MO2",
    docType: "manufacturingOrder",
    data: {
      manufacturingOrderNumber: "MO-1002",
      itemId: "SCOOTER",
      quantity: 80,
      dueDate: "2026-03-22",
    },
  },
];

export const workOrders: WorkOrderDoc[] = [
  {
    docId: "WO1",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO1",
      manufacturingOrderId: "MO1",
      workCenterId: "FX240",
      startDate: "2026-03-03T08:00:00Z",
      endDate: "2026-03-03T10:00:00Z",
      durationMinutes: 60,
      isMaintenance: false,
      dependsOnWorkOrderIds: [],
    },
  },
  {
    docId: "WO2",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO2",
      manufacturingOrderId: "MO1",
      workCenterId: "TX320",
      startDate: "2026-03-03T08:30:00Z",
      endDate: "2026-03-03T10:00:00Z",
      durationMinutes: 90,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO1"],
    },
  },
  {
    docId: "WO3",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO3",
      manufacturingOrderId: "MO1",
      workCenterId: "PZ510",
      startDate: "2026-03-03T09:00:00Z",
      endDate: "2026-03-03T10:30:00Z",
      durationMinutes: 90,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO2"],
    },
  },
  {
    docId: "WO4",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO4",
      manufacturingOrderId: "MO1",
      workCenterId: "FX240",
      startDate: "2026-03-03T10:00:00Z",
      endDate: "2026-03-03T11:00:00Z",
      durationMinutes: 60,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO1"],
    },
  },
  {
    docId: "WO5",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO5",
      manufacturingOrderId: "MO1",
      workCenterId: "TX320",
      startDate: "2026-03-03T10:30:00Z",
      endDate: "2026-03-03T11:30:00Z",
      durationMinutes: 60,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO4"],
    },
  },
  {
    docId: "WO6",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO6",
      manufacturingOrderId: "MO1",
      workCenterId: "PZ510",
      startDate: "2026-03-03T11:00:00Z",
      endDate: "2026-03-03T12:30:00Z",
      durationMinutes: 90,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO3", "WO5"],
    },
  },
  {
    docId: "WO7",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO7",
      manufacturingOrderId: "MO1",
      workCenterId: "FX240",
      startDate: "2026-03-03T11:30:00Z",
      endDate: "2026-03-03T12:30:00Z",
      durationMinutes: 60,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO2"],
    },
  },
  {
    docId: "WO8",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO8",
      manufacturingOrderId: "MO1",
      workCenterId: "TX320",
      startDate: "2026-03-03T12:00:00Z",
      endDate: "2026-03-03T13:30:00Z",
      durationMinutes: 90,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO7"],
    },
  },
  {
    docId: "WO9",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO9",
      manufacturingOrderId: "MO1",
      workCenterId: "PZ510",
      startDate: "2026-03-03T12:30:00Z",
      endDate: "2026-03-03T14:00:00Z",
      durationMinutes: 90,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO8"],
    },
  },
  {
    docId: "WO10",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO10",
      manufacturingOrderId: "MO1",
      workCenterId: "FX240",
      startDate: "2026-03-03T13:00:00Z",
      endDate: "2026-03-03T14:00:00Z",
      durationMinutes: 60,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO6"],
    },
  },
  {
    docId: "WO11",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO11",
      manufacturingOrderId: "MO1",
      workCenterId: "TX320",
      startDate: "2026-03-03T13:30:00Z",
      endDate: "2026-03-03T15:00:00Z",
      durationMinutes: 90,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO10"],
    },
  },
  {
    docId: "WO12",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO12",
      manufacturingOrderId: "MO1",
      workCenterId: "PZ510",
      startDate: "2026-03-03T14:00:00Z",
      endDate: "2026-03-03T15:30:00Z",
      durationMinutes: 90,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO11"],
    },
  },
  {
    docId: "WO13",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO13",
      manufacturingOrderId: "MO1",
      workCenterId: "FX240",
      startDate: "2026-03-03T14:30:00Z",
      endDate: "2026-03-03T15:30:00Z",
      durationMinutes: 60,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO9"],
    },
  },
  {
    docId: "WO14",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO14",
      manufacturingOrderId: "MO1",
      workCenterId: "TX320",
      startDate: "2026-03-03T15:00:00Z",
      endDate: "2026-03-03T16:00:00Z",
      durationMinutes: 60,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO13"],
    },
  },
  {
    docId: "WO15",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO15",
      manufacturingOrderId: "MO1",
      workCenterId: "PZ510",
      startDate: "2026-03-03T15:30:00Z",
      endDate: "2026-03-03T16:30:00Z",
      durationMinutes: 60,
      isMaintenance: false,
      dependsOnWorkOrderIds: ["WO14"],
    },
  },
];

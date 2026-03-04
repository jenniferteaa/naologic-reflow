export type Doc<T extends string, D> = {
  docId: string;
  docType: T;
  data: D;
};

export type WorkOrderDoc = Doc<
  "workOrder",
  {
    workOrderNumber: string;
    manufacturingOrderId: string;
    workCenterId: string;

    startDate: string;
    endDate: string;
    durationMinutes: number;

    isMaintenance: boolean;
    dependsOnWorkOrderIds: string[];
  }
>;

export type WorkCenterDoc = Doc<
  "workCenter",
  {
    name: string;
    shifts: Array<{ dayOfWeek: number; startHour: number; endHour: number }>;
    maintenanceWindows: Array<{
      startDate: string;
      endDate: string;
      reason?: string;
    }>;
  }
>;

export type ManufacturingOrderDoc = Doc<
  "manufacturingOrder",
  {
    manufacturingOrderNumber: string;
    itemId: string;
    quantity: number;
    dueDate: string;
  }
>;

export type ReflowInput = {
  workOrders: WorkOrderDoc[];
  workCenters: WorkCenterDoc[];
  manufacturingOrders?: ManufacturingOrderDoc[];
};

export type WorkOrderChange = {
  workOrderId: string;
  oldStartDate: string;
  oldEndDate: string;
  newStartDate: string;
  newEndDate: string;
  reason: string;
};

export type ReflowResult = {
  updatedWorkOrders: WorkOrderDoc[];
  changes: WorkOrderChange[];
  explanation: string;
};

import { WorkCenterDoc, WorkOrderDoc } from "./types";

// checking if a defined work center in the work order exisits
export const assertWorkCentersExist = (
  workOrders: WorkOrderDoc[],
  workCenters: WorkCenterDoc[],
) => {
  const centerIds = new Set(workCenters.map((center) => center.docId));
  for (const order of workOrders) {
    if (!centerIds.has(order.data.workCenterId)) {
      throw new Error(`Missing work center ${order.data.workCenterId}`);
    }
  }
};

// function used to construct the adjacency list, builds children and inDegree
// then uses the adjacency list to produce the topological sort.
export const topoSortWorkOrders = (
  workOrders: WorkOrderDoc[],
  orderSort?: (a: string, b: string) => number,
) => {
  const workOrderById = new Map<string, WorkOrderDoc>();
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const order of workOrders) {
    workOrderById.set(order.docId, order);
    inDegree.set(order.docId, 0);
  }

  for (const order of workOrders) {
    const deps = order.data.dependsOnWorkOrderIds ?? [];
    for (const depId of deps) {
      if (!workOrderById.has(depId)) {
        throw new Error(`Missing dependency work order ${depId}`);
      }
      const list = children.get(depId);
      if (list) list.push(order.docId);
      else children.set(depId, [order.docId]);
      inDegree.set(order.docId, (inDegree.get(order.docId) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(id);
  }
  if (orderSort) queue.sort(orderSort);

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    const kids = children.get(id);
    if (!kids) continue;
    for (const child of kids) {
      inDegree.set(child, (inDegree.get(child) ?? 0) - 1);
      if (inDegree.get(child) === 0) {
        queue.push(child);
        if (orderSort) queue.sort(orderSort);
      }
    }
  }

  if (topoOrder.length !== workOrders.length) {
    throw new Error("Circular dependency detected in work orders.");
  }

  return topoOrder;
};

export const assertMaintenanceTiming = (
  workOrderId: string,
  fixedStartMs: number,
  depsEndMs: number,
) => {
  if (depsEndMs > fixedStartMs) {
    throw new Error(
      `Maintenance work order ${workOrderId} violates dependency timing`,
    );
  }
};

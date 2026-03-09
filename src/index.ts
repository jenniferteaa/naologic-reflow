//import largeWorkOrders from "./data/large-work-orders-fixed.json";
import {
  manufacturingOrders,
  workCenters,
  workOrders,
} from "./data/sample-data";
import { ReflowService } from "./reflow/reflow.service";
import { WorkOrderDoc } from "./reflow/types";

const service = new ReflowService();

const runScenario = (label: string, workOrdersInput: WorkOrderDoc[]) => {
  console.log(`=== ${label} ===`);
  try {
    const result = service.reflow({
      workOrders: workOrdersInput,
      workCenters,
      manufacturingOrders,
    });
    console.log(`Work orders processed: ${result.updatedWorkOrders.length}`);
    console.log(`Changes made: ${result.changes.length}`);
    //console.log(result.updatedWorkOrders);
    console.log(result.changes);
    console.log(result.explanation);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Scenario failed: ${message}`);
  }
};

runScenario("Scenario 1: Small Dataset", workOrders);
console.log("");
//runScenario("Scenario 2: Large Dataset", largeWorkOrders as WorkOrderDoc[]);

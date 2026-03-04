import { ReflowService } from "./reflow/reflow.service";

const service = new ReflowService();

const result = service.reflow({
  workOrders: [],
  workCenters: [],
  manufacturingOrders: [],
});

console.log(JSON.stringify(result, null, 2));

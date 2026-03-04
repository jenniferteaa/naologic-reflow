import { ReflowInput, ReflowResult } from "./types";

export class ReflowService {
  reflow(input: ReflowInput): ReflowResult {
    // TODO: implement topo sort + scheduling + shift/maintenance handling
    return {
      updatedWorkOrders: input.workOrders,
      changes: [],
      explanation: "Stub: reflow not implemented yet.",
    };
  }
}

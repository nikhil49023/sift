import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { STAGES } from "@sift/contracts";

export type AuditStage = (typeof STAGES)[number];
const State = Annotation.Root({
  auditId: Annotation<string>(),
  orgId: Annotation<string>(),
  proceed: Annotation<boolean>(),
});

export async function runAuditGraph(
  auditId: string,
  orgId: string,
  runStage: (stage: AuditStage) => Promise<boolean>,
) {
  // PostgreSQL owns evidence and stage checkpoints. The graph carries IDs only,
  // so retries do not retain another copy of source files in a free server heap.
  const execute = (stage: AuditStage) => async () => ({ proceed: await runStage(stage) });
  const graph = new StateGraph(State)
    .addNode("scout", execute("scout"))
    .addNode("forensics", execute("forensics"))
    .addNode("judge", execute("judge"))
    .addNode("synthesizer", execute("synthesizer"));
  graph.addEdge(START, STAGES[0]);
  for (const [index, stage] of STAGES.entries()) {
    const next = STAGES[index + 1] ?? END;
    graph.addConditionalEdges(stage, state => state.proceed ? next : END, [next, END]);
  }
  // The worker owns bounded provider retries. LangGraph must not multiply them.
  return graph.compile().invoke({ auditId, orgId, proceed: true }, {
    recursionLimit: STAGES.length + 2,
    runName: "SIFT audit",
  });
}

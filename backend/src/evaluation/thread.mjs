import { parentPort, workerData } from "node:worker_threads";
try {
  const { operation, body } = workerData;
  const result =
    operation === "web"
      ? await (
          await import("./web.mjs")
        ).evaluateWeb(body.files, body.cases, body.runOnly)
      : await (
          await import("./projects.mjs")
        ).compileProject(body.tech, body.files);
  parentPort.postMessage({ result });
} catch (error) {
  parentPort.postMessage({
    error: String(
      error?.message || "No se pudo completar la comprobación.",
    ).slice(0, 2000),
    status: error?.status,
  });
}

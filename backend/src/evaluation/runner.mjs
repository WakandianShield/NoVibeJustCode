import { Worker } from "node:worker_threads";
import { AppError, assert, cleanFiles } from "../domain.mjs";
let active = 0;
function run(operation, body) {
  assert(
    active < 2,
    429,
    "Hay otras prácticas evaluándose. Inténtalo en unos segundos.",
  );
  active++;
  return new Promise((resolve, reject) => {
    let task;
    try {
      task = new Worker(new URL("./thread.mjs", import.meta.url), {
        workerData: { operation, body },
        execArgv: [],
        resourceLimits: {
          maxOldGenerationSizeMb: 192,
          maxYoungGenerationSizeMb: 32,
        },
      });
    } catch (error) {
      active--;
      reject(error);
      return;
    }
    let settled = false;
    const done = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      task.terminate().finally(() => {
        active--;
        error ? reject(error) : resolve(result);
      });
    };
    const timer = setTimeout(
      () =>
        done(
          null,
          operation === "web"
            ? {
                estado: "con errores",
                aprobados: 0,
                total: body.cases.length,
                detalle:
                  "La práctica excedió el tiempo o la memoria permitidos.",
              }
            : {
                valido: false,
                detalle:
                  "El análisis excedió el tiempo o la memoria permitidos.",
              },
        ),
      operation === "web" ? 15000 : 50000,
    );
    task.once("message", (message) => {
      if (message.error) {
        if (message.status === 503) done(new AppError(503, message.error));
        else
          done(
            null,
            operation === "web"
              ? {
                  estado: "con errores",
                  aprobados: 0,
                  total: body.cases.length,
                  detalle: message.error,
                }
              : { valido: false, detalle: message.error },
          );
      } else done(null, message.result);
    });
    task.once("error", () =>
      done(
        null,
        operation === "web"
          ? {
              estado: "con errores",
              aprobados: 0,
              total: body.cases.length,
              detalle: "El código excedió los límites del evaluador.",
            }
          : {
              valido: false,
              detalle: "El proyecto excedió los límites del analizador.",
            },
      ),
    );
    task.once("exit", () => {
      if (!settled)
        done(
          new AppError(
            503,
            "No se pudo terminar la comprobación. Puedes reintentar.",
          ),
        );
    });
  });
}
export function evaluateWebLocally(files, cases, runOnly = false) {
  files = cleanFiles(files);
  assert(
    Array.isArray(cases) && cases.length <= 30,
    422,
    "Criterios de práctica inválidos.",
  );
  return run("web", { files, cases, runOnly });
}
export function compileProjectLocally(tech, files) {
  return run("compile", { tech, files: cleanFiles(files) });
}

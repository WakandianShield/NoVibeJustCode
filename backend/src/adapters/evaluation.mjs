import { assert } from "../domain.mjs";
import { executeConsole } from "../evaluation/console.mjs";
import { evaluateWebLocally } from "../evaluation/runner.mjs";
export async function evaluate(
  tech,
  mode,
  files,
  cases,
  runOnly = false,
  stdin = "",
) {
  if (mode === "web") return evaluateWebLocally(files, cases, runOnly);
  assert(cases.length > 0, 422, "La práctica no tiene casos configurados.");
  let approved = 0;
  const feedback = [];
  for (const c of cases) {
    const r = await executeConsole(tech, files, c, runOnly, stdin);
    if (r.ok) approved++;
    feedback.push(
      c.es_publico
        ? r.detalle
        : r.ok
          ? "Caso privado aprobado."
          : "Caso privado no superado.",
    );
  }
  return {
    estado: runOnly
      ? "ejecutado"
      : approved === cases.length
        ? "aprobado"
        : "con errores",
    aprobados: approved,
    total: cases.length,
    detalle: feedback.join("\n").slice(0, 8000),
  };
}

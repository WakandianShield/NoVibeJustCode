import { config } from "../config/index.js";
import { assert, AppError } from "../domain.mjs";
export async function worker(path, body) {
  assert(
    config.workerSecret,
    503,
    "Configura el servicio aislado de evaluación.",
  );
  try {
    const r = await fetch(config.workerUrl + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Key": config.workerSecret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) throw new Error("worker");
    return await r.json();
  } catch {
    throw new AppError(
      503,
      "No se pudo completar la validación. Tu trabajo sigue guardado.",
    );
  }
}
function checkExecutorResponse(response) {
  assert(![401, 403].includes(response.status), 503,
    "El servicio de ejecución no tiene acceso autorizado. Contacta con soporte.");
  assert(response.status !== 429, 503,
    "El servicio de ejecución alcanzó su límite de uso. Inténtalo más tarde.");
  assert(response.ok, 503, "El ejecutor no está disponible.");
}
async function executeConsole(tecnologia, files, c, runOnly, stdin) {
  const base = process.env.ONLINECOMPILER_API_URL || "https://api.onlinecompiler.io";
  const key = process.env.ONLINECOMPILER_API_KEY;
  assert(key, 503, "El servicio de ejecución aún no está configurado.");
  const compilers = {
    Python: process.env.ONLINECOMPILER_PYTHON_COMPILER || "python-3.14",
    "Node.js": process.env.ONLINECOMPILER_NODE_COMPILER || "nodejs-24",
    JavaScript: process.env.ONLINECOMPILER_NODE_COMPILER || "nodejs-24",
    TypeScript: process.env.ONLINECOMPILER_TYPESCRIPT_COMPILER || "typescript-deno",
  };
  assert(compilers[tecnologia], 422, "Lenguaje de ejecución no compatible.");
  let source = Object.entries(files)
    .filter(([n]) => /\.(py|js|ts|mjs)$/.test(n))
    .map(([, s]) => s)
    .join("\n");
  if (tecnologia === "TypeScript") {
    // Deno's TypeScript runtime needs Node compatibility for course templates.
    source =
      'import { createRequire as __nvjcCreateRequire } from "node:module";\n' +
      'var require = __nvjcCreateRequire(import.meta.url);\n' + source;
  }
  // Student programs run only in OnlineCompiler's isolated service.
  let response;
  try {
    response = await fetch(base.replace(/\/$/, "") + "/api/run-code-sync/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: key },
      body: JSON.stringify({
        compiler: compilers[tecnologia],
        code: source,
        input: String(runOnly ? stdin : (c.entrada ?? "")),
        time_limit: 2,
        memory_limit: 128,
      }),
      signal: AbortSignal.timeout(40000),
    });
  } catch {
    throw new AppError(503, "No se pudo contactar con el servicio de ejecución. Inténtalo más tarde.");
  }
  checkExecutorResponse(response);
  let result;
  try { result = await response.json(); } catch {
    throw new AppError(503, "Respuesta inválida del ejecutor.");
  }
  assert(result && ["success", "error"].includes(result.status) &&
    Number.isInteger(result.exit_code) && typeof result.output === "string",
    503, "Respuesta inválida del ejecutor.");
  const completed = result.status === "success" && result.exit_code === 0 && !result.truncated;
  const fallback = result.exit_code === 124 ? "Tiempo límite de ejecución excedido." :
    result.exit_code === 137 ? "Límite de memoria excedido." :
    result.truncated ? "La salida excede el límite permitido." :
    completed ? "Ejecución completada." : "El programa terminó con errores.";
  return {
    ok: completed && (runOnly || result.output.trim() === String(c.salida_esperada ?? "").trim()),
    detalle: result.error || (completed ? result.output : "") || fallback,
  };
}
export async function evaluate(
  tech,
  mode,
  files,
  cases,
  runOnly = false,
  stdin = "",
) {
  if (mode === "web")
    return worker("/evaluate-web", {
      archivos: files,
      casos: cases,
      solo_ejecutar: runOnly,
    });
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

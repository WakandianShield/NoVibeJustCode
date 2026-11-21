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
const encode = (s) => Buffer.from(s).toString("base64");
const decode = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");
async function judge(tecnologia, files, c, runOnly, stdin) {
  const url = process.env.JUDGE0_URL;
  assert(url, 503, "Configura Judge0 para ejecutar prácticas de consola.");
  const headers = { "Content-Type": "application/json" };
  if (process.env.JUDGE0_KEY)
    headers[process.env.JUDGE0_AUTH_HEADER || "X-RapidAPI-Key"] =
      process.env.JUDGE0_KEY;
  if (process.env.JUDGE0_HOST)
    headers["X-RapidAPI-Host"] = process.env.JUDGE0_HOST;
  let source = Object.entries(files)
    .filter(([n]) => /\.(py|js|ts|mjs)$/.test(n))
    .map(([, s]) => s)
    .join("\n");
  if (tecnologia === "TypeScript") {
    const r = await worker("/transpile", { archivos: files });
    if (!r.valido) return { ok: false, detalle: r.detalle };
    source = r.codigo;
  }
  // El código de la práctica se ejecuta únicamente en Judge0, nunca en el API.
  const body = {
    source_code: encode(source),
    language_id: Number(
      tecnologia === "Python"
        ? process.env.JUDGE0_PYTHON_ID || 71
        : process.env.JUDGE0_NODE_ID || 63,
    ),
    stdin: encode(runOnly ? String(stdin) : c.entrada),
    cpu_time_limit: 2,
    memory_limit: 131072,
    wall_time_limit: 5,
    enable_network: false,
  };
  const r = await fetch(
    url.replace(/\/$/, "") + "/submissions?base64_encoded=true&wait=false",
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    },
  );
  assert(r.ok, 503, "El ejecutor no está disponible.");
  const { token } = await r.json();
  assert(typeof token === "string", 503, "Respuesta inválida del ejecutor.");
  for (let n = 0; n < 30; n++) {
    await new Promise((r) => setTimeout(r, 300));
    const r = await fetch(
      url.replace(/\/$/, "") +
        "/submissions/" +
        encodeURIComponent(token) +
        "?base64_encoded=true",
      { headers, signal: AbortSignal.timeout(5000) },
    );
    assert(r.ok, 503, "No fue posible consultar la ejecución.");
    const x = await r.json();
    if (x.status?.id > 2) {
      const out = decode(x.stdout),
        errors = decode(x.compile_output) || decode(x.stderr);
      return {
        ok:
          x.status.id === 3 &&
          (runOnly || out.trim() === c.salida_esperada.trim()),
        detalle: errors || out || x.status.description,
      };
    }
  }
  throw new AppError(503, "La ejecución sigue pendiente. Vuelve a intentarlo.");
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
    const r = await judge(tech, files, c, runOnly, stdin);
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

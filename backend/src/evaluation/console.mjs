import { assert, AppError } from "../domain.mjs";
export function prepareConsoleSource(technology, files) {
  const source = Object.entries(files)
    .filter(([name]) => /\.(py|js|ts|mjs)$/.test(name))
    .map(([, text]) => text)
    .join("\n");
  if (
    technology === "Python" &&
    /^\s*(?:async\s+)?def resolver\s*\(/m.test(source) &&
    !/json\.dumps\(resolver\(datos\)/.test(source)
  ) {
    return (
      source +
      "\n\nimport json as __nvjc_json\nimport sys as __nvjc_sys\n" +
      "__nvjc_input = __nvjc_json.loads(__nvjc_sys.stdin.read())\n" +
      'print(__nvjc_json.dumps(resolver(__nvjc_input), ensure_ascii=False, separators=(",", ":")))\n'
    );
  }
  if (
    ["Node.js", "JavaScript", "TypeScript"].includes(technology) &&
    /\b(?:function\s+resolver\s*\(|(?:const|let)\s+resolver\s*=)/.test(
      source,
    ) &&
    !/JSON\.stringify\(resolver\(datos\)/.test(source)
  ) {
    return (
      source +
      '\n\nconst __nvjc_input = JSON.parse(require("fs").readFileSync(0, "utf8"));\n' +
      "console.log(JSON.stringify(resolver(__nvjc_input)));\n"
    );
  }
  // Existing full-program drafts keep working; new templates expose just resolver.
  return source;
}
function checkExecutorResponse(response) {
  assert(
    ![401, 403].includes(response.status),
    503,
    "El servicio de ejecución no tiene acceso autorizado. Contacta con soporte.",
  );
  assert(
    response.status !== 429,
    503,
    "El servicio de ejecución alcanzó su límite de uso. Inténtalo más tarde.",
  );
  assert(response.ok, 503, "El ejecutor no está disponible.");
}
export async function executeConsole(tecnologia, files, c, runOnly, stdin) {
  const base =
    process.env.ONLINECOMPILER_API_URL || "https://api.onlinecompiler.io";
  const key = process.env.ONLINECOMPILER_API_KEY;
  assert(key, 503, "El servicio de ejecución aún no está configurado.");
  const compilers = {
    Python: process.env.ONLINECOMPILER_PYTHON_COMPILER || "python-3.14",
    "Node.js": process.env.ONLINECOMPILER_NODE_COMPILER || "nodejs-24",
    JavaScript: process.env.ONLINECOMPILER_NODE_COMPILER || "nodejs-24",
    TypeScript:
      process.env.ONLINECOMPILER_TYPESCRIPT_COMPILER || "typescript-deno",
  };
  assert(compilers[tecnologia], 422, "Lenguaje de ejecución no compatible.");
  let source = prepareConsoleSource(tecnologia, files);
  if (tecnologia === "TypeScript") {
    // Deno's TypeScript runtime needs Node compatibility for course templates.
    source =
      'import { createRequire as __nvjcCreateRequire } from "node:module";\n' +
      "var require = __nvjcCreateRequire(import.meta.url);\n" +
      source;
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
    throw new AppError(
      503,
      "No se pudo contactar con el servicio de ejecución. Inténtalo más tarde.",
    );
  }
  checkExecutorResponse(response);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new AppError(503, "Respuesta inválida del ejecutor.");
  }
  assert(
    result &&
      ["success", "error"].includes(result.status) &&
      Number.isInteger(result.exit_code) &&
      typeof result.output === "string",
    503,
    "Respuesta inválida del ejecutor.",
  );
  const completed =
    result.status === "success" && result.exit_code === 0 && !result.truncated;
  const fallback =
    result.exit_code === 124
      ? "Tiempo límite de ejecución excedido."
      : result.exit_code === 137
        ? "Límite de memoria excedido."
        : result.truncated
          ? "La salida excede el límite permitido."
          : completed
            ? "Ejecución completada."
            : "El programa terminó con errores.";
  return {
    ok:
      completed &&
      (runOnly ||
        result.output.trim() === String(c.salida_esperada ?? "").trim()),
    detalle: result.error || (completed ? result.output : "") || fallback,
  };
}

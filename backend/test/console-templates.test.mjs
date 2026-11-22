import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { prepareConsoleSource } from "../src/evaluation/console.mjs";
import { evaluate } from "../src/adapters/evaluation.mjs";
import { parse } from "acorn";
import ts from "typescript";
test("las 40 plantillas están formateadas y las 24 de consola ocultan la lectura y serialización", async () => {
  const catalog = JSON.parse(
    await readFile(
      new URL("../../database/curriculum.json", import.meta.url),
      "utf8",
    ),
  );
  let count = 0,
    consoleCount = 0;
  for (const c of catalog)
    for (const s of c.secciones) {
      const e = s.ejercicio;
      if (!e) continue;
      count++;
      for (const [name, text] of Object.entries(e.plantilla)) {
        assert.ok(text.endsWith("\n"), name);
        assert.doesNotMatch(
          text,
          /readFileSync|sys\.stdin|__name__|JSON\.stringify|declare function require/,
        );
        if (name === "index.html") assert.ok(text.split("\n").length > 10);
        if (name.endsWith(".js")) parse(text, { ecmaVersion: "latest" });
        if (name.endsWith(".ts"))
          assert.equal(
            ts.transpileModule(text, { reportDiagnostics: true }).diagnostics
              .length,
            0,
          );
        if (name.endsWith(".py")) {
          const result = spawnSync(
            "python3",
            ["-I", "-c", "import ast,sys;ast.parse(sys.stdin.read())"],
            { input: text, encoding: "utf8" },
          );
          assert.equal(result.status, 0, result.stderr);
        }
      }
      if (e.modo_evaluacion !== "web") consoleCount++;
    }
  assert.equal(count, 40);
  assert.equal(consoleCount, 24);
});
test("la función mínima de Python recibe datos y devuelve JSON mediante el adaptador interno", () => {
  const source = prepareConsoleSource("Python", {
    "main.py": 'def resolver(datos):\n    return "Hola, " + datos["nombre"]\n',
  });
  const r = spawnSync("python3", ["-I", "-c", source], {
    input: '{"nombre":"Carlos"}',
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '"Hola, Carlos"');
});
test("las funciones mínimas Node y TypeScript incluyen el adaptador solo al enviarse al proveedor", async (t) => {
  const old = process.env.ONLINECOMPILER_API_KEY;
  process.env.ONLINECOMPILER_API_KEY = "test-key";
  t.after(() =>
    old === undefined
      ? delete process.env.ONLINECOMPILER_API_KEY
      : (process.env.ONLINECOMPILER_API_KEY = old),
  );
  for (const [tech, files] of [
    [
      "Node.js",
      { "main.js": "function resolver(datos) { return datos.a + datos.b; }" },
    ],
    [
      "TypeScript",
      {
        "main.ts":
          "function resolver(datos: {a:number;b:number}) { return datos.a + datos.b; }",
      },
    ],
  ]) {
    const spy = t.mock.method(globalThis, "fetch", async (url, options) => {
      const body = JSON.parse(options.body);
      assert.match(body.code, /__nvjc_input/);
      assert.match(body.code, /readFileSync/);
      assert.equal(body.input, '{"a":2,"b":3}');
      return Response.json({
        status: "success",
        exit_code: 0,
        output: "5",
        error: "",
        truncated: false,
      });
    });
    assert.equal(
      (
        await evaluate(tech, "consola", files, [
          { entrada: '{"a":2,"b":3}', salida_esperada: "5", es_publico: true },
        ])
      ).estado,
      "aprobado",
    );
    spy.mock.restore();
  }
});
test("los borradores completos anteriores no reciben un segundo adaptador", () => {
  const py =
    "def resolver(datos):\n    return datos\nimport json, sys\ndatos=json.loads(sys.stdin.read())\nprint(json.dumps(resolver(datos)))";
  const js =
    'function resolver(datos) {return datos;}\nconst fs=require("fs");const datos=JSON.parse(fs.readFileSync(0,"utf8"));console.log(JSON.stringify(resolver(datos)));';
  assert.equal(prepareConsoleSource("Python", { "main.py": py }), py);
  assert.equal(prepareConsoleSource("Node.js", { "main.js": js }), js);
});

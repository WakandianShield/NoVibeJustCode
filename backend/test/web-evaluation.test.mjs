import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluate } from "../src/adapters/evaluation.mjs";
import { compileProjectLocally } from "../src/evaluation/runner.mjs";
const check = (
  entrada,
  salida_esperada,
  tipo_criterio = "texto",
  es_publico = true,
) => ({
  entrada: JSON.stringify(entrada),
  salida_esperada,
  tipo_criterio,
  es_publico,
});
test("califica las 16 prácticas web y rechaza sus plantillas sin completar, sin HTTP", async (t) => {
  t.mock.method(globalThis, "fetch", () => {
    throw Error("No debe llamar a un servicio.");
  });
  const catalog = JSON.parse(
    await readFile(
      new URL("../../database/curriculum.json", import.meta.url),
      "utf8",
    ),
  );
  let count = 0;
  for (const course of catalog)
    for (const section of course.secciones) {
      const e = section.ejercicio;
      if (e?.modo_evaluacion !== "web") continue;
      const good = await evaluate(
        course.tecnologia,
        "web",
        e.solucion_referencia,
        e.casos,
      );
      assert.equal(good.estado, "aprobado", `${section.id}: ${good.detalle}`);
      const bad = await evaluate(
        course.tecnologia,
        "web",
        e.plantilla,
        e.casos,
      );
      assert.equal(bad.estado, "con errores", String(section.id));
      count++;
    }
  assert.equal(count, 16);
});
test("no admite aprobar una respuesta enviada por el navegador y no revela casos privados", async () => {
  const r = await evaluate(
    "HTML y CSS",
    "web",
    { "index.html": "<h1>incorrecto</h1>" },
    [check({ selector: "h1" }, "secreto", "texto", false)],
  );
  assert.equal(r.estado, "con errores");
  assert.equal(r.detalle, "Caso privado no superado.");
  assert.doesNotMatch(r.detalle, /secreto/);
});
test("el código no accede a Node, archivos, módulos externos ni red", async () => {
  for (const script of [
    'document.body.textContent=typeof process+":"+typeof require;',
    'document.body.textContent=Function("return typeof process")();',
    'fetch("https://example.com/private").then(()=>document.body.textContent="escape").catch(()=>document.body.textContent="bloqueado");',
  ]) {
    const expected = script.startsWith("fetch")
      ? "bloqueado"
      : script.includes("Function(")
        ? "undefined"
        : "undefined:undefined";
    const r = await evaluate(
      "JavaScript",
      "web",
      {
        "index.html":
          '<html><body><script src="app.js"></script></body></html>',
        "app.js": script,
      },
      [check({ selector: "body" }, expected)],
    );
    assert.equal(r.estado, "aprobado", r.detalle);
  }
  const r = await evaluate(
    "JavaScript",
    "web",
    {
      "index.html": '<script type="module" src="app.js"></script>',
      "app.js": 'import fs from "node:fs";',
    },
    [check({ selector: "body" }, "")],
  );
  assert.equal(r.estado, "con errores");
});
test("interrumpe bucles y asignaciones excesivas y permite evaluar de nuevo", async () => {
  for (const source of [
    "while(true){}",
    'const a=[];while(true)a.push(new Array(100000).fill("x"));',
  ]) {
    const r = await evaluate(
      "JavaScript",
      "web",
      { "index.html": '<script src="app.js"></script>', "app.js": source },
      [check({ selector: "h1" }, "")],
    );
    assert.equal(r.estado, "con errores");
  }
  assert.equal(
    (
      await evaluate("HTML y CSS", "web", { "index.html": "<h1>Bien</h1>" }, [
        check({ selector: "h1" }, "Bien"),
      ])
    ).estado,
    "aprobado",
  );
});
test("aplica cascada, padding e ignora reglas móviles a 1024px", async () => {
  const files = {
    "index.html":
      '<link rel="stylesheet" href="style.css"><button class="primario" style="padding-top: 16px">Hola</button>',
    "style.css":
      ".primario{padding:8px;display:grid}@media(max-width:600px){.primario{display:block}}",
  };
  const r = await evaluate("HTML y CSS", "web", files, [
    check({ selector: ".primario", property: "padding-top" }, "16px", "estilo"),
    check({ selector: ".primario", property: "display" }, "grid", "estilo"),
  ]);
  assert.equal(r.estado, "aprobado", r.detalle);
});
test("compila proyectos web, JavaScript y TypeScript sin ejecutarlos", async () => {
  for (const [tech, files] of [
    [
      "HTML y CSS",
      {
        "index.html": "<!doctype html><html><body></body></html>",
        "style.css": "body { color: blue; }",
      },
    ],
    ["JavaScript", { "main.js": 'throw new Error("No ejecutar");' }],
    ["TypeScript", { "main.ts": "const value: number = 2;" }],
  ])
    assert.equal((await compileProjectLocally(tech, files)).valido, true, tech);
  assert.equal(
    (await compileProjectLocally("Node.js", { "main.js": "const = ;" })).valido,
    false,
  );
  assert.equal(
    (
      await compileProjectLocally("TypeScript", {
        "main.ts": 'const value: number = "error";',
      })
    ).valido,
    false,
  );
});

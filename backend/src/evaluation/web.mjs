import { readFile } from "node:fs/promises";
import { posix } from "node:path";
import { getQuickJS } from "quickjs-emscripten";
import * as css from "css-tree";
const [domSource, bootstrap] = await Promise.all([
  readFile(new URL(import.meta.resolve("linkedom/worker")), "utf8"),
  readFile(new URL("./web-dom.mjs", import.meta.url), "utf8"),
]);
const normalizeSelector = (value) => String(value || "").replace(/\\"/g, '"');
function styles(files, document) {
  const rules = [];
  const collect = (ast) =>
    ast.children?.forEach((node) => {
      if (node.type === "Atrule") {
        if (node.name.toLowerCase() === "media") {
          const query = css.generate(node.prelude);
          const min = /min-width:\s*(\d+)px/.exec(query),
            max = /max-width:\s*(\d+)px/.exec(query);
          if (
            (min && +min[1] > 1024) ||
            (max && +max[1] < 1024) ||
            /\bprint\b/.test(query)
          )
            return;
          if (node.block) collect(node.block);
        }
        return;
      }
      if (node.type !== "Rule" || !node.prelude?.children) return;
      const declarations = [];
      node.block.children.forEach((d) => {
        if (d.type === "Declaration")
          declarations.push({
            property: d.property,
            value: css.generate(d.value),
            important: d.important,
          });
      });
      node.prelude.children.forEach((selector) => {
        let specificity = 0;
        css.walk(selector, (n) => {
          if (n.type === "IdSelector") specificity += 1000000;
          else if (
            [
              "ClassSelector",
              "AttributeSelector",
              "PseudoClassSelector",
            ].includes(n.type)
          )
            specificity += 1000;
          else if (
            ["TypeSelector", "PseudoElementSelector"].includes(n.type) &&
            n.name !== "*"
          )
            specificity++;
        });
        rules.push({
          selector: css.generate(selector),
          specificity,
          declarations,
        });
      });
    });
  for (const el of document.querySelectorAll('style,link[rel="stylesheet"]')) {
    let text = el.textContent;
    if (el.localName === "link")
      text = files[localFile(el.getAttribute("href"), "index.html")] || "";
    collect(css.parse(text));
  }
  return rules;
}
function localFile(path, from = "index.html") {
  if (!path || /^[a-z]+:|^\/\//i.test(path) || path.includes("\\"))
    throw new Error("Solo se permiten archivos locales de la práctica.");
  const name = posix.normalize(
    posix.join(posix.dirname(from), path.split(/[?#]/)[0]),
  );
  if (name.startsWith("../") || posix.isAbsolute(name))
    throw new Error("Ruta de archivo inválida.");
  return name;
}
export async function evaluateWeb(files, cases, runOnly = false) {
  if (!files["index.html"]) throw new Error("Falta index.html.");
  if (!cases.length && !runOnly)
    throw new Error("La práctica no tiene criterios configurados.");
  // Parse HTML as data; none of its scripts runs in the backend's JavaScript realm.
  const { parseHTML } = await import("linkedom");
  const { document } = parseHTML(files["index.html"]);
  const rules = styles(files, document);
  const scripts = [...document.querySelectorAll("script")]
    .filter(
      (s) =>
        !s.type ||
        ["text/javascript", "application/javascript", "module"].includes(
          s.type,
        ),
    )
    .map((s, i) => {
      const path = s.getAttribute("src")
        ? localFile(s.getAttribute("src"))
        : null;
      if (path && !Object.hasOwn(files, path))
        throw new Error("Archivo JavaScript no encontrado: " + path);
      return {
        name: path || "inline-" + i + ".js",
        source: path ? files[path] : s.textContent,
        module: s.type === "module",
      };
    });
  const QuickJS = await getQuickJS();
  let approved = 0;
  const feedback = [];
  for (const test of runOnly ? [null] : cases) {
    const runtime = QuickJS.newRuntime();
    runtime.setMemoryLimit(32 * 1024 * 1024);
    runtime.setMaxStackSize(512 * 1024);
    const deadline = Date.now() + 2000;
    runtime.setInterruptHandler(() => Date.now() > deadline);
    runtime.setModuleLoader(
      (name) => {
        if (name === "nvjc:dom") return bootstrap;
        if (name === "linkedom") return domSource;
        if (!Object.hasOwn(files, name) || !name.endsWith(".js"))
          throw new Error("Módulo no disponible: " + name);
        return files[name];
      },
      (base, name) =>
        ["nvjc:dom", "linkedom"].includes(name) ? name : localFile(name, base),
    );
    const vm = runtime.newContext();
    let harness;
    const run = (source, name = "practice.js", type = "global") =>
      vm.unwrapResult(vm.evalCode(source, name, { type }));
    const call = (method, args = []) => {
      const fn = vm.getProp(harness, method),
        handles = args.map((v) => vm.newString(String(v)));
      try {
        return vm.unwrapResult(vm.callFunction(fn, vm.undefined, ...handles));
      } finally {
        fn.dispose();
        handles.forEach((h) => h.dispose());
      }
    };
    const settle = () => {
      for (let i = 0; i < 6; i++) {
        call("flush").dispose();
        const pending = runtime.executePendingJobs(100);
        if (pending.error) {
          const detail = vm.dump(pending.error);
          pending.error.dispose();
          throw new Error(detail.message || "Error asíncrono.");
        }
        if (!pending.value) break;
      }
      if (runtime.hasPendingJob())
        throw new Error("La ejecución asíncrona excedió el límite.");
    };
    try {
      run(`globalThis.Intl = { NumberFormat: class { format(n) { return String(Number(Number(n).toFixed(6))); } } }; globalThis.atob = input => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let bits = 0, value = 0, output = '';
        for (const c of input.replace(/=+$/, '')) {
          const digit = alphabet.indexOf(c); if (digit < 0) continue;
          value = (value << 6) | digit; bits += 6;
          if (bits >= 8) { bits -= 8; output += String.fromCharCode((value >> bits) & 255); }
        }
        return output;
      };`).dispose();
      run(
        `import {createDOM} from 'nvjc:dom'; globalThis.__nvjcHarness=createDOM(${JSON.stringify(files)},${JSON.stringify(rules)});`,
        "nvjc-init.js",
        "module",
      ).dispose();
      harness = vm.getProp(vm.global, "__nvjcHarness");
      run("delete globalThis.__nvjcHarness").dispose();
      for (const s of scripts)
        run(s.source, s.name, s.module ? "module" : "global").dispose();
      call("loaded").dispose();
      settle();
      if (!test) {
        feedback.push(
          "HTML, CSS y JavaScript ejecutados. Abre la pestaña Vista previa para visualizar la página.",
        );
        continue;
      }
      const input =
        typeof test.entrada === "string"
          ? JSON.parse(test.entrada)
          : test.entrada;
      if (input.fill)
        call("fill", [
          normalizeSelector(input.fill.selector),
          input.fill.value,
        ]).dispose();
      if (input.click)
        call("click", [normalizeSelector(input.click)]).dispose();
      settle();
      const value = call("read", [
        normalizeSelector(input.selector),
        test.tipo_criterio,
        input.property || "",
      ]);
      let actual;
      try {
        actual = vm.dump(value);
      } finally {
        value.dispose();
      }
      const ok = actual === String(test.salida_esperada).trim();
      if (ok) approved++;
      feedback.push(
        test.es_publico
          ? (ok ? "Criterio aprobado: " : "Revisa el elemento: ") +
              normalizeSelector(input.selector)
          : ok
            ? "Caso privado aprobado."
            : "Caso privado no superado.",
      );
    } catch (error) {
      const raw = error?.message || "Error al ejecutar la práctica.";
      const message = /interrupted/i.test(raw)
        ? "El código excedió el tiempo permitido."
        : /out of memory/i.test(raw)
          ? "El código excedió la memoria permitida."
          : raw;
      feedback.push(
        !test || test.es_publico
          ? message.slice(0, 800)
          : "Caso privado no superado.",
      );
      if (!test)
        return {
          estado: "con errores",
          aprobados: 0,
          total: 0,
          detalle: feedback.join("\n"),
        };
    } finally {
      harness?.dispose();
      vm.dispose();
      runtime.dispose();
    }
  }
  return {
    estado: runOnly
      ? "ejecutado"
      : approved === cases.length
        ? "aprobado"
        : "con errores",
    aprobados: approved,
    total: runOnly ? 0 : cases.length,
    detalle: feedback.join("\n").slice(0, 8000),
  };
}

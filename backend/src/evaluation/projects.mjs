import ts from "typescript";
import { parse as jsParse } from "acorn";
import { parse as htmlParse } from "parse5";
import { parse as cssParse } from "css-tree";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { executeConsole } from "./console.mjs";
import { cleanFiles } from "../domain.mjs";
const require = createRequire(import.meta.url);
const lib = dirname(ts.getDefaultLibFilePath({}));
const modules = resolve(
  dirname(require.resolve("typescript/package.json")),
  "..",
);
export function typescriptProgram(files) {
  const options = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    skipLibCheck: true,
    types: ["node"],
    typeRoots: [resolve(modules, "@types")],
    esModuleInterop: true,
  };
  const virtual = Object.fromEntries(
    Object.entries(files).map(([n, v]) => ["/project/" + n, v]),
  );
  const host = ts.createCompilerHost(options);
  const canRead = (name) => {
    const p = resolve(name);
    return [
      lib,
      resolve(modules, "@types"),
      resolve(modules, "undici-types"),
    ].some((base) => p === base || p.startsWith(base + "/"));
  };
  const read = host.readFile.bind(host),
    exists = host.fileExists.bind(host);
  host.readFile = (name) =>
    virtual[name] ?? (canRead(name) ? read(name) : undefined);
  host.fileExists = (name) =>
    name in virtual || (canRead(name) && exists(name));
  host.getCurrentDirectory = () => "/project";
  host.directoryExists = (name) =>
    name === modules ||
    Object.keys(virtual).some((n) => n.startsWith(name + "/")) ||
    canRead(name + "/");
  host.getSourceFile = (name, version) => {
    const text = host.readFile(name);
    return text === undefined
      ? undefined
      : ts.createSourceFile(name, text, version, true);
  };
  const names = Object.keys(virtual).filter((n) => /\.tsx?$/.test(n));
  if (!names.length) throw new Error("Faltan archivos TypeScript.");
  const program = ts.createProgram(names, options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => {
      const location =
        d.file && d.start !== undefined
          ? d.file.getLineAndCharacterOfPosition(d.start)
          : null;
      return (
        (d.file?.fileName.replace("/project/", "") || "TypeScript") +
        (location ? ":" + (location.line + 1) : "") +
        ": " +
        ts.flattenDiagnosticMessageText(d.messageText, " ")
      );
    })
    .slice(0, 30);
}
function entry(files, tech) {
  const ext = tech === "Python" ? ".py" : tech === "TypeScript" ? ".ts" : ".js";
  const candidates =
    tech === "HTML y CSS"
      ? ["index.html"]
      : [
          "main" + ext,
          "index" + ext,
          "src/main" + ext,
          "src/index" + ext,
          "app" + ext,
          "server" + ext,
        ];
  if (files["package.json"]) {
    const p = JSON.parse(files["package.json"]);
    if (typeof p.main === "string")
      candidates.unshift(p.main.replace(/^\.\//, ""));
  }
  const found = candidates.find((n) => n in files);
  if (!found) throw new Error("Falta el punto de entrada del proyecto.");
  return found;
}
async function pythonSyntax(files) {
  const sources = Object.fromEntries(
    Object.entries(files).filter(([name]) => name.endsWith(".py")),
  );
  const source =
    "import ast,json\nfiles=" +
    JSON.stringify(JSON.stringify(sources)) +
    '\nfor name,source in json.loads(files).items():\n ast.parse(source,filename=name)\nprint("Sintaxis válida.")';
  const result = await executeConsole(
    "Python",
    { "main.py": source },
    {},
    true,
    "",
  );
  return result.ok ? [] : [result.detalle];
}
export async function compileProject(tech, input) {
  const files = cleanFiles(input);
  entry(files, tech);
  let errors = [];
  if (tech === "Python") errors = await pythonSyntax(files);
  else if (tech === "TypeScript") errors = typescriptProgram(files);
  else if (["JavaScript", "Node.js"].includes(tech)) {
    for (const [name, source] of Object.entries(files))
      if (/\.(js|mjs|cjs)$/.test(name)) {
        try {
          jsParse(source, {
            ecmaVersion: "latest",
            sourceType: name.endsWith(".cjs") ? "script" : "module",
            allowHashBang: true,
          });
        } catch (e) {
          errors.push(name + ": " + e.message);
        }
      }
  } else if (tech === "HTML y CSS") {
    for (const [name, source] of Object.entries(files)) {
      if (name.endsWith(".html"))
        htmlParse(source, {
          onParseError: (e) => {
            if (e.code !== "missing-doctype") errors.push(name + ": " + e.code);
          },
        });
      if (name.endsWith(".css"))
        try {
          cssParse(source, {
            onParseError: (e) => errors.push(name + ": " + e.message),
          });
        } catch (e) {
          errors.push(name + ": " + e.message);
        }
    }
  } else throw new Error("Tecnología no admitida.");
  for (const [name, source] of Object.entries(files))
    if (name.endsWith(".json"))
      try {
        JSON.parse(source);
      } catch {
        errors.push(name + ": JSON inválido.");
      }
  return {
    valido: errors.length === 0,
    detalle: errors.length
      ? errors.join("\n").slice(0, 8000)
      : "Sintaxis y configuración válidas.",
  };
}

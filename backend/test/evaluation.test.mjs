import test from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/adapters/evaluation.mjs";

const cases = [{ entrada: "21", salida_esperada: "42", es_publico: true }];
const b64 = (s) => Buffer.from(s).toString("base64");
function setup(t, host = "api.onlinecompiler.io") {
  for (const [name, value] of Object.entries({
    JUDGE0_URL: `https://${host}/api/judge0`,
    JUDGE0_AUTH_HEADER: "X-Auth-Token",
    JUDGE0_KEY: "test-key",
    JUDGE0_HOST: "",
    JUDGE0_TYPESCRIPT_ID: "101",
  })) {
    const old = process.env[name];
    process.env[name] = value;
    t.after(() => old === undefined ? delete process.env[name] : process.env[name] = old);
  }
}

test("compatible API omits unsupported network option and preserves private-case feedback", async (t) => {
  setup(t);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.headers["X-Auth-Token"], "test-key");
    if (options.method === "POST") {
      const body = JSON.parse(options.body);
      assert.equal("enable_network" in body, false);
      assert.equal(body.cpu_time_limit, 2);
      return Response.json({ token: "example" }, { status: 201 });
    }
    return Response.json({ status: { id: 3 }, stdout: b64("42\n") });
  });
  const result = await evaluate("Python", "consola", { "main.py": "print(42)" }, [
    ...cases, { ...cases[0], es_publico: false },
  ]);
  assert.equal(result.estado, "aprobado");
  assert.equal(result.detalle, "42\n\nCaso privado aprobado.");
});

test("regular Judge0 still explicitly disables network access", async (t) => {
  setup(t, "judge.example.com");
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (options.method === "POST") {
      assert.equal(JSON.parse(options.body).enable_network, false);
      return Response.json({ token: "example" });
    }
    return Response.json({ status: { id: 3 }, stdout: b64("wrong") });
  });
  assert.equal((await evaluate("Python", "consola", { "main.py": "print('wrong')" }, cases)).estado, "con errores");
});

test("native TypeScript includes Node compatibility without calling the worker", async (t) => {
  setup(t);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /^https:\/\/api\.onlinecompiler\.io\//);
    if (options.method === "POST") {
      const body = JSON.parse(options.body);
      assert.equal(body.language_id, 101);
      assert.match(Buffer.from(body.source_code, "base64").toString(), /createRequire/);
      return Response.json({ token: "example" });
    }
    return Response.json({ status: { id: 3 }, stdout: b64("42") });
  });
  assert.equal((await evaluate("TypeScript", "consola", { "main.ts": "console.log(42)" }, cases)).estado, "aprobado");
});

test("provider failures are not mistaken for failed student solutions", async (t) => {
  setup(t);
  for (const status of [401, 403, 429, 500]) {
    const mock = t.mock.method(globalThis, "fetch", async () => new Response("{}", { status }));
    await assert.rejects(evaluate("Python", "consola", { "main.py": "print(42)" }, cases), (e) => e.status === 503);
    mock.mock.restore();
  }
  t.mock.method(globalThis, "fetch", async (url, options) => Response.json(
    options.method === "POST" ? { token: "example" } : { status: { id: 13 } },
  ));
  await assert.rejects(evaluate("Python", "consola", { "main.py": "print(42)" }, cases), (e) => e.status === 503);
});

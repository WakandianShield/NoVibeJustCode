// This module is loaded only inside QuickJS WebAssembly, never in Node's realm.
import { parseHTML, Event } from "linkedom";
export function createDOM(files, rules) {
  const { document, window } = parseHTML(files["index.html"]);
  const timers = new Map();
  let nextTimer = 1;
  const storage = new Map();
  const localPath = (path) => {
    path = String(path)
      .replace(/^\.\//, "")
      .replace(/^\//, "")
      .split(/[?#]/)[0];
    if (/[:\\]/.test(path) || path.split("/").includes(".."))
      throw new Error("Solo se permiten archivos de la práctica.");
    return path;
  };
  const globals = {
    document,
    window: globalThis,
    self: globalThis,
    Event,
    MouseEvent: Event,
    InputEvent: Event,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    console: { log() {}, warn() {}, error() {} },
    localStorage: {
      setItem: (k, v) => storage.set(String(k), String(v)),
      getItem: (k) => storage.get(String(k)) ?? null,
      removeItem: (k) => storage.delete(String(k)),
      clear: () => storage.clear(),
    },
    fetch: async (path) => {
      const name = localPath(path),
        present = Object.hasOwn(files, name);
      return {
        ok: present,
        status: present ? 200 : 404,
        json: async () => JSON.parse(files[name]),
        text: async () => files[name] ?? "",
      };
    },
    setTimeout: (fn, delay = 0, ...args) => {
      const id = nextTimer++;
      timers.set(id, () => fn(...args));
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  Object.assign(globalThis, globals);
  // LinkeDOM's defaultView is a proxy of this VM's global, not Node's global.
  Object.defineProperty(document, "readyState", {
    value: "complete",
    configurable: true,
  });
  const styleFor = (element) => {
    const values = new Map();
    const apply = (name, value, priority, weight, order) => {
      const prev = values.get(name);
      const rank = [priority ? 1 : 0, weight, order];
      if (
        !prev ||
        rank[0] > prev.rank[0] ||
        (rank[0] === prev.rank[0] &&
          (rank[1] > prev.rank[1] ||
            (rank[1] === prev.rank[1] && rank[2] >= prev.rank[2])))
      )
        values.set(name, { value, rank });
      if (name === "padding" || name === "margin") {
        const v = value.trim().split(/\s+/);
        ["top", "right", "bottom", "left"].forEach((side, i) =>
          apply(
            name + "-" + side,
            [v[0], v[1] ?? v[0], v[2] ?? v[0], v[3] ?? v[1] ?? v[0]][i],
            priority,
            weight,
            order,
          ),
        );
      }
    };
    rules.forEach((rule, order) => {
      if (element.matches(rule.selector))
        for (const d of rule.declarations)
          apply(d.property, d.value, d.important, rule.specificity, order);
    });
    for (const property of element.style) {
      const raw = element.style.getPropertyValue(property);
      apply(
        property,
        raw.replace(/\s*!important\s*$/, ""),
        /!important\s*$/.test(raw),
        1000000000,
        rules.length,
      );
    }
    const get = (name, depth = 0) => {
      if (depth > 12) return "";
      let value = values.get(name)?.value;
      if (!value && name.startsWith("--") && element.parentElement)
        value = styleFor(element.parentElement).getPropertyValue(name);
      if (!value)
        return name.startsWith("padding-") || name.startsWith("margin-")
          ? "0px"
          : name === "display"
            ? "inline"
            : "";
      return value
        .replace(
          /var\((--[\w-]+)(?:,\s*([^)]*))?\)/g,
          (_, key, fallback) => get(key, depth + 1) || fallback || "",
        )
        .trim();
    };
    return new Proxy(
      { getPropertyValue: (name) => get(name) },
      {
        get(target, name) {
          return name in target
            ? target[name]
            : get(String(name).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()));
        },
      },
    );
  };
  globalThis.getComputedStyle = styleFor;
  const flush = () => {
    const queue = [...timers.values()];
    timers.clear();
    if (queue.length > 100) throw new Error("Demasiados temporizadores.");
    for (const fn of queue) fn();
  };
  return {
    loaded() {
      for (const element of document.querySelectorAll("*")) {
        for (const attribute of element.attributes) {
          if (/^on(click|input|change|submit)$/.test(attribute.name)) {
            element.addEventListener(
              attribute.name.slice(2),
              new Function("event", attribute.value),
            );
          }
        }
      }
      document.dispatchEvent(new Event("DOMContentLoaded"));
      window.dispatchEvent(new Event("load"));
    },
    flush,
    fill(selector, value) {
      const element = document.querySelector(selector);
      if (!element) throw new Error("No existe el campo: " + selector);
      element.value = String(value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    },
    click(selector) {
      const element = document.querySelector(selector);
      if (!element) throw new Error("No existe el botón: " + selector);
      element.dispatchEvent(
        new Event("click", { bubbles: true, cancelable: true }),
      );
    },
    read(selector, kind, property) {
      const nodes = [...document.querySelectorAll(selector)];
      if (kind === "selector") return String(nodes.length);
      if (kind === "estilo")
        return nodes[0] ? styleFor(nodes[0]).getPropertyValue(property) : "";
      return nodes
        .map((n) => n.textContent?.trim() || "")
        .join("\n")
        .trim();
    },
  };
}

import { projectsRepo as repo } from "./repository.mjs";
import { learning } from "../aprendizaje/service.mjs";
import { assert, cleanFiles } from "../../domain.mjs";
import { tx, parseJson } from "../../config/db.js";
import { compileProjectLocally } from "../../evaluation/runner.mjs";
import { z } from "zod";
const edit = z.object({
  titulo: z.string().trim().min(2).max(100),
  descripcion: z.string().max(3000).default(""),
  version: z.number().int().positive(),
  archivos: z.record(z.string(), z.string()),
});
export const projects = {
  list: (user) => repo.list(user.id_usuario),
  async owned(user, id, cx, lock = false) {
    const p = await repo.byId(id, cx, lock);
    assert(
      p && p.id_usuario === user.id_usuario,
      404,
      "Proyecto no encontrado.",
    );
    return p;
  },
  async get(user, id) {
    const p = await this.owned(user, id);
    return {
      ...p,
      archivos_borrador: parseJson(p.archivos_borrador),
      archivos_entregados: parseJson(p.archivos_entregados, null),
    };
  },
  async create(user, body) {
    const section = Number(body.id_seccion),
      s = await learning.access(user, section);
    assert(
      s.numero === 10,
      422,
      "Solo puedes crear proyectos en la sección 10.",
    );
    const old = await repo.bySection(user.id_usuario, section);
    if (old) return this.get(user, old.id_proyecto);
    const defaults = parseJson(s.configuracion_proyecto).archivos;
    return repo.create(
      user.id_usuario,
      section,
      body.titulo || "Mi proyecto libre",
      cleanFiles(defaults),
    );
  },
  async save(user, id, body) {
    const p = await this.owned(user, id);
    await learning.access(user, p.id_seccion);
    assert(
      p.estado !== "validando",
      409,
      "Espera a que termine la validación.",
    );
    const b = edit.parse(body),
      files = cleanFiles(b.archivos);
    const result = await repo.save(
      id,
      b.titulo,
      b.descripcion,
      files,
      b.version,
    );
    assert(
      result.affectedRows,
      409,
      "Existe una versión más reciente. Recarga antes de guardar.",
    );
    return this.get(user, id);
  },
  async finalize(user, id) {
    let p;
    await tx(async (cx) => {
      p = await this.owned(user, id, cx, true);
      assert(
        p.estado !== "validando",
        409,
        "El proyecto ya se está validando.",
      );
      await learning.access(user, p.id_seccion);
      await repo.snapshot(
        id,
        cleanFiles(parseJson(p.archivos_borrador)),
        p.version,
        cx,
      );
    });
    let result;
    try {
      result = await compileProjectLocally(
        p.tecnologia,
        parseJson(p.archivos_borrador),
      );
      await tx(async (cx) => {
        if (!result.valido && p.estado_compilacion === "valido")
          await repo.restore(id, p, result.detalle, cx);
        else await repo.finish(id, result, cx);
        if (result.valido)
          await learning.refresh(user.id_usuario, p.id_curso, cx);
      });
    } catch (err) {
      if (p.estado_compilacion === "valido")
        await repo.restore(id, p, "La nueva validación sigue pendiente.");
      else await repo.pending(id);
      throw err;
    }
    return { ...(await this.get(user, id)), resultado_validacion: result };
  },
};

import { q, one, parseJson } from "../../config/db.js";
export const projectsRepo = {
  list: (user) =>
    q(
      "SELECT p.id_proyecto,p.titulo,p.id_seccion,p.estado,p.estado_compilacion,p.version,p.version_entregada,p.actualizado_en,c.tecnologia FROM proyectos p JOIN secciones s USING(id_seccion) JOIN cursos c USING(id_curso) WHERE p.id_usuario=? ORDER BY actualizado_en DESC",
      [user],
    ),
  byId: (id, cx, lock = false) =>
    one(
      "SELECT p.*,c.tecnologia,s.id_curso FROM proyectos p JOIN secciones s USING(id_seccion) JOIN cursos c USING(id_curso) WHERE p.id_proyecto=?" +
        (lock ? " FOR UPDATE" : ""),
      [id],
      cx,
    ),
  bySection: (user, section) =>
    one(
      "SELECT id_proyecto FROM proyectos WHERE id_usuario=? AND id_seccion=?",
      [user, section],
    ),
  async create(user, section, title, files) {
    const r = await q(
      "INSERT INTO proyectos(id_usuario,id_seccion,titulo,descripcion,archivos_borrador) VALUES(?,?,?,?,?)",
      [user, section, title, "", JSON.stringify(files)],
    );
    return this.byId(r.insertId);
  },
  save: (id, title, description, files, version) =>
    q(
      "UPDATE proyectos SET titulo=?,descripcion=?,archivos_borrador=?,version=version+1 WHERE id_proyecto=? AND version=?",
      [title, description, JSON.stringify(files), id, version],
    ),
  snapshot: (id, files, version, cx) =>
    q(
      "UPDATE proyectos SET archivos_entregados=?,version_entregada=?,estado='validando' WHERE id_proyecto=?",
      [JSON.stringify(files), version, id],
      cx,
    ),
  finish: (id, result, cx) =>
    q(
      "UPDATE proyectos SET estado=?,estado_compilacion=?,diagnostico_compilacion=?,validado_en=CURRENT_TIMESTAMP WHERE id_proyecto=?",
      [
        result.valido ? "completado" : "con errores",
        result.valido ? "valido" : "error",
        result.detalle,
        id,
      ],
      cx,
    ),
  pending: (id, cx) =>
    q(
      "UPDATE proyectos SET estado='borrador',diagnostico_compilacion='Validación pendiente: el servicio no está disponible.' WHERE id_proyecto=?",
      [id],
      cx,
    ),
  restore: (id, p, detail, cx) =>
    q(
      "UPDATE proyectos SET archivos_entregados=?,version_entregada=?,estado='completado',estado_compilacion='valido',diagnostico_compilacion=? WHERE id_proyecto=?",
      [
        JSON.stringify(parseJson(p.archivos_entregados)),
        p.version_entregada,
        detail + "\nSe conserva tu última versión completada.",
        id,
      ],
      cx,
    ),
};

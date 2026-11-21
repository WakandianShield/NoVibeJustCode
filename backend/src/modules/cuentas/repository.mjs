import { q, one } from "../../config/db.js";
export const accountRepo = {
  byEmail: (email) =>
    one("SELECT * FROM usuarios WHERE correo=? AND activo=1", [email]),
  byId: (id, cx) =>
    one("SELECT * FROM usuarios WHERE id_usuario=? AND activo=1", [id], cx),
  async create(b) {
    const r = await q(
      "INSERT INTO usuarios(nombre,nombre_usuario,correo,resumen_contrasena,descripcion) VALUES(?,?,?,?,?)",
      [b.nombre, b.nombre_usuario, b.correo, b.hash, b.descripcion],
    );
    return this.byId(r.insertId);
  },
  token: (id, jti, date) =>
    q(
      "UPDATE usuarios SET identificador_token_activo=?,token_expira_en=? WHERE id_usuario=?",
      [jti, date, id],
    ),
  async update(id, b) {
    await q(
      "UPDATE usuarios SET nombre=?,nombre_usuario=?,descripcion=? WHERE id_usuario=? AND activo=1",
      [b.nombre, b.nombre_usuario, b.descripcion, id],
    );
    return this.byId(id);
  },
  async image(id, field, path) {
    await q(
      `UPDATE usuarios SET ${field === "banner" ? "banner_url" : "foto_url"}=? WHERE id_usuario=?`,
      [path, id],
    );
    return this.byId(id);
  },
  search: (term) =>
    q(
      "SELECT id_usuario,nombre,nombre_usuario,descripcion,foto_url,banner_url FROM usuarios WHERE activo=1 AND (nombre LIKE ? OR nombre_usuario LIKE ?) ORDER BY nombre_usuario LIMIT 30",
      ["%" + term + "%", "%" + term + "%"],
    ),
  profile: (username) =>
    one(
      "SELECT id_usuario,nombre,nombre_usuario,descripcion,foto_url,banner_url FROM usuarios WHERE nombre_usuario=? AND activo=1",
      [username],
    ),
  badges: (id) =>
    q(
      "SELECT l.*,ul.obtenido_en,c.tecnologia FROM usuario_logro ul JOIN logros l USING(id_logro) JOIN cursos c USING(id_curso) WHERE ul.id_usuario=? ORDER BY l.id_curso,l.seccion_meta",
      [id],
    ),
  badgeDefinitions: () =>
    q(
      "SELECT l.*,c.tecnologia FROM logros l JOIN cursos c USING(id_curso) ORDER BY l.id_curso,l.seccion_meta",
    ),
};

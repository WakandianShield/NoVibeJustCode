import { q, one } from "../../config/db.js";
export const communityRepo = {
  pair: (a, b, cx) =>
    one(
      "SELECT * FROM amistades WHERE id_usuario_a=? AND id_usuario_b=?" +
        (cx ? " FOR UPDATE" : ""),
      [Math.min(a, b), Math.max(a, b)],
      cx,
    ),
  byId: (id, cx, lock = false) =>
    one(
      "SELECT * FROM amistades WHERE id_amistad=?" +
        (lock ? " FOR UPDATE" : ""),
      [id],
      cx,
    ),
  async request(a, b, cx) {
    await q(
      "INSERT INTO amistades(id_usuario_a,id_usuario_b,id_solicitante,estado) VALUES(?,?,?,'pendiente') ON DUPLICATE KEY UPDATE id_solicitante=VALUES(id_solicitante),estado='pendiente',bloqueado_por=NULL",
      [Math.min(a, b), Math.max(a, b), a],
      cx,
    );
    return this.pair(a, b, cx);
  },
  update: (id, data, cx) =>
    q(
      "UPDATE amistades SET estado=?,bloqueado_por=? WHERE id_amistad=?",
      [data.estado, data.bloqueado_por, id],
      cx,
    ),
  list: (user) =>
    q(
      `SELECT a.*,u.nombre,u.nombre_usuario,u.foto_url,(SELECT COUNT(*) FROM mensajes m WHERE m.id_amistad=a.id_amistad AND m.id_emisor<>? AND m.leido_en IS NULL) no_leidos FROM amistades a JOIN usuarios u ON u.id_usuario=IF(a.id_usuario_a=?,a.id_usuario_b,a.id_usuario_a) WHERE (a.id_usuario_a=? OR a.id_usuario_b=?) AND a.estado IN('pendiente','aceptada','bloqueada') ORDER BY a.actualizada_en DESC`,
      [user, user, user, user],
    ),
};

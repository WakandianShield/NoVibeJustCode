import { q, tx } from "../../config/db.js";
export const privacyRepo = {
  async export(user) {
    const result = {};
    for (const [table, field] of [
      ["usuarios", "id_usuario"],
      ["progreso", "id_usuario"],
      ["intentos", "id_usuario"],
      ["usuario_logro", "id_usuario"],
      ["proyectos", "id_usuario"],
      ["suscripciones", "id_usuario"],
    ]) {
      result[table] = await q(`SELECT * FROM ${table} WHERE ${field}=?`, [
        user,
      ]);
    }
    result.amistades = await q(
      "SELECT * FROM amistades WHERE id_usuario_a=? OR id_usuario_b=?",
      [user, user],
    );
    result.mensajes_propios = await q(
      "SELECT * FROM mensajes WHERE id_emisor=?",
      [user],
    );
    for (const u of result.usuarios) {
      delete u.resumen_contrasena;
      delete u.identificador_token_activo;
      delete u.token_expira_en;
    }
    return result;
  },
  async erase(user) {
    return tx(async (cx) => {
      for (const table of [
        "progreso",
        "intentos",
        "usuario_logro",
        "proyectos",
      ])
        await q(`DELETE FROM ${table} WHERE id_usuario=?`, [user], cx);
      await q(
        "UPDATE mensajes SET texto='[Mensaje eliminado por su autor]' WHERE id_emisor=?",
        [user],
        cx,
      );
      await q(
        "UPDATE amistades SET estado='eliminada',bloqueado_por=NULL WHERE id_usuario_a=? OR id_usuario_b=?",
        [user, user],
        cx,
      );
      await q(
        "UPDATE usuarios SET nombre='Cuenta eliminada',nombre_usuario=?,correo=?,resumen_contrasena='eliminada',descripcion='',foto_url=NULL,banner_url=NULL,activo=0,identificador_token_activo=NULL,token_expira_en=NULL WHERE id_usuario=?",
        ["eliminado_" + user, "eliminado_" + user + "@invalid.local", user],
        cx,
      );
    });
  },
};

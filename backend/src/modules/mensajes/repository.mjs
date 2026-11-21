import { q, one } from "../../config/db.js";
export const messagesRepo = {
  client: (id, cx) =>
    one("SELECT * FROM mensajes WHERE id_cliente=?", [id], cx),
  async insert(friend, user, client, text, cx) {
    const r = await q(
      "INSERT INTO mensajes(id_amistad,id_emisor,id_cliente,texto) VALUES(?,?,?,?)",
      [friend, user, client, text],
      cx,
    );
    return one("SELECT * FROM mensajes WHERE id_mensaje=?", [r.insertId], cx);
  },
  history: (friend, before) =>
    q(
      "SELECT * FROM mensajes WHERE id_amistad=? AND id_mensaje<? ORDER BY id_mensaje DESC LIMIT 50",
      [friend, before || Number.MAX_SAFE_INTEGER],
    ),
  read: (friend, user) =>
    q(
      "UPDATE mensajes SET leido_en=COALESCE(leido_en,CURRENT_TIMESTAMP) WHERE id_amistad=? AND id_emisor<>?",
      [friend, user],
    ),
};

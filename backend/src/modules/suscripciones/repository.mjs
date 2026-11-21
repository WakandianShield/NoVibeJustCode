import { q, one } from "../../config/db.js";
export const subscriptionsRepo = {
  active: (user, cx) =>
    one(
      "SELECT * FROM suscripciones WHERE id_usuario=? AND estado IN('ACTIVE','CANCELLED') AND fin_periodo>UTC_TIMESTAMP() ORDER BY fin_periodo DESC LIMIT 1",
      [user],
      cx,
    ),
  all: (user) =>
    q(
      "SELECT * FROM suscripciones WHERE id_usuario=? ORDER BY id_suscripcion DESC",
      [user],
    ),
  provider: (id) =>
    one("SELECT * FROM suscripciones WHERE id_proveedor=?", [id]),
  async save(user, s) {
    await q(
      "INSERT INTO suscripciones(id_usuario,id_proveedor,estado,inicio_periodo,fin_periodo,renovacion_habilitada) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE estado=VALUES(estado),inicio_periodo=COALESCE(VALUES(inicio_periodo),inicio_periodo),fin_periodo=COALESCE(VALUES(fin_periodo),fin_periodo),renovacion_habilitada=VALUES(renovacion_habilitada)",
      [user, s.id, s.status, s.inicio, s.fin, s.status === "ACTIVE"],
    );
    return this.provider(s.id);
  },
  payments: (user) =>
    q(
      "SELECT p.* FROM pagos p JOIN suscripciones s USING(id_suscripcion) WHERE s.id_usuario=? ORDER BY p.fecha DESC",
      [user],
    ),
  payment: (sub, p) =>
    q(
      "INSERT INTO pagos(id_suscripcion,id_transaccion,importe,moneda,estado,fecha) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE estado=VALUES(estado)",
      [sub, p.id, p.importe, p.moneda, p.estado, p.fecha],
    ),
  cancel: (id) =>
    q(
      "UPDATE suscripciones SET estado='CANCELLED',renovacion_habilitada=0 WHERE id_suscripcion=?",
      [id],
    ),
};

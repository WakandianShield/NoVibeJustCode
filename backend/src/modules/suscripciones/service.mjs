import { subscriptionsRepo as repo } from "./repository.mjs";
import { config } from "../../config/index.js";
import { assert } from "../../domain.mjs";
import { paypal, verifyWebhook, sqlDate } from "../../adapters/paypal.mjs";
export const subscriptions = {
  config: () => ({
    clientId: config.paypalId || null,
    planId: config.paypalPlan || null,
    precio: 149,
    moneda: "MXN",
  }),
  async create(user, body) {
    assert(
      body.consentimiento === true,
      422,
      "Debes aceptar el cobro recurrente.",
    );
    assert(
      !(await repo.active(user.id_usuario)),
      409,
      "Tu cuenta ya tiene Pro vigente.",
    );
    const s = await paypal("/v1/billing/subscriptions", {
      method: "POST",
      headers: {
        "PayPal-Request-Id": `nvjc-${user.id_usuario}-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        plan_id: config.paypalPlan,
        custom_id: String(user.id_usuario),
        application_context: {
          brand_name: "NoVibeJustCode",
          user_action: "SUBSCRIBE_NOW",
          return_url: config.origin + "/planes",
          cancel_url: config.origin + "/planes",
        },
      }),
    });
    await repo.save(user.id_usuario, { ...s, inicio: null, fin: null });
    return { id: s.id };
  },
  async sync(user, id) {
    const known = await repo.provider(id);
    assert(
      known && known.id_usuario === user.id_usuario,
      404,
      "Suscripción no encontrada.",
    );
    const s = await paypal(
      "/v1/billing/subscriptions/" + encodeURIComponent(id),
    );
    assert(
      s.plan_id === config.paypalPlan &&
        s.custom_id === String(user.id_usuario),
      403,
      "La suscripción no corresponde a esta cuenta o plan.",
    );
    const payment = s.billing_info?.last_payment;
    const paid =
      payment &&
      Number(payment.amount?.value) === 149 &&
      payment.amount?.currency_code === "MXN";
    const fin = paid ? s.billing_info?.next_billing_time : null;
    const stored = await repo.save(user.id_usuario, {
      ...s,
      status: s.status === "ACTIVE" && !paid ? "APPROVAL_PENDING" : s.status,
      inicio: sqlDate(payment?.time),
      fin: sqlDate(fin),
    });
    const end = new Date().toISOString(),
      start = new Date(Date.now() - 180 * 86400000).toISOString();
    const txs = await paypal(
      `/v1/billing/subscriptions/${encodeURIComponent(id)}/transactions?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}`,
    );
    for (const p of txs.transactions || [])
      await repo.payment(stored.id_suscripcion, {
        id: p.id,
        importe: p.amount_with_breakdown?.gross_amount?.value || 0,
        moneda: p.amount_with_breakdown?.gross_amount?.currency_code || "MXN",
        estado: p.status,
        fecha: sqlDate(p.time),
      });
    return this.mine(user);
  },
  async mine(user) {
    return {
      activa: await repo.active(user.id_usuario),
      suscripciones: await repo.all(user.id_usuario),
      pagos: await repo.payments(user.id_usuario),
    };
  },
  async cancel(user) {
    const sub = await repo.active(user.id_usuario);
    assert(sub, 404, "No existe Pro vigente.");
    if (sub.estado !== "CANCELLED")
      await paypal(
        `/v1/billing/subscriptions/${encodeURIComponent(sub.id_proveedor)}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "Cancelación solicitada por el titular.",
          }),
        },
      );
    await repo.cancel(sub.id_suscripcion);
    return this.mine(user);
  },
  async webhook(headers, event) {
    await verifyWebhook(headers, event);
    const id = event.resource?.billing_agreement_id || event.resource?.id;
    const known = await repo.provider(id);
    if (known) await this.sync({ id_usuario: known.id_usuario }, id);
    return { recibido: true };
  },
};

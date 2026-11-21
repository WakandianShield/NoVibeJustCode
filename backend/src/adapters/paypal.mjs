import { config } from "../config/index.js";
import { assert, AppError } from "../domain.mjs";
let token,
  until = 0;
export async function paypal(path, options = {}) {
  assert(
    config.paypalId && config.paypalSecret && config.paypalPlan,
    503,
    "Configura PayPal para habilitar el cobro Pro.",
  );
  if (!token || Date.now() > until) {
    const r = await fetch(config.paypalApi + "/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(config.paypalId + ":" + config.paypalSecret).toString(
            "base64",
          ),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15000),
    });
    assert(r.ok, 503, "No fue posible autenticar el proveedor de pagos.");
    const b = await r.json();
    token = b.access_token;
    until = Date.now() + (b.expires_in - 60) * 1000;
  }
  const r = await fetch(config.paypalApi + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw new AppError(
      503,
      "PayPal no pudo completar la operación. No se ha confirmado ningún cambio de acceso.",
    );
  return r.status === 204 ? null : r.json();
}
export async function verifyWebhook(headers, event) {
  assert(
    config.paypalWebhook,
    503,
    "Falta configurar el identificador del webhook.",
  );
  const b = await paypal("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: config.paypalWebhook,
      webhook_event: event,
    }),
  });
  assert(b.verification_status === "SUCCESS", 401, "Firma de PayPal inválida.");
}
export const sqlDate = (x) =>
  x ? new Date(x).toISOString().slice(0, 19).replace("T", " ") : null;

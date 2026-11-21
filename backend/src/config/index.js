import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(
  fileURLToPath(new URL("../../../", import.meta.url)),
);

dotenv.config({
  path: resolve(projectRoot, ".env"),
  quiet: true,
});

export const config = {
  port: Number(process.env.PORT || 3000),
  origin: process.env.APP_ORIGIN || "http://localhost:4200",
  database: process.env.DATABASE_URL,
  secret: process.env.JWT_SECRET,
  uploadDir: resolve(projectRoot, process.env.UPLOAD_DIR || "./uploads"),
  workerUrl: process.env.WORKER_URL || "http://127.0.0.1:3100",
  workerSecret: process.env.WORKER_SECRET,
  paypalApi: process.env.PAYPAL_API || "https://api-m.paypal.com",
  paypalId: process.env.PAYPAL_CLIENT_ID,
  paypalSecret: process.env.PAYPAL_CLIENT_SECRET,
  paypalPlan: process.env.PAYPAL_PLAN_ID,
  paypalWebhook: process.env.PAYPAL_WEBHOOK_ID,
};

export function checkConfig() {
  if (!config.database || !config.secret || config.secret.length < 40) {
    throw new Error(
      "Configura DATABASE_URL y JWT_SECRET (mínimo 40 caracteres) en .env",
    );
  }
}

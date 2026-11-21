import { z } from "zod";
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const assert = (condition, status, message) => {
  if (!condition) throw new AppError(status, message);
};
export const idSchema = z.coerce.number().int().positive().safe();
export const credentials = z.object({
  correo: z
    .email()
    .max(254)
    .transform((x) => x.toLowerCase()),
  contrasena: z
    .string()
    .min(12)
    .max(72)
    .refine(
      (x) => Buffer.byteLength(x, "utf8") <= 72,
      "La contraseña supera el límite de bytes admitido.",
    ),
});
export const profileSchema = z.object({
  nombre: z.string().trim().min(2).max(60),
  nombre_usuario: z
    .string()
    .regex(/^[a-zA-Z0-9_]{3,24}$/)
    .transform((x) => x.toLowerCase()),
  descripcion: z.string().max(300).default(""),
});
export const registerSchema = credentials.extend(profileSchema.shape);
export function cleanFiles(input) {
  assert(
    input && typeof input === "object" && !Array.isArray(input),
    422,
    "Envía un conjunto de archivos.",
  );
  const entries = Object.entries(input);
  assert(
    entries.length > 0 && entries.length <= 100,
    422,
    "El proyecto admite entre 1 y 100 archivos.",
  );
  let size = 0;
  const seen = new Set();
  for (const [path, text] of entries) {
    assert(
      typeof text === "string" &&
        path.length <= 200 &&
        !path.startsWith("/") &&
        !path.includes("\\") &&
        !path.split("/").some((x) => !x || x === "." || x === "..") &&
        !/[:\x00-\x1f]/.test(path),
      422,
      "Nombre o contenido de archivo inválido.",
    );
    assert(
      !/(^|\/)(\.env(?:\..*)?|node_modules|\.git|\.npmrc|id_rsa|credentials)(\/|$)/i.test(
        path,
      ),
      422,
      "No incluyas secretos ni dependencias instaladas.",
    );
    assert(
      !seen.has(path.toLowerCase()),
      422,
      "Existen nombres de archivos duplicados.",
    );
    seen.add(path.toLowerCase());
    size += Buffer.byteLength(text);
  }
  assert(size <= 10 * 1024 * 1024, 422, "El proyecto excede 10 MB.");
  return Object.fromEntries(entries);
}
export function friendshipAction(row, user, action) {
  assert(
    row && (row.id_usuario_a === user || row.id_usuario_b === user),
    404,
    "Amistad no encontrada.",
  );
  if (action === "aceptar" || action === "rechazar") {
    assert(
      row.estado === "pendiente" && row.id_solicitante !== user,
      409,
      "Solo el destinatario puede responder la solicitud.",
    );
    return {
      estado: action === "aceptar" ? "aceptada" : "rechazada",
      bloqueado_por: null,
    };
  }
  if (action === "cancelar") {
    assert(
      row.estado === "pendiente" && row.id_solicitante === user,
      409,
      "Solo puedes cancelar tu solicitud pendiente.",
    );
    return { estado: "cancelada", bloqueado_por: null };
  }
  if (action === "bloquear") {
    assert(
      row.estado !== "bloqueada" || row.bloqueado_por === user,
      409,
      "La relación ya está bloqueada.",
    );
    return { estado: "bloqueada", bloqueado_por: user };
  }
  if (action === "desbloquear") {
    assert(
      row.estado === "bloqueada" && row.bloqueado_por === user,
      409,
      "No puedes retirar el bloqueo de otra persona.",
    );
    return { estado: "eliminada", bloqueado_por: null };
  }
  if (action === "eliminar") {
    assert(row.estado === "aceptada", 409, "La amistad no está aceptada.");
    return { estado: "eliminada", bloqueado_por: null };
  }
  throw new AppError(422, "Operación desconocida.");
}

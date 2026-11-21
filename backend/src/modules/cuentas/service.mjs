import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { imageStore, normalizeProfileImage } from "../../storage/profile-images.mjs";
import { accountRepo as repo } from "./repository.mjs";
import { subscriptionsRepo } from "../suscripciones/repository.mjs";
import {
  registerSchema,
  credentials,
  profileSchema,
  assert,
} from "../../domain.mjs";
import { config } from "../../config/index.js";
export function publicAccount(u) {
  return {
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    nombre_usuario: u.nombre_usuario,
    descripcion: u.descripcion,
    foto_url: u.foto_url,
    banner_url: u.banner_url,
  };
}
export const accounts = {
  async image(user, type, file) {
    const bytes = await normalizeProfileImage(type, file);
    const banner = type === "banner";
    const url = await imageStore.save(bytes);
    const old = banner ? user.banner_url : user.foto_url;
    let updated;
    try { updated = await repo.image(user.id_usuario, banner ? "banner" : "foto", url); }
    catch (error) { await imageStore.remove(url).catch(() => {}); throw error; }
    if (old) await imageStore.remove(old).catch(() => console.error("No se pudo limpiar una imagen reemplazada."));
    return this.me(updated);
  },
  async session(user) {
    const jti = randomUUID(),
      expires = new Date(Date.now() + 24 * 3600000);
    await repo.token(user.id_usuario, jti, expires);
    const token = jwt.sign(
      { sub: String(user.id_usuario), jti },
      config.secret,
      { expiresIn: "24h", issuer: "NoVibeJustCode", audience: "nvjc-web" },
    );
    return {
      token,
      usuario: {
        ...publicAccount(user),
        correo: user.correo,
        pro: Boolean(await subscriptionsRepo.active(user.id_usuario)),
      },
    };
  },
  async register(body) {
    const b = registerSchema.parse(body);
    const hash = await bcrypt.hash(b.contrasena, 12);
    return this.session(await repo.create({ ...b, hash }));
  },
  async login(body) {
    const b = credentials.parse(body),
      user = await repo.byEmail(b.correo);
    assert(
      user && (await bcrypt.compare(b.contrasena, user.resumen_contrasena)),
      401,
      "Correo o contraseña incorrectos.",
    );
    return this.session(user);
  },
  async authenticate(token) {
    assert(token, 401, "Inicia sesión para continuar.");
    let data;
    try {
      data = jwt.verify(token, config.secret, {
        issuer: "NoVibeJustCode",
        audience: "nvjc-web",
        algorithms: ["HS256"],
      });
    } catch {
      assert(false, 401, "La sesión venció.");
    }
    const user = await repo.byId(Number(data.sub));
    assert(
      user &&
        user.identificador_token_activo === data.jti &&
        new Date(user.token_expira_en + "Z").getTime() > Date.now(),
      401,
      "La sesión ya no está activa.",
    );
    return user;
  },
  async me(user) {
    return {
      ...publicAccount(user),
      correo: user.correo,
      pro: Boolean(await subscriptionsRepo.active(user.id_usuario)),
    };
  },
  logout: (user) => repo.token(user.id_usuario, null, null),
  async update(user, body) {
    return publicAccount(
      await repo.update(user.id_usuario, profileSchema.parse(body)),
    );
  },
  search: (term) => repo.search(String(term || "").slice(0, 60)),
  async profile(username) {
    const u = await repo.profile(username);
    assert(u, 404, "Perfil no encontrado.");
    return {
      ...u,
      insignias: await repo.badges(u.id_usuario),
      metas: await repo.badgeDefinitions(),
    };
  },
};

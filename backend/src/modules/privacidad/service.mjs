import bcrypt from "bcryptjs";
import { privacyRepo as repo } from "./repository.mjs";
import { subscriptions } from "../suscripciones/service.mjs";
import { subscriptionsRepo } from "../suscripciones/repository.mjs";
import { assert } from "../../domain.mjs";
import { imageStore } from "../../storage/profile-images.mjs";
export const privacy = {
  async verify(user, password) {
    assert(
      typeof password === "string" &&
        (await bcrypt.compare(password, user.resumen_contrasena)),
      401,
      "Confirma tu contraseña para continuar.",
    );
  },
  async export(user, body) {
    await this.verify(user, body.contrasena);
    return repo.export(user.id_usuario);
  },
  async erase(user, body) {
    await this.verify(user, body.contrasena);
    if (await subscriptionsRepo.active(user.id_usuario))
      await subscriptions.cancel(user);
    await repo.erase(user.id_usuario);
    for (const path of [user.foto_url, user.banner_url])
      if (path)
        await imageStore.remove(path).catch(() => console.error("No se pudo limpiar una imagen de la cuenta eliminada."));
    return { eliminada: true };
  },
};

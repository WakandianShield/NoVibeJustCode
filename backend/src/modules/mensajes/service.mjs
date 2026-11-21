import { messagesRepo as repo } from "./repository.mjs";
import { community } from "../comunidad/service.mjs";
import { assert } from "../../domain.mjs";
import { tx } from "../../config/db.js";
import { z } from "zod";
const bodySchema = z.object({
  id_amistad: z.number().int().positive(),
  id_cliente: z.string().uuid(),
  texto: z.string().trim().min(1).max(4000),
});
export const messages = {
  async history(user, friend, before) {
    await community.allowed(user.id_usuario, friend);
    return (await repo.history(friend, before)).reverse();
  },
  async send(user, body) {
    const b = bodySchema.parse(body);
    return tx(async (cx) => {
      const row = await community.allowed(user.id_usuario, b.id_amistad, cx);
      const old = await repo.client(b.id_cliente, cx);
      if (old) {
        assert(
          old.id_emisor === user.id_usuario &&
            old.id_amistad === b.id_amistad &&
            old.texto === b.texto,
          409,
          "El identificador ya pertenece a otro mensaje.",
        );
        return { ...old, participantes: [row.id_usuario_a, row.id_usuario_b] };
      }
      return {
        ...(await repo.insert(
          b.id_amistad,
          user.id_usuario,
          b.id_cliente,
          b.texto,
          cx,
        )),
        participantes: [row.id_usuario_a, row.id_usuario_b],
      };
    });
  },
  async read(user, id) {
    const row = await community.allowed(user.id_usuario, id);
    await repo.read(id, user.id_usuario);
    return {
      id_amistad: id,
      lector: user.id_usuario,
      participantes: [row.id_usuario_a, row.id_usuario_b],
    };
  },
};

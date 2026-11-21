import { communityRepo as repo } from "./repository.mjs";
import { accountRepo } from "../cuentas/repository.mjs";
import { assert, friendshipAction } from "../../domain.mjs";
import { tx } from "../../config/db.js";
export const community = {
  list: (user) => repo.list(user.id_usuario),
  async request(user, target) {
    assert(
      Number.isSafeInteger(target) && target > 0,
      422,
      "Usuario inválido.",
    );
    assert(target !== user.id_usuario, 422, "No puedes agregarte a ti mismo.");
    assert(await accountRepo.byId(target), 404, "Usuario no encontrado.");
    return tx(async (cx) => {
      const row = await repo.pair(user.id_usuario, target, cx);
      assert(
        !row || !["pendiente", "aceptada", "bloqueada"].includes(row.estado),
        409,
        "Ya existe una relación pendiente, aceptada o bloqueada.",
      );
      return repo.request(user.id_usuario, target, cx);
    });
  },
  async action(user, id, action) {
    return tx(async (cx) => {
      const row = await repo.byId(id, cx, true),
        change = friendshipAction(row, user.id_usuario, action);
      await repo.update(id, change, cx);
      return { ...row, ...change };
    });
  },
  async allowed(user, id, cx) {
    const row = await repo.byId(id, cx, Boolean(cx));
    assert(
      row && (row.id_usuario_a === user || row.id_usuario_b === user),
      404,
      "Conversación no encontrada.",
    );
    assert(
      row.estado === "aceptada",
      403,
      "El chat requiere amistad aceptada y sin bloqueo.",
    );
    return row;
  },
};

import { community as service } from "./service.mjs";
export const controller = {
  list: async (req, res) => res.json(await service.list(req.user)),
  request: async (req, res) =>
    res.json(await service.request(req.user, Number(req.body.id_usuario))),
  action: async (req, res) =>
    res.json(
      await service.action(req.user, Number(req.params.id), req.params.accion),
    ),
};

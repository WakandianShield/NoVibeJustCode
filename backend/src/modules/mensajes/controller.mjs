import { messages as service } from "./service.mjs";
export const controller = {
  history: async (req, res) =>
    res.json(
      await service.history(
        req.user,
        Number(req.params.id),
        Number(req.query.antes) || undefined,
      ),
    ),
  send: async (req, res) => res.json(await service.send(req.user, req.body)),
  read: async (req, res) =>
    res.json(await service.read(req.user, Number(req.params.id))),
};

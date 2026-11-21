import { subscriptions as service } from "./service.mjs";
export const controller = {
  config: async (req, res) => res.json(service.config()),
  mine: async (req, res) => res.json(await service.mine(req.user)),
  create: async (req, res) =>
    res.json(await service.create(req.user, req.body)),
  sync: async (req, res) =>
    res.json(await service.sync(req.user, req.params.id)),
  cancel: async (req, res) => res.json(await service.cancel(req.user)),
  webhook: async (req, res) =>
    res.json(await service.webhook(req.headers, req.body)),
};

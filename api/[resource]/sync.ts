import { VercelRequest, VercelResponse } from "@vercel/node";
import { handleResourceSyncRoute } from "../../src/server/vercel-routes";

export default async (req: VercelRequest, res: VercelResponse) => {
  const resource = Array.isArray(req.query.resource) ? req.query.resource[0] : req.query.resource;
  return handleResourceSyncRoute(req, res, resource || "");
};

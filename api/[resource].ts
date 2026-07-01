import { VercelRequest, VercelResponse } from "@vercel/node";
import { handleResourceRootRoute } from "../src/server/vercel-routes";

export default async (req: VercelRequest, res: VercelResponse) => {
  const resource = Array.isArray(req.query.resource) ? req.query.resource[0] : req.query.resource;
  return handleResourceRootRoute(req, res, resource || "");
};

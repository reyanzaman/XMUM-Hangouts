import { VercelRequest, VercelResponse } from "@vercel/node";
import { handleAccountRoute } from "../../src/server/vercel-routes";

export default async (req: VercelRequest, res: VercelResponse) => {
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  return handleAccountRoute(req, res, action || "");
};

import { VercelRequest, VercelResponse } from "@vercel/node";
import { handleAuthRoute } from "../../src/server/vercel-routes";

export default async (req: VercelRequest, res: VercelResponse) => {
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  return handleAuthRoute(req, res, action || "");
};

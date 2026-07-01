import { VercelRequest, VercelResponse } from "@vercel/node";
import {
  handleAccountRoute,
  handleAuthRoute,
  handleResourceRootRoute,
  handleResourceSyncRoute
} from "../src/server/vercel-routes.js";

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] || "" : value || "");

export default async (req: VercelRequest, res: VercelResponse) => {
  const group = getParam(req.query.group);
  const action = getParam(req.query.action);
  const resource = getParam(req.query.resource);

  if (group === "auth") {
    return handleAuthRoute(req, res, action);
  }

  if (group === "account") {
    return handleAccountRoute(req, res, action);
  }

  if (group === "sync") {
    return handleResourceSyncRoute(req, res, resource);
  }

  if (group === "resource") {
    return handleResourceRootRoute(req, res, resource);
  }

  return res.status(404).json({ error: "Route not found" });
};

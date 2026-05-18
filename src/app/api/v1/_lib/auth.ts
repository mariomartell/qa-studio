import { NextRequest } from "next/server";

export function checkApiKey(req: NextRequest): Response | null {
  const key = process.env.QA_STUDIO_API_KEY;
  if (!key) {
    return Response.json({ error: "API key not configured on server" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (provided !== key) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

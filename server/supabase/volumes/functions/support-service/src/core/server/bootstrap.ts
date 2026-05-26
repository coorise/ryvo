import { env } from "../../configs/index.ts";
import { handle } from "../../api/routes.ts";

export function startServer() {
  const server = Bun.serve({ port: env.port, fetch: handle });
  console.log(`[support-service] listening on :${server.port}`);
  return server;
}

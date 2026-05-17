import { createBunServer } from "../_shared/lib/bun/server";
import { router } from "./src/api";
import { env } from "./src/configs";

const server = createBunServer({
  port: env.port,
  router,
  middleware: ["request-id", "logger"],
});

if (import.meta.main) {
  server.start();
}

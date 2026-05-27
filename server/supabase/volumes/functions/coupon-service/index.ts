import "./src/index.ts";
import { startServer } from "./src/core/server/bootstrap.ts";

if (import.meta.main) {
  startServer();
}

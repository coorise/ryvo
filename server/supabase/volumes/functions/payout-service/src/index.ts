export { handle } from "./api/routes.ts";
export { startServer } from "./core/server/bootstrap.ts";
export { SERVICE_NAME } from "./configs/const.ts";

if (import.meta.main) {
  startServer();
}

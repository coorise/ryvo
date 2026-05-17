export function healthController() {
  return Response.json({ data: { status: "ok" }, meta: { timestamp: new Date().toISOString() } });
}

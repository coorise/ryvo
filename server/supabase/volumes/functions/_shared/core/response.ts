export type ApiMeta = {
  request_id: string;
  timestamp: string;
};

export function ok<T>(data: T, meta?: Partial<ApiMeta>, status = 200): Response {
  return Response.json(
    {
      data,
      meta: {
        request_id: meta?.request_id ?? crypto.randomUUID(),
        timestamp: meta?.timestamp ?? new Date().toISOString(),
      },
    },
    { status },
  );
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details: Record<string, unknown> = {},
): Response {
  return Response.json({ error: { code, message, details } }, { status });
}

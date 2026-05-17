export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export type RouteHandler = (req: Request) => Response | Promise<Response>;

export type RouteDefinition = {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
};

export type Router = Record<string, Partial<Record<HttpMethod, RouteHandler>>>;

export type Middleware = (req: Request, next: () => Promise<Response>) => Promise<Response>;

export type CreateBunServerOptions = {
  port: number;
  router: Router;
  middleware?: string[];
};

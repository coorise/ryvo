import { apiRequest, type RequestOptions } from "./api-client";

/** Thin OOP wrapper over the functions gateway for service modules. */
export abstract class BaseService {
  constructor(protected readonly serviceName: string) {}

  protected get<T>(path: string, token?: string | null) {
    return apiRequest<T>(this.serviceName, path, { token });
  }

  protected post<T>(path: string, body: unknown, token?: string | null) {
    return apiRequest<T>(this.serviceName, path, {
      method: "POST",
      body,
      token,
    } satisfies RequestOptions);
  }

  protected patch<T>(path: string, body: unknown, token?: string | null) {
    return apiRequest<T>(this.serviceName, path, {
      method: "PATCH",
      body,
      token,
    } satisfies RequestOptions);
  }

  protected put<T>(path: string, body: unknown, token?: string | null) {
    return apiRequest<T>(this.serviceName, path, {
      method: "PUT",
      body,
      token,
    } satisfies RequestOptions);
  }

  protected delete<T>(path: string, token?: string | null) {
    return apiRequest<T>(this.serviceName, path, {
      method: "DELETE",
      token,
    } satisfies RequestOptions);
  }
}

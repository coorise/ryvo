import { BaseService } from "@/lib/base-service";

export type AdminTask = {
  id: string;
  name: string;
  task_key: string;
  kind?: "preset" | "http";
  params: Record<string, unknown>;
  request_method?: string | null;
  request_path?: string | null;
  request_query?: Record<string, unknown> | null;
  request_headers?: Record<string, unknown> | null;
  request_body?: Record<string, unknown> | null;
  schedule_mode: "immediate" | "one_time" | "daily" | "weekly" | "monthly";
  run_at: string | null;
  time_of_day: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  timezone: string;
  next_run_at: string | null;
  paused_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export class TasksService extends BaseService {
  constructor() {
    super("auth-hooks");
  }

  list(token: string | null) {
    return this.get<{ tasks: AdminTask[] }>("/v1/admin/settings/tasks", token);
  }

  create(
    token: string | null,
    body: {
      name: string;
      kind?: "preset" | "http";
      task_key: string;
      params: Record<string, unknown>;
      request_method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
      request_path?: string;
      request_query?: Record<string, unknown>;
      request_headers?: Record<string, unknown>;
      request_body?: Record<string, unknown> | null;
      schedule_mode: AdminTask["schedule_mode"];
      run_at?: string | null;
      time_of_day?: string | null;
      day_of_week?: number | null;
      day_of_month?: number | null;
      timezone?: string;
    },
  ) {
    return this.post<{ task: AdminTask }>("/v1/admin/settings/tasks", body, token);
  }

  run(token: string | null, id: string) {
    return this.post<{ run_id: string; result: Record<string, unknown> }>(
      `/v1/admin/settings/tasks/${id}/run`,
      {},
      token,
    );
  }

  pause(token: string | null, id: string) {
    return this.post<{ task: AdminTask }>(`/v1/admin/settings/tasks/${id}/pause`, {}, token);
  }

  resume(token: string | null, id: string) {
    return this.post<{ task: AdminTask }>(`/v1/admin/settings/tasks/${id}/resume`, {}, token);
  }

  delete(token: string | null, id: string) {
    return this.delete<{ deleted: boolean }>(`/v1/admin/settings/tasks/${id}`, token);
  }
}

export const tasksService = new TasksService();


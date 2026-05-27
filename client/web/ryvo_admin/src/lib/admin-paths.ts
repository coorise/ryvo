import { ROUTES } from "@/configs/const";

export function adminProfilePath(area: "users" | "staff" | "drivers", id: string) {
  const base =
    area === "users"
      ? ROUTES.admin.users.profile
      : area === "staff"
        ? ROUTES.admin.staff.profile
        : ROUTES.admin.drivers.profile;
  return `${base}?id=${encodeURIComponent(id)}`;
}

export function adminEditPath(area: "users" | "staff" | "drivers", id: string) {
  return `${adminProfilePath(area, id)}&edit=1`;
}

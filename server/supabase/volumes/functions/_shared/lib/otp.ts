import { createHash, randomBytes, randomInt } from "node:crypto";

import { env } from "./env.ts";

function pepper(): string {
  return env.jwtSecret || env.serviceRoleKey || "ryvo-otp-dev-pepper";
}

export function generateOtp6(): string {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(`${pepper()}:otp:${code}`).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(`${pepper()}:reset:${token}`).digest("hex");
}

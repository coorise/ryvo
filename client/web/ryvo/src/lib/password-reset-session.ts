import { STORAGE_KEYS_RESET } from "@/configs/const";
import { getStorageItem, removeStorageItem, setStorageItem } from "./storage";

export type PasswordResetSession = {
  email: string;
  resetToken?: string;
};

export function getPasswordResetSession(): PasswordResetSession | null {
  return getStorageItem<PasswordResetSession>(STORAGE_KEYS_RESET);
}

export function setPasswordResetSession(session: PasswordResetSession): void {
  setStorageItem(STORAGE_KEYS_RESET, session);
}

export function clearPasswordResetSession(): void {
  removeStorageItem(STORAGE_KEYS_RESET);
}

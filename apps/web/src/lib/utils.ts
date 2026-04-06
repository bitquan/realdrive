import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PaymentMethod, Role, SessionUser } from "@shared/contracts";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Now";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatPaymentMethod(method: PaymentMethod) {
  if (method === "cashapp") {
    return "Cash App";
  }

  if (method === "jim") {
    return "Jim";
  }

  return "Cash";
}

export function roleHome(role: Role) {
  if (role === "driver") {
    return "/driver";
  }

  if (role === "admin") {
    return "/admin";
  }

  return "/rider/rides";
}

export function userHasRole(user: SessionUser | null | undefined, role: Role) {
  if (!user) {
    return false;
  }

  return user.role === role || user.roles.includes(role);
}

export function roleLabel(role: Role) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "driver") {
    return "Driver";
  }

  return "Rider";
}

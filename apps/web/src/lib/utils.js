import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value);
}
export function formatDateTime(value) {
    if (!value) {
        return "Now";
    }
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(value));
}
export function roleHome(role) {
    if (role === "driver") {
        return "/driver";
    }
    if (role === "admin") {
        return "/admin";
    }
    return "/";
}
export function userHasRole(user, role) {
    if (!user) {
        return false;
    }
    return user.role === role || user.roles.includes(role);
}
export function roleLabel(role) {
    if (role === "admin") {
        return "Admin";
    }
    if (role === "driver") {
        return "Driver";
    }
    return "Rider";
}

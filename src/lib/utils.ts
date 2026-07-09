import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export const statusColors: Record<string, string> = {
  IDLE: "bg-white/5 text-white/50 border-white/10",
  RESEARCHING: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  WRITING: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  WAITING_APPROVAL: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  SENDING_APPROVED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  UPDATING_CRM: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  MEETING_SCHEDULED: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  MONITORING: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  ANALYZING: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  ERROR: "bg-red-500/10 text-red-300 border-red-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
};

export function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

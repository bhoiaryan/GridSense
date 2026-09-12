import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskLevel } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function riskClassName(risk: RiskLevel) {
  if (risk === "HIGH") {
    return "border-red-200 bg-red-50 text-grid-red";
  }

  if (risk === "MEDIUM") {
    return "border-amber-200 bg-amber-50 text-grid-amber";
  }

  return "border-emerald-200 bg-emerald-50 text-grid-green";
}

export function formatMw(value: number) {
  return `${value.toFixed(1)} MW`;
}

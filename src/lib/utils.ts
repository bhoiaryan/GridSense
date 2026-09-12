import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskLevel } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function riskClassName(risk: RiskLevel) {
  if (risk === "HIGH") {
    return "border-[#e9d0ce] bg-[#fff1f0] text-[#9b3f42]";
  }

  if (risk === "MEDIUM") {
    return "border-[#e5d9c2] bg-[#f9f1e5] text-[#7d6944]";
  }

  return "border-[#d6e7dd] bg-[#eef8f2] text-[#386c58]";
}

export function formatMw(value: number) {
  return `${value.toFixed(1)} MW`;
}

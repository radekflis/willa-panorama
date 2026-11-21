import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPln(amount: number | bigint): string {
  const num = typeof amount === "bigint" ? Number(amount) : amount;
  return `${num.toLocaleString("pl-PL")} zł`;
}

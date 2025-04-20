import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDefaultDownloadPath(): string {
  return '~/Downloads/';
}

export function getStoredDownloadPath(): string {
  if (typeof window === 'undefined') return getDefaultDownloadPath();
  return localStorage.getItem('downloadPath') || getDefaultDownloadPath();
}

export function setStoredDownloadPath(path: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('downloadPath', path);
}

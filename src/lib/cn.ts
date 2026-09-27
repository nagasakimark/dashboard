import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Join class names; later Tailwind classes win over conflicting earlier ones (e.g. w-full then w-20). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

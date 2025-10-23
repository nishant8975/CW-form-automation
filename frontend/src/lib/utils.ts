import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- NEW HELPER FUNCTIONS ADDED BELOW ---

/**
 * Formats a date string into a more readable format (e.g., "20 Oct 2025").
 * @param dateString The ISO date string to format.
 * @returns A formatted date string or a fallback character.
 */
export const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return dateString; // Fallback if the date string is invalid
    }
};

/**
 * Maps the backend status constants (e.g., "UNDER_REVIEW") to lowercase strings
 * that your StatusBadge component expects (e.g., "under_review").
 * @param status The status string from the API.
 * @returns A UI-friendly status string.
 */
export const mapStatusToUi = (status?: string) => {
    if (!status) return "pending";
    switch (status.toUpperCase()) {
        case "APPROVED": return "approved";
        case "UNDER_REVIEW": return "under_review";
        case "REJECTED": return "rejected";
        case "PENDING_HOD_EXCEPTION": return "pending_hod_exception";
        case "PENDING":
        default: return "pending";
    }
};

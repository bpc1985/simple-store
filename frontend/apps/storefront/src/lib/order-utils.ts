/**
 * Shared order display utilities.
 * Used across account page, orders list, and order detail.
 */

export type StatusVariant = "default" | "destructive" | "secondary";

export function getStatusVariant(status: string): StatusVariant {
  switch (status.toUpperCase()) {
    case "CONFIRMED":
    case "DELIVERED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

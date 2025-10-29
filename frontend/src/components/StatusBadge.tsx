import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

// ✨ FIX: Add 'pending_hod_exception' to the allowed status types
interface StatusBadgeProps {
  status: "pending" | "approved" | "rejected" | "under_review" | "pending_hod_exception";
  size?: "sm" | "md" | "lg";
}

export const StatusBadge = ({ status, size = "md" }: StatusBadgeProps) => {
  const configs = {
    pending: {
      label: "Pending",
      icon: Clock,
      className: "bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200", // Using orange for pending
    },
    approved: {
      label: "Approved",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-600 border-green-200 hover:bg-green-200", // Using green-based theme
    },
    rejected: {
      label: "Rejected",
      icon: XCircle,
      className: "bg-red-100 text-red-600 border-red-200 hover:bg-red-200", // Using red-based theme
    },
    under_review: {
      label: "Under Review",
      icon: Clock, // Using Clock for under review as well, maybe differentiate color slightly
      className: "bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200", // Using blue-based theme
    },
    // ✨ NEW: Add configuration for the HOD exception status
    pending_hod_exception: {
      label: "Pending HOD Exception",
      icon: AlertCircle, // Using AlertCircle to indicate warning/exception
      className: "bg-yellow-100 text-yellow-600 border-yellow-200 hover:bg-yellow-200", // Using yellow-based theme
    },
  };

  // Fallback to 'pending' config if an unexpected status is passed
  const config = configs[status] || configs.pending;
  const Icon = config.icon;
 
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5", // Adjusted padding
    md: "text-sm px-2.5 py-1", // Adjusted padding
    lg: "text-base px-3 py-1.5", // Adjusted padding
  };

  return (
    <Badge
        variant="outline" // Use outline variant for consistency with border colors
        className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.className} ${sizeClasses[size]}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
};


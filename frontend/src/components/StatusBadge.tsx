import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: "pending" | "approved" | "rejected" | "under_review";
  size?: "sm" | "md" | "lg";
}

export const StatusBadge = ({ status, size = "md" }: StatusBadgeProps) => {
  const configs = {
    pending: {
      label: "Pending",
      icon: Clock,
      className: "bg-pending/10 text-pending border-pending/20 hover:bg-pending/20",
    },
    approved: {
      label: "Approved",
      icon: CheckCircle2,
      className: "bg-success/10 text-success border-success/20 hover:bg-success/20",
    },
    rejected: {
      label: "Rejected",
      icon: XCircle,
      className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
    },
    under_review: {
      label: "Under Review",
      icon: AlertCircle,
      className: "bg-info/10 text-info border-info/20 hover:bg-info/20",
    },
  };

  const config = configs[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <Badge className={`${config.className} ${sizeClasses[size]} font-medium border transition-smooth`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {config.label}
    </Badge>
  );
};

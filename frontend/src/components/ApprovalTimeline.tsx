import { CheckCircle2, Clock, XCircle, User } from "lucide-react";

interface ApprovalStep {
  id: string;
  title: string;
  person: string;
  status: "completed" | "pending" | "rejected" | "current";
  timestamp?: string;
  remarks?: string;
}

interface ApprovalTimelineProps {
  steps: ApprovalStep[];
}

export const ApprovalTimeline = ({ steps }: ApprovalTimelineProps) => {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        const statusConfig = {
          completed: {
            icon: CheckCircle2,
            iconColor: "text-success",
            lineColor: "bg-success",
            bgColor: "bg-success/10",
            borderColor: "border-success",
          },
          current: {
            icon: Clock,
            iconColor: "text-info",
            lineColor: "bg-info",
            bgColor: "bg-info/10",
            borderColor: "border-info",
          },
          pending: {
            icon: Clock,
            iconColor: "text-muted-foreground",
            lineColor: "bg-border",
            bgColor: "bg-muted",
            borderColor: "border-border",
          },
          rejected: {
            icon: XCircle,
            iconColor: "text-destructive",
            lineColor: "bg-destructive",
            bgColor: "bg-destructive/10",
            borderColor: "border-destructive",
          },
        };

        const config = statusConfig[step.status];
        const Icon = config.icon;

        return (
          <div key={step.id} className="relative pl-8">
            {/* Timeline dot and line */}
            <div className="absolute left-0 top-0 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
              </div>
              {!isLast && (
                <div className={`w-0.5 h-full min-h-[40px] ${config.lineColor} mt-2`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 ${step.status === "current" ? "opacity-100" : "opacity-80"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{step.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>{step.person}</span>
                  </div>
                  {step.timestamp && (
                    <p className="text-xs text-muted-foreground mt-1">{step.timestamp}</p>
                  )}
                  {step.remarks && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{step.remarks}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

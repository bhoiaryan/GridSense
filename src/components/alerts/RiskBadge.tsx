import type { RiskLevel } from "../../types";
import { cn, riskClassName } from "../../lib/utils";

interface RiskBadgeProps {
  risk: RiskLevel;
  className?: string;
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-bold", riskClassName(risk), className)}>
      {risk} RISK
    </span>
  );
}

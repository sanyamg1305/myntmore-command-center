import type { StatusKey } from "@/lib/metrics";
import { STATUS_LABEL } from "@/lib/metrics";

const styles: Record<StatusKey, string> = {
  over: "bg-status-over text-white",
  on: "bg-status-on text-white",
  risk: "bg-status-risk text-black",
  off: "bg-status-off text-white",
  none: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  manual,
}: {
  status: StatusKey;
  manual?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}
    >
      {STATUS_LABEL[status]}
      {manual && (
        <span className="ml-1 rounded-sm bg-black/20 px-1 text-[9px]">M</span>
      )}
    </span>
  );
}

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export type HistoryRow = {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  reason: string | null;
  created_at: string;
  performed_by_user?: { name?: string } | null;
};

export function HistoryTimeline({
  rows,
  locale,
}: {
  rows: HistoryRow[];
  locale: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">-</p>;
  }

  return (
    <ol className="space-y-4">
      {rows.map((row) => (
        <li key={row.id} className="relative border-l-2 border-muted pl-4">
          <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{row.action}</Badge>
            {row.from_status && row.to_status && (
              <span className="text-xs text-muted-foreground">
                {row.from_status} → {row.to_status}
              </span>
            )}
          </div>
          {row.notes && (
            <p className="mt-1 text-sm text-foreground">{row.notes}</p>
          )}
          {row.reason && (
            <p className="mt-1 text-xs text-muted-foreground">
              reason: {row.reason}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {row.performed_by_user?.name ?? "-"} ·{" "}
            {formatDateTime(row.created_at, locale)}
          </p>
        </li>
      ))}
    </ol>
  );
}

import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  before: string | null;
  after: string | null;
  created_at: string;
  actor_name: string | null;
};

export default async function AuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("audit:read")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const { results } = await db
    .prepare(
      "SELECT a.id, a.action, a.target_type, a.target_id, a.before, a.after, a.created_at, u.name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT 200",
    )
    .all();

  const rows = (results ?? []) as AuditRow[];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("auditLog")}</h2>
        <p className="text-sm text-muted-foreground">{t("auditHint")}</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("noAudit")}</CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("date")}</TableHead>
                <TableHead>{t("actor")}</TableHead>
                <TableHead>{t("action")}</TableHead>
                <TableHead>{t("target")}</TableHead>
                <TableHead>{t("before")}</TableHead>
                <TableHead>{t("after")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(row.created_at, locale)}
                  </TableCell>
                  <TableCell className="text-sm">{row.actor_name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.action}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.target_type ?? "-"}
                    {row.target_id ? `:${row.target_id.slice(0, 8)}` : ""}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                    {row.before ?? "-"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                    {row.after ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

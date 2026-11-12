import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: number;
  created_at: string;
};

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("notifications");
  const ctx = await getAuthContext();
  if (!ctx.user) return null;

  const db = getDB();
  const { results } = await db
    .prepare(
      "SELECT id, title, body, type, entity_type, entity_id, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
    )
    .bind(ctx.user.id)
    .all();

  const rows = (results ?? []) as NotificationRow[];
  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("unread", { count: unread })}
          </p>
        </div>
        <MarkAllReadButton disabled={unread === 0} />
      </div>

      {rows.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {rows.map((row) => {
          const href =
            row.entity_type === "checkout_request" && row.entity_id
              ? `/${locale}/checkout/${row.entity_id}`
              : null;
          const content = (
            <Card className={row.is_read ? "opacity-70" : "border-primary/30 bg-primary/5"}>
              <CardContent className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{row.title}</p>
                  {!row.is_read && <Badge variant="default">{t("new")}</Badge>}
                </div>
                {row.body && <p className="text-sm text-muted-foreground">{row.body}</p>}
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(row.created_at, locale)}
                </p>
              </CardContent>
            </Card>
          );
          return href ? (
            <Link key={row.id} href={href} className="block">
              {content}
            </Link>
          ) : (
            <div key={row.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}

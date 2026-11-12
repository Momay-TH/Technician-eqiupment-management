"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { markAllNotificationsReadAction } from "@/app/[locale]/(app)/notifications/actions";
import { Button } from "@/components/ui/button";
import { CheckCheck, Loader2 } from "lucide-react";

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations("notifications");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || loading}
      onClick={async () => {
        setLoading(true);
        const res = await markAllNotificationsReadAction();
        setLoading(false);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        router.refresh();
      }}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CheckCheck className="mr-2 h-4 w-4" />
      )}
      {t("markAllRead")}
    </Button>
  );
}

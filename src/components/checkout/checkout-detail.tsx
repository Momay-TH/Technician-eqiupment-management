"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  approveCheckoutAction,
  cancelCheckoutAction,
  handoverItemAction,
  rejectCheckoutAction,
  returnItemAction,
} from "@/app/[locale]/(app)/checkout/actions";
import {
  CHECKOUT_ITEM_STATUS_META,
  CHECKOUT_STATUS_META,
  type CheckoutItemStatus,
  type CheckoutStatus,
} from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  RotateCcw,
  XCircle,
} from "lucide-react";

export type CheckoutDetailItem = {
  id: string;
  status: CheckoutItemStatus;
  checked_out_at: string | null;
  returned_at: string | null;
  condition_on_return: string | null;
  return_notes: string | null;
  equipment?: {
    id: string;
    asset_code: string;
    name: string;
    serial_number: string;
    status: string;
  } | null;
};

export type CheckoutDetailData = {
  id: string;
  code: string;
  status: CheckoutStatus;
  purpose: string | null;
  expected_return_date: string | null;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  requested_by_user?: { name?: string } | null;
  approved_by_user?: { name?: string } | null;
  items: CheckoutDetailItem[];
};

export function CheckoutDetail({
  request,
  locale,
  canApprove,
  canReturn,
  canCreate,
  isRequester,
}: {
  request: CheckoutDetailData;
  locale: string;
  canApprove: boolean;
  canReturn: boolean;
  canCreate: boolean;
  isRequester: boolean;
}) {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [handoverCode, setHandoverCode] = useState("");
  const [returnCode, setReturnCode] = useState("");
  const [returnCondition, setReturnCondition] = useState<"good" | "damaged">(
    "good",
  );
  const [returnNotes, setReturnNotes] = useState("");

  const statusMeta = CHECKOUT_STATUS_META[request.status];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue =
    request.status === "approved" &&
    request.expected_return_date != null &&
    new Date(request.expected_return_date) < today;

  const pendingItems = request.items.filter((i) => i.status === "pending");
  const checkedOutItems = request.items.filter(
    (i) => i.status === "checked_out",
  );

  function errorText(code: string) {
    switch (code) {
      case "CANNOT_APPROVE_OWN":
        return t("cannotApproveOwn");
      case "ITEM_NOT_FOUND":
        return t("itemNotFound");
      case "ITEM_NOT_AVAILABLE":
        return t("itemNotAvailable");
      case "REASON_REQUIRED":
        return t("rejectReasonRequired");
      default:
        return `${tc("error")} (${code})`;
    }
  }

  async function run(
    key: string,
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (!res.ok) {
      toast.error(errorText(res.error));
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  }

  const showApprove = canApprove && request.status === "pending" && !isRequester;
  const showCancel = isRequester && request.status === "pending";
  const showHandover =
    request.status === "approved" && pendingItems.length > 0 && (canApprove || isRequester);
  const showReturn = request.status === "approved" && checkedOutItems.length > 0 && canReturn;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-semibold">{request.code}</span>
            <Badge variant={statusMeta?.variant ?? "outline"}>
              {locale === "th"
                ? statusMeta?.labelTh ?? request.status
                : statusMeta?.labelEn ?? request.status}
            </Badge>
            {overdue && <Badge variant="destructive">{t("overdue")}</Badge>}
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">{t("requestedBy")}:</span>{" "}
              {request.requested_by_user?.name ?? "-"}
            </p>
            <p>
              <span className="text-muted-foreground">
                {t("expectedReturnDate")}:
              </span>{" "}
              {formatDate(request.expected_return_date, locale)}
            </p>
            <p>
              <span className="text-muted-foreground">{t("approvedBy")}:</span>{" "}
              {request.approved_by_user?.name ?? "-"}
            </p>
            <p>
              <span className="text-muted-foreground">{tc("createdAt")}:</span>{" "}
              {formatDateTime(request.created_at, locale)}
            </p>
            {request.purpose && (
              <p className="md:col-span-2">
                <span className="text-muted-foreground">{t("purpose")}:</span>{" "}
                {request.purpose}
              </p>
            )}
            {request.rejection_reason && (
              <p className="md:col-span-2 rounded-md bg-destructive/10 px-3 py-2 text-destructive">
                <span className="font-medium">{t("rejectReason")}:</span>{" "}
                {request.rejection_reason}
              </p>
            )}
          </div>

          {(showApprove || showCancel) && (
            <div className="flex flex-wrap gap-2">
              {showApprove && (
                <>
                  <Button
                    disabled={busy === "approve"}
                    onClick={() =>
                      void run(
                        "approve",
                        () => approveCheckoutAction(request.id),
                        t("approvedToast"),
                      )
                    }
                  >
                    {busy === "approve" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {t("approve")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setRejectOpen(true)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {t("reject")}
                  </Button>
                </>
              )}
              {showCancel && (
                <Button
                  variant="outline"
                  disabled={busy === "cancel"}
                  onClick={() =>
                    void run(
                      "cancel",
                      () => cancelCheckoutAction(request.id),
                      t("cancelSuccess"),
                    )
                  }
                >
                  {t("cancel")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("items")}{" "}
            <Badge variant="secondary">{request.items.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {request.items.length === 0 && (
            <p className="text-sm text-muted-foreground">{tc("noData")}</p>
          )}
          {request.items.map((item) => {
            const meta = CHECKOUT_ITEM_STATUS_META[item.status];
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.equipment?.name ?? "-"}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {item.equipment?.asset_code ?? "-"} ·{" "}
                    {item.equipment?.serial_number ?? "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.returned_at && (
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.returned_at, locale)}
                    </span>
                  )}
                  <Badge
                    variant={
                      item.status === "checked_out"
                        ? "default"
                        : item.status === "damaged"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {locale === "th" ? meta?.labelTh : meta?.labelEn}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {(showHandover || showReturn) && (
        <div className="grid gap-4 md:grid-cols-2">
          {showHandover && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PackageCheck className="h-4 w-4" />
                  {t("scanToHandover")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {t("handoverHint", { count: pendingItems.length })}
                </p>
                <Input
                  value={handoverCode}
                  onChange={(e) => setHandoverCode(e.target.value)}
                  placeholder="CCTV-CAM-0001"
                />
                <Button
                  disabled={busy === "handover" || !handoverCode.trim()}
                  onClick={async () => {
                    const ok = await run(
                      "handover",
                      () => handoverItemAction(request.id, handoverCode),
                      t("handoverSuccess"),
                    );
                    if (ok) setHandoverCode("");
                  }}
                >
                  {busy === "handover" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                  )}
                  {t("handover")}
                </Button>
              </CardContent>
            </Card>
          )}

          {showReturn && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RotateCcw className="h-4 w-4" />
                  {t("scanToReturn")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {t("returnHint", { count: checkedOutItems.length })}
                </p>
                <Input
                  value={returnCode}
                  onChange={(e) => setReturnCode(e.target.value)}
                  placeholder="CCTV-CAM-0001"
                />
                <div className="space-y-2">
                  <Label>{t("condition")}</Label>
                  <Select
                    value={returnCondition}
                    onValueChange={(v) =>
                      setReturnCondition((v ?? "good") as "good" | "damaged")
                    }
                    items={[
                      { value: "good", label: t("conditionGood") },
                      { value: "damaged", label: t("conditionDamaged") },
                    ]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">
                        {t("conditionGood")}
                      </SelectItem>
                      <SelectItem value="damaged">
                        {t("conditionDamaged")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("returnNotes")}</Label>
                  <Textarea
                    rows={2}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </div>
                <Button
                  disabled={busy === "return" || !returnCode.trim()}
                  onClick={async () => {
                    const ok = await run(
                      "return",
                      () =>
                        returnItemAction(
                          request.id,
                          returnCode,
                          returnCondition,
                          returnNotes,
                        ),
                      t("returnSuccess"),
                    );
                    if (ok) {
                      setReturnCode("");
                      setReturnNotes("");
                    }
                  }}
                >
                  {busy === "return" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  {t("return")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("reject")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("rejectReason")}</Label>
              <Textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={busy === "reject" || !rejectReason.trim()}
                onClick={async () => {
                  const ok = await run(
                    "reject",
                    () => rejectCheckoutAction(request.id, rejectReason),
                    t("rejectedToast"),
                  );
                  if (ok) {
                    setRejectOpen(false);
                    setRejectReason("");
                  }
                }}
              >
                {busy === "reject" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("reject")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {!canCreate && !canApprove && !canReturn && (
        <p className="text-xs text-muted-foreground">{tc("noData")}</p>
      )}
    </div>
  );
}

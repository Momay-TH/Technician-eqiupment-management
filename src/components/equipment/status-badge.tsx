import { Badge } from "@/components/ui/badge";
import { STATUS_META, type EquipmentStatus } from "@/lib/constants";

export function StatusBadge({
  status,
  locale,
}: {
  status: EquipmentStatus;
  locale: string;
}) {
  const meta = STATUS_META.find((s) => s.value === status);
  if (!meta) return <Badge variant="outline">{status}</Badge>;
  return (
    <Badge variant={meta.variant}>
      {locale === "th" ? meta.labelTh : meta.labelEn}
    </Badge>
  );
}

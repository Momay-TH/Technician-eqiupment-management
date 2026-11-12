import { setRequestLocale } from "next-intl/server";
import { KitsView } from "@/components/kits/kits-view";

export const dynamic = "force-dynamic";

export default async function KitsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <KitsView locale={locale} />;
}

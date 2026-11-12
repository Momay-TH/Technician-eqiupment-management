import { setRequestLocale } from "next-intl/server";
import { StocktakeView } from "@/components/stocktake/stocktake-view";

export const dynamic = "force-dynamic";

export default async function StocktakePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <StocktakeView locale={locale} />;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CameraOff, Loader2, Search } from "lucide-react";

function extractAssetCode(text: string): string {
  const value = text.trim();
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.indexOf("e");
    if (index >= 0 && parts[index + 1]) {
      return decodeURIComponent(parts[index + 1]);
    }
  } catch {
    // not a URL — treat as raw code
  }
  return value;
}

export function ScanClient({ locale }: { locale: string }) {
  const t = useTranslations("qr");
  const tc = useTranslations("common");
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const regionId = "qr-reader-region";
  const scalerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null,
  );

  function go(raw: string) {
    const code = extractAssetCode(raw);
    if (!code) return;
    router.push(`/${locale}/e/${encodeURIComponent(code)}`);
  }

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    setStarting(true);

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(regionId, { verbose: false });
        scalerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            cancelled = true;
            const scannerRef = scalerRef.current;
            scalerRef.current = null;
            setScanning(false);
            if (scannerRef) {
              scannerRef
                .stop()
                .then(() => scannerRef.clear())
                .catch(() => undefined);
            }
            go(decodedText);
          },
          () => undefined,
        );
        if (cancelled) {
          await scanner.stop().catch(() => undefined);
          scanner.clear();
        }
      } catch {
        if (!cancelled) {
          setError(t("cameraError"));
          setScanning(false);
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scalerRef.current;
      scalerRef.current = null;
      if (scanner) {
        scanner.stop().catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("scanCamera")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            id={regionId}
            className={
              scanning
                ? "overflow-hidden rounded-lg border bg-black/5"
                : "hidden"
            }
          />

          {!scanning ? (
            <Button onClick={() => setScanning(true)} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              {t("startScan")}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setScanning(false)}
            >
              <CameraOff className="mr-2 h-4 w-4" />
              {t("stopScan")}
            </Button>
          )}

          {starting && (
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {tc("loading")}
            </p>
          )}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("manualInput")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const code = extractAssetCode(manual);
              if (!code) {
                setError(t("notFound"));
                return;
              }
              go(code);
            }}
          >
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="CCTV-CAM-0001"
              autoFocus
            />
            <Button type="submit" disabled={!manual.trim()}>
              <Search className="mr-2 h-4 w-4" />
              {t("search")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">เกิดข้อผิดพลาด</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "Something went wrong."}
      </p>
      <Button onClick={reset}>ลองใหม่</Button>
    </div>
  );
}

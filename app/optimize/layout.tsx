"use client";

import { Suspense } from "react";
import { CVProvider } from "@/lib/cv-context";
import { Toaster } from "react-hot-toast";

export default function OptimizeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading optimizer…
        </div>
      }
    >
      <CVProvider>
        {children}
        <Toaster position="bottom-right" />
      </CVProvider>
    </Suspense>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function Inner({ message }: { message: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (sp.get("saved")) {
      toast.success(message);
      router.replace(window.location.pathname);
    }
  }, [sp, router, message]);
  return null;
}

import { Suspense } from "react";
export function SavedToast({ message }: { message: string }) {
  return (
    <Suspense>
      <Inner message={message} />
    </Suspense>
  );
}

"use client";

import { SmartImport } from "@/components/salvo/SmartImport";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Import</h1>
        <p className="text-sm text-ink-2">Upload and map your property list</p>
      </div>
      <SmartImport onComplete={() => router.push("/offers")} />
    </div>
  );
}

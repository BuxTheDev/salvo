import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/salvo/ComingSoon";

export default function TemplatesPage() {
  return (
    <ComingSoon
      icon={FileText}
      title="LOI template editor"
      description="Edit clause text and layout for the Creative and Cash LOI PDFs directly from the browser."
      phase="Phase 3+"
    />
  );
}

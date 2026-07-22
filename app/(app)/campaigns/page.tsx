import { History } from "lucide-react";
import { ComingSoon } from "@/components/salvo/ComingSoon";

export default function CampaignsPage() {
  return (
    <ComingSoon
      icon={History}
      title="Campaign history"
      description="Past blasts and response tracking, mirrored from GoHighLevel. Ships with the GHL API integration."
      phase="Phase 4–5"
    />
  );
}

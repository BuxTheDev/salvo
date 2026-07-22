"use client";

import { FIELD_SPEC, type Field, type FieldMap } from "@/lib/engine/mapper";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FIELD_LABELS: Record<Field, string> = {
  address: "Address",
  city: "City",
  state: "State",
  zip: "Zip",
  owner_full: "Owner Full Name",
  owner_first: "Owner First Name",
  owner_last: "Owner Last Name",
  home_value: "Home Value",
  loan_balance: "Loan Balance",
  equity: "Equity",
  monthly_rent: "Monthly Rent",
  loan_payment: "Loan Payment",
  asking: "Asking Price",
  agent_name: "Agent Name",
  agent_email: "Agent Email",
  agent_phone: "Agent Phone",
  owner_cell: "Owner Cell",
  owner_email: "Owner Email",
};

const NONE = "__none__";

export function MappingGrid({
  headers,
  map,
  onChange,
}: {
  headers: string[];
  map: FieldMap;
  onChange: (field: Field, header: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {FIELD_SPEC.map((spec) => {
        const mapped = map[spec.field];
        return (
          <div key={spec.field} className="flex items-center justify-between gap-2 rounded-md border border-line bg-panel px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-ink">
                {FIELD_LABELS[spec.field]}
                {spec.required && <span className="text-loss"> *</span>}
              </span>
              {mapped && (
                <Badge variant={mapped.confidence === "auto" ? "gain" : mapped.confidence === "set" ? "steel" : "warn"} className="mt-1 w-fit">
                  {mapped.confidence}
                </Badge>
              )}
            </div>
            <Select
              value={mapped?.header ?? NONE}
              onValueChange={(v) => onChange(spec.field, v === NONE ? null : v)}
            >
              <SelectTrigger className="w-[170px] shrink-0 font-mono-data text-xs">
                <SelectValue placeholder="— none —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— none —</SelectItem>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

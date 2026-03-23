import fs from "fs";
import path from "path";
import { buildDataUses } from "./dataUseRules";

type PurposeCatalog = { version: string; purposes: Array<{ code: string; label: string; examples?: string[] }> };

let cache: PurposeCatalog | null = null;
export function loadPurposeCatalog(): PurposeCatalog {
  if (cache) return cache;
  const file = path.join(process.cwd(), "server", "catalogs", "purposes.ptBR.json");
  cache = JSON.parse(fs.readFileSync(file, "utf-8"));
  return cache!;
}

export function listPurposes() {
  return loadPurposeCatalog();
}

export function suggestDataUses(input: {
  subjectGroups: string[];
  dataElements: Array<{ name: string; sensivel?: boolean }>;
  purposeByDataElement: Record<string, string[]>;
  systems?: string[];
  channels?: string[];
  recipients?: string[];
  internationalTransfer?: boolean;
  operatorsCount?: number;
  volumeFrequency?: string;
  monitoring?: boolean;
}) {
  const uses = buildDataUses({
    subjectGroups: input.subjectGroups,
    dataElements: input.dataElements,
    purposeByDataElement: input.purposeByDataElement,
    systems: input.systems || [],
    channels: input.channels || [],
    recipients: input.recipients || [],
    internationalTransfer: !!input.internationalTransfer,
    operatorsCount: input.operatorsCount || 0,
    volumeFrequency: input.volumeFrequency,
    monitoring: !!input.monitoring,
  });
  return { ok: true, uses };
}

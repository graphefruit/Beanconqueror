import type { IHandoffImport } from '../../interfaces/brew/IHandoff';

export interface BrewImportProvenanceChip {
  sourceName: string;
  device?: string;
  sourceUrl?: string;
}

export function buildBrewImportProvenanceChip(
  imported?: IHandoffImport,
): BrewImportProvenanceChip | undefined {
  if (!imported) {
    return undefined;
  }

  // Re-check stored provenance: backup/JSON imports can bypass the handoff decoder.
  const sourceUrl = imported.sourceUrl?.startsWith('https:')
    ? imported.sourceUrl
    : undefined;

  return {
    sourceName: imported.sourceName,
    device: imported.device,
    sourceUrl,
  };
}

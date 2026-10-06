import type { IHandoffImport } from '../../interfaces/brew/IHandoff';

export interface BrewImportProvenanceChip {
  sourceName: string;
  device?: string;
  sourceUrl?: string;
}

export function buildBrewImportProvenanceChip(
  imported?: IHandoffImport,
): BrewImportProvenanceChip | undefined {
  if (!imported || typeof imported !== 'object') {
    return undefined;
  }

  // Re-check stored provenance: backup/JSON imports can bypass the handoff decoder.
  const sourceName =
    typeof imported.sourceName === 'string' ? imported.sourceName.trim() : '';
  if (!sourceName) {
    return undefined;
  }

  const device = typeof imported.device === 'string' ? imported.device : undefined;
  const sourceUrl =
    typeof imported.sourceUrl === 'string' &&
    imported.sourceUrl.startsWith('https://')
      ? imported.sourceUrl
      : undefined;

  return {
    sourceName,
    device,
    sourceUrl,
  };
}

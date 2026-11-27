const CLOUD_FOLDER = 'Cloud/';

/**
 * The places in the app data directory where a stored photo path may point
 * to, in the order to try them.
 *
 * Early iOS versions stored photo paths with a leading 'Cloud/' that is not
 * part of the location; backups carry these paths to every platform. The
 * stored path is never changed. The place a platform used before comes first,
 * so a file found there is still the one found, and the cleaned path is tried
 * after it. Absolute 'file://' URIs, as stored by early iOS versions, are
 * used as they are.
 */
export function photoPathCandidates(path: string, isIos: boolean): string[] {
  if (path.startsWith('file://')) {
    return [path];
  }
  const relative = path.startsWith('/') ? path.slice(1) : path;
  if (!relative.startsWith(CLOUD_FOLDER)) {
    return [relative];
  }
  const cleaned = relative.slice(CLOUD_FOLDER.length);
  return isIos ? [cleaned, relative] : [relative, cleaned];
}

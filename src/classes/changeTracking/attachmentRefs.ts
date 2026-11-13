import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';
import { ATTACHMENT_KIND } from '../../interfaces/changeTracking/iAttachmentManifest';

/** A file an entry refers to. */
export interface AttachmentRef {
  path: string;
  kind: ATTACHMENT_KIND;
}

/** Where to look for a referenced file. */
export interface AttachmentStatTarget {
  path: string;
  /**
   * True for absolute file URIs, which are checked as they are; otherwise
   * the path is relative to the data directory of the app.
   */
  absolute: boolean;
}

/**
 * The files a stored entry of `_collection` refers to: its photos and, for
 * brews, graphs and barista mode brews, its flow profiles. Takes the stored
 * (raw) entry. Every path is listed once, as the entry references it.
 */
export function collectAttachmentRefs(
  _collection: string,
  _rawEntry: any,
): AttachmentRef[] {
  const refs: AttachmentRef[] = [];
  if (_rawEntry === null || typeof _rawEntry !== 'object') {
    return refs;
  }
  const seen = new Set<string>();
  const add = (_path: unknown, _kind: ATTACHMENT_KIND) => {
    if (typeof _path !== 'string' || _path.trim() === '' || seen.has(_path)) {
      return;
    }
    seen.add(_path);
    refs.push({ path: _path, kind: _kind });
  };

  if (_collection !== 'GRAPH' && Array.isArray(_rawEntry.attachments)) {
    for (const attachment of _rawEntry.attachments) {
      add(attachment, 'photo');
    }
  }

  switch (_collection) {
    case 'BREWS':
      add(_rawEntry.flow_profile, 'brew_flow_profile');
      // Same rule as Brew.getGraphPath for an imported reference graph.
      if (
        _rawEntry.reference_flow_profile?.type ===
          REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH &&
        typeof _rawEntry.config?.uuid === 'string'
      ) {
        add(
          'importedGraph/' + _rawEntry.config.uuid + '_flow_profile.json',
          'imported_flow_profile',
        );
      }
      break;
    case 'GRAPH':
      add(_rawEntry.flow_profile, 'graph_flow_profile');
      break;
    case 'BARISTAMODE_BREWS':
      add(_rawEntry.flow_profile, 'baristamode_flow_profile');
      break;
  }
  return refs;
}

/**
 * Type after the file name. The content of the file is not checked here,
 * so a photo stored under another extension gets the wrong type.
 */
export function mimeFromPath(_path: string): string {
  const name = _path.split(/[/\\]/).pop() ?? '';
  const dot = name.lastIndexOf('.');
  const extension = dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    case 'json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Where a referenced file is looked up, following the rules used to show
 * photos: a leading '/' is left out (UIFileHelper.normalizeFileName), and on
 * iOS a leading 'Cloud/' as well (UIFileHelper.getInternalFileSrc).
 * Absolute 'file://' URIs, as stored by early iOS versions, are checked as
 * they are. Only for looking up; the stored path is never changed.
 */
export function resolveForStat(
  _path: string,
  _isIos: boolean,
): AttachmentStatTarget {
  if (_path.startsWith('file://')) {
    return { path: _path, absolute: true };
  }
  let path = _path.startsWith('/') ? _path.slice(1) : _path;
  const cloud = 'Cloud/';
  if (_isIos && path.startsWith(cloud)) {
    path = path.substring(cloud.length);
  }
  return { path, absolute: false };
}

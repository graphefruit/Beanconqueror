import type { UIAlert } from '../services/uiAlert';
import { StorageClass, StorageClassAddResult } from './storageClass';

/**
 * Runs a write of a collection and resolves whether it was stored. When it
 * was not, the user has got exactly one message afterwards: the one of the
 * collection, or its `STORAGE_SAVE_FAILED` from here when the collection
 * stayed silent, since it does not report every write it turns down.
 */
export async function storedOrReported(
  _uiAlert: Pick<UIAlert, 'showMessage'>,
  _write: () => Promise<boolean | StorageClassAddResult>,
): Promise<boolean> {
  const shown = StorageClass.getMessagesShown();
  const result = await _write();
  const saved = typeof result === 'boolean' ? result : result.saved;
  if (!saved && StorageClass.getMessagesShown() === shown) {
    await _uiAlert.showMessage(
      'STORAGE_SAVE_FAILED',
      undefined,
      undefined,
      true,
    );
  }
  return saved;
}

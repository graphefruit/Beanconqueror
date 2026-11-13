import { inject, InjectionToken } from '@angular/core';

import { Platform } from '@ionic/angular/standalone';

import { FileInfo, Filesystem } from '@capacitor/filesystem';

import { UIFileHelper } from '../uiFileHelper';

/**
 * File access for the backups written before an import. Paths are relative
 * to the app data directory (UIFileHelper.getDataDirectory()). Unit tests
 * replace the file system at this boundary.
 */
export interface PreImportBackupFiles {
  /** False where the app has no file system of its own, in the browser. */
  isAvailable: () => boolean;
  /** Writes `_data` to `_path`, missing folders are created. */
  write: (_path: string, _data: Blob) => Promise<void>;
  /** Files directly in `_folder`, none when the folder does not exist. */
  list: (_folder: string) => Promise<FileInfo[]>;
  remove: (_path: string) => Promise<void>;
}

/** Code of Filesystem.readdir() for a folder that does not exist. */
const FOLDER_NOT_FOUND = 'OS-PLUG-FILE-0008';

export const PRE_IMPORT_BACKUP_FILES = new InjectionToken<PreImportBackupFiles>(
  'PRE_IMPORT_BACKUP_FILES',
  {
    providedIn: 'root',
    factory: () => {
      const platform = inject(Platform);
      const uiFileHelper = inject(UIFileHelper);
      return {
        isAvailable: () => platform.is('capacitor'),
        write: async (_path: string, _data: Blob) => {
          await uiFileHelper.writeFileFromBlob(
            _data,
            _path,
            uiFileHelper.getDataDirectory(),
          );
        },
        list: async (_folder: string) => {
          try {
            const { files } = await Filesystem.readdir({
              path: _folder,
              directory: uiFileHelper.getDataDirectory(),
            });
            return files.filter((_file) => _file.type === 'file');
          } catch (error) {
            if ((error as { code?: unknown })?.code === FOLDER_NOT_FOUND) {
              return [];
            }
            throw error;
          }
        },
        remove: (_path: string) =>
          uiFileHelper.deleteFile(_path, uiFileHelper.getDataDirectory()),
      };
    },
  },
);

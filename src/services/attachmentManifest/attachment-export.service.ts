import { inject, Service } from '@angular/core';

import { Directory, Filesystem } from '@capacitor/filesystem';

import { UIFileHelper } from '../uiFileHelper';
import { UILog } from '../uiLog';
import { AttachmentManifestService } from './attachment-manifest.service';

export interface ExportFolder {
  path: string;
  directory: Directory;
}

export interface FullExportResult {
  /** Referenced files that could not be copied. */
  missing: number;
  /** True when the export was stopped; nothing in the folder was replaced. */
  aborted: boolean;
}

/**
 * Writes a full export: the zip of the data and every photo and flow profile
 * file the attachment manifest names, under the path the app stores it at.
 *
 * Everything is first written to a staging folder inside the export folder.
 * Only when all of it is there, files of an earlier export are replaced, the
 * zip last. A failure before that removes the staging folder again, so no
 * files without their zip are left behind. An export that was stopped, or
 * ended with the app, keeps its staging folder, and the next one goes on
 * from there: a file is copied as `<name>.part` and only gets its name when
 * complete, so a file with its name is never copied again.
 */
@Service()
export class AttachmentExportService {
  public static readonly ZIP_NAME = 'Beanconqueror.zip';
  public static readonly STAGING_FOLDER = '.unfinished-export';
  /** Files copied between two turns of the event loop. */
  public static readonly PORTION = 25;

  private readonly manifest = inject(AttachmentManifestService);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiLog = inject(UILog);

  /**
   * Writes the zip and the referenced files into `_folder`. A file that
   * cannot be copied is logged and counted; anything else that fails
   * rejects.
   */
  public async writeExport(
    _folder: ExportFolder,
    _zip: Blob,
    _signal?: AbortSignal,
  ): Promise<FullExportResult> {
    const staging: ExportFolder = {
      path: `${_folder.path}/${AttachmentExportService.STAGING_FOLDER}`,
      directory: _folder.directory,
    };
    const resuming = await this.uiFileHelper.fileExists(staging);
    let copied: string[];
    let missing: number;
    try {
      const paths = await this.manifest.currentPaths();
      ({ copied, missing } = await this.__copyAll(
        paths,
        staging,
        resuming,
        _signal,
      ));
      if (_signal?.aborted) {
        return { missing, aborted: true };
      }
      await this.uiFileHelper.writeFileFromBlob(
        _zip,
        `${staging.path}/${AttachmentExportService.ZIP_NAME}`,
        staging.directory,
      );
    } catch (error) {
      await this.__removeStaging(staging);
      throw error;
    }
    // From here on the staging folder holds complete files only; when moving
    // fails it stays, and the next export finishes the move.
    const made = new Set<string>();
    for (const path of [...copied, AttachmentExportService.ZIP_NAME]) {
      await this.__makeParent(_folder, path, made);
      await Filesystem.rename({
        from: `${staging.path}/${path}`,
        to: `${_folder.path}/${path}`,
        directory: staging.directory,
        toDirectory: _folder.directory,
      });
    }
    await this.__removeStaging(staging);
    this.uiLog.log(
      `AttachmentExportService - exported ${copied.length} files, ${missing} missing`,
    );
    return { missing, aborted: false };
  }

  private async __copyAll(
    _paths: string[],
    _staging: ExportFolder,
    _resuming: boolean,
    _signal: AbortSignal | undefined,
  ): Promise<{ copied: string[]; missing: number }> {
    const copied: string[] = [];
    let missing = 0;
    const made = new Set<string>();
    const dataDirectory = this.uiFileHelper.getDataDirectory();
    for (let i = 0; i < _paths.length; i++) {
      if (_signal?.aborted) {
        break;
      }
      if (i > 0 && i % AttachmentExportService.PORTION === 0) {
        await new Promise((_resolve) => setTimeout(_resolve, 0));
      }
      const path = _paths[i];
      const target = `${_staging.path}/${path}`;
      const unfinished = target + '.part';
      if (
        _resuming &&
        (await this.uiFileHelper.fileExists({
          path: target,
          directory: _staging.directory,
        }))
      ) {
        copied.push(path);
        continue;
      }
      try {
        await this.__makeParent(_staging, path, made);
        if (_resuming) {
          await this.__delete(unfinished, _staging.directory);
        }
        await Filesystem.copy({
          from: await this.uiFileHelper.resolvePhotoPath(path),
          directory: dataDirectory,
          to: unfinished,
          toDirectory: _staging.directory,
        });
        await Filesystem.rename({
          from: unfinished,
          to: target,
          directory: _staging.directory,
          toDirectory: _staging.directory,
        });
        copied.push(path);
      } catch (error) {
        this.uiLog.error(
          'Error while exporting',
          path,
          error,
          '.The error will be ignored.',
        );
        missing++;
        await this.__delete(unfinished, _staging.directory);
      }
    }
    return { copied, missing };
  }

  private async __makeParent(
    _folder: ExportFolder,
    _path: string,
    _made: Set<string>,
  ): Promise<void> {
    const parent = _path.substring(0, _path.lastIndexOf('/'));
    if (!_made.has(parent)) {
      await this.uiFileHelper.makeParentDirs(
        `${_folder.path}/${_path}`,
        _folder.directory,
      );
      _made.add(parent);
    }
  }

  private async __delete(_path: string, _directory: Directory): Promise<void> {
    try {
      await Filesystem.deleteFile({ path: _path, directory: _directory });
    } catch {
      // There was nothing to delete.
    }
  }

  private async __removeStaging(_staging: ExportFolder): Promise<void> {
    if (!(await this.uiFileHelper.fileExists(_staging))) {
      return;
    }
    try {
      await Filesystem.rmdir({ ..._staging, recursive: true });
    } catch (error) {
      this.uiLog.error('Could not remove the staging folder', error);
    }
  }
}

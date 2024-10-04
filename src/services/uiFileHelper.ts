/** Core */
import { Injectable } from '@angular/core';
import { Capacitor, CapacitorException } from '@capacitor/core';
import {
  Filesystem,
  Directory,
  Encoding,
  StatOptions,
} from '@capacitor/filesystem';
import { Platform } from '@ionic/angular';
import { DomSanitizer } from '@angular/platform-browser';
import { UILog } from './uiLog';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import moment from 'moment';
import { InstanceClass } from './instanceClass';

/**
 * Handles every helping functionalities
 */
declare var navigator: any;
@Injectable({
  providedIn: 'root',
})
export class UIFileHelper extends InstanceClass {
  constructor(
    private readonly uiLog: UILog,
    private readonly platform: Platform,
    private readonly domSanitizer: DomSanitizer,
    private readonly socialSharing: SocialSharing
  ) {
    super();
  }

  public getDataDirectory(): Directory {
    if (this.platform.is('ios') && this.platform.is('cordova')) {
      return Directory.Documents;
    } else if (this.platform.is('android') && this.platform.is('cordova')) {
      return Directory.Data;
    } else {
      throw new Error(`Unsupported platform: ${this.platform.platforms()}`);
    }
  }

  public normalizeFileName(fileName: string): string {
    if (fileName.startsWith('/')) {
      return fileName.slice(1);
    }
    return fileName;
  }

  public async readFileAsText(
    path: string,
    directory?: Directory
  ): Promise<string> {
    this.uiLog.debug(
      'readFileAsText for path',
      path,
      'in directory',
      directory
    );

    if (!this.platform.is('cordova')) {
      throw new Error(
        'File system operations are only supported on native platforms.'
      );
    }

    const readResult = await Filesystem.readFile({
      path: path,
      directory: directory,
      encoding: Encoding.UTF8,
    });

    if (readResult.data instanceof Blob) {
      throw new Error(
        'Filesystem.readFile() returned a Blob, this is not ' +
          'supposed to happen on Capacitor platforms according to the ' +
          'documentation!'
      );
    }
    // returned data is a plain text string because we set the encoding
    return readResult.data as string;
  }

  public async readInternalFileAsText(fileName: string): Promise<string> {
    this.uiLog.debug('readInternalFileAsText for fileName', fileName);
    return this.readFileAsText(
      this.normalizeFileName(fileName),
      this.getDataDirectory()
    );
  }

  public async readFileAsBase64(
    path: string,
    directory?: Directory
  ): Promise<string> {
    this.uiLog.debug(
      'readFileAsBase64 for path',
      path,
      'in directory',
      directory
    );

    if (!this.platform.is('cordova')) {
      throw new Error(
        'File system operations are only supported on native platforms.'
      );
    }

    const readResult = await Filesystem.readFile({
      path: path,
      directory: directory,
    });

    if (readResult.data instanceof Blob) {
      throw new Error(
        'Filesystem.readFile() returned a Blob, this is not ' +
          'supposed to happen on Capacitor platforms according to the ' +
          'documentation!'
      );
    }
    // returned data is a base64 string of the file contents
    return readResult.data as string;
  }

  public async readInternalFileAsBase64(fileName: string): Promise<string> {
    this.uiLog.debug('readInternalFileAsBase64 for fileName:', fileName);
    return this.readFileAsBase64(
      this.normalizeFileName(fileName),
      this.getDataDirectory()
    );
  }

  public async readFileAsUint8Array(
    path: string,
    directory?: Directory
  ): Promise<Uint8Array> {
    this.uiLog.debug(
      'readFileAsUint8Array for path',
      path,
      'in directory',
      directory
    );

    const base64 = await this.readFileAsBase64(path, directory);
    return this.binaryStringToUint8Array(atob(base64));
  }

  public async readInternalFileAsUint8Array(
    fileName: string
  ): Promise<Uint8Array> {
    this.uiLog.debug('readInternalFileAsUint8Array for fileName:', fileName);

    return this.readFileAsUint8Array(
      this.normalizeFileName(fileName),
      this.getDataDirectory()
    );
  }

  public async readJSONFile(path: string, directory?: Directory): Promise<any> {
    this.uiLog.debug('readJSONFile for path', path, 'in directory', directory);
    try {
      const fileContent = await this.readFileAsText(path, directory);
      const parsedJSON = JSON.parse(fileContent);
      return parsedJSON;
    } catch (error) {
      this.uiLog.error(
        'Error in readJSONFile for path',
        path,
        'in directory',
        directory,
        '; Error: ',
        error
      );
      throw error;
    }
  }

  public async readInternalJSONFile(path: string): Promise<any> {
    this.uiLog.debug('readInternalJSONFile for path', path);
    return this.readJSONFile(path, this.getDataDirectory());
  }

  public async writeFileFromBase64(
    base64: string,
    path: string,
    directory?: Directory
  ): Promise<string> {
    this.uiLog.debug(
      'writeFileFromBase64 for path',
      path,
      'in directory',
      directory
    );

    if (!this.platform.is('cordova')) {
      throw new Error(
        'File system operations are only supported on native platforms.'
      );
    }

    const writeResult = await Filesystem.writeFile({
      data: base64,
      path: path,
      directory: directory,
      recursive: true, // create parent directories
    });

    this.uiLog.debug(
      'writeFileFromBase64 successful for path',
      path,
      'in directory',
      directory,
      '; Result URI is',
      writeResult.uri
    );

    // return the relative path we used to write the file instead of the
    // absolute path returned in writeResult.uri for backwards compatibility
    // with cordova-plugin-file.
    return path;
  }

  public async writeInternalFileFromBase64(
    base64: string,
    path: string
  ): Promise<string> {
    this.uiLog.debug('writeInternalFileFromBase64 for path', path);
    return this.writeFileFromBase64(base64, path, this.getDataDirectory());
  }

  public async writeFileFromBlob(
    blob: Blob,
    path: string,
    directory?: Directory
  ): Promise<string> {
    this.uiLog.debug(
      'writeFileFromBlob for path',
      path,
      'in directory',
      directory
    );

    const base64 = await this.blobToBase64(blob);
    return this.writeFileFromBase64(base64, path, directory);
  }

  public async writeInternalFileFromBlob(
    blob: Blob,
    path: string
  ): Promise<string> {
    this.uiLog.debug('writeInternalFileFromBlob for path', path);
    return this.writeFileFromBlob(blob, path, this.getDataDirectory());
  }

  public async writeFileFromText(
    text: string,
    path: string,
    directory?: Directory
  ): Promise<string> {
    this.uiLog.debug(
      'writeFileFromText for path',
      path,
      'in directory',
      directory
    );

    if (!this.platform.is('cordova')) {
      throw new Error(
        'File system operations are only supported on native platforms.'
      );
    }

    const writeResult = await Filesystem.writeFile({
      data: text,
      path: path,
      directory: directory,
      encoding: Encoding.UTF8, // text mode
      recursive: true, // create parent directories
    });

    this.uiLog.debug(
      'writeFileFromText successful for path',
      path,
      'in directory',
      directory,
      '; Result URI is',
      writeResult.uri
    );

    // return the relative path we used to write the file instead of the
    // absolute path returned in writeResult.uri for backwards compatibility
    // with cordova-plugin-file.
    return path;
  }

  public async writeInternalFileFromText(
    text: string,
    path: string
  ): Promise<string> {
    this.uiLog.debug('writeInternalFileFromText for path', path);
    return this.writeFileFromText(text, path, this.getDataDirectory());
  }

  public async generateInternalPath(
    fileName: string,
    fileExtension: string
  ): Promise<string> {
    this.uiLog.debug(
      'generateInternalPath for fileName',
      fileName,
      'and extension',
      fileExtension
    );
    let generatedFileName = `${fileName}${fileExtension}`;
    let fileExists = await this.fileExists({
      path: generatedFileName,
      directory: this.getDataDirectory(),
    });
    if (!fileExists) {
      this.uiLog.debug(generatedFileName, 'does not exist yet, using that');
      return generatedFileName;
    }

    let counter = 0;
    do {
      counter++;
      generatedFileName = `${fileName}${counter}${fileExtension}`;

      fileExists = await this.fileExists({
        path: generatedFileName,
        directory: this.getDataDirectory(),
      });
    } while (fileExists);
    this.uiLog.debug(generatedFileName, 'does not exist yet, using that');
    return generatedFileName;
  }

  public async deleteFile(path: string, directory?: Directory): Promise<void> {
    this.uiLog.debug('deleteFile for path', path, 'in directory', directory);

    if (!this.platform.is('cordova')) {
      throw new Error(
        'File system operations are only supported on native platforms.'
      );
    }

    await Filesystem.deleteFile({
      path: path,
      directory: directory,
    });
  }

  public async deleteInternalFile(path: string): Promise<void> {
    this.uiLog.debug('deleteInternalFile for path', path);
    await this.deleteFile(path, this.getDataDirectory());
  }

  public async deleteZIPBackupsOlderThanSevenDays(): Promise<void> {
    this.uiLog.debug('deleteZIPBackupsOlderThanSevenDays starting');

    if (!this.platform.is('cordova')) {
      throw new Error(
        'File system operations are only supported on native platforms.'
      );
    }

    const lastSevenDays: string[] = [];
    for (let i = 0; i < 8; i++) {
      const day: string = moment().subtract(i, 'days').format('DD_MM_YYYY');
      const automatedBackupFileName: string =
        'Beanconqueror_automatic_export_' + day + '.zip';
      lastSevenDays.push(automatedBackupFileName);
    }

    try {
      const exportDir = await Filesystem.readdir({
        path: 'Download/Beanconqueror_export/',
        directory: Directory.External,
      });

      for (const directoryEntry of exportDir.files) {
        if (directoryEntry.type !== 'file') {
          continue;
        }

        if (
          !directoryEntry.name.startsWith('Beanconqueror_automatic_export_')
        ) {
          // If the file does not start with our prefix then don't touch it
          continue;
        }

        if (lastSevenDays.indexOf(directoryEntry.name) > -1) {
          this.uiLog.info(
            'Backup file ',
            directoryEntry.name,
            'is not older than 7 days, so we will keep it'
          );
          continue;
        }

        try {
          this.uiLog.info(
            'Deleting outdated backup file',
            directoryEntry.name,
            'at URI',
            directoryEntry.uri
          );
          await Filesystem.deleteFile({ path: directoryEntry.uri });
        } catch (error) {
          this.uiLog.error(
            'Could not remove automated backup file at',
            directoryEntry.uri,
            '; Error:',
            error
          );
          // don't rethrow, continue with all the other files instead
          continue;
        }
      }
    } catch (error) {
      this.uiLog.error(
        'Error occured in deleteZIPBackupsOlderThanSevenDays',
        error
      );
      throw error;
    }
  }

  public async downloadExternalFile(
    url: string,
    fileName: string = 'beanconqueror_image',
    fileExtension: string = '.png'
  ): Promise<string> {
    const path = await this.generateInternalPath(fileName, fileExtension);
    const directory = this.getDataDirectory();
    const result = await Filesystem.downloadFile({ url, path, directory });

    this.uiLog.debug(
      'downloadExternalFile successful for url',
      url,
      'to path',
      path,
      'in directory',
      directory,
      '; Result path is',
      result.path
    );

    // return the relative path we used to write the file instead of the
    // absolute path returned in result.path for backwards compatibility
    // with cordova-plugin-file.
    return path;
  }

  // TODO Capacitor migration: Give this a better name
  public async exportFile(
    fileName: string,
    blob: Blob,
    share: boolean = true
  ): Promise<string | undefined> {
    if (this.platform.is('cordova')) {
      const path = `Download/Beanconqueror_export/${fileName}`;
      await this.writeFileFromBlob(blob, path, Directory.External);
      const { uri: exportUri } = await Filesystem.getUri({
        path,
        directory: Directory.External,
      });
      if (share === true) {
        this.socialSharing.share(undefined, undefined, exportUri);
      }
      return path;
    } else {
      // We are in a browser
      setTimeout(() => {
        if (navigator.msSaveBlob) {
          // IE 10+
          navigator.msSaveBlob(blob, fileName);
        } else {
          const link = document.createElement('a');
          if (link.download !== undefined) {
            // feature detection
            // Browsers that support HTML5 download attribute
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }, 250);
      return fileName;
    }
  }

  public async makeParentDirs(
    path: string,
    directory?: Directory
  ): Promise<void> {
    this.uiLog.debug(
      'makeParentDirs for path',
      path,
      'in directory',
      directory
    );

    const parts = this.splitFilePath(path);

    this.uiLog.debug(
      'Calling mkdir() with path',
      path,
      'in directory',
      directory
    );
    try {
      await Filesystem.mkdir({
        path: parts.FILE_PATH,
        recursive: true,
        directory: directory,
      });
    } catch (error) {
      if (
        error instanceof CapacitorException &&
        error.message === 'Directory exists'
      ) {
        // If the directory already exists just ignore the error
        return;
      }
      throw error;
    }
  }
  public makeParentDirsInternal(path: string): Promise<void> {
    this.uiLog.debug('makeParentDirsInternal for path', path);
    return this.makeParentDirs(path, this.getDataDirectory());
  }

  public async duplicateInternalFile(path: string): Promise<string> {
    this.uiLog.debug('duplicateInternalFile for path', path);

    if (!this.platform.is('cordova')) {
      throw new Error(
        'File system operations are only supported on native platforms.'
      );
    }

    const fileObj = this.splitFilePath(path);
    const newPath = await this.generateInternalPath(
      fileObj.FILE_NAME,
      fileObj.EXTENSION
    );
    await this.makeParentDirsInternal(newPath);
    const result = await Filesystem.copy({
      from: path,
      directory: this.getDataDirectory(),
      to: newPath,
      toDirectory: this.getDataDirectory(),
    });

    this.uiLog.debug(
      'duplicateInternalFile successful for original path',
      path,
      'duplicated to new path',
      newPath,
      '; Result uri is',
      result.uri
    );

    // return the relative path we used to write the file instead of the
    // absolute path returned in result.path for backwards compatibility
    // with cordova-plugin-file.
    return newPath;
  }

  private splitFilePath(_filePath: string): {
    FILE_NAME: string;
    FILE_PATH: string;
    EXTENSION: string;
  } {
    // TODO If we have folders, this won't work. because we're ignoring foldesrs i all subfunctions
    try {
      let filePath: string = _filePath.substr(0, _filePath.lastIndexOf('/'));

      if (filePath === '') {
        filePath = '/';
      }
      const fileName: string = _filePath.substr(
        _filePath.lastIndexOf('/') + 1,
        _filePath.lastIndexOf('.') - _filePath.lastIndexOf('/') - 1
      );
      const exstension: string = _filePath.substr(_filePath.lastIndexOf('.'));

      return {
        FILE_NAME: fileName,
        FILE_PATH: filePath,
        EXTENSION: exstension,
      };
    } catch (ex) {
      return {
        FILE_NAME: '',
        FILE_PATH: '',
        EXTENSION: '',
      };
    }
  }
  public async getInternalFileSrc(
    _filePath: string,
    _addTimeStamp: boolean = false
  ): Promise<any> {
    if (!this.platform.is('cordova')) {
      return '';
    }
    try {
      let fileName = this.normalizeFileName(_filePath);

      if (this.platform.is('ios')) {
        // After switching to iOS cloud, the fullPath saves the Cloud path actualy with, so we need to delete this one :)
        const searchForCloud: string = 'Cloud/';
        if (fileName.startsWith(searchForCloud)) {
          fileName = fileName.substring(searchForCloud.length);
        }
      }

      const fileOptions = {
        path: fileName,
        directory: this.getDataDirectory(),
      };
      // Check if file exists; stat() will throw if it does not exist
      await Filesystem.stat(fileOptions);
      const { uri } = await Filesystem.getUri(fileOptions);
      let fileSrcUri = Capacitor.convertFileSrc(uri);
      if (_addTimeStamp) {
        fileSrcUri += '?' + moment().unix();
      }
      return this.domSanitizer.bypassSecurityTrustResourceUrl(fileSrcUri);
    } catch (error) {
      this.uiLog.error(
        'Error in getInternalFileSrc for path',
        _filePath,
        ':',
        error
      );
      return '';
    }
  }

  public async fileExists(options: StatOptions): Promise<boolean> {
    try {
      await Filesystem.stat(options);
      return true;
    } catch (error) {
      return false;
    }
  }

  private binaryStringToUint8Array(binaryString: string): Uint8Array {
    const array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      array[i] = binaryString.charCodeAt(i);
    }
    return array;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.replace('data:*/*;base64', '');
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }
}

/** Core */
import { Injectable } from '@angular/core';
import {
  DirectoryEntry,
  Entry,
  File,
  FileEntry,
} from '@awesome-cordova-plugins/file/ngx';
import { Capacitor } from '@capacitor/core';
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
import {
  FileTransfer,
  FileTransferObject,
} from '@awesome-cordova-plugins/file-transfer/ngx';
import { InstanceClass } from './instanceClass';
/**
 * Handles every helping functionalities
 */
declare var navigator: any;
declare var window;
@Injectable({
  providedIn: 'root',
})
export class UIFileHelper extends InstanceClass {
  constructor(
    private readonly file: File,
    private readonly uiLog: UILog,
    private readonly platform: Platform,
    private readonly domSanitizer: DomSanitizer,
    private readonly socialSharing: SocialSharing,
    private readonly fileTransfer: FileTransfer
  ) {
    super();
  }

  // TODO Capacitor migration: Remove this method once Cordova file plugin is no longer needed
  private getFileDirectory(): string {
    if (this.platform.is('ios') && this.platform.is('cordova')) {
      return this.file.documentsDirectory;
    } else {
      return this.file.dataDirectory;
    }
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

  private normalizeFileName(fileName: string): string {
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

  public async getJSONFile(fileName: string): Promise<any> {
    try {
      const fileContent = await this.readInternalFileAsText(fileName);
      const parsedJSON = JSON.parse(fileContent);
      return parsedJSON;
    } catch (ex) {
      this.uiLog.error(`We could not read json file ${fileName}` + ex.message);
      throw ex;
    }
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

  public async deleteZIPBackupsOlderThanSevenDays(): Promise<void> {
    this.uiLog.debug('deleteZIPBackupsOlderThanSevenDays starting');

    if (!this.platform.is('cordova')) {
      throw new Error(
        'File system operations are only supported on native platforms.'
      );
    }

    let storageDirectory: Directory;
    if (this.platform.is('android')) {
      storageDirectory = Directory.External;
    } else {
      storageDirectory = Directory.Documents;
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
        directory: storageDirectory,
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
    _url: string,
    _fileName: string = 'beanconqueror_image',
    _fileExtension: string = '.png'
  ): Promise<string> {
    const promise: Promise<string> = new Promise(async (resolve, reject) => {
      const url: string = _url;
      const fileTransferObj: FileTransferObject = this.fileTransfer.create();
      await this.generateInternalPath(_fileName, _fileExtension).then(
        async (_newName) => {
          fileTransferObj
            .download(url, this.getFileDirectory() + _newName)
            .then(
              async (_entry) => {
                this.uiLog.log('File download completed: ' + _entry.fullPath);
                resolve(_entry.fullPath);
              },
              (error) => {
                // handle error
                resolve(undefined);
              }
            );
        }
      );
    });
    return promise;
  }

  // TODO Capacitor migration: Re-implement using Capacitor APIs
  public async downloadFile(
    _filename,
    _blob,
    _share: boolean = true
  ): Promise<FileEntry> {
    const promise: Promise<FileEntry> = new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        let storageLocation: string = '';
        if (this.platform.is('android')) {
          storageLocation = this.file.externalDataDirectory;
        } else {
          storageLocation = this.file.documentsDirectory;
        }
        if (storageLocation !== null && storageLocation !== undefined) {
          window.resolveLocalFileSystemURL(
            storageLocation,
            (fileSystem) => {
              fileSystem.getDirectory(
                'Download',
                {
                  create: true,
                  exclusive: false,
                },
                (directory) => {
                  directory.getDirectory(
                    'Beanconqueror_export',
                    {
                      create: true,
                      exclusive: false,
                    },
                    (directory_export) => {
                      // You need to put the name you would like to use for the file here.
                      directory_export.getFile(
                        _filename,
                        {
                          create: true,
                          exclusive: false,
                        },
                        (fileEntry: FileEntry) => {
                          fileEntry.createWriter(
                            (writer) => {
                              writer.onwriteend = () => {
                                if (_share === true) {
                                  this.socialSharing.share(
                                    undefined,
                                    undefined,
                                    fileEntry.nativeURL
                                  );
                                }
                                resolve(fileEntry);
                              };

                              writer.seek(0);
                              writer.write(_blob); // You need to put the file, blob or base64 representation here.
                            },
                            () => {
                              reject();
                            }
                          );
                        },
                        () => {
                          reject();
                        }
                      );
                    },
                    () => {
                      reject();
                    }
                  );
                },
                () => {
                  reject();
                }
              );
            },
            () => {
              reject();
            }
          );
        } else {
          reject();
        }
      } else {
        resolve(undefined);
        setTimeout(() => {
          if (navigator.msSaveBlob) {
            // IE 10+
            navigator.msSaveBlob(_blob, _filename);
          } else {
            const link = document.createElement('a');
            if (link.download !== undefined) {
              // feature detection
              // Browsers that support HTML5 download attribute
              const url = URL.createObjectURL(_blob);
              link.setAttribute('href', url);
              link.setAttribute('download', _filename);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }
        }, 250);
      }
    });
    return promise;
  }

  // TODO Capacitor migration: Re-implement using Capacitor APIs if still needed
  public createFolder(_path) {
    const promise: Promise<FileEntry> = new Promise(async (resolve, reject) => {
      const folders = _path.split('/');

      try {
        this.file.resolveDirectoryUrl(this.getFileDirectory()).then(
          (_rootDir: DirectoryEntry) => {
            this.createFolderInternal(
              _rootDir,
              folders,
              () => {
                resolve(undefined);
              },
              () => {
                reject();
              }
            );
          },
          () => {
            reject();
          }
        );
      } catch (ex) {
        reject();
      }
    });

    return promise;
  }

  private createFolderInternal(
    _rootDirEntry: DirectoryEntry,
    _folders,
    _resolve,
    _reject
  ) {
    // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
    if (_folders[0] === '.' || _folders[0] === '') {
      _folders = _folders.slice(1);
    }
    if (
      _folders === undefined ||
      _folders.length === 0 ||
      _folders[0].indexOf('.') >= 0
    ) {
      //  _folders[0].indexOf('.')  -> Means we got a file with a extension.
      _resolve(undefined);
    } else {
      this.file
        .getDirectory(_rootDirEntry, _folders[0], {
          create: true,
          exclusive: false,
        })
        .then(
          (dirEntry) => {
            // Recursively add the new subfolder (if we still have another to create).

            if (_folders.length) {
              this.createFolderInternal(
                dirEntry,
                _folders.slice(1),
                _resolve,
                _reject
              );
            } else {
              // All folders were created
              _resolve(undefined);
            }
          },
          () => {
            _reject();
          }
        );
    }
  }

  public async deleteFile(_filePath): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        const fileObj = this.__splitFilePath(_filePath);
        let filePath = this.getFileDirectory();

        if (filePath.endsWith('/') === false) {
          filePath = filePath + '/';
        }
        if (fileObj.FILE_PATH.startsWith('/')) {
          fileObj.FILE_PATH = fileObj.FILE_PATH.substr(1);
        }
        if (fileObj.FILE_PATH.endsWith('/')) {
          fileObj.FILE_PATH = fileObj.FILE_PATH.substr(
            0,
            fileObj.FILE_PATH.length - 1
          );
        }
        if (fileObj.FILE_PATH.length > 0) {
          filePath = filePath + fileObj.FILE_PATH;
        }

        this.file
          .removeFile(filePath, fileObj.FILE_NAME + fileObj.EXTENSION)
          .then(
            () => {
              this.uiLog.log('Deleted file: ' + _filePath);
              resolve(undefined);
            },
            (e) => {
              this.uiLog.error('Cant delete file: ' + JSON.stringify(e));
              reject();
            }
          );
      } else {
        resolve(undefined);
      }
    });
  }

  public async copyFile(_filePath: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        const fileObj = this.__splitFilePath(_filePath);
        this.generateInternalPath(fileObj.FILE_NAME, fileObj.EXTENSION).then(
          (_newName) => {
            // console.log('New Filename' + _newName);

            this.file
              .copyFile(
                this.getFileDirectory(),
                fileObj.FILE_NAME + fileObj.EXTENSION,
                this.getFileDirectory(),
                _newName
              )
              .then(
                (_t) => {
                  resolve(_t.fullPath);
                },
                (e) => {
                  reject();
                }
              );
          }
        );
      } else {
        reject();
      }
    });
  }

  private __splitFilePath(_filePath: string): {
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

  private async fileExists(options: StatOptions): Promise<boolean> {
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

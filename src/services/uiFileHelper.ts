/** Core */
import { Injectable } from '@angular/core';
import { DirectoryEntry, Entry, File, FileEntry } from '@ionic-native/file/ngx';
import { Platform } from '@ionic/angular';
import { DomSanitizer } from '@angular/platform-browser';
import { UILog } from './uiLog';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import moment from 'moment';
import {
  FileTransfer,
  FileTransferObject,
} from '@ionic-native/file-transfer/ngx';
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
  private cachedBase64: any = {};
  private cachedInternalUrls: any = {};

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

  private getFileDirectory(): string {
    if (this.platform.is('ios') && this.platform.is('cordova')) {
      return this.file.documentsDirectory;
    } else {
      return this.file.dataDirectory;
    }
  }

  public async saveJSONFile(
    _fileName: string,
    _jsonContent: string
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const blob = new Blob([_jsonContent], {
        type: 'application/json;charset=UTF-8;',
      });

      try {
        await this.createFolder(_fileName);
      } catch (ex) {
        this.uiLog.error(
          'UILog - saveJSONFile - We could not create folders ' + _fileName
        );
      }

      this.file.createFile(this.getFileDirectory(), _fileName, true).then(
        (_fileEntry: FileEntry) => {
          _fileEntry.createWriter((writer) => {
            writer.onwriteend = () => {
              resolve(undefined);
              this.uiLog.info(
                'UILog - saveJSONFile - File saved successfully - ' + _fileName
              );
            };
            writer.onerror = () => {
              reject();
            };
            writer.seek(0);
            writer.write(blob); // You need to put the file, blob or base64 representation here.
          });
        },
        () => {
          reject();
          this.uiLog.error('Could not save file');
        }
      );
    });
  }

  public async getJSONFile(_fileName: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        // let filePath: string;
        // filePath = _filePath;
        // filePath.slice(0, filePath.lastIndexOf('/'));
        let path: string;
        let fileName: string;
        path = this.getFileDirectory();
        fileName = _fileName;
        if (fileName.startsWith('/')) {
          fileName = fileName.slice(1);
        }

        this.file.readAsText(path, fileName).then(
          (_text: string) => {
            try {
              const parsedJSON: any = JSON.parse(_text);
              resolve(parsedJSON);
            } catch (ex) {
              this.uiLog.error('We could not read json file ' + ex.message);
              reject();
            }
          },
          () => {
            reject();
          }
        );
      } else {
        reject();
      }
    });
  }

  public async saveBase64File(
    _fileName: string,
    _fileExtension: string,
    _base64: string
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.generateFileName(
        this.getFileDirectory(),
        _fileName,
        _fileExtension
      ).then((_newName) => {
        // console.log('New Filename' + _newName);
        let newBlob: Blob = this.dataURItoBlob(_base64);
        if (newBlob === undefined) {
          reject();
        } else {
          this.file.writeFile(this.getFileDirectory(), _newName, newBlob).then(
            (_t) => {
              newBlob = null;
              this.uiLog.log('Save file below: ' + _t.fullPath);
              resolve(_t.fullPath);
            },
            (e) => {
              this.uiLog.error('Cant save file: ' + JSON.stringify(e));
              reject();
            }
          );
        }
      });
    });
  }

  public async deleteJSONBackupsOlderThenSevenDays(): Promise<any> {
    const promise: Promise<any> = new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        let storageLocation: string = '';
        if (this.platform.is('android')) {
          storageLocation = this.file.externalRootDirectory;
        } else {
          storageLocation = this.file.documentsDirectory;
        }

        const lastSevenDays: Array<string> = [];
        for (let i = 0; i < 8; i++) {
          const day: string = moment().subtract(i, 'days').format('DD_MM_YYYY');
          const automatedBackupFileName: string =
            'Beanconqueror_automatic_export_' + day + '.json';
          lastSevenDays.push(automatedBackupFileName);
        }

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
                  (directory_export: DirectoryEntry) => {
                    const directoryReader = directory_export.createReader();
                    directoryReader.readEntries(
                      (entries: Entry[]) => {
                        for (const entry of entries) {
                          if (entry.isFile) {
                            if (
                              lastSevenDays.indexOf(entry.name) === -1 &&
                              entry.name.indexOf(
                                'Beanconqueror_automatic_export_'
                              ) === 0
                            ) {
                              const filename: string = entry.name;
                              entry.remove(
                                () => {
                                  this.uiLog.log(
                                    'Removed automated backup file ' + filename
                                  );
                                },
                                () => {
                                  this.uiLog.log(
                                    'Could not remove automated backup file ' +
                                      filename
                                  );
                                }
                              );
                            } else if (lastSevenDays.indexOf(entry.name) > -1) {
                              this.uiLog.log(
                                'We found a backup file not older then 7 days, so dont delete it'
                              );
                            }
                          }
                        }
                      },
                      () => {}
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
        reject(undefined);
      }
    });
    return promise;
  }

  public async downloadExternalFile(
    _url: string,
    _fileName: string = 'beanconqueror_image',
    _fileExtension: string = '.png'
  ): Promise<string> {
    const promise: Promise<string> = new Promise(async (resolve, reject) => {
      const url: string = _url;
      const fileTransferObj: FileTransferObject = this.fileTransfer.create();
      await this.generateFileName(
        this.getFileDirectory(),
        _fileName,
        _fileExtension
      ).then(async (_newName) => {
        fileTransferObj.download(url, this.getFileDirectory() + _newName).then(
          async (_entry) => {
            this.uiLog.log('File download completed: ' + _entry.fullPath);
            resolve(_entry.fullPath);
          },
          (error) => {
            // handle error
            resolve(undefined);
          }
        );
      });
    });
    return promise;
  }

  public async downloadFile(
    _filename,
    _blob,
    _share: boolean = true
  ): Promise<FileEntry> {
    const promise: Promise<FileEntry> = new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        let storageLocation: string = '';
        if (this.platform.is('android')) {
          storageLocation = this.file.externalRootDirectory;
        } else {
          storageLocation = this.file.documentsDirectory;
        }

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

  public createFolder(_path) {
    const promise: Promise<FileEntry> = new Promise(async (resolve, reject) => {
      const folders = _path.split('/');

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

  public moveFile(
    _oldPath,
    _newPath,
    _oldFilename,
    _newFilename
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      this.file.moveFile(_oldPath, _oldFilename, _newPath, _newFilename).then(
        (_entry) => {
          resolve(_entry.fullPath);
        },
        () => {
          reject();
        }
      );
    });
  }

  public async copyFileWithSpecificName(
    _filePath: string,
    _fileName: string = 'beanconqueror_image'
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        const fileObj = this.__splitFilePath(_filePath);
        this.generateFileName(
          this.getFileDirectory(),
          _fileName,
          fileObj.EXTENSION
        ).then(async (_newName) => {
          // console.log('New Filename' + _newName);

          this.file
            .copyFile(
              fileObj.FILE_PATH,
              fileObj.FILE_NAME + fileObj.EXTENSION,
              this.getFileDirectory(),
              _newName
            )
            .then(
              async (_t) => {
                resolve(_t.fullPath);
              },
              (e) => {
                reject();
              }
            );
        });
      } else {
        reject();
      }
    });
  }

  public async copyFile(_filePath: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        const fileObj = this.__splitFilePath(_filePath);
        this.generateFileName(
          this.getFileDirectory(),
          fileObj.FILE_NAME,
          fileObj.EXTENSION
        ).then((_newName) => {
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
        });
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
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        if (this.cachedInternalUrls[_filePath]) {
          //resolve(this.cachedInternalUrls[_filePath]);
          // return;
        }
        // let filePath: string;
        // filePath = _filePath;
        // filePath.slice(0, filePath.lastIndexOf('/'));
        let path: string;
        let fileName: string;
        path = this.getFileDirectory();
        fileName = _filePath;
        if (fileName.startsWith('/')) {
          fileName = fileName.slice(1);
        }

        if (this.platform.is('ios')) {
          // After switching to iOS cloud, the fullPath saves the Cloud path actualy with, so we need to delete this one :)
          const searchForCloud: string = 'Cloud/';
          if (fileName.startsWith(searchForCloud)) {
            fileName = fileName.substring(searchForCloud.length);
          }
        }

        this.file.resolveLocalFilesystemUrl(path + fileName).then(
          (fileEntry: FileEntry) => {
            fileEntry.file(
              (meta) => {
                let convertedURL = window.Ionic.WebView.convertFileSrc(
                  fileEntry.nativeURL
                );
                if (_addTimeStamp) {
                  convertedURL += '?' + moment().unix();
                }
                convertedURL =
                  this.domSanitizer.bypassSecurityTrustResourceUrl(
                    convertedURL
                  );
                this.cachedInternalUrls[_filePath] = convertedURL;
                resolve(convertedURL);
              },
              () => {
                resolve('');
              }
            );
          },
          () => {
            resolve('');
          }
        );
      } else {
        resolve('');
      }
    });
  }

  public async getBase64File(_filePath: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        if (this.cachedBase64[_filePath]) {
          resolve(this.cachedBase64[_filePath]);
          return;
        }
        // let filePath: string;
        // filePath = _filePath;
        // filePath.slice(0, filePath.lastIndexOf('/'));
        let path: string;
        let fileName: string;
        path = this.getFileDirectory();
        fileName = _filePath;
        if (fileName.startsWith('/')) {
          fileName = fileName.slice(1);
        }

        this.file.readAsDataURL(path, fileName).then((_dataUrl: string) => {
          this.cachedBase64[_filePath] = _dataUrl;
          resolve(_dataUrl);
        });
      } else {
        resolve('');
      }
    });
  }

  private async generateFileName(
    _path: string,
    _fileName: string,
    _fileExtension: string
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let counter: number = 1;
      let doesExist: boolean = false;
      const passedFilename: string = _fileName;
      const passedExtension: string = _fileExtension;
      const passedPath: string = _path;
      let fileName: string = `${passedFilename}${passedExtension}`;
      do {
        try {
          const ret = await this.file.checkFile(passedPath, fileName);
          doesExist = ret;

          if (!doesExist) {
            resolve(fileName);
            doesExist = false;
          } else {
            fileName = `${passedFilename}${counter}${passedExtension}`;
            counter++;
            doesExist = true;
          }
        } catch (ex) {
          resolve(fileName);
          doesExist = false;
        }
      } while (doesExist);
    });
  }

  private dataURItoBlob(dataURI: any): any {
    try {
      // convert base64/URLEncoded data component to raw binary data held in a string
      let byteString;
      const base64TagExists: boolean = dataURI.split(',')[0].indexOf('base64');
      if (base64TagExists) {
        byteString = atob(dataURI.split(',')[1]);
      } else {
        byteString = window.unescape(dataURI.split(',')[1]);
      }

      // separate out the mime component
      const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
      // write the bytes of the string to a typed array
      let ia = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const newBlob = new Blob([ia], { type: mimeString });
      ia = null;
      return newBlob;
    } catch (ex) {
      return undefined;
    }
  }
}

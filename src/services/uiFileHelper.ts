/** Core */
import {Injectable} from '@angular/core';
import {File, FileEntry} from '@ionic-native/file/ngx';
import {unescape} from 'querystring';
import {Platform} from '@ionic/angular';
import {DomSanitizer} from '@angular/platform-browser';

/**
 * Handles every helping functionalities
 */
declare var window;
@Injectable({
  providedIn: 'root'
})
export class UIFileHelper {

  private cachedBase64: any = {};
  private cachedInternalUrls: any = {};


  constructor (private readonly file: File, private readonly platform: Platform, private readonly domSanitizer: DomSanitizer) {
  }

  public async saveBase64File (_fileName: string, _fileExtension: string, _base64: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.generateFileName(this.file.dataDirectory, _fileName, _fileExtension).then((_newName) => {
        // console.log('New Filename' + _newName);
        const newBlob: Blob = this.dataURItoBlob(_base64);
        if (newBlob === undefined) {
          reject();
        } else {
          this.file.writeFile(this.file.dataDirectory, _newName, newBlob).then((_t) => {
            resolve(_t.fullPath);
          }, () => {
            reject();
          });
        }
      });

    });
  }

  public async deleteFile(_filePath): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        const fileObj = this.__splitFilePath(_filePath);
        let filePath = this.file.dataDirectory;
        if (fileObj.FILE_PATH.length > 1 && fileObj.FILE_PATH.indexOf('/') === 0 && filePath.lastIndexOf('/') === filePath.length - 1) {
          filePath = filePath + fileObj.FILE_PATH.substr(1);
        }
        this.file.removeFile(filePath, fileObj.FILE_NAME + fileObj.EXTENSION).then(() => {
          resolve();
        }, () => {
          reject();
        });
      } else {
        resolve();
      }

    });
  }

  public async copyFileWithSpecificName(_filePath: string, _fileName: string = 'beanconqueror_image'): Promise<any> {


    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {


      const fileObj = this.__splitFilePath(_filePath);
      this.generateFileName(this.file.dataDirectory, _fileName, fileObj.EXTENSION).then((_newName) => {
        // console.log('New Filename' + _newName);

        this.file.copyFile(fileObj.FILE_PATH, fileObj.FILE_NAME + fileObj.EXTENSION,
          this.file.dataDirectory, _newName).then((_t) => {
          resolve(_t.fullPath);
        }, (e) => {
          reject();
        });

      });
      }
      else {
        reject();
      }
    });
  }

  public async copyFile(_filePath: string): Promise<any> {


    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {


      const fileObj = this.__splitFilePath(_filePath);
      this.generateFileName(this.file.dataDirectory, fileObj.FILE_NAME, fileObj.EXTENSION).then((_newName) => {
        // console.log('New Filename' + _newName);

        this.file.copyFile(this.file.dataDirectory, fileObj.FILE_NAME + fileObj.EXTENSION,
          this.file.dataDirectory, _newName).then((_t) => {
          resolve(_t.fullPath);
        }, (e) => {
          reject();
        });

      });
      } else {
        reject();
      }
    });
  }

  private __splitFilePath(_filePath: string): { FILE_NAME: string; FILE_PATH: string; EXTENSION: string; } {
    // TODO If we have folders, this won't work. because we're ignoring foldesrs i all subfunctions
    try {


      let filePath: string = _filePath.substr(0, _filePath.lastIndexOf('/'));

      if (filePath === '') {
        filePath = '/';
      }
      const fileName: string = _filePath.substr(_filePath.lastIndexOf('/') + 1, _filePath.lastIndexOf('.') - _filePath.lastIndexOf('/') - 1);
      const exstension: string = _filePath.substr(_filePath.lastIndexOf('.'));


      return {
        FILE_NAME: fileName,
        FILE_PATH: filePath,
        EXTENSION: exstension
      };
    } catch (ex) {
      return {
        FILE_NAME: '',
        FILE_PATH: '',
        EXTENSION: '',
      };
    }

  }
  public async getInternalFileSrc (_filePath: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        if (this.cachedInternalUrls[_filePath]) {
          resolve(this.cachedInternalUrls[_filePath]);
          return;
        }
        // let filePath: string;
        // filePath = _filePath;
        // filePath.slice(0, filePath.lastIndexOf('/'));
        let path: string;
        let fileName: string;
        path = this.file.dataDirectory;
        fileName = _filePath;
        if (fileName.startsWith('/')) {
          fileName = fileName.slice(1);
        }
        this.file.resolveLocalFilesystemUrl(path + fileName).then((fileEntry: FileEntry) => {


          fileEntry.file(
            (meta) => {
              let convertedURL = window.Ionic.WebView.convertFileSrc(fileEntry.nativeURL);
              convertedURL = this.domSanitizer.bypassSecurityTrustResourceUrl(convertedURL);
              this.cachedInternalUrls[_filePath] = convertedURL;
              resolve(convertedURL);
            }, () => {
              resolve('');
            }
          );

        },() => {
          resolve('');
        });

      } else {
        resolve('');
      }

    });
  }

  public async getBase64File (_filePath: string): Promise<any> {
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
        path = this.file.dataDirectory;
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

  private async generateFileName (_path: string, _fileName: string, _fileExtension: string): Promise<any> {
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
          } else {
            fileName = `${passedFilename}${counter}${passedExtension}`;
            counter++;
            doesExist = true;
          }
        } catch (ex) {
          resolve(fileName);
        }
      } while (doesExist);
    });
  }

  private dataURItoBlob (dataURI: any): any {
    try {
      // convert base64/URLEncoded data component to raw binary data held in a string
      let byteString;
      const base64TagExists: boolean = dataURI.split(',')[0].indexOf('base64');
      if (base64TagExists) {
        byteString = atob(dataURI.split(',')[1]);
      } else {
        byteString = unescape(dataURI.split(',')[1]);
      }

      // separate out the mime component
      const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
      // write the bytes of the string to a typed array
      const ia = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      return new Blob([ia], {type: mimeString});
    } catch (ex) {
      return undefined;
    }
  }
}

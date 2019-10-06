/** Core */
import {Injectable} from '@angular/core';
import {File} from '@ionic-native/file/ngx';
import {unescape} from 'querystring';
import {Platform} from '@ionic/angular';

/**
 * Handles every helping functionalities
 */
@Injectable()
export class UIFileHelper {

  private cachedBase64: any = {};
  constructor (private readonly file: File, private readonly platform: Platform) {
  }

  public async saveBase64File (_fileName: string, _fileExtension: string, _base64: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.generateFileName(this.file.dataDirectory, _fileName, _fileExtension).then((_newName) => {
        console.log('New Filename' + _newName);
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

  public async getBase64File (_filePath: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        if (this.cachedBase64[_filePath]) {
          resolve(this.cachedBase64[_filePath]);
        }
        // let filePath: string;
        // filePath = _filePath;
        let path: string;
        let fileName: string;
        path = this.file.dataDirectory; // filePath.slice(0, filePath.lastIndexOf('/'));
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

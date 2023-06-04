import { cloneDeep } from 'lodash';
import { Injectable } from '@angular/core';
import { UISettingsStorage } from './uiSettingsStorage';
import { UIStorage } from './uiStorage';
import { UIHelper } from './uiHelper';
/**
 * Handles every helping functionalities
 */

import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
@Injectable({
  providedIn: 'root',
})
export class UIExportHelper {
  /**
   *
   */
  private isAppReady: number = -1;

  constructor(
    private readonly uiSettings: UISettingsStorage,
    public uiStorage: UIStorage,
    private readonly uiHelper: UIHelper
  ) {}

  public async buildExportZIP(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.uiStorage.export().then(async (_data) => {
        const clonedData = this.uiHelper.cloneData(_data);
        const brewChunks = [];
        if (clonedData?.BREWS?.length > 0) {
          const chunkSize = 1000;
          for (let i = 0; i < clonedData.BREWS.length; i += chunkSize) {
            const chunk = clonedData.BREWS.slice(i, i + chunkSize);
            brewChunks.push(chunk);
          }
        }

        const originalJSON = this.uiHelper.cloneData(_data);
        if (brewChunks.length > 0) {
          originalJSON.BREWS = brewChunks[0];
        }

        const zipFileWriter = new BlobWriter();
        const beanconquerorJSON = new TextReader(JSON.stringify(originalJSON));
        const zipWriter = new ZipWriter(zipFileWriter);

        await zipWriter.add('Beanconqueror.json', beanconquerorJSON);

        // zipObj.file("Beanconqueror.json", JSON.stringify(originalJSON));
        for (let i = 1; i < brewChunks.length; i++) {
          const beanconquerorBrewJSON = new TextReader(
            JSON.stringify(brewChunks[i])
          );
          await zipWriter.add(
            'Beanconqueror_Brews_' + i + '.json',
            beanconquerorBrewJSON
          );
          //zipObj.file("Beanconqueror_Brews_" + i + ".json", JSON.stringify(brewChunks[i]));
        }
        const zipFileBlob = await zipWriter.close();
        const downloadURL = (data, fileName) => {
          const a = document.createElement('a');
          a.href = data;
          a.download = fileName;
          document.body.appendChild(a);
          a.style.display = 'none';
          a.click();
          a.remove();
        };

        const downloadBlob = (data, fileName, mimeType) => {
          const blob = new Blob([data], {
            type: mimeType,
          });

          const url = window.URL.createObjectURL(blob);

          downloadURL(url, fileName);

          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        };
        resolve(zipFileBlob);

        /** zipObj.generateAsync({type:"blob"}).then( (blob)=> { // 1) generate the zip file
          resolve(blob);
            //downloadBlob(blob, "hello.zip",undefined);                          // 2) trigger the download
        },  (err)=> {
          reject();
        });**/
      });
    });
  }
}

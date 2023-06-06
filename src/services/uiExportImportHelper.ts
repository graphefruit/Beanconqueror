import { Injectable } from '@angular/core';
import { UISettingsStorage } from './uiSettingsStorage';
import { UIStorage } from './uiStorage';
import { UIHelper } from './uiHelper';
/**
 * Handles every helping functionalities
 */

import {
  BlobReader,
  BlobWriter,
  EntryMetaData,
  TextReader,
  TextWriter,
  ZipEntry,
  ZipFileEntry,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js';
import { FileEntry } from '@ionic-native/file';
@Injectable({
  providedIn: 'root',
})
export class UIExportImportHelper {
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
        }
        const zipFileBlob = await zipWriter.close();
        resolve(zipFileBlob);
      });
    });
  }

  public async importZIPFile(_fileEntry: FileEntry): Promise<any> {
    return new Promise((resolve, reject) => {
      _fileEntry.file(async (file) => {
        try {
          const reader = new FileReader();
          reader.onloadend = async (event: Event) => {
            try {
              const readBlob = new Blob([reader.result as any], {
                type: 'application/zip',
              });

              const zipFileReader = new BlobReader(readBlob);

              // Creates a ZipReader object reading the zip content via `zipFileReader`,
              // retrieves metadata (name, dates, etc.) of the first entry, retrieves its
              // content via `helloWorldWriter`, and closes the reader.
              const zipReader = new ZipReader(zipFileReader);

              const entries: Array<any> = await zipReader.getEntries();
              const entriesLength = entries.length;

              let importJSONData = undefined;

              if (entriesLength > 0) {
                console.log(entries);

                const foundGeneralEntry = entries.find(
                  (e) => e.filename === 'Beanconqueror.json'
                );
                if (foundGeneralEntry === undefined) {
                  await zipReader.close();
                  reject();
                  return;
                }

                const generalWriter = new TextWriter();
                const generalImportText = await foundGeneralEntry.getData(
                  generalWriter
                );
                importJSONData = JSON.parse(generalImportText);

                if (
                  importJSONData &&
                  importJSONData?.BREWS &&
                  importJSONData.BREWS?.length > 0
                ) {
                } else {
                  importJSONData.BREWS = [];
                }
                for (let i = 1; i < entriesLength; i++) {
                  const brewEntry = entries.find(
                    (e) => e.filename === 'Beanconqueror_Brews_' + i + '.json'
                  );
                  const brewWriter = new TextWriter();
                  const brewImportText = await brewEntry.getData(brewWriter);
                  const parsedBrews = JSON.parse(brewImportText);
                  importJSONData.BREWS.push(...parsedBrews);
                }

                await zipReader.close();
                resolve(importJSONData);
              }
            } catch (ex) {
              reject();
            }
          };
          reader.onerror = (event: Event) => {
            reject();
          };

          reader.readAsArrayBuffer(file);
        } catch (ex) {
          reject();
        }
      });
    });
  }
}

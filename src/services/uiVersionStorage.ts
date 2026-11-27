import { Service } from '@angular/core';

import { StorageClass } from '../classes/storageClass';
import { Version } from '../classes/version/iVersion';
import { IVersion } from '../interfaces/version/iVersion';

@Service()
export class UiVersionStorage extends StorageClass {
  private version: Version = new Version();
  private isVersionInitialized: number = -1;
  private versionIsTakenOver: () => void;
  /** Resolves when `isVersionInitialized` is set, also after a failed read. */
  private readonly versionTakenOver = new Promise<void>((resolve) => {
    this.versionIsTakenOver = resolve;
  });

  constructor() {
    super('VERSION');

    super.storageReady().then(
      async () => {
        const entries: Array<any> = this.getAllEntries();
        if (entries.length > 0) {
          // We already had some settings here.
          if (this.version === undefined) {
            this.version = new Version();
          }
          this.version.initializeByObject(entries[0]);
          this.isVersionInitialized = 1;
          this.versionIsTakenOver();
        } else {
          // Take the new settings obj.
          const data: any = await super.add(this.version);
          this.version = new Version();
          this.version.initializeByObject(data);
          this.isVersionInitialized = 1;
          this.versionIsTakenOver();
        }
      },
      () => {
        // Outsch, cant do much.
        this.isVersionInitialized = 0;
        this.versionIsTakenOver();
      },
    );
  }

  public async initializeStorage() {
    await super.__initializeStorage();
  }

  public async storageReady(): Promise<any> {
    const already = this.isVersionInitialized !== -1;
    await this.versionTakenOver;
    if (this.isVersionInitialized === 1) {
      this.uiLog.log(
        already
          ? `Storage ${this.DB_PATH} - already - ready`
          : `Storage ${this.DB_PATH} ready`,
      );
      return undefined;
    }
    this.uiLog.log(
      already
        ? `Storage ${this.DB_PATH} - already - not - ready`
        : `Storage ${this.DB_PATH} not ready`,
    );
    return Promise.reject();
  }

  public async reinitializeStorage() {
    await super.reinitializeStorage();

    await super.storageReady().then(
      async () => {
        const entries: Array<any> = this.getAllEntries();
        if (entries.length > 0) {
          // Reset to a new version object, else when importing data, there might be wrong data existing still.
          this.version = new Version();
          this.version.initializeByObject(entries[0]);
        } else {
          const data: any = await super.add(this.version);
          this.version = new Version();
          this.version.initializeByObject(data);
        }
      },
      () => {
        // Outsch, cant do much.
      },
    );
  }
  public getVersion(): Version {
    return this.version;
  }

  /** Resolves whether the version was stored. */
  public saveVersion(version: IVersion): Promise<boolean> {
    return super.storeOnlyEntry(version);
  }
}

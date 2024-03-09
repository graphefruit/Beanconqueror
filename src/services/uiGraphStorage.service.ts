/** Core */
import { Injectable } from '@angular/core';
/** Ionic native */
/** Classes */
/** Services */

import { StorageClass } from '../classes/storageClass';

import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UIStorage } from './uiStorage';
import { TranslateService } from '@ngx-translate/core';
import { Graph } from '../classes/graph/graph';

/** Interfaces */

@Injectable({
  providedIn: 'root',
})
export class UIGraphStorage extends StorageClass {
  /**
   * Singelton instance
   */
  public static instance: UIGraphStorage;

  private graphs: Array<Graph> = [];
  public static getInstance(): UIGraphStorage {
    if (UIGraphStorage.instance) {
      return UIGraphStorage.instance;
    }

    return undefined;
  }
  constructor(
    protected uiStorage: UIStorage,
    protected uiHelper: UIHelper,
    protected uiLog: UILog,
    private readonly translate: TranslateService
  ) {
    super(uiStorage, uiHelper, uiLog, 'GRAPH');
    if (UIGraphStorage.instance === undefined) {
      UIGraphStorage.instance = this;
    }
    super.attachOnEvent().subscribe((data) => {
      this.graphs = [];
    });
  }

  public async initializeStorage() {
    this.graphs = [];
    await super.__initializeStorage();
  }

  public getAllEntries(): Array<Graph> {
    if (this.graphs.length <= 0) {
      const entries: Array<any> = super.getAllEntries();
      for (const graph of entries) {
        const graphObj: Graph = new Graph();
        graphObj.initializeByObject(graph);
        this.graphs.push(graphObj);
      }
    }
    return this.graphs;
  }

  public getEntryByUUID(_uuid: string): Graph {
    const graphEntries: Array<any> = super.getAllEntries();
    const graphEntry = graphEntries.find((e) => e.config.uuid === _uuid);
    if (graphEntry) {
      const graphObj: Graph = new Graph();
      graphObj.initializeByObject(graphEntry);
      return graphObj;
    }
    return null;
  }
}

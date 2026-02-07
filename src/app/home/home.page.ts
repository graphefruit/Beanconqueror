import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { Bean } from '../../classes/bean/bean';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { Preparation } from '../../classes/preparation/preparation';
import { UIMillStorage } from '../../services/uiMillStorage';
import { Mill } from '../../classes/mill/mill';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonContent,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonBadge,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    TranslatePipe,
    IonContent,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonBadge,
  ],
})
export class HomePage {
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiMillStorage = inject(UIMillStorage);

  /** Needed app minimize for android */

  public beansExist: boolean;
  public preparationsExist: boolean;
  public millsExist: boolean;

  public ngOnInit() {
    this._calculcateEntries();

    this.uiBeanStorage.attachOnEvent().subscribe((_val) => {
      this._calculcateEntries();
    });
    this.uiPreparationStorage.attachOnEvent().subscribe((_val) => {
      this._calculcateEntries();
    });
    this.uiMillStorage.attachOnEvent().subscribe((_val) => {
      this._calculcateEntries();
    });
  }
  private _calculcateEntries() {
    this.beansExist = this.activeBeansExists();
    this.preparationsExist = this.activePreparationsExists();
    this.millsExist = this.activeMillsExists();
  }

  public activeBeansExists(): boolean {
    const beans: Array<Bean> = this.uiBeanStorage.getAllEntries();
    return beans.filter((e) => e.finished === false).length > 0;
  }

  public activePreparationsExists(): boolean {
    const preparations: Array<Preparation> =
      this.uiPreparationStorage.getAllEntries();
    return preparations.filter((e) => e.finished === false).length > 0;
  }

  public activeMillsExists(): boolean {
    const mills: Array<Mill> = this.uiMillStorage.getAllEntries();

    return mills.filter((e) => e.finished === false).length > 0;
  }
}

export default HomePage;

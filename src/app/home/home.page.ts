import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { Bean } from '../../classes/bean/bean';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { Preparation } from '../../classes/preparation/preparation';
import { UIMillStorage } from '../../services/uiMillStorage';
import { Mill } from '../../classes/mill/mill';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  /** Needed app minimize for android */

  public beansExist: boolean;
  public preparationsExist: boolean;
  public millsExist: boolean;

  constructor(
    private readonly router: Router,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiMillStorage: UIMillStorage,
  ) {}

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
  public showBeans() {
    this.router.navigate(['/beans']);
  }

  public showBrews() {
    this.router.navigate(['/brew']);
  }

  public showPreparation() {
    this.router.navigate(['/preparation']);
  }

  public showMills() {
    this.router.navigate(['/mill']);
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

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';

import { IonBackButton, IonContent, IonHeader, IonIcon } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import BaristamodeBrew from '../../../classes/brew/baristamodeBrew';
import { BaristamodeBrewInformationComponent } from '../../../components/baristamode-brew-information/baristamode-brew-information.component';
import { HeaderComponent } from '../../../components/header/header.component';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../../components/virtual-list/virtual-list.component';
import { UIBaristamodeBrewStorage } from '../../../services/uiBaristamodeBrewStorage';

@Component({
  selector: 'app-baristamode-brews',
  templateUrl: './baristamode-brews.page.html',
  styleUrls: ['./baristamode-brews.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    VirtualListComponent,
    VirtualRowDirective,
    BaristamodeBrewInformationComponent,
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonIcon,
    HeaderComponent,
  ],
})
export class BaristamodeBrewsPage implements OnInit, OnDestroy {
  private readonly uiBaristamodeBrewStorage = inject(UIBaristamodeBrewStorage);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  public brews: BaristamodeBrew[] = [];
  public readonly brewKey = (brew: BaristamodeBrew): string => brew.config.uuid;

  private brewStorageChangeSubscription: Subscription;

  constructor() {}

  public ionViewWillEnter(): void {
    this.loadBrews();
    this.brewStorageChangeSubscription = this.uiBaristamodeBrewStorage
      .attachOnEvent()
      .subscribe(() => {
        this.loadBrews();
      });
  }

  public loadBrews(): void {
    const allBrews = this.uiBaristamodeBrewStorage.getAllEntries();
    // Sort by date descending (newest first)
    this.brews = allBrews.sort(
      (a, b) => b.config.unix_timestamp - a.config.unix_timestamp,
    );
    this.changeDetectorRef.detectChanges();
  }

  public ngOnInit() {}

  public ngOnDestroy() {
    if (this.brewStorageChangeSubscription) {
      this.brewStorageChangeSubscription.unsubscribe();
      this.brewStorageChangeSubscription = undefined;
    }
  }
}

export default BaristamodeBrewsPage;

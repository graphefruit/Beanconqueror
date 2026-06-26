import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';
import { Subscription } from 'rxjs';

import BaristamodeBrew from '../../../classes/brew/baristamodeBrew';
import { BaristamodeBrewInformationComponent } from '../../../components/baristamode-brew-information/baristamode-brew-information.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { UIBaristamodeBrewStorage } from '../../../services/uiBaristamodeBrewStorage';

@Component({
  selector: 'app-baristamode-brews',
  templateUrl: './baristamode-brews.page.html',
  styleUrls: ['./baristamode-brews.page.scss'],
  imports: [
    AgVirtualScrollComponent,
    BaristamodeBrewInformationComponent,
    TranslatePipe,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonIcon,
    HeaderComponent,
  ],
})
export class BaristamodeBrewsPage implements OnInit, OnDestroy {
  private readonly uiBaristamodeBrewStorage = inject(UIBaristamodeBrewStorage);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  public brews: BaristamodeBrew[] = [];

  @ViewChild('brewsScroll', { read: AgVirtualScrollComponent, static: false })
  public brewsScroll: AgVirtualScrollComponent;

  @ViewChild('brewContent', { read: ElementRef })
  public brewContent: ElementRef;

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
    this.retriggerScroll();
    this.changeDetectorRef.detectChanges();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(() => {
      if (!this.brewsScroll || !this.brewContent) {
        return;
      }
      const el = this.brewContent.nativeElement;
      if (!el || el.offsetHeight === 0) {
        return;
      }
      this.brewsScroll.el.style.height =
        el.offsetHeight - this.brewsScroll.el.offsetTop + 'px';

      if (this.brewsScroll.items.length === 0) {
        this.brewsScroll.refreshData();
      }

      setTimeout(() => {
        const elScroll = this.brewsScroll.el;
        elScroll.dispatchEvent(new Event('scroll'));
      }, 15);
    }, 150);
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

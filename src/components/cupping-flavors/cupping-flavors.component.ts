import { NgStyle } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonCheckbox,
  IonChip,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonListHeader,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, close } from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Brew } from '../../classes/brew/brew';
import CuppingFlavors from '../../data/cupping-flavors/cupping-flavors.json';
import { IFlavor } from '../../interfaces/flavor/iFlavor';
import { UIHelper } from '../../services/uiHelper';

@Component({
  selector: 'cupping-flavors',
  templateUrl: './cupping-flavors.component.html',
  styleUrls: ['./cupping-flavors.component.scss'],
  imports: [
    FormsModule,
    NgStyle,
    TranslatePipe,
    IonList,
    IonListHeader,
    IonItem,
    IonInput,
    IonIcon,
    IonChip,
    IonSearchbar,
    IonCheckbox,
  ],
})
export class CuppingFlavorsComponent implements OnInit {
  private translate = inject(TranslateService);
  private readonly uiHelper = inject(UIHelper);

  public searchFlavorText: string = '';

  @Input('data') public data: IFlavor;
  @Output() public dataChange = new EventEmitter<Brew>();

  public selectedFlavors = {};
  public customFlavors: Array<string> = [];

  public displayingFlavors = [];
  private allCuppingFlavors = [];
  public customFlavor: string = '';

  constructor() {
    addIcons({ addCircleOutline, close });
  }

  public ngOnInit() {
    this.instanceCuppingFlavors();
    this.setNewCuppingView(this.allCuppingFlavors);
  }

  private instanceCuppingFlavors() {
    this.allCuppingFlavors = CuppingFlavors;
    for (const flavor of this.allCuppingFlavors) {
      flavor.translatedLabel = this.translate.instant(flavor.label);
      flavor.display = true;
      for (const subFlavors of flavor.children) {
        subFlavors.translatedLabel = this.translate.instant(subFlavors.label);
        subFlavors.display = true;
        for (const subSubFlavors of subFlavors.children) {
          subSubFlavors.translatedLabel = this.translate.instant(
            subSubFlavors.label,
          );
          subSubFlavors.display = true;
        }
      }
    }
  }
  private setNewCuppingView(_newView: Array<any>) {
    this.displayingFlavors = Object.assign([], _newView);
  }

  public setCustomFlavors(_flavors: Array<string>) {
    this.customFlavors = this.uiHelper.cloneData(_flavors);
  }
  public setSelectedFlavors(_selectedFlavors: {}) {
    this.selectedFlavors = this.uiHelper.cloneData(_selectedFlavors);
  }

  public getCustomFlavors(): Array<string> {
    return this.customFlavors;
  }
  public getSelectedFlavors() {
    return this.selectedFlavors;
  }

  public searchFlavors() {
    if (this.searchFlavorText && this.searchFlavorText.trim() !== '') {
      this.setNewCuppingView(
        this.searchThroughFlavors(this.searchFlavorText.trim()),
      );
    } else {
      this.resetFlavors();
    }
  }

  public resetFlavors() {
    this.setNewCuppingView(this.allCuppingFlavors);
  }
  private searchThroughFlavors(searchText: string) {
    const searchedFlavors: Array<any> = JSON.parse(
      JSON.stringify(this.allCuppingFlavors),
    );

    for (const flavor of searchedFlavors) {
      let displaySubFlavor: boolean = false;

      for (const subFlavors of flavor.children) {
        let displaySubSubFlavor: boolean = false;

        for (const subSubFlavors of subFlavors.children) {
          if (this.flavorMatches(subSubFlavors.translatedLabel, searchText)) {
            subSubFlavors.display = true;
            displaySubSubFlavor = true;
          } else {
            subSubFlavors.display = false;
          }
        }

        if (displaySubSubFlavor) {
          subFlavors.display = true;
          displaySubFlavor = true;
        } else {
          // If subSubFlavor is not display, we search if we show the above one aswell.
          if (this.flavorMatches(subFlavors.translatedLabel, searchText)) {
            subFlavors.display = true;
            displaySubFlavor = true;
          } else {
            subFlavors.display = false;
          }
        }
      }

      if (displaySubFlavor) {
        flavor.display = true;
      } else {
        // If subSubFlavor is not display, we search if we show the above one aswell.
        if (this.flavorMatches(flavor.translatedLabel, searchText)) {
          flavor.display = true;
        } else {
          flavor.display = false;
        }
      }
    }
    return searchedFlavors;
  }
  private flavorMatches(text: string, search: string): boolean {
    return text.toLowerCase().includes(search.toLowerCase());
  }

  public checkInputAndAddCustomFlavor() {
    this.addCustomFlavor();
  }

  public addCustomFlavor() {
    if (this.customFlavor) {
      this.customFlavors.push(this.customFlavor);
      this.customFlavor = '';
    }
  }
  public removeCustomFlavor(_index) {
    this.customFlavors.splice(_index, 1);
  }
}

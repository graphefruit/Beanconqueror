import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Brew } from '../../classes/brew/brew';
import { Settings } from '../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { Graph } from '../../classes/graph/graph';
import { UIHelper } from '../../services/uiHelper';
import { BREW_FUNCTION_PIPE_ENUM } from '../../enums/brews/brewFunctionPipe';
import { Bean } from '../../classes/bean/bean';
import { Preparation } from '../../classes/preparation/preparation';
import { Mill } from '../../classes/mill/mill';

@Component({
  selector: 'brew-graph-reference-card',
  templateUrl: './brew-graph-reference-card.component.html',
  styleUrls: ['./brew-graph-reference-card.component.scss'],
  standalone: false,
})
export class BrewGraphReferenceCardComponent implements OnInit {
  @Input() public brew: Brew;
  @Input() public graph: Graph;
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public settings: Settings;

  public radioSelection: string;

  @ViewChild('radioEl', { read: ElementRef, static: true })
  public radioEl: ElementRef;

  @ViewChild('ionItemEl', { read: ElementRef, static: false })
  public ionItemEl: ElementRef;

  public bean: Bean;
  public preparation: Preparation;
  public mill: Mill;

  public isGraph: boolean;
  public isCustomRatingRange: boolean;

  constructor(
    private readonly uiSettingsStorage: UISettingsStorage,
    protected readonly uiBrewHelper: UIBrewHelper,
    protected readonly uiHelper: UIHelper,
  ) {}

  public getElementOffsetWidth() {
    if (this.ionItemEl?.nativeElement?.offsetWidth) {
      return this.ionItemEl?.nativeElement?.offsetWidth - 50;
    }
    return 0;
  }

  public async ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();

    if (this.brew) {
      this.bean = this.brew.getBean();
      this.preparation = this.brew.getPreparation();
      this.mill = this.brew.getMill();
    }

    this.isGraph = this.isGraphType();
    this.isCustomRatingRange = this.hasCustomRatingRange();
  }

  public isGraphType() {
    if (this.graph !== null && this.graph !== undefined) {
      return true;
    }
    return false;
  }
  public hasCustomRatingRange(): boolean {
    if (this.settings) {
      // #379
      if (Number(this.settings.brew_rating) !== 5) {
        return true;
      } else if (Number(this.settings.brew_rating_steps) !== 1) {
        return true;
      }
    }
    return false;
  }

  protected readonly BREW_FUNCTION_PIPE_ENUM = BREW_FUNCTION_PIPE_ENUM;
}

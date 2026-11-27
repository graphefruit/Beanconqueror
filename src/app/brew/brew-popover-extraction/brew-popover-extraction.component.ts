import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import {
  IonCard,
  IonContent,
  IonFooter,
  IonHeader,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { Observable } from 'rxjs';

import { Brew } from 'src/classes/brew/brew';
import { PREPARATION_STYLE_TYPE } from 'src/enums/preparations/preparationStyleTypes';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import {
  extractionScaleFor,
  FILTER_EXTRACTION_SCALE,
  layoutExtractionChart,
  zoneLabelLines,
} from './extraction-chart';

const ZONE_KEYS = FILTER_EXTRACTION_SCALE.zones.map((zone) => zone.key);
const NO_TEXTS: Record<string, string> = {};

@Component({
  selector: 'app-brew-popover-extraction',
  templateUrl: './brew-popover-extraction.component.html',
  styleUrls: ['./brew-popover-extraction.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    IonHeader,
    IonContent,
    IonCard,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonFooter,
  ],
})
export class BrewPopoverExtractionComponent {
  private readonly modalController = inject(ModalController);
  private readonly translate = inject(TranslateService);

  public static COMPONENT_ID = 'brew-extraction';
  public readonly brew = input.required<Brew>();

  private readonly chartBox = viewChild<ElementRef<HTMLElement>>('chartBox');
  private readonly size = signal({ width: 0, height: 0 });
  private readonly zoneTexts = toSignal(
    this.translate.stream(ZONE_KEYS) as Observable<Record<string, string>>,
    { initialValue: NO_TEXTS },
  );

  protected readonly espresso = computed(
    () =>
      this.brew().getPreparation().style_type ===
      PREPARATION_STYLE_TYPE.ESPRESSO,
  );

  /** The brew's point in the chart, also for the text that replaces it. */
  protected readonly extractionValues = computed(() => ({
    tds: String(this.brew().tds),
    yield: this.brew().getExtractionYield(),
  }));

  protected readonly layout = computed(() => {
    const { width, height } = this.size();
    const values = this.extractionValues();
    const layout = layoutExtractionChart(
      extractionScaleFor(this.brew().getPreparation().style_type),
      width,
      height,
      { yield: Number(values.yield), tds: Number(values.tds) },
    );
    if (!layout) {
      return undefined;
    }
    const texts = this.zoneTexts();
    return {
      ...layout,
      zones: layout.zones.map((zone) => ({
        ...zone,
        lines: zoneLabelLines(texts[zone.key]),
      })),
    };
  });

  public constructor() {
    // The chart fills its card, also after a rotation or resize.
    effect((onCleanup) => {
      const box = this.chartBox()?.nativeElement;
      if (!box) {
        return;
      }
      const observer = new ResizeObserver(() =>
        this.size.set({ width: box.clientWidth, height: box.clientHeight }),
      );
      observer.observe(box);
      onCleanup(() => observer.disconnect());
    });
  }

  public dismiss(): void {
    void this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewPopoverExtractionComponent.COMPONENT_ID,
    );
  }
}

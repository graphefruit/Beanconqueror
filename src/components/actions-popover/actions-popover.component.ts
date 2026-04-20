import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  Signal,
} from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  cameraOutline,
  copyOutline,
  flameOutline,
  heart,
  heartOutline,
  imagesOutline,
  powerOutline,
  qrCodeOutline,
  shareSocialOutline,
  snowOutline,
  thermometerOutline,
  trophy,
  trophyOutline,
  wifiOutline,
} from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

export interface PopoverAction {
  itemType: 'action';
  role: string;
  translationKey: string;
  subtitleTranslationKey?: string;
  icon: string;
  iconColor?: string;
  lines?: 'full' | 'inset' | 'none';
  visible?: boolean | Signal<boolean>;
}

export interface PopoverHeader {
  itemType: 'header';
  translationKey: string;
  visible?: boolean | Signal<boolean>;
}

export interface PopoverDivider {
  itemType: 'divider';
  visible?: boolean | Signal<boolean>;
}

export type PopoverItem = PopoverAction | PopoverHeader | PopoverDivider;

export function popoverAction(
  config: Omit<PopoverAction, 'itemType'>,
): PopoverAction {
  return { itemType: 'action', ...config };
}

export function popoverHeader(
  config: Omit<PopoverHeader, 'itemType'>,
): PopoverHeader {
  return { itemType: 'header', ...config };
}

export function popoverDivider(
  config: Omit<PopoverDivider, 'itemType'> = {},
): PopoverDivider {
  return { itemType: 'divider', ...config };
}

@Component({
  selector: 'actions-popover',
  template: `
    <ion-header translucent></ion-header>
    <ion-content>
      <ion-list lines="full">
        @for (item of visibleItems(); track $index) {
          @switch (item.itemType) {
            @case ('action') {
              <ion-item
                (click)="choose(item.role)"
                [lines]="item.lines"
                button
                tappable
              >
                <ion-icon
                  [name]="item.icon"
                  [style.color]="item.iconColor"
                  slot="start"
                ></ion-icon>
                @if (item.subtitleTranslationKey) {
                  <ion-label>
                    <span>{{ item.translationKey | translate }}</span>
                    <p>{{ item.subtitleTranslationKey | translate }}</p>
                  </ion-label>
                } @else {
                  <span>{{ item.translationKey | translate }}</span>
                }
              </ion-item>
            }
            @case ('header') {
              <ion-item lines="none">
                <h4>{{ item.translationKey | translate }}</h4>
              </ion-item>
            }
            @case ('divider') {
              <hr />
            }
          }
        }
      </ion-list>
    </ion-content>
  `,
  styles: `
    :host {
      ion-header {
        height: 40px;
        background-color: var(--ion-color-light);
      }
    }
  `,
  imports: [
    TranslatePipe,
    IonHeader,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsPopoverComponent {
  private readonly modalController = inject(ModalController);

  componentId = input.required<string>();
  items = input.required<PopoverItem[]>();

  visibleItems = computed(() =>
    this.items().filter((item) => {
      const visible =
        typeof item.visible === 'function' ? item.visible() : item.visible;
      return visible !== false;
    }),
  );

  constructor() {
    // Icons referenced by any caller/user must be registered here
    addIcons({
      analyticsOutline,
      cameraOutline,
      copyOutline,
      flameOutline,
      heart,
      heartOutline,
      imagesOutline,
      powerOutline,
      qrCodeOutline,
      shareSocialOutline,
      snowOutline,
      thermometerOutline,
      trophy,
      trophyOutline,
      wifiOutline,
    });
  }

  static create(
    modalController: ModalController,
    opts: {
      id: string;
      items: PopoverItem[];
      breakpoints: number[];
      initialBreakpoint: number;
    },
  ): Promise<HTMLIonModalElement> {
    return modalController.create({
      component: ActionsPopoverComponent,
      componentProps: { componentId: opts.id, items: opts.items },
      id: opts.id,
      cssClass: 'popover-actions',
      breakpoints: opts.breakpoints,
      initialBreakpoint: opts.initialBreakpoint,
    });
  }

  async choose(role: string): Promise<void> {
    await this.modalController.dismiss(undefined, role, this.componentId());
  }
}

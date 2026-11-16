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
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  cameraOutline,
  copyOutline,
  download,
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

interface ActionsPopoverOptions {
  id: string;
  items: PopoverItem[];
  breakpoints: number[];
  initialBreakpoint: number;
}

@Component({
  selector: 'actions-popover',
  template: `
    <ion-header translucent />
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
                />
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
      download,
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

  /**
   * Shows the menu and resolves the role of the action chosen in it.
   * Undefined when it was closed without one: Ionic then puts its own
   * reason into the role, 'backdrop' for a tap beside the menu.
   */
  static async pick(
    modalController: ModalController,
    opts: ActionsPopoverOptions,
  ): Promise<string | undefined> {
    const popover = await ActionsPopoverComponent.create(modalController, opts);
    await popover.present();
    const { role } = await popover.onWillDismiss();
    return opts.items.some(
      (item) => item.itemType === 'action' && item.role === role,
    )
      ? role
      : undefined;
  }

  private static create(
    modalController: ModalController,
    opts: ActionsPopoverOptions,
  ): Promise<HTMLIonModalElement> {
    return modalController.create({
      component: ActionsPopoverComponent,
      componentProps: { componentId: opts.id, items: opts.items },
      id: opts.id,
      cssClass: 'popover-actions',
      breakpoints: opts.breakpoints,
      initialBreakpoint: opts.initialBreakpoint,
      // Ionic 9 makes the drag handle a keyboard stop that cycles through the
      // sheet sizes. With a single size it could not change anything, so it
      // stays out of the tab order then.
      handleBehavior:
        opts.breakpoints.filter((breakpoint) => breakpoint > 0).length > 1
          ? 'cycle'
          : 'none',
    });
  }

  async choose(role: string): Promise<void> {
    await this.modalController.dismiss(undefined, role, this.componentId());
  }
}

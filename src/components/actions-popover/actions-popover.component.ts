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

import { SheetCloseButtonComponent } from '../sheet-close-button/sheet-close-button.component';

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

/**
 * The name of a button. Ionic moves it from ion-button to the button in its
 * shadow root.
 */
function buttonName(button: Element): string | null {
  return (
    button.getAttribute('aria-label') ??
    button.shadowRoot
      ?.querySelector('[aria-label]')
      ?.getAttribute('aria-label') ??
    null
  );
}

interface ActionsPopoverOptions {
  id: string;
  items: PopoverItem[];
  breakpoints: number[];
  initialBreakpoint: number;
  /**
   * The click on the button that opens the menu. The menu has no visible
   * title and takes the button's name, e.g. "Options for Alpha Filter", so a
   * screen reader says which entry it belongs to.
   */
  openedBy?: Event;
}

@Component({
  selector: 'actions-popover',
  template: `
    <!-- Room for the grip only: no banner landmark without content. -->
    <ion-header translucent aria-hidden="true" />
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
                  aria-hidden="true"
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
      <app-sheet-close-button />
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
    SheetCloseButtonComponent,
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
    // Read at once: the event loses its target once it has been handled.
    const opener = opts.openedBy?.currentTarget;
    const label = opener instanceof Element ? buttonName(opener) : null;
    const popover = await ActionsPopoverComponent.create(
      modalController,
      opts,
      label,
    );
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
    label: string | null,
  ): Promise<HTMLIonModalElement> {
    return modalController.create({
      component: ActionsPopoverComponent,
      componentProps: { componentId: opts.id, items: opts.items },
      id: opts.id,
      htmlAttributes: label ? { 'aria-label': label } : undefined,
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

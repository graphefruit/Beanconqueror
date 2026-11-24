import { inject } from '@angular/core';

import { AlertController, IonModalToken, Platform } from '@ionic/angular';

import { UIAlert } from '../uiAlert';

/** Above Ionic's overlay handler (100), which ignores the question. */
const QUESTION_BACK_PRIORITY = 101;

export interface DiscardGuardOptions {
  /** Translation key of the question. */
  readonly question: string;
  readonly changed: () => boolean;
  readonly close: () => unknown;
}

/**
 * Asks before a form with input closes. Every way out ends in
 * `confirmDismiss`: the form's back and cancel buttons call it, and Android
 * back and Escape, which Ionic turns into a dismiss of the top overlay with
 * the role 'backdrop', reach it through the modal's `canDismiss`. Closing
 * with any other role (saved, closed by the form itself, by a parent modal)
 * is not asked about.
 */
export class DiscardGuard {
  private busy = false;
  private formClosing = false;

  constructor(
    private readonly uiAlert: UIAlert,
    private readonly platform: Platform,
    private readonly alertController: AlertController,
    private readonly options: DiscardGuardOptions,
    private readonly modal: HTMLIonModalElement | null,
  ) {
    if (modal) {
      modal.canDismiss = (_data, role) => this.canDismiss(role);
      modal.addEventListener('ionModalWillDismiss', () => {
        this.formClosing = true;
      });
    }
  }

  public async canDismiss(role?: string): Promise<boolean> {
    if (role !== 'backdrop' && role !== 'gesture') {
      return true;
    }
    // Not awaited: Ionic holds the modal's lock until this returns, and the
    // question closes the modal itself on "yes".
    void this.confirmDismiss();
    return false;
  }

  public async confirmDismiss(): Promise<void> {
    // A second back or tap while asking or closing must not ask or close twice.
    if (this.busy) {
      return;
    }
    this.busy = true;
    try {
      if (this.options.changed() && !(await this.ask())) {
        this.busy = false;
        return;
      }
      // The form may have closed itself meanwhile (automatic save, lost
      // scale), so there is nothing left to close.
      if (!this.formClosing) {
        await this.options.close();
      }
    } catch (error) {
      this.busy = false;
      throw error;
    }
  }

  /**
   * The question cannot be dismissed by its backdrop (that would count as
   * "yes"), so Ionic leaves back and Escape to the app, which would put the
   * app in the background. Here they answer "no", as on any Android dialog.
   * When the form closes itself while asking (automatic save, lost scale),
   * the question goes with it instead of standing over the list.
   */
  private async ask(): Promise<boolean> {
    const answerNo = () =>
      void this.alertController
        .getTop()
        .then((alert) => alert?.dismiss(undefined, 'cancel'));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        answerNo();
      }
    };
    const back = this.platform.backButton.subscribeWithPriority(
      QUESTION_BACK_PRIORITY,
      answerNo,
    );
    document.addEventListener('keydown', onKey);
    this.modal?.addEventListener('ionModalWillDismiss', answerNo);
    try {
      const choice = await this.uiAlert.showConfirm(
        this.options.question,
        'SURE_QUESTION',
        true,
      );
      return choice === 'YES';
    } finally {
      back.unsubscribe();
      document.removeEventListener('keydown', onKey);
      this.modal?.removeEventListener('ionModalWillDismiss', answerNo);
    }
  }
}

/** Creates the guard of the form being constructed and hooks it into its modal. */
export function injectDiscardGuard(options: DiscardGuardOptions): DiscardGuard {
  return new DiscardGuard(
    inject(UIAlert),
    inject(Platform),
    inject(AlertController),
    options,
    inject(IonModalToken, { optional: true }),
  );
}

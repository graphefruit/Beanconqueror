import { inject, Injectable, NgZone } from '@angular/core';

import { App, URLOpenListenerEvent } from '@capacitor/app';
import { TranslateService } from '@ngx-translate/core';

import IntentHandlerTracking from '../../data/tracking/intentHandlerTracking';
import QR_TRACKING from '../../data/tracking/qrTracking';
import { BEAN_CODE_ACTION } from '../../enums/beans/beanCodeAction';
import type { IHandoffEnvelope } from '../../interfaces/brew/IHandoff';
import { ServerBean } from '../../models/bean/serverBean';
import {
  BrewImportRollbackError,
  BrewImportService,
} from '../brewImport/brew-import.service';
import { ServerCommunicationService } from '../serverCommunication/server-communication.service';
import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIBeanHelper } from '../uiBeanHelper';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewHelper } from '../uiBrewHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { VisualizerService } from '../visualizerService/visualizer-service.service';
import {
  collectHandoffPayload,
  decodeHandoffBatchPayload,
  decodeHandoffPayload,
} from './brew-handoff.decoder';

interface ICreatedHandoffBean {
  uuid: string;
  beanName: string;
}

interface ICreatedHandoffPreparation {
  uuid: string;
  preparationType: string;
}

interface IBrewImportRollbackErrorLike {
  brewUuid: string;
  rolledBack: boolean;
  beanUuid: string;
  isBrewImportRollbackError: true;
}

@Injectable({
  providedIn: 'root',
})
export class IntentHandlerService {
  private readonly uiHelper = inject(UIHelper);
  private readonly uiLog = inject(UILog);
  private readonly serverCommunicationService = inject(
    ServerCommunicationService,
  );
  private readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly beanStorage = inject(UIBeanStorage);
  private readonly preparationStorage = inject(UIPreparationStorage);
  private readonly translate = inject(TranslateService);
  private readonly visualizerService = inject(VisualizerService);
  private readonly brewImportService = inject(BrewImportService);
  private readonly zone = inject(NgZone);

  public static SUPPORTED_INTENTS = {
    ADD_BEAN_ONLINE: 'ADD_BEAN_ONLINE',
    ADD_USER_BEAN: 'ADD_USER_BEAN',
    ADD_BREW: 'ADD_BREW',
    ADD_BREWS: 'ADD_BREWS',
  };

  public attachOnHandleOpenUrl() {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.zone.run(() => {
        const matchedHandoff = this.handoffIntentName(event.url);
        if (matchedHandoff !== undefined) {
          this.uiLog.log('Deeplink matched', {
            intent: matchedHandoff,
            length: event.url.length,
          });
        } else {
          this.uiLog.log('Deeplink matched', event);
        }
        this.handleDeepLink(event.url);
      });
    });
  }

  public async handleQRCodeLink(_url) {
    await this.uiHelper.isBeanconqurorAppReady().then(async () => {
      const url: string = _url;
      const matchedHandoff = this.handoffIntentName(url);
      if (matchedHandoff !== undefined) {
        this.uiLog.log(
          `Handle QR Code Link: ${matchedHandoff} (${url.length} chars)`,
        );
      } else {
        this.uiLog.log('Handle QR Code Link: ' + url);
      }
      await this.handleDeepLink(_url);
    });
  }

  public async handleDeepLink(_url) {
    try {
      if (_url) {
        await this.uiHelper.isBeanconqurorAppReady().then(async () => {
          const url: string = _url;
          const matchedHandoff = this.handoffIntentName(url);
          if (matchedHandoff !== undefined) {
            this.uiLog.log(
              `Handle deeplink: ${matchedHandoff} (${url.length} chars)`,
            );
          } else {
            this.uiLog.log('Handle deeplink: ' + url);
          }
          const urlParams = new URLSearchParams(url.split('?')[1]);
          if (
            url.indexOf('https://beanconqueror.com/?qr=') === 0 ||
            url.indexOf('https://beanconqueror.com?qr=') === 0 ||
            url.indexOf('?qr=') >= 0
          ) {
            const qrCodeId: string = urlParams.get('qr');
            await this.addBeanFromServer(qrCodeId);
          } else if (
            url
              .toLowerCase()
              .indexOf('beanconqueror://ADD_BEAN_ONLINE'.toLowerCase()) === 0
          ) {
            const qrCodeId: string = urlParams.get('id');
            await this.addBeanFromServer(qrCodeId);
          } else if (
            url.indexOf('https://beanconqueror.com/?shareUserBean0=') === 0 ||
            url.indexOf('https://beanconqueror.com?shareUserBean0=') === 0 ||
            url.indexOf('?shareUserBean0=') >= 0
          ) {
            let userBeanJSON: string = '';

            const regex = /((shareUserBean)[0-9]+(?=\=))/gi;
            const foundJSONParams = url.match(regex);
            try {
              for (const param of foundJSONParams) {
                userBeanJSON += String(urlParams.get(param));
              }
            } catch (ex) {}
            this.uiLog.log('Found shared bean ' + userBeanJSON);
            if (userBeanJSON) {
              /*
               * Android import is replacing the "+" with spaces when using the params, therefore we need to revert it.
               */
              userBeanJSON = userBeanJSON.replace(/ /g, '+');
              await this.addBeanFromUser(userBeanJSON);
            }
          } else if (
            url
              .toLowerCase()
              .indexOf('beanconqueror://ADD_USER_BEAN'.toLowerCase()) === 0
          ) {
            let userBeanJSON: string = '';

            const regex = /((shareUserBean)[0-9]+(?=\=))/gi;
            const foundJSONParams = url.match(regex);
            for (const param of foundJSONParams) {
              userBeanJSON += String(urlParams.get(param));
            }
            if (userBeanJSON) {
              /*
               * Android import is replacing the "+" with spaces when using the params, therefore we need to revert it.
               */
              userBeanJSON = userBeanJSON.replace(/ /g, '+');
              await this.addBeanFromUser(userBeanJSON);
            }
          } else if (this.matchesIntent(url, 'ADD_BREWS')) {
            await this.addBrewsFromHandoff(url);
          } else if (this.matchesIntent(url, 'ADD_BREW')) {
            await this.addBrewFromHandoff(url);
          } else if (
            url
              .toLowerCase()
              .indexOf('beanconqueror://VISUALIZER_SHARE'.toLowerCase()) === 0
          ) {
            const visualizerShareCode = String(urlParams.get('code'));

            this.importVisualizerShot(visualizerShareCode);
          } else if (
            url.indexOf('https://beanconqueror.com/?visualizerShare=') === 0 ||
            url.indexOf('https://beanconqueror.com?visualizerShare=') === 0 ||
            url.indexOf('?visualizerShare=') >= 0
          ) {
            /*e.g: "https://beanconqueror.com/app/visualizer/importVisualizer.html?visualizerShare=JRKJ"*/
            const visualizerShareCode = String(
              urlParams.get('visualizerShare'),
            );

            this.importVisualizerShot(visualizerShareCode);
          } else if (url.indexOf('bean.html') >= 0) {
            /**
             * On Android the whole path is directly resolved, therefore its the new url used**/
            const qrCodeId: string = urlParams.get('id');
            await this.addBeanFromServer(qrCodeId);
          } else if (url.indexOf('int/') > 0) {
            //We got an internal call ihr right now :)
            // Split into type, id, action ['bean', '3E95E1', 'START_BREW']
            const data = url.split('int/')[1].split('/');
            const actionType = data[0];
            const id = data[1];
            let action = data[2];
            try {
              this.uiAnalytics.trackEvent(
                IntentHandlerTracking.TITLE,
                IntentHandlerTracking.ACTIONS.INTERNAL_CALL,
                action as BEAN_CODE_ACTION,
              );
            } catch (ex) {}
            if (actionType === 'bean') {
              if (
                (action as BEAN_CODE_ACTION) === BEAN_CODE_ACTION.CHOOSE_ACTION
              ) {
                //We overwrite action here :)
                action = await this.uiBeanHelper.chooseNFCTagAction();
              }

              if ((action as BEAN_CODE_ACTION) === BEAN_CODE_ACTION.DETAIL) {
                await this.uiBeanHelper.detailBeanByInternalShareCode(id);
              } else if (
                (action as BEAN_CODE_ACTION) === BEAN_CODE_ACTION.EDIT
              ) {
                await this.uiBeanHelper.editBeanByInternalShareCode(id);
              } else if (
                (action as BEAN_CODE_ACTION) === BEAN_CODE_ACTION.START_BREW
              ) {
                await this.uiBrewHelper.startBrewForBeanByInternalShareCode(id);
              } else if (
                (action as BEAN_CODE_ACTION) ===
                BEAN_CODE_ACTION.START_BREW_CHOOSE_PREPARATION
              ) {
                await this.uiBrewHelper.startBrewAndChoosePreparationMethodForBeanByInternalShareCode(
                  id,
                );
              } else if (
                (action as BEAN_CODE_ACTION) ===
                BEAN_CODE_ACTION.REPEAT_LAST_BREW
              ) {
                await this.uiBrewHelper.repeatLastBrewForBeanByInternalShareCode(
                  id,
                );
              }
            }
          } else {
            this.uiAlert.showMessage(
              'QR.WRONG_QRCODE_DESCRIPTION',
              'QR.WRONG_QRCODE_TITLE',
              undefined,
              true,
            );
          }
        });
      }
    } catch (ex) {
      if (this.uiAlert.isLoadingSpinnerShown()) {
        this.uiAlert.hideLoadingSpinner();
      }
      this.uiLog.error('Handle Deep link failed: ' + ex.message);
    }
  }

  private matchesIntent(url: string, intent: string): boolean {
    return (
      url.split('?')[0].replace(/\/$/, '').toLowerCase() ===
      `beanconqueror://${intent}`.toLowerCase()
    );
  }

  /**
   * Receive a brew handed over from another app.
   *
   * The payload arrives split across numbered `shareBrew` parameters, exactly
   * as the bean share does, because a single parameter long enough to hold a
   * whole brew is truncated by the OS. The decoder is the trust boundary: it
   * validates before anything reaches storage, and every rejection carries a
   * specific reason, so the log says what was wrong rather than only that
   * something was.
   */
  private async addBrewFromHandoff(_url: string) {
    this.uiLog.log('Import brew from handoff link');

    let createdBeanUuid: string | undefined;
    let createdPreparationUuid: string | undefined;
    try {
      this.uiAnalytics.trackEvent(
        IntentHandlerTracking.TITLE,
        IntentHandlerTracking.ACTIONS.ADD_HANDOFF_BREW,
      );
      const envelope = await decodeHandoffPayload(collectHandoffPayload(_url));
      createdBeanUuid =
        await this.brewImportService.ensureBeanFromHandoff(envelope);
      createdPreparationUuid =
        await this.brewImportService.ensurePreparationFromHandoff(envelope);

      // A finished import only needs the fallback links that BrewImportService
      // cannot create itself, so a grinder hint may stay unlinked. The check
      // runs after the pod bean is created, because that bean is one of the
      // links it is looking for.
      if (this.uiBrewHelper.canImportBrewIfNotShowMessage() === false) {
        this.uiLog.log(
          'Import brew from handoff link skipped: cannot import yet',
        );
        await this.removeCreatedHandoffPreparation(createdPreparationUuid);
        await this.removeCreatedHandoffBean(createdBeanUuid);
        return;
      }

      await this.uiAlert.showLoadingSpinner();
      const imported = await this.brewImportService.import(envelope);
      if (imported.brew.method_of_preparation === createdPreparationUuid) {
        createdPreparationUuid = undefined;
      }
      createdBeanUuid = undefined;
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage(
        'BREW_IMPORT_SUCCESSFUL',
        undefined,
        undefined,
        true,
      );
    } catch (ex) {
      this.uiLog.error('Import brew from handoff link failed: ' + ex.message);
      if (
        this.shouldKeepCreatedHandoffPreparationAfterFailedImport(
          ex,
          createdPreparationUuid,
        )
      ) {
        createdPreparationUuid = undefined;
      }
      if (
        createdBeanUuid !== undefined &&
        this.shouldKeepCreatedBeanAfterImportFailure(ex, createdBeanUuid)
      ) {
        this.uiLog.error(
          `Import brew from handoff link kept bean ${createdBeanUuid} because imported brew ${ex.brewUuid} could not be rolled back.`,
        );
        createdBeanUuid = undefined;
      } else {
        await this.removeCreatedHandoffBean(createdBeanUuid);
      }
      await this.removeCreatedHandoffPreparation(createdPreparationUuid);
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage(
        this.brewImportFailureMessage(ex),
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
  }

  private shouldKeepCreatedBeanAfterImportFailure(
    ex: unknown,
    createdBeanUuid: string,
  ): ex is {
    isBrewImportRollbackError: true;
    brewUuid: string;
    rolledBack: false;
    beanUuid?: string;
  } {
    if (
      !!ex &&
      typeof ex === 'object' &&
      'isBrewImportRollbackError' in ex &&
      ex.isBrewImportRollbackError === true &&
      'rolledBack' in ex &&
      ex.rolledBack === false &&
      'brewUuid' in ex &&
      typeof ex.brewUuid === 'string'
    ) {
      return (
        !('beanUuid' in ex) ||
        ex.beanUuid === undefined ||
        ex.beanUuid === createdBeanUuid
      );
    }

    return false;
  }

  /**
   * The handoff intent this URL carries, if it carries one.
   *
   * A handoff URL holds a whole brew and runs to hundreds of kilobytes, so the
   * log records the intent and the length rather than the URL itself. Naming
   * the intent that actually matched keeps a batch from being logged as a
   * single brew.
   */
  private handoffIntentName(url: string): string | undefined {
    if (
      this.matchesIntent(url, IntentHandlerService.SUPPORTED_INTENTS.ADD_BREWS)
    ) {
      return IntentHandlerService.SUPPORTED_INTENTS.ADD_BREWS;
    }
    if (
      this.matchesIntent(url, IntentHandlerService.SUPPORTED_INTENTS.ADD_BREW)
    ) {
      return IntentHandlerService.SUPPORTED_INTENTS.ADD_BREW;
    }
    return undefined;
  }

  private async removeCreatedHandoffBean(
    uuid: string | undefined,
  ): Promise<boolean> {
    if (uuid === undefined) {
      return true;
    }
    try {
      const didRemove = await this.beanStorage.removeByUUID(uuid);
      if (didRemove) {
        return true;
      }
      this.uiLog.error(
        'Import brew from handoff link failed to roll back bean: ' + uuid,
      );
      return false;
    } catch (ex) {
      this.uiLog.error(
        'Import brew from handoff link failed to roll back bean: ' +
          uuid +
          ' (' +
          ex.message +
          ')',
      );
      return false;
    }
  }

  private shouldKeepCreatedHandoffPreparationAfterFailedImport(
    error: unknown,
    uuid: string | undefined,
  ): boolean {
    if (
      uuid === undefined ||
      !this.isNonDurableBrewImportRollbackError(error)
    ) {
      return false;
    }

    this.uiLog.error(
      'Import brew from handoff link kept handoff-created preparation after non-durable brew rollback: ' +
        uuid +
        ' (brew: ' +
        error.brewUuid +
        ')',
    );
    return true;
  }

  private isNonDurableBrewImportRollbackError(
    error: unknown,
  ): error is BrewImportRollbackError | IBrewImportRollbackErrorLike {
    if (error instanceof BrewImportRollbackError) {
      return error.rolledBack === false;
    }
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as Partial<IBrewImportRollbackErrorLike>;
    return (
      candidate.isBrewImportRollbackError === true &&
      candidate.rolledBack === false &&
      typeof candidate.brewUuid === 'string' &&
      typeof candidate.beanUuid === 'string'
    );
  }

  private async removeCreatedHandoffPreparation(
    uuid: string | undefined,
  ): Promise<boolean> {
    if (uuid === undefined) {
      return true;
    }
    try {
      const didRemove = await this.preparationStorage.removeByUUID(uuid);
      if (didRemove) {
        return true;
      }
      this.uiLog.error(
        'Import brew from handoff link failed to roll back preparation: ' +
          uuid,
      );
      return false;
    } catch (ex) {
      this.uiLog.error(
        'Import brew from handoff link failed to roll back preparation: ' +
          uuid +
          ' (' +
          ex.message +
          ')',
      );
      return false;
    }
  }

  /**
   * Receive several brews handed over from another app.
   *
   * Each batch entry is a complete single-brew envelope. The batch decoder only
   * validates the wrapper; the entries go through the same validator and import
   * service used by `ADD_BREW`, so the single and batch paths cannot drift.
   */
  private async addBrewsFromHandoff(_url: string) {
    this.uiLog.log('Import brews from handoff link');

    const createdBeanUuids: string[] = [];
    const retainedBeanUuids = new Set<string>();
    const createdPreparationUuids: string[] = [];
    const retainedPreparationUuids = new Set<string>();
    const createdPreparationUuidsByType = new Map<string, string>();
    try {
      this.uiAnalytics.trackEvent(
        IntentHandlerTracking.TITLE,
        IntentHandlerTracking.ACTIONS.ADD_HANDOFF_BREWS,
      );
      const envelopes = await decodeHandoffBatchPayload(
        collectHandoffPayload(_url),
      );
      await this.ensureDistinctBeansFromHandoff(envelopes, createdBeanUuids);
      await this.ensureDistinctPreparationsFromHandoff(
        envelopes,
        createdPreparationUuids,
        createdPreparationUuidsByType,
      );

      // Same rule as the single import: a batch only needs the fallback links
      // BrewImportService cannot create itself, and a grinder hint may stay
      // unlinked. The check runs after any batch beans are created, because
      // those beans are among the links it is looking for.
      if (this.uiBrewHelper.canImportBrewIfNotShowMessage() === false) {
        this.uiLog.log(
          'Import brews from handoff link skipped: cannot import yet',
        );
        await this.removeUnretainedCreatedHandoffPreparations(
          createdPreparationUuids,
          retainedPreparationUuids,
        );
        await this.removeUnretainedCreatedHandoffBeans(
          createdBeanUuids,
          retainedBeanUuids,
        );
        return;
      }

      await this.uiAlert.showLoadingSpinner();
      let importedCount = 0;
      const createdBeanUuidSet = new Set(createdBeanUuids);
      const createdPreparationUuidSet = new Set(createdPreparationUuids);
      for (let index = 0; index < envelopes.length; index++) {
        const envelope = envelopes[index];
        this.uiAlert.setLoadingSpinnerMessage(
          this.translate.instant('BREW_IMPORT_BATCH_PROGRESS', {
            current: index + 1,
            total: envelopes.length,
          }),
        );
        try {
          const imported = await this.brewImportService.import(envelope);
          if (createdBeanUuidSet.has(imported.brew.bean)) {
            retainedBeanUuids.add(imported.brew.bean);
          }
          if (
            createdPreparationUuidSet.has(imported.brew.method_of_preparation)
          ) {
            retainedPreparationUuids.add(imported.brew.method_of_preparation);
          }
          importedCount++;
        } catch (ex) {
          this.uiLog.error(
            'Import brew from batch handoff link failed: ' + ex.message,
          );
          this.keepBatchBeanAfterNonDurableRollback(
            ex,
            createdBeanUuidSet,
            retainedBeanUuids,
          );
          this.keepBatchPreparationAfterNonDurableRollback(
            ex,
            envelope,
            createdPreparationUuidsByType,
            retainedPreparationUuids,
          );
        }
      }
      await this.uiAlert.hideLoadingSpinner();
      await this.removeUnretainedCreatedHandoffPreparations(
        createdPreparationUuids,
        retainedPreparationUuids,
      );
      await this.removeUnretainedCreatedHandoffBeans(
        createdBeanUuids,
        retainedBeanUuids,
      );

      if (importedCount === 0) {
        this.uiAlert.showMessage(
          'BREW_IMPORT_FAILED',
          'ERROR_OCCURED',
          undefined,
          true,
        );
        return;
      }

      this.uiAlert.showMessage(
        this.translate.instant('BREW_IMPORT_BATCH_RESULT', {
          imported: importedCount,
          total: envelopes.length,
        }),
        undefined,
        undefined,
        false,
      );
    } catch (ex) {
      this.uiLog.error('Import brews from handoff link failed: ' + ex.message);
      await this.removeUnretainedCreatedHandoffPreparations(
        createdPreparationUuids,
        retainedPreparationUuids,
      );
      await this.removeUnretainedCreatedHandoffBeans(
        createdBeanUuids,
        retainedBeanUuids,
      );
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage(
        this.brewImportFailureMessage(ex),
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
  }

  private keepBatchBeanAfterNonDurableRollback(
    error: unknown,
    createdBeanUuidSet: Set<string>,
    retainedBeanUuids: Set<string>,
  ): void {
    if (!this.isNonDurableBrewImportRollbackError(error)) {
      return;
    }

    if (!createdBeanUuidSet.has(error.beanUuid)) {
      return;
    }

    retainedBeanUuids.add(error.beanUuid);
    this.uiLog.error(
      'Import brew from batch handoff link kept handoff-created bean after non-durable brew rollback: ' +
        error.beanUuid +
        ' (brew: ' +
        error.brewUuid +
        ')',
    );
  }

  private async removeUnretainedCreatedHandoffBeans(
    createdBeanUuids: string[],
    retainedBeanUuids: Set<string>,
  ): Promise<void> {
    let cleanupComplete = true;
    try {
      for (const uuid of createdBeanUuids) {
        if (!retainedBeanUuids.has(uuid)) {
          const removed = await this.removeCreatedHandoffBean(uuid);
          cleanupComplete = cleanupComplete && removed;
        }
      }
    } catch (ex) {
      cleanupComplete = false;
      this.uiLog.error(
        'Import brew from handoff link failed while cleaning up beans: ' +
          ex.message,
      );
    }
    if (!cleanupComplete) {
      this.uiLog.error(
        'Import brews from handoff link cleanup incomplete; some handoff-created coffees may remain on disk.',
      );
    }
  }

  private keepBatchPreparationAfterNonDurableRollback(
    error: unknown,
    envelope: IHandoffEnvelope,
    createdPreparationUuidsByType: Map<string, string>,
    retainedPreparationUuids: Set<string>,
  ): void {
    if (!this.isNonDurableBrewImportRollbackError(error)) {
      return;
    }

    const preparationType = this.handoffPreparationType(envelope);
    const uuid =
      preparationType === undefined
        ? undefined
        : createdPreparationUuidsByType.get(preparationType);
    if (uuid === undefined) {
      return;
    }

    retainedPreparationUuids.add(uuid);
    this.uiLog.error(
      'Import brew from batch handoff link kept handoff-created preparation after non-durable brew rollback: ' +
        uuid +
        ' (brew: ' +
        error.brewUuid +
        ')',
    );
  }

  private async removeUnretainedCreatedHandoffPreparations(
    createdPreparationUuids: string[],
    retainedPreparationUuids: Set<string>,
  ): Promise<void> {
    let cleanupComplete = true;
    try {
      for (const uuid of createdPreparationUuids) {
        if (!retainedPreparationUuids.has(uuid)) {
          const removed = await this.removeCreatedHandoffPreparation(uuid);
          cleanupComplete = cleanupComplete && removed;
        }
      }
    } catch (ex) {
      cleanupComplete = false;
      this.uiLog.error(
        'Import brew from handoff link failed while cleaning up preparations: ' +
          ex.message,
      );
    }
    if (!cleanupComplete) {
      this.uiLog.error(
        'Import brews from handoff link cleanup incomplete; some handoff-created preparations may remain on disk.',
      );
    }
  }

  /**
   * Offer to create the coffees a batch mentions, asking once rather than once
   * per brew.
   *
   * Returns the beans this call created, so a batch that then cannot proceed
   * can take them back. A bean the user already had is not in that list and is
   * never touched.
   */
  private async ensureDistinctBeansFromHandoff(
    envelopes: IHandoffEnvelope[],
    createdBeanUuids: string[] = [],
  ): Promise<ICreatedHandoffBean[]> {
    const envelopesByBeanName = new Map<string, IHandoffEnvelope[]>();
    for (const envelope of envelopes) {
      const beanName = this.handoffBeanName(envelope);
      if (beanName === undefined) {
        continue;
      }

      const groupedEnvelopes = envelopesByBeanName.get(beanName) ?? [];
      groupedEnvelopes.push(envelope);
      envelopesByBeanName.set(beanName, groupedEnvelopes);
    }

    const creatableEnvelopes: IHandoffEnvelope[] = [];
    for (const groupedEnvelopes of envelopesByBeanName.values()) {
      const creatableEnvelope = groupedEnvelopes.find((envelope) =>
        this.brewImportService.canCreateBeanFromHandoff(envelope, 'exact'),
      );
      if (creatableEnvelope !== undefined) {
        creatableEnvelopes.push(creatableEnvelope);
      }
    }

    if (creatableEnvelopes.length === 0) {
      return [];
    }

    if (creatableEnvelopes.length === 1) {
      const created = await this.brewImportService.ensureBeanFromHandoff(
        creatableEnvelopes[0],
        'exact',
      );
      const beanName = this.handoffBeanName(creatableEnvelopes[0]);
      if (created === undefined || beanName === undefined) {
        return [];
      }
      createdBeanUuids.push(created);
      return [{ uuid: created, beanName }];
    }

    const choice = await this.uiAlert.showConfirm(
      this.translate.instant('BREW_IMPORT_CREATE_BEANS_DESCRIPTION', {
        count: creatableEnvelopes.length,
      }),
      this.translate.instant('BREW_IMPORT_CREATE_BEANS_TITLE', {
        count: creatableEnvelopes.length,
      }),
      false,
    );
    if (choice !== 'YES') {
      return [];
    }

    const created: ICreatedHandoffBean[] = [];
    try {
      for (const envelope of creatableEnvelopes) {
        const uuid = await this.brewImportService.createBeanFromHandoff(
          envelope,
          'exact',
        );
        const beanName = this.handoffBeanName(envelope);
        if (uuid !== undefined && beanName !== undefined) {
          createdBeanUuids.push(uuid);
          created.push({ uuid, beanName });
        }
      }
    } catch (ex) {
      for (const bean of created) {
        const removed = await this.removeCreatedHandoffBean(bean.uuid);
        if (removed) {
          this.removeCreatedBeanUuid(createdBeanUuids, bean.uuid);
        }
      }
      throw ex;
    }
    return created;
  }

  private removeCreatedBeanUuid(createdBeanUuids: string[], uuid: string): void {
    const index = createdBeanUuids.indexOf(uuid);
    if (index >= 0) {
      createdBeanUuids.splice(index, 1);
    }
  }

  /**
   * Offer to create preparation methods a batch names by stable type, asking
   * once for each missing type rather than once per brew.
   */
  private async ensureDistinctPreparationsFromHandoff(
    envelopes: IHandoffEnvelope[],
    createdPreparationUuids: string[] = [],
    createdPreparationUuidsByType: Map<string, string> = new Map(),
  ): Promise<ICreatedHandoffPreparation[]> {
    const envelopesByPreparationType = new Map<string, IHandoffEnvelope[]>();
    for (const envelope of envelopes) {
      const preparationType = this.handoffPreparationType(envelope);
      if (preparationType === undefined) {
        continue;
      }

      const groupedEnvelopes =
        envelopesByPreparationType.get(preparationType) ?? [];
      groupedEnvelopes.push(envelope);
      envelopesByPreparationType.set(preparationType, groupedEnvelopes);
    }

    const creatableEnvelopes: IHandoffEnvelope[] = [];
    for (const groupedEnvelopes of envelopesByPreparationType.values()) {
      const creatableEnvelope = groupedEnvelopes.find((envelope) =>
        this.brewImportService.canCreatePreparationFromHandoff(envelope),
      );
      if (creatableEnvelope !== undefined) {
        creatableEnvelopes.push(creatableEnvelope);
      }
    }

    if (creatableEnvelopes.length === 0) {
      return [];
    }

    const created: ICreatedHandoffPreparation[] = [];
    try {
      for (const envelope of creatableEnvelopes) {
        const uuid =
          await this.brewImportService.ensurePreparationFromHandoff(envelope);
        const preparationType = this.handoffPreparationType(envelope);
        if (uuid !== undefined && preparationType !== undefined) {
          createdPreparationUuids.push(uuid);
          createdPreparationUuidsByType.set(preparationType, uuid);
          created.push({ uuid, preparationType });
        }
      }
    } catch (ex) {
      for (const preparation of created) {
        const removed = await this.removeCreatedHandoffPreparation(
          preparation.uuid,
        );
        if (removed) {
          this.removeCreatedPreparationUuid(
            createdPreparationUuids,
            createdPreparationUuidsByType,
            preparation,
          );
        }
      }
      throw ex;
    }
    return created;
  }

  private removeCreatedPreparationUuid(
    createdPreparationUuids: string[],
    createdPreparationUuidsByType: Map<string, string>,
    preparation: ICreatedHandoffPreparation,
  ): void {
    const index = createdPreparationUuids.indexOf(preparation.uuid);
    if (index >= 0) {
      createdPreparationUuids.splice(index, 1);
    }
    if (
      createdPreparationUuidsByType.get(preparation.preparationType) ===
      preparation.uuid
    ) {
      createdPreparationUuidsByType.delete(preparation.preparationType);
    }
  }

  private handoffBeanName(envelope: IHandoffEnvelope): string | undefined {
    const beanName = envelope.bean?.name;
    if (typeof beanName !== 'string') {
      return undefined;
    }
    return beanName.normalize('NFC').trim().toLocaleLowerCase();
  }

  private handoffPreparationType(
    envelope: IHandoffEnvelope,
  ): string | undefined {
    const preparationType = envelope.brew.preparationType;
    if (typeof preparationType !== 'string') {
      return undefined;
    }
    const trimmed = preparationType.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private brewImportFailureMessage(error: unknown): string {
    if (
      error instanceof Error &&
      error.message.startsWith('Inflated payload exceeds')
    ) {
      return 'BREW_IMPORT_TOO_LARGE';
    }

    return 'BREW_IMPORT_FAILED';
  }

  private importVisualizerShot(_shareCode) {
    this.uiAnalytics.trackEvent(
      IntentHandlerTracking.TITLE,
      IntentHandlerTracking.ACTIONS.VISUALIZER_IMPORT,
    );
    this.visualizerService.importShotWithSharedCode(_shareCode);
  }
  public async addBeanFromServer(_qrCodeId: string) {
    this.uiLog.log('Load bean information from server: ' + _qrCodeId);

    try {
      await this.uiAlert.showLoadingSpinner();
      this.uiAnalytics.trackEvent(
        IntentHandlerTracking.TITLE,
        IntentHandlerTracking.ACTIONS.IMPORT_ROASTER_BEAN,
        _qrCodeId,
      );
      const beanData: ServerBean =
        await this.serverCommunicationService.getBeanInformation(_qrCodeId);
      await this.uiBeanHelper.addScannedQRBean(beanData);
    } catch (ex) {
      this.uiAnalytics.trackEvent(
        QR_TRACKING.TITLE,
        QR_TRACKING.ACTIONS.SCAN_FAILED,
      );
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage(
        'QR.SERVER.ERROR_OCCURED',
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
  }

  public async addBeanFromUser(_userBeanJSON: string) {
    this.uiLog.log(
      'Load bean information from shared user context: ' + _userBeanJSON,
    );

    try {
      await this.uiAlert.showLoadingSpinner();
      this.uiAnalytics.trackEvent(
        IntentHandlerTracking.TITLE,
        IntentHandlerTracking.ACTIONS.ADD_USER_SHARED_BEAN,
      );
      await this.uiBeanHelper.addUserSharedBean(_userBeanJSON);
    } catch (ex) {
      this.uiAnalytics.trackEvent(
        QR_TRACKING.TITLE,
        QR_TRACKING.ACTIONS.SCAN_FAILED,
      );
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage(
        'QR.SERVER.ERROR_OCCURED',
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
  }
}

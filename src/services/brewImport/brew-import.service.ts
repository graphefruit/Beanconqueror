import { inject, Injectable } from '@angular/core';

import moment from 'moment';

import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import type {
  IHandoffBean,
  IHandoffEnvelope,
  IHandoffFlow,
  IHandoffMetric,
} from '../../interfaces/brew/IHandoff';
import { UIAlert } from '../uiAlert';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIFileHelper } from '../uiFileHelper';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UISettingsStorage } from '../uiSettingsStorage';

const MAX_ABSOLUTE_MILLISECONDS = 24 * 60 * 60 * 1_000;
const MAX_ABSOLUTE_GRAMS = 100_000;
const MAX_CREATE_BEAN_PROMPT_NAME_LENGTH = 60;

export interface IBrewImportResult {
  brew: Brew;
  brewFlow: BrewFlow;
}

export class BrewImportRollbackError extends Error {
  public readonly isBrewImportRollbackError = true;

  public constructor(
    public readonly brewUuid: string,
    public readonly rolledBack: boolean,
    public readonly beanUuid: string,
  ) {
    super(`Imported brew update failed: ${brewUuid}`);
    this.name = 'BrewImportRollbackError';
    Object.setPrototypeOf(this, BrewImportRollbackError.prototype);
  }
}

interface INameMatchResult {
  uuid: string;
  note?: string;
}

interface IStoredNamedEntry {
  name: string;
  finished?: boolean;
  config: { uuid: string };
}

@Injectable({
  providedIn: 'root',
})
export class BrewImportService {
  private readonly beanStorage = inject(UIBeanStorage);
  private readonly millStorage = inject(UIMillStorage);
  private readonly preparationStorage = inject(UIPreparationStorage);
  private readonly brewStorage = inject(UIBrewStorage);
  private readonly fileHelper = inject(UIFileHelper);
  private readonly uiLog = inject(UILog);
  private readonly settingsStorage = inject(UISettingsStorage);
  private readonly uiAlert = inject(UIAlert);

  public build(envelope: IHandoffEnvelope): IBrewImportResult {
    const brew = new Brew();
    const notes: string[] = [];

    brew.grind_weight = envelope.brew.doseIn?.value ?? 0;
    brew.brew_quantity = envelope.brew.waterIn.value;
    brew.brew_quantity_type = 'ML' as BREW_QUANTITY_TYPES_ENUM;
    brew.brew_beverage_quantity = envelope.brew.beverageOut.value;
    brew.brew_beverage_quantity_type = 'GR' as BREW_QUANTITY_TYPES_ENUM;
    this.assignSecondsAndMilliseconds(
      envelope.brew.brewTime,
      (seconds, milliseconds) => {
        brew.brew_time = seconds;
        brew.brew_time_milliseconds = milliseconds;
      },
    );
    brew.brew_temperature = envelope.brew.temperature ?? 0;
    brew.grind_size = envelope.brew.grindSize ?? '';
    brew.mill_speed = envelope.brew.grinderRpm ?? 0;
    this.assignSecondsAndMilliseconds(
      envelope.brew.firstDripTime ?? 0,
      (seconds, milliseconds) => {
        brew.coffee_first_drip_time = seconds;
        brew.coffee_first_drip_time_milliseconds = milliseconds;
      },
    );
    this.assignSecondsAndMilliseconds(
      envelope.brew.bloomTime ?? 0,
      (seconds, milliseconds) => {
        brew.coffee_blooming_time = seconds;
        brew.coffee_blooming_time_milliseconds = milliseconds;
      },
    );
    brew.rating = this.ratingOnThisScale(envelope.brew.rating);
    brew.config.unix_timestamp = Math.floor(
      Date.parse(envelope.brew.date) / 1000,
    );
    brew.customInformation.imported = envelope.imported;

    const beanName = this.optionalBeanName(envelope);
    const beanMatch = this.findUniqueOrDefault(
      this.beanStorage.getAllEntries(),
      beanName,
      'Bean',
    );
    brew.bean = beanMatch.uuid;
    if (beanMatch.note) {
      notes.push(beanMatch.note);
    }

    if (envelope.brew.grinderName) {
      const match = this.findUniqueByName(
        this.millStorage.getAllEntries(),
        envelope.brew.grinderName,
        'Grinder',
      );
      brew.mill = match.uuid;
      if (match.note) {
        notes.push(match.note);
      }
    }

    const preparationMatch = this.findUniqueOrDefault(
      this.preparationStorage.getAllEntries(),
      envelope.brew.preparationMethod,
      'Preparation',
    );
    brew.method_of_preparation = preparationMatch.uuid;
    if (preparationMatch.note) {
      notes.push(preparationMatch.note);
    }

    brew.note = [envelope.brew.note, ...notes].filter(Boolean).join('\n\n');

    return {
      brew,
      brewFlow: this.buildFlow(envelope.flow, envelope.metrics),
    };
  }

  public async ensureBeanFromHandoff(
    envelope: IHandoffEnvelope,
  ): Promise<string | undefined> {
    const bean = envelope.bean;
    if (!bean || !this.hasBeanMetadata(bean)) {
      return undefined;
    }

    if (this.hasNameMatch(this.beanStorage.getAllEntries(), bean.name)) {
      return undefined;
    }

    const choice = await this.uiAlert.showConfirm(
      'BREW_IMPORT_CREATE_BEAN_DESCRIPTION',
      'BREW_IMPORT_CREATE_BEAN_TITLE',
      true,
      { name: this.promptBeanName(bean.name) },
    );
    if (choice !== 'YES') {
      return undefined;
    }

    const created = await this.beanStorage.add(this.buildBean(bean));
    return created.config.uuid;
  }

  public async import(envelope: IHandoffEnvelope): Promise<IBrewImportResult> {
    const result = this.build(envelope);
    const addedBrew: Brew = await this.brewStorage.add(result.brew);

    addedBrew.config.unix_timestamp = result.brew.config.unix_timestamp;
    addedBrew.customInformation.imported =
      result.brew.customInformation.imported;

    if (this.hasFlowContent(result.brewFlow)) {
      addedBrew.flow_profile = addedBrew.getGraphPath();
      try {
        await this.fileHelper.writeInternalFileFromText(
          JSON.stringify(result.brewFlow),
          addedBrew.flow_profile,
        );
      } catch {
        addedBrew.flow_profile = '';
      }
    }

    const didUpdate = await this.brewStorage.update(addedBrew);
    if (!didUpdate) {
      if (addedBrew.flow_profile) {
        try {
          await this.fileHelper.deleteInternalFile(addedBrew.flow_profile);
        } catch (ex) {
          this.uiLog.error(
            `Import brew rollback flow-file delete failed: ${addedBrew.flow_profile}`,
            ex,
          );
        }
      }
      const didRollback = await this.brewStorage.removeByObject(addedBrew);
      if (didRollback) {
        this.uiLog.error(
          `Import brew update failed; rolled back imported brew: ${addedBrew.config.uuid}`,
        );
      } else {
        this.uiLog.error(
          `Import brew update failed; rollback could not remove imported brew: ${addedBrew.config.uuid}`,
        );
      }
      throw new BrewImportRollbackError(
        addedBrew.config.uuid,
        didRollback,
        result.brew.bean,
      );
    }

    return {
      brew: addedBrew,
      brewFlow: result.brewFlow,
    };
  }

  private buildFlow(
    flow: IHandoffFlow | undefined,
    metrics: IHandoffMetric[] | undefined,
  ): BrewFlow {
    const brewFlow = new BrewFlow();

    if (flow) {
      this.assignFlowSamples(brewFlow, flow);
    }
    if (metrics) {
      this.assignMetrics(brewFlow, metrics);
    }

    return brewFlow;
  }

  private assertWithinGramLimit(total: number, field: string): void {
    if (Math.abs(total) > MAX_ABSOLUTE_GRAMS) {
      throw new Error(
        `Envelope ${field} cumulative total must be at most ${MAX_ABSOLUTE_GRAMS}`,
      );
    }
  }

  private assignFlowSamples(brewFlow: BrewFlow, flow: IHandoffFlow): void {
    let timestampMs = 0;
    let waterDispensed = 0;
    let weight = 0;
    let oldWaterDispensed = 0;
    let oldWeight = 0;
    let oldTemperature = 0;

    flow.t.forEach((timestampDelta, index) => {
      timestampMs += timestampDelta;
      if (timestampMs > MAX_ABSOLUTE_MILLISECONDS) {
        throw new Error(
          `Envelope flow.t cumulative timestamp must be at most ${MAX_ABSOLUTE_MILLISECONDS}`,
        );
      }
      waterDispensed += flow.waterDispensed[index] / 10;
      weight += flow.weight[index] / 10;
      this.assertWithinGramLimit(waterDispensed, 'flow.waterDispensed');
      this.assertWithinGramLimit(weight, 'flow.weight');

      const timestamp = this.formatTimestamp(timestampMs);
      const brewTime = this.formatBrewTime(timestampMs);
      brewFlow.weight.push({
        timestamp,
        brew_time: brewTime,
        actual_weight: weight,
        old_weight: oldWeight,
        actual_smoothed_weight: weight,
        old_smoothed_weight: oldWeight,
        calculated_real_flow: 0,
        not_mutated_weight: weight,
      });
      brewFlow.waterDispensed.push({
        actual: waterDispensed,
        old: oldWaterDispensed,
        timestamp,
        brew_time: brewTime,
      });

      if (flow.temperature) {
        const temperature = flow.temperature[index];
        brewFlow.temperatureFlow.push({
          actual_temperature: temperature,
          old_temperature: oldTemperature,
          timestamp,
          brew_time: brewTime,
        });
        oldTemperature = temperature;
      }

      oldWaterDispensed = waterDispensed;
      oldWeight = weight;
    });
  }

  private assignMetrics(brewFlow: BrewFlow, metrics: IHandoffMetric[]): void {
    const colors = this.settingsStorage.getSettings().graph_colors.customTrace;
    metrics.forEach((metric) => {
      brewFlow.customMetrics[metric.key] = metric.t.map(
        (timestampMs, index) => ({
          value: metric.v[index],
          timestamp: this.formatTimestamp(timestampMs),
          brew_time: this.formatBrewTime(timestampMs),
        }),
      );
      brewFlow.customAxes.push({
        key: metric.key,
        // The prefix is Beanconqueror chrome and stays as an i18n key; the
        // sender's metric name is opaque user data and is rendered verbatim.
        namePrefix: this.metricKindKey(metric.kind),
        name: metric.name,
        unit: metric.unit,
        colorLight: colors.active.light,
        colorDark: colors.active.dark,
      });
    });
  }

  private metricKindKey(kind: IHandoffMetric['kind']): string {
    return kind === 'target'
      ? 'BREW_IMPORT_METRIC_TARGET'
      : 'BREW_IMPORT_METRIC_MEASURED';
  }

  private hasFlowContent(brewFlow: BrewFlow): boolean {
    return (
      brewFlow.weight.length > 0 ||
      brewFlow.waterDispensed.length > 0 ||
      brewFlow.temperatureFlow.length > 0 ||
      Object.keys(brewFlow.customMetrics).length > 0
    );
  }

  private optionalBeanName(envelope: IHandoffEnvelope): string {
    return typeof envelope.bean?.name === 'string' ? envelope.bean.name : '';
  }

  private promptBeanName(name: string): string {
    if (name.length <= MAX_CREATE_BEAN_PROMPT_NAME_LENGTH) {
      return name;
    }
    return `${name.slice(0, MAX_CREATE_BEAN_PROMPT_NAME_LENGTH - 3)}...`;
  }

  private hasBeanMetadata(bean: IHandoffBean): boolean {
    return [
      bean.origin,
      bean.process,
      bean.variety,
      bean.aromatics,
      bean.note,
      bean.beanMix,
    ].some((field) => field !== undefined);
  }

  private buildBean(handoffBean: IHandoffBean): Bean {
    const bean = new Bean();
    bean.name = handoffBean.name;
    bean.note = handoffBean.note ?? '';
    bean.aromatics = handoffBean.aromatics ?? '';
    bean.beanMix = this.beanMixFromHandoff(handoffBean.beanMix);

    // Beanconqueror attachments are local file paths; remote pod images would
    // need a downloader, permissions and lifecycle policy outside this import.
    const information = this.beanInformationFromHandoff(handoffBean);
    if (information !== undefined) {
      bean.bean_information.push(information);
    }

    return bean;
  }

  private beanInformationFromHandoff(
    bean: IHandoffBean,
  ): IBeanInformation | undefined {
    if (!bean.origin && !bean.process && !bean.variety) {
      return undefined;
    }

    return {
      country: bean.origin ?? '',
      region: '',
      farm: '',
      farmer: '',
      elevation: '',
      harvest_time: '',
      variety: bean.variety ?? '',
      processing: bean.process ?? '',
      certification: '',
      percentage: 0,
      purchasing_price: 0,
      fob_price: 0,
    };
  }

  private beanMixFromHandoff(beanMix: string | undefined): BEAN_MIX_ENUM {
    const normalized = this.normalizeBeanMix(beanMix ?? '');
    if (normalized === 'singleorigin' || normalized === 'single') {
      return 'SINGLE_ORIGIN' as BEAN_MIX_ENUM;
    }
    if (normalized === 'blend') {
      return 'BLEND' as BEAN_MIX_ENUM;
    }
    if (normalized === 'unknown') {
      return 'UNKNOWN' as BEAN_MIX_ENUM;
    }
    return 'UNKNOWN' as BEAN_MIX_ENUM;
  }

  private normalizeBeanMix(value: string): string {
    return value
      .normalize('NFC')
      .trim()
      .toLocaleLowerCase()
      .replace(/[\W_]/g, '');
  }

  private hasNameMatch(
    entries: IStoredNamedEntry[],
    hintedName: string,
  ): boolean {
    const normalizedHint = this.normalizeName(hintedName);
    return entries.some(
      (entry) => this.normalizeName(entry.name) === normalizedHint,
    );
  }

  private findUniqueOrDefault(
    entries: IStoredNamedEntry[],
    hintedName: string,
    label: string,
  ): INameMatchResult {
    const usable = this.usableEntries(entries);
    const fallback = this.firstUsableEntry(usable);
    const fallbackNote = (reason: string): INameMatchResult => {
      if (!fallback) {
        throw new Error(`${label} not linked: no available ${label}.`);
      }
      const shownHint = hintedName.trim();
      const hintText = shownHint ? `"${shownHint}"` : 'no name supplied';
      return {
        uuid: fallback.config.uuid,
        note: `${label} not linked: ${hintText} (${reason}). Using "${fallback.name}".`,
      };
    };

    // Name hints are matched case-insensitively after trimming, but never create
    // equipment. A mistaken match can be cleared by hand; an importer-created
    // duplicate silently pollutes the user's lists and is hard to discover.
    const normalizedHint = this.normalizeName(hintedName);
    if (!normalizedHint) {
      return fallbackNote('missing name');
    }

    const matches = usable.filter(
      (entry) => this.normalizeName(entry.name) === normalizedHint,
    );
    if (matches.length === 1) {
      return { uuid: matches[0].config.uuid };
    }

    if (matches.length === 0) {
      const wider = this.findUniqueModelMatch(usable, normalizedHint);
      if (wider) {
        return {
          uuid: wider.config.uuid,
          note: `${label} linked to "${wider.name}" from "${hintedName.trim()}".`,
        };
      }
    }

    const reason = matches.length === 0 ? 'no match' : 'multiple matches';
    return fallbackNote(reason);
  }

  private findUniqueByName(
    entries: IStoredNamedEntry[],
    hintedName: string,
    label: string,
  ): INameMatchResult {
    const usable = this.usableEntries(entries);
    const normalizedHint = this.normalizeName(hintedName);
    if (!normalizedHint) {
      return { uuid: '' };
    }

    const matches = usable.filter(
      (entry) => this.normalizeName(entry.name) === normalizedHint,
    );
    if (matches.length === 1) {
      return { uuid: matches[0].config.uuid };
    }

    if (matches.length === 0) {
      const wider = this.findUniqueModelMatch(usable, normalizedHint);
      if (wider) {
        return {
          uuid: wider.config.uuid,
          note: `${label} linked to "${wider.name}" from "${hintedName.trim()}".`,
        };
      }
    }

    const reason = matches.length === 0 ? 'no match' : 'multiple matches';
    return {
      uuid: '',
      note: `${label} not linked: "${hintedName.trim()}" (${reason}).`,
    };
  }

  /**
   * The one entry whose name and the hint are the same equipment named at
   * different lengths.
   *
   * A sending app usually knows its maker and not its model, and a user
   * usually types the model: a machine that calls itself "xBloom" never found
   * a mill the user had entered as "xBloom Studio", and neither name is wrong.
   * So a name that is a whole leading word of the other counts, in either
   * direction, because which of the two is the longer depends on which side
   * knows more.
   *
   * The boundary is what keeps this from being a substring search. "Ode" must
   * not reach "Odessa", so the longer name has to continue with a separator
   * rather than with more of a word. And it must be the *only* such entry: a
   * user with both an xBloom Studio and an xBloom Original is telling us the
   * distinction matters to them, so a hint that cannot choose between them
   * falls through to the note rather than guessing.
   */
  private findUniqueModelMatch(
    entries: IStoredNamedEntry[],
    normalizedHint: string,
  ): IStoredNamedEntry | undefined {
    const extendsName = (longer: string, shorter: string): boolean =>
      longer.length > shorter.length &&
      longer.startsWith(shorter) &&
      /[\s\-_/]/.test(longer.charAt(shorter.length));

    const candidates = entries.filter((entry) => {
      const name = this.normalizeName(entry.name);
      if (!name) {
        return false;
      }
      return (
        extendsName(name, normalizedHint) || extendsName(normalizedHint, name)
      );
    });

    return candidates.length === 1 ? candidates[0] : undefined;
  }

  // A finished bean or preparation is archived, and `canBrew()` will not brew
  // with one. Linking an imported brew to an archived entry files the brew
  // itself under the archive, where the user is unlikely to look for it. So the
  // importer only ever sees entries it is allowed to link to, and every path
  // below -- exact name, widened model name, and the default -- narrows first.
  private usableEntries(entries: IStoredNamedEntry[]): IStoredNamedEntry[] {
    return entries.filter((entry) => !entry.finished);
  }

  private firstUsableEntry(
    entries: IStoredNamedEntry[],
  ): IStoredNamedEntry | undefined {
    return this.usableEntries(entries).sort((a, b) =>
      a.name.localeCompare(b.name),
    )[0];
  }

  private normalizeName(name: string): string {
    return name.normalize('NFC').trim().toLocaleLowerCase();
  }

  /**
   * A rating from another app, held to this user's own scale.
   *
   * Clamped rather than rescaled: the number somebody typed is the number they
   * meant, and stretching a 4 into an 8 because this install counts to ten
   * would put a verdict in the diary that nobody gave. A brew that arrives
   * unrated stays unrated, which on this scale is 0.
   */
  private ratingOnThisScale(rating: number | undefined): number {
    if (rating === undefined || rating <= 0) {
      return 0;
    }
    const ceiling = this.settingsStorage.getSettings().brew_rating;
    return Math.min(rating, ceiling);
  }

  private assignSecondsAndMilliseconds(
    value: number,
    assign: (seconds: number, milliseconds: number) => void,
  ): void {
    const totalMilliseconds = Math.round(value * 1000);
    assign(Math.trunc(totalMilliseconds / 1000), totalMilliseconds % 1000);
  }

  private formatTimestamp(milliseconds: number): string {
    return moment.utc(milliseconds).format('HH:mm:ss.SSS');
  }

  private formatBrewTime(milliseconds: number): string {
    return (milliseconds / 1000).toFixed(3);
  }
}

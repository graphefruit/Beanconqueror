const { config } = require('./config');
const { getPool } = require('./db');
const {
  getStorageValue,
  setStorageValue,
  upsertStorageList,
} = require('./storage-repository');

const GAGGIUINO_SETTINGS_KEY = 'GAGGIUINO_SETTINGS';
const GAGGIUINO_AUTOSYNC_STATE_KEY = 'GAGGIUINO_AUTOSYNC_STATE';
const GAGGIUINO_BEAN_UUID = '00000000-0000-4000-8000-000000000001';
const GAGGIUINO_MILL_UUID = '00000000-0000-4000-8000-000000000002';
const GAGGIUINO_PREPARATION_UUID = '00000000-0000-4000-8000-000000000003';

class GaggiuinoConnectionError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = 'GaggiuinoConnectionError';
    this.status = status;
  }
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '');
}

async function getGaggiuinoSettings() {
  const settings = await getStorageValue(GAGGIUINO_SETTINGS_KEY);
  const parsedTimeoutMs = Number(settings?.timeoutMs);
  return {
    baseUrl: settings?.baseUrl ?? config.gaggiuino.baseUrl,
    timeoutMs: Number.isFinite(parsedTimeoutMs)
      ? parsedTimeoutMs
      : config.gaggiuino.timeoutMs,
    designatedMillUuid:
      settings?.designatedMillUuid ?? GAGGIUINO_MILL_UUID,
    autoSyncEnabled:
      settings?.autoSyncEnabled !== undefined
        ? Boolean(settings.autoSyncEnabled)
        : config.gaggiuino.autoSyncEnabled,
  };
}

async function updateGaggiuinoSettings(settings) {
  const current = await getGaggiuinoSettings();
  const parsedTimeoutMs = Number(settings?.timeoutMs);
  const nextSettings = {
    baseUrl: String(
      settings?.baseUrl ?? current.baseUrl,
    ).trim(),
    timeoutMs: Math.max(
      1000,
      Math.min(
        Number.isFinite(parsedTimeoutMs)
          ? parsedTimeoutMs
          : current.timeoutMs,
        30000,
      ),
    ),
    designatedMillUuid: String(
      settings?.designatedMillUuid ?? current.designatedMillUuid,
    ).trim(),
    autoSyncEnabled:
      settings?.autoSyncEnabled !== undefined
        ? Boolean(settings.autoSyncEnabled)
        : current.autoSyncEnabled,
  };

  if (!nextSettings.baseUrl.startsWith('http')) {
    throw new GaggiuinoConnectionError(
      'Gaggiuino URL must start with http:// or https://',
      400,
    );
  }

  await setStorageValue(GAGGIUINO_SETTINGS_KEY, nextSettings);
  return nextSettings;
}

async function getAutoSyncState() {
  const settings = await getGaggiuinoSettings();
  const current = await getStorageValue(GAGGIUINO_AUTOSYNC_STATE_KEY);
  return {
    enabled: Boolean(settings.autoSyncEnabled),
    online: current?.online ?? null,
    running: current?.running ?? false,
    consecutiveFailures: Number(current?.consecutiveFailures) || 0,
    lastCheckedAt: current?.lastCheckedAt || null,
    lastSuccessAt: current?.lastSuccessAt || null,
    lastError: current?.lastError || '',
    lastSyncedShotId: Number(current?.lastSyncedShotId) || 0,
    lastImportedCount: Number(current?.lastImportedCount) || 0,
    lastSyncSummary: current?.lastSyncSummary || { added: 0, updated: 0, total: 0 },
    nextPollInMs: Number(current?.nextPollInMs) || config.gaggiuino.autoSyncIntervalMs,
  };
}

async function updateAutoSyncState(patch) {
  const current = await getAutoSyncState();
  const next = { ...current, ...patch };
  await setStorageValue(GAGGIUINO_AUTOSYNC_STATE_KEY, next);
  return next;
}

async function resolveImportMillUuid() {
  const settings = await getGaggiuinoSettings();
  const requestedUuid = settings.designatedMillUuid || GAGGIUINO_MILL_UUID;
  const mills = await getStorageValue('MILL');
  if (!Array.isArray(mills)) {
    return GAGGIUINO_MILL_UUID;
  }

  const selectedMill = mills.find(
    (entry) => entry?.config?.uuid === requestedUuid,
  );
  if (selectedMill?.config?.uuid) {
    return selectedMill.config.uuid;
  }

  return GAGGIUINO_MILL_UUID;
}

async function requestGaggiuino(path) {
  const gaggiuinoSettings = await getGaggiuinoSettings();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    gaggiuinoSettings.timeoutMs,
  );
  const url = `${normalizeBaseUrl(gaggiuinoSettings.baseUrl)}${path}`;

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Gaggiuino request failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new GaggiuinoConnectionError(
        `Timed out connecting to Gaggiuino at ${gaggiuinoSettings.baseUrl}`,
      );
    }

    if (error instanceof GaggiuinoConnectionError) {
      throw error;
    }

    throw new GaggiuinoConnectionError(
      `Could not connect to Gaggiuino at ${gaggiuinoSettings.baseUrl}: ${error.message}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeLatestShotId(data) {
  if (Array.isArray(data)) {
    return Number(data[0]?.lastShotId ?? data[0]?.id ?? data[0]);
  }

  return Number(data?.lastShotId ?? data?.id ?? data);
}

function normalizeShotTimestamp(shot) {
  const timestamp = shot?.timestamp;
  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  const parsed = Number(timestamp);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const dateValue = Date.parse(timestamp);
  if (Number.isFinite(dateValue)) {
    return Math.floor(dateValue / 1000);
  }

  return null;
}

async function getStatus() {
  return await requestGaggiuino('/api/system/status');
}

async function getLatestShotId() {
  const data = await requestGaggiuino('/api/shots/latest');
  return normalizeLatestShotId(data);
}

async function getShot(id) {
  return await requestGaggiuino(`/api/shots/${id}`);
}

async function saveShot(id, shot) {
  if (!shot) {
    return;
  }

  await getPool().execute(
    `INSERT INTO gaggiuino_shots (shot_id, shot_timestamp, profile_name, raw_data)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       shot_timestamp = VALUES(shot_timestamp),
       profile_name = VALUES(profile_name),
       raw_data = VALUES(raw_data)`,
    [
      id,
      normalizeShotTimestamp(shot),
      shot?.profile?.name || null,
      JSON.stringify(shot),
    ],
  );
}

async function getSavedShots() {
  const [rows] = await getPool().execute(
    'SELECT shot_id, shot_timestamp, profile_name, raw_data FROM gaggiuino_shots ORDER BY shot_id DESC LIMIT 50',
  );

  return rows.map((row) => ({
    id: row.shot_id,
    timestamp: row.shot_timestamp,
    profileName: row.profile_name,
    rawData: Buffer.isBuffer(row.raw_data)
      ? JSON.parse(row.raw_data.toString('utf8'))
      : typeof row.raw_data === 'string'
        ? JSON.parse(row.raw_data)
        : row.raw_data,
  }));
}

function createConfig(uuid, unixTimestamp) {
  return {
    uuid,
    unix_timestamp: unixTimestamp || Math.floor(Date.now() / 1000),
  };
}

function createGaggiuinoBean() {
  return {
    name: 'Unspecified Coffee',
    buyDate: '',
    roastingDate: '',
    note: 'Placeholder coffee for Gaggiuino imports. Edit per shot after sync.',
    roaster: '',
    config: createConfig(GAGGIUINO_BEAN_UUID),
    roast: 'UNKNOWN',
    roast_range: 0,
    roast_custom: '',
    beanMix: 'SINGLE_ORIGIN',
    aromatics: '',
    weight: 0,
    finished: false,
    cost: 0,
    attachments: [],
    decaffeinated: false,
    cupping_points: '',
    bean_roasting_type: 'UNKNOWN',
    bean_information: [],
    url: '',
    ean_article_number: '',
    bean_roast_information: { bean_uuid: '' },
    rating: 0,
    qr_code: '',
    internal_share_code: '',
    favourite: false,
    shared: false,
    cupping: {},
    cupped_flavor: { predefined_flavors: {}, custom_flavors: [] },
    frozenDate: '',
    unfrozenDate: '',
    frozenId: '',
    frozenGroupId: '',
    frozenStorageType: 'UNKNOWN',
    frozenNote: '',
    bestDate: '',
    openDate: '',
    co2e_kg: 0,
  };
}

function createGaggiuinoMill() {
  return {
    name: 'Unspecified Grinder',
    note: 'Placeholder grinder for Gaggiuino imports. Edit per shot after sync.',
    config: createConfig(GAGGIUINO_MILL_UUID),
    finished: false,
    attachments: [],
    has_adjustable_speed: false,
    has_timer: false,
  };
}

function createGaggiuinoPreparation() {
  const visibleParameters = {
    bean: true,
    brew_beverage_quantity: true,
    brew_temperature: true,
    brew_time: true,
    coffee_first_drip_time: true,
    grind_weight: true,
    mill: true,
    pressure_profile: true,
  };

  return {
    name: 'Gaggiuino',
    note: 'Server-synced Gaggiuino espresso shots.',
    config: createConfig(GAGGIUINO_PREPARATION_UUID),
    style_type: 'ESPRESSO',
    type: 'GAGGIUINO',
    finished: false,
    use_custom_parameters: true,
    manage_parameters: visibleParameters,
    default_last_coffee_parameters: visibleParameters,
    visible_list_view_parameters: {},
    repeat_coffee_parameters: { repeat_coffee_active: false },
    brew_order: {},
    tools: [],
    attachments: [],
    connectedPreparationDevice: { type: 'GAGGIUINO', customParams: {} },
  };
}

function getFirstNumber(source, paths) {
  for (const path of paths) {
    const value = path
      .split('.')
      .reduce((current, segment) => current?.[segment], source);
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function getValue(source, path) {
  return path
    .split('.')
    .reduce((current, segment) => current?.[segment], source);
}

function getFirstArray(source, paths) {
  for (const path of paths) {
    const value = getValue(source, path);
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function getLastNumberFromArray(source, paths) {
  for (const path of paths) {
    const values = getFirstArray(source, [path]);
    for (let index = values.length - 1; index >= 0; index--) {
      const parsed = Number(values[index]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function getFirstString(source, paths) {
  for (const path of paths) {
    const value = path
      .split('.')
      .reduce((current, segment) => current?.[segment], source);
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return '';
}

function normalizeDeciUnit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  if (Math.abs(parsed) >= 100) {
    return Math.round(parsed) / 10;
  }

  return parsed;
}

function normalizeFlow(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed) / 10;
}

function normalizePressure(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed) / 10;
}

function normalizeTenths(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed) / 10;
}

function getTimeScaleDivisor(shot) {
  const duration = Number(shot?.duration);
  const times = getFirstArray(shot, ['datapoints.timeInShot']);
  const lastTime = Number(times[times.length - 1]);

  if (Number.isFinite(duration) && duration > 2000) {
    return 1000;
  }

  if (Number.isFinite(duration) && duration > 120) {
    return 10;
  }

  if (Number.isFinite(lastTime) && lastTime > 120) {
    return 10;
  }

  return 1;
}

function normalizeDurationSeconds(shot) {
  const duration = getFirstNumber(shot, [
    'duration',
    'shotDuration',
    'totalTime',
    'time',
  ]);
  return duration / getTimeScaleDivisor(shot);
}

function normalizeShotTimeSeconds(rawTime, shot, fallback) {
  const parsedTime = Number(rawTime);
  if (Number.isFinite(parsedTime)) {
    return parsedTime / getTimeScaleDivisor(shot);
  }

  return fallback;
}

function secondsPart(value) {
  return Math.floor(value);
}

function millisecondsPart(value) {
  return Math.round((value - Math.floor(value)) * 1000);
}

function getDose(shot) {
  return getFirstNumber(shot, [
    'dose',
    'coffeeIn',
    'beanWeight',
    'weightIn',
    'profile.recipe.coffeeIn',
  ]);
}

function getBeverageQuantity(shot) {
  const datapointQuantity = normalizeTenths(
    getLastNumberFromArray(shot, ['datapoints.shotWeight']),
  );
  if (datapointQuantity > 0) {
    return datapointQuantity;
  }

  const explicitQuantity = getFirstNumber(shot, [
    'yield',
    'coffeeOut',
    'weightOut',
    'beverageWeight',
    'profile.globalStopConditions.weight',
  ]);
  if (explicitQuantity > 0) {
    return normalizeDeciUnit(explicitQuantity);
  }

  return 0;
}

function getBrewTemperature(shot) {
  const explicitTemperature = getFirstNumber(shot, [
    'temperature',
    'waterTemperature',
    'profile.waterTemperature',
  ]);
  if (explicitTemperature > 0) {
    return normalizeDeciUnit(explicitTemperature);
  }

  return normalizeTenths(getLastNumberFromArray(shot, ['datapoints.temperature']));
}

function getFirstDripSeconds(shot) {
  const times = getFirstArray(shot, ['datapoints.timeInShot']);
  const weights = getFirstArray(shot, ['datapoints.shotWeight']);
  const flows = getFirstArray(shot, ['datapoints.weightFlow']);
  const length = Math.max(times.length, weights.length, flows.length);

  for (let index = 0; index < length; index++) {
    const weight = Number(weights[index]);
    const flow = Number(flows[index]);
    if (
      (Number.isFinite(weight) && weight > 0) ||
      (Number.isFinite(flow) && flow > 0)
    ) {
      return normalizeShotTimeSeconds(
        times[index],
        shot,
        normalizeDurationSeconds({ duration: index }),
      );
    }
  }

  return 0;
}

function formatGraphTimestamp(seconds) {
  const date = new Date(Math.max(0, seconds) * 1000);
  return date.toISOString().substring(11, 23);
}

function createBrewFlowProfile(shot) {
  const datapoints = shot?.datapoints || {};
  const times = Array.isArray(datapoints.timeInShot) ? datapoints.timeInShot : [];
  const shotWeight = Array.isArray(datapoints.shotWeight) ? datapoints.shotWeight : [];
  const weightFlow = Array.isArray(datapoints.weightFlow) ? datapoints.weightFlow : [];
  const pumpFlow = Array.isArray(datapoints.pumpFlow) ? datapoints.pumpFlow : [];
  const pressure = Array.isArray(datapoints.pressure) ? datapoints.pressure : [];
  const temperature = Array.isArray(datapoints.temperature) ? datapoints.temperature : [];
  const waterPumped = Array.isArray(datapoints.waterPumped) ? datapoints.waterPumped : [];
  const targetPressure = Array.isArray(datapoints.targetPressure)
    ? datapoints.targetPressure
    : [];
  const targetPumpFlow = Array.isArray(datapoints.targetPumpFlow)
    ? datapoints.targetPumpFlow
    : [];
  const targetTemperature = Array.isArray(datapoints.targetTemperature)
    ? datapoints.targetTemperature
    : [];
  const length = Math.max(
    times.length,
    shotWeight.length,
    weightFlow.length,
    pumpFlow.length,
    pressure.length,
    temperature.length,
    waterPumped.length,
    targetPressure.length,
    targetPumpFlow.length,
    targetTemperature.length,
  );
  const flowProfile = {
    weight: [],
    weightSecond: [],
    waterFlow: [],
    realtimeFlow: [],
    realtimeFlowSecond: [],
    pressureFlow: [],
    temperatureFlow: [],
    waterDispensed: [],
    waterDispensedFlowSecond: [],
    brewbyweight: [],
    customMetrics: {},
    customAxes: [
      {
        key: 'targetPressure',
        name: 'Gaggiuino target pressure',
        unit: 'bar',
        colorLight: '#8b5cf6',
        colorDark: '#a78bfa',
        hiddenDefault: true,
      },
      {
        key: 'targetPumpFlow',
        name: 'Gaggiuino target pump flow',
        unit: 'ml/s',
        colorLight: '#0ea5e9',
        colorDark: '#38bdf8',
        hiddenDefault: true,
      },
      {
        key: 'targetTemperature',
        name: 'Gaggiuino target temperature',
        unit: 'C',
        colorLight: '#ef4444',
        colorDark: '#f87171',
        hiddenDefault: true,
      },
    ],
  };

  let previousWeight = 0;
  let previousPressure = 0;
  let previousTemperature = 0;
  let previousWaterPumped = 0;

  for (let index = 0; index < length; index++) {
    const rawTime = Number(times[index]);
    const seconds = normalizeShotTimeSeconds(
      rawTime,
      shot,
      normalizeDurationSeconds({ duration: index }),
    );
    const timestamp = formatGraphTimestamp(seconds);
    const brewTime = seconds.toFixed(1);
    const rawWeight = Number(shotWeight[index]);
    const weight = normalizeTenths(rawWeight);
    const pressureValue = normalizePressure(pressure[index]);
    const temperatureValue = normalizeTenths(temperature[index]);
    const waterPumpedValue = normalizeTenths(waterPumped[index]);
    let realtimeFlow = 0;
    if (index > 0 && Number.isFinite(rawWeight)) {
      const previousRawTime = Number(times[index - 1]);
      const previousSeconds = normalizeShotTimeSeconds(
        previousRawTime,
        shot,
        normalizeDurationSeconds({ duration: index - 1 }),
      );
      const deltaSeconds = seconds - previousSeconds;
      if (deltaSeconds > 0) {
        realtimeFlow = (weight - previousWeight) / deltaSeconds;
      }
    }

    if (!Number.isFinite(realtimeFlow) || Math.abs(realtimeFlow) < 0.0001) {
      realtimeFlow = normalizeFlow(weightFlow[index]);
    }

    if ((!Number.isFinite(realtimeFlow) || Math.abs(realtimeFlow) < 0.0001) && index > 0) {
      const previousRawTime = Number(times[index - 1]);
      const previousSeconds = normalizeShotTimeSeconds(
        previousRawTime,
        shot,
        normalizeDurationSeconds({ duration: index - 1 }),
      );
      const deltaSeconds = seconds - previousSeconds;
      if (deltaSeconds > 0) {
        const pumpCurrent = normalizeFlow(pumpFlow[index]);
        const pumpPrevious = normalizeFlow(pumpFlow[index - 1]);
        realtimeFlow = (pumpCurrent + pumpPrevious) / 2;
      }
    }

    if (shotWeight[index] !== undefined) {
      flowProfile.weight.push({
        timestamp,
        brew_time: brewTime,
        actual_weight: weight,
        old_weight: previousWeight,
        actual_smoothed_weight: weight,
        old_smoothed_weight: previousWeight,
        calculated_real_flow: realtimeFlow,
        not_mutated_weight: weight,
      });
      flowProfile.realtimeFlow.push({
        timestamp,
        brew_time: brewTime,
        flow_value: realtimeFlow,
        smoothed_weight: weight,
        timestampdelta: 0,
      });
      previousWeight = weight;
    }

    if (pumpFlow[index] !== undefined) {
      flowProfile.waterFlow.push({
        timestamp,
        brew_time: brewTime,
        value: normalizeFlow(pumpFlow[index]),
      });
    }

    if (pressure[index] !== undefined) {
      flowProfile.pressureFlow.push({
        timestamp,
        brew_time: brewTime,
        actual_pressure: pressureValue,
        old_pressure: previousPressure,
      });
      previousPressure = pressureValue;
    }

    if (temperature[index] !== undefined) {
      flowProfile.temperatureFlow.push({
        timestamp,
        brew_time: brewTime,
        actual_temperature: temperatureValue,
        old_temperature: previousTemperature,
      });
      previousTemperature = temperatureValue;
    }

    if (waterPumped[index] !== undefined) {
      flowProfile.waterDispensed.push({
        timestamp,
        brew_time: brewTime,
        actual: waterPumpedValue,
        old: previousWaterPumped,
      });
      previousWaterPumped = waterPumpedValue;
    }

    if (targetPressure[index] !== undefined) {
      flowProfile.customMetrics.targetPressure ??= [];
      flowProfile.customMetrics.targetPressure.push({
        timestamp,
        brew_time: brewTime,
        value: normalizePressure(targetPressure[index]),
      });
    }

    if (targetPumpFlow[index] !== undefined) {
      flowProfile.customMetrics.targetPumpFlow ??= [];
      flowProfile.customMetrics.targetPumpFlow.push({
        timestamp,
        brew_time: brewTime,
        value: normalizeFlow(targetPumpFlow[index]),
      });
    }

    if (targetTemperature[index] !== undefined) {
      flowProfile.customMetrics.targetTemperature ??= [];
      flowProfile.customMetrics.targetTemperature.push({
        timestamp,
        brew_time: brewTime,
        value: normalizeTenths(targetTemperature[index]),
      });
    }
  }

  return flowProfile;
}

function getBrewFlowProfilePath(uuid) {
  return `brews/${uuid}_flow_profile.json`;
}

function createBrewFromShot(id, shot, millUuid) {
  const unixTimestamp = normalizeShotTimestamp(shot) || Math.floor(Date.now() / 1000);
  const profileName = getFirstString(shot, ['profile.name', 'profileName', 'name']);
  const uuidSuffix = String(id).padStart(12, '0').slice(-12);
  const uuid = `00000000-0000-4000-9000-${uuidSuffix}`;
  const dose = getDose(shot);
  const beverageQuantity = getBeverageQuantity(shot);
  const brewTime = normalizeDurationSeconds(shot);
  const firstDripTime = getFirstDripSeconds(shot);
  const noteParts = [`Imported from Gaggiuino shot #${id}`];

  if (profileName) {
    noteParts.push(`Profile: ${profileName}`);
  }

  if (dose > 0) {
    noteParts.push(`Dose: ${dose} g`);
  }

  if (beverageQuantity > 0) {
    noteParts.push(`Yield: ${beverageQuantity} g`);
  }

  return {
    grind_size: '',
    grind_weight: dose,
    method_of_preparation: GAGGIUINO_PREPARATION_UUID,
    mill: millUuid || GAGGIUINO_MILL_UUID,
    mill_speed: 0,
    mill_timer: 0,
    mill_timer_milliseconds: 0,
    pressure_profile: profileName,
    bean: GAGGIUINO_BEAN_UUID,
    brew_temperature: getBrewTemperature(shot),
    brew_temperature_time: 0,
    brew_temperature_time_milliseconds: 0,
    brew_time: secondsPart(brewTime),
    brew_time_milliseconds: millisecondsPart(brewTime),
    brew_quantity: beverageQuantity,
    brew_quantity_type: 'GR',
    note: noteParts.join('\n'),
    rating: 0,
    coffee_type: '',
    coffee_concentration: '',
    coffee_first_drip_time: secondsPart(firstDripTime),
    coffee_first_drip_time_milliseconds: millisecondsPart(firstDripTime),
    coffee_blooming_time: 0,
    coffee_blooming_time_milliseconds: 0,
    attachments: [],
    tds: 0,
    water: '',
    bean_weight_in: dose,
    vessel_weight: 0,
    vessel_name: '',
    coordinates: {
      accuracy: null,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude: null,
      longitude: null,
      speed: null,
    },
    brew_beverage_quantity: beverageQuantity,
    brew_beverage_quantity_type: 'GR',
    config: createConfig(uuid, unixTimestamp),
    cupping: {},
    cupped_flavor: { predefined_flavors: {}, custom_flavors: [] },
    method_of_preparation_tools: [],
    favourite: false,
    best_brew: false,
    flow_profile: getBrewFlowProfilePath(uuid),
    reference_flow_profile: { uuid: '', type: 'NONE' },
    preparationDeviceBrew: {
      type: 'GAGGIUINO',
      externalId: id,
      rawData: shot,
    },
    customInformation: {},
  };
}

async function ensureGaggiuinoReferences() {
  const [beans, mills, preparations] = await Promise.all([
    upsertStorageList('BEANS', [createGaggiuinoBean()], (entry) => entry?.config?.uuid),
    upsertStorageList('MILL', [createGaggiuinoMill()], (entry) => entry?.config?.uuid),
    upsertStorageList(
      'PREPARATION',
      [createGaggiuinoPreparation()],
      (entry) => entry?.config?.uuid,
    ),
  ]);

  return { beans, mills, preparations };
}

async function syncShotsToBrews(shots) {
  await ensureGaggiuinoReferences();
  const millUuid = await resolveImportMillUuid();
  const brews = shots.map((entry) =>
    createBrewFromShot(entry.id, entry.rawData, millUuid),
  );
  await Promise.all(
    brews.map((brew, index) =>
      setStorageValue(
        `FILE:${brew.flow_profile}`,
        createBrewFlowProfile(shots[index].rawData),
      ),
    ),
  );
  return await upsertStorageList(
    'BREWS',
    brews,
    (entry) => entry?.config?.uuid,
  );
}

async function importLatestShots(count, options = {}) {
  const latestShotId = await getLatestShotId();
  const imported = [];

  if (!Number.isFinite(latestShotId)) {
    return imported;
  }

  const limit = Math.max(1, Math.min(Number(count) || 6, 50));
  for (
    let id = latestShotId;
    id >= Math.max(1, latestShotId - limit + 1);
    id--
  ) {
    try {
      const shot = await getShot(id);
      if (shot) {
        await saveShot(id, shot);
        imported.push({ id, rawData: shot });
      }
    } catch (error) {
      console.warn(`Failed to import Gaggiuino shot ${id}: ${error.message}`);
    }
  }

  let sync = { added: 0, updated: 0, total: 0 };
  if (options.syncToBrews !== false && imported.length > 0) {
    sync = await syncShotsToBrews(imported);
  }

  return { imported, sync };
}

async function importShotRange(startId, endId, options = {}) {
  const imported = [];
  if (!Number.isFinite(startId) || !Number.isFinite(endId)) {
    return { imported, sync: { added: 0, updated: 0, total: 0 } };
  }

  const normalizedStart = Math.max(1, Math.floor(startId));
  const normalizedEnd = Math.max(normalizedStart, Math.floor(endId));

  for (let id = normalizedStart; id <= normalizedEnd; id++) {
    try {
      const shot = await getShot(id);
      if (shot) {
        await saveShot(id, shot);
        imported.push({ id, rawData: shot });
      }
    } catch (error) {
      console.warn(`Failed to import Gaggiuino shot ${id}: ${error.message}`);
    }
  }

  let sync = { added: 0, updated: 0, total: 0 };
  if (options.syncToBrews !== false && imported.length > 0) {
    sync = await syncShotsToBrews(imported);
  }

  return { imported, sync };
}

async function syncNewShotsSinceLast(options = {}) {
  const latestShotId = await getLatestShotId();
  if (!Number.isFinite(latestShotId)) {
    return {
      imported: [],
      sync: { added: 0, updated: 0, total: 0 },
      latestShotId: 0,
      lastSyncedShotId: 0,
    };
  }

  const state = await getAutoSyncState();
  const batchSize = Math.max(1, Number(options.maxShotsPerRun) || config.gaggiuino.autoSyncBatchSize);
  const initialImportCount = Math.max(
    1,
    Number(options.initialImportCount) || config.gaggiuino.autoSyncInitialImportCount,
  );

  let startId = state.lastSyncedShotId > 0 ? state.lastSyncedShotId + 1 : latestShotId - initialImportCount + 1;
  startId = Math.max(1, startId);

  let endId = latestShotId;
  if (startId > endId) {
    return {
      imported: [],
      sync: { added: 0, updated: 0, total: 0 },
      latestShotId,
      lastSyncedShotId: state.lastSyncedShotId,
    };
  }

  endId = Math.min(endId, startId + batchSize - 1);

  const result = await importShotRange(startId, endId, {
    syncToBrews: options.syncToBrews !== false,
  });

  const nextLastSyncedShotId =
    result.imported.length > 0
      ? result.imported[result.imported.length - 1].id
      : Math.max(state.lastSyncedShotId, endId);

  await updateAutoSyncState({
    lastSyncedShotId: nextLastSyncedShotId,
    lastImportedCount: result.imported.length,
    lastSyncSummary: result.sync,
  });

  return {
    ...result,
    latestShotId,
    lastSyncedShotId: nextLastSyncedShotId,
  };
}

module.exports = {
  GaggiuinoConnectionError,
  getAutoSyncState,
  getGaggiuinoSettings,
  getLatestShotId,
  getSavedShots,
  getShot,
  getStatus,
  importLatestShots,
  importShotRange,
  saveShot,
  syncNewShotsSinceLast,
  syncShotsToBrews,
  updateAutoSyncState,
  updateGaggiuinoSettings,
};

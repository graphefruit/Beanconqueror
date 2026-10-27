import { book } from 'ionicons/icons';

import { UILog } from '../../../services/uiLog';
import { GaggimateWarnings, parseWarningStates } from './gaggimateWarnings';

export interface GaggimateStatus {
  currentTemperature: number;
  targetTemperature: number;
  currentPressure: number;
  targetPressure: number;
  targetWeight: number;
  activeTargetWeight: number;
  currentFlow: number;
  targetFlow: number;
  waterPumped: number;
  mode: number;
  selectedProfile: string;
  selectedProfileId: string | null;
  brewTarget: boolean;
  brewTargetDuration: number;
  volumetricAvailable: boolean;
  grindTargetDuration: number;
  grindTargetVolume: number;
  grindTarget: number;
  grindActive: boolean;
  currentWeight: number;
  bluetoothConnected: boolean;
  process: any | null;
  timestamp: Date;
  rssi: number;
  lat: number;
  tofDistance: number;
  waterLevel: number;
  currentPumpPower: number;
  currentBoilerPower: number;
  currentPuckResistance: number;
  currentPuckFlow: number;
  currentCoffeeVolume: number;
  warnings: GaggimateWarnings[];
}

export interface GaggimateCapabilities {
  pressure: boolean;
  dimming: boolean;
  ledControl: boolean;
  gearpumpAddon: boolean;
}

export interface GaggimateMachineState {
  connected: boolean;
  isBrewing: boolean;
  isActive: boolean;
  isGMBrewByWeight: boolean;
  isValid: boolean;
  isWarning: boolean;
  shotId: number;
  status: GaggimateStatus;
  capabilities: GaggimateCapabilities;
  history: GaggimateStatus[];
}

export class GaggimateWsService {
  private socket: WebSocket | null = null;
  private listeners: Record<string, Record<string, (msg: any) => void>> = {};
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private baseReconnectDelay = 1000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private mustRecordHistory = false;
  private url: string | null = null;
  private readonly debug: boolean = false;
  private readonly timeout: number = 10000;
  private activeRequests: Map<string, (error: Error) => void> = new Map();

  history = [];
  MAX_HISTORY = 600;

  constructor(options?: { timeout?: number; debug?: boolean }) {
    this.debug = options?.debug ?? false;
    this.timeout = options?.timeout ?? 10000;
  }

  private _log(...args: any[]): void {
    if (this.debug) {
      UILog.getInstance().debug('[GaggimateApiService]', ...args);
    }
  }

  private _logError(...args: any[]): void {
    if (this.debug) {
      UILog.getInstance().error('[GaggimateApiService]', ...args);
    }
  }

  machineState: GaggimateMachineState = {
    isBrewing: false,
    isActive: false,
    isGMBrewByWeight: false,
    isValid: false,
    isWarning: false,
    shotId: 0,
    connected: false,
    status: {
      currentTemperature: 0,
      targetTemperature: 0,
      currentPressure: 0,
      targetPressure: 0,
      targetWeight: 0,
      activeTargetWeight: 0,
      currentFlow: 0,
      targetFlow: 0,
      waterPumped: 0,
      mode: 0,
      selectedProfile: '',
      selectedProfileId: null,
      brewTarget: false,
      brewTargetDuration: 0,
      volumetricAvailable: false,
      grindTargetDuration: 0,
      grindTargetVolume: 0,
      grindTarget: 0,
      grindActive: false,
      currentWeight: 0,
      bluetoothConnected: false,
      process: null,
      timestamp: new Date(),
      rssi: 0,
      lat: 0,
      tofDistance: 0,
      waterLevel: 0,
      currentPumpPower: 0,
      currentBoilerPower: 0,
      currentPuckResistance: 0,
      currentPuckFlow: 0,
      currentCoffeeVolume: 0,
      warnings: [],
    },
    capabilities: {
      pressure: false,
      dimming: false,
      ledControl: false,
      gearpumpAddon: false,
    },
    history: [],
  };

  get isConnected(): boolean {
    return this.machineState.connected;
  }

  connect(url: string): void {
    this.url = url;
    this._log('Apiservice connecting to', url);
    this._connect();
  }

  // isConnecting state machine: set to true when a connection attempt starts
  // (in _connect()) and only reset to false once the outcome is known:
  // - synchronously, if the WebSocket could not even be constructed (catch)
  // - asynchronously, via _onOpen() (handshake succeeded),
  // _onError()/_onClose() (handshake failed or socket closed before opening)
  // or disconnect() (aborted by user)
  private _connect(): Promise<void> {
    if (this.isConnecting || !this.url) {
      return;
    }
    this.isConnecting = true;

    try {
      if (this.socket) {
        this.socket.close();
      }

      this.socket = new WebSocket(this.url);
      this.socket.addEventListener('message', this._onMessage.bind(this));
      this.socket.addEventListener('close', this._onClose.bind(this));
      this.socket.addEventListener('error', this._onError.bind(this));
      this.socket.addEventListener('open', this._onOpen.bind(this));
    } catch (error) {
      this._logError('WebSocket connection error:', error);
      this.isConnecting = false;
      this._scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      this._log('Timeout ', this.reconnectTimeout);
      clearTimeout(this.reconnectTimeout);
      this._log('Timeout cleared', this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this._log('WebSocket disconnecting');
      this.socket = null;
    }
    this.isConnecting = false;
    this.machineState = { ...this.machineState, connected: false };
  }

  clear(): void {
    this.send({
      tp: 'req:process:clear',
    });
  }

  private _onOpen(): void {
    this._log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.machineState = { ...this.machineState, connected: true };
    this.mustRecordHistory = false;
  }

  private _onClose(): void {
    this._log('WebSocket connection closed');
    this.isConnecting = false;
    this.machineState = { ...this.machineState, connected: false };

    // Immediately reject pending requests so they don't wait for timeouts
    if (this.activeRequests.size > 0) {
      this._log(
        `Cleaning up ${this.activeRequests.size} pending requests due to socket close`,
      );
      for (const [rid, rejectRequest] of this.activeRequests) {
        rejectRequest(new Error('WebSocket connection closed'));
      }
      this.activeRequests.clear();
    }
  }

  private _onError(error: Event): void {
    this._logError('GaggimateApiService: WebSocket error:', error);
    this.isConnecting = false;
    if (this.socket) {
      this.socket.close();
    }
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );

    this._log(
      `Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this._connect();
    }, delay);
  }

  private _onMessage(event: MessageEvent): void {
    let message: any;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      this._logError(
        'Failed to parse incoming WebSocket message:',
        event.data,
        error,
      );
      return;
    }

    if (message.tp === 'evt:status') {
      this._log('raw process', message.process);
      this._log('raw status', message);
      this._onStatus(message);
    }

    if (message.tp === 'evt:brew:confirm') {
      this.machineState.isWarning = true;
      this.machineState.isBrewing = false;
      this._log('brew confirm', message.warn);
    }

    if (message.tp === 'evt:brew:confirm:cancel') {
      this.machineState.isWarning = false;
      this._log('brew confirm cancelled', message.tp);
    }

    if (message.tp === 'evt:brew:started') {
      this._log('brew started', message.warn);
    }

    if (message.tp === 'evt:shot-finished-stats') {
      this._log('shot finished', message.tp);
    }

    if (message.tp === 'evt:history-shot-saved') {
      this.machineState.isBrewing = false;
      this._log('shot saved');
      this.machineState.shotId = Number(message.id ?? 0);
      this.machineState.isValid = true;
      this.clear();
      this._log('retrieved the shot id', this.machineState.shotId);
    }

    const listeners = Object.values(this.listeners[message.tp] || {});
    for (const listener of listeners) {
      listener(message);
    }
  }

  private _onStatus(message: any): void {
    // evt:status frames are partial: fast telemetry every tick, slow state only when it changes
    // (plus a full snapshot on connect and every 10 s). Merge onto the last known status.

    let isBrewing = this.machineState.isBrewing;

    const has = (key: string) =>
      Object.prototype.hasOwnProperty.call(message, key);
    const newStatus: GaggimateStatus = { ...this.machineState.status };

    const map = (
      key: string,
      name: keyof GaggimateStatus,
      convert: (v: any) => any = (v) => v,
    ) => {
      if (has(key)) (newStatus as any)[name] = convert(message[key]);
    };

    map('ct', 'currentTemperature');
    map('tt', 'targetTemperature');
    map('pr', 'currentPressure');
    map('pt', 'targetPressure');
    map('tw', 'targetWeight', (v) => v || 0);
    map('fl', 'currentFlow');
    map('tf', 'targetFlow', (v) => v || 0);
    map('wp', 'waterPumped', (v) => v || 0);
    map('m', 'mode');
    map('p', 'selectedProfile');
    map('puid', 'selectedProfileId');
    map('bt', 'brewTarget', (v) => !!v);
    map('btd', 'brewTargetDuration', (v) => v || 0);
    map('bta', 'volumetricAvailable', (v) => v || false);
    map('gtd', 'grindTargetDuration', (v) => v || 0);
    map('gtv', 'grindTargetVolume', (v) => v || 0);
    map('gt', 'grindTarget', (v) => v || 0);
    map('gact', 'grindActive', (v) => v || false);
    map('cw', 'currentWeight', (v) => v || 0);
    map('bc', 'bluetoothConnected', (v) => v || false);
    map('rssi', 'rssi', (v) => v || 0);
    map('lat', 'lat', (v) => v || 0);
    map('tof', 'tofDistance', (v) => v || 0);
    map('wl', 'waterLevel', (v) => v || 0);
    map('pw', 'currentPumpPower', (v) => v ?? 0);
    map('hp', 'currentBoilerPower', (v) => v ?? 0);
    map('pkr', 'currentPuckResistance', (v) => v ?? 0);
    map('pf', 'currentPuckFlow', (v) => v ?? 0);
    map('cv', 'currentCoffeeVolume', (v) => v ?? 0);
    map('warn', 'warnings', parseWarningStates);

    // this is needed to avoid toggling back to true IsBrewing when the shot ends
    // isBrewing is set to false by the _OnMessage event handler, but we receive a new generic status message (not a brewing process one) without the process object
    // and map() would keep the last process object (with a=1, so brewing) that will trigger the update of isBrewing to true
    if (this.machineState.isBrewing) {
      map('process', 'process', (v) => v || null);
    } else {
      newStatus.process = message.process || null;
    }

    newStatus.activeTargetWeight =
      (newStatus.process?.a && newStatus.targetWeight) || 0;
    newStatus.timestamp = new Date();

    const capabilities = { ...this.machineState.capabilities };
    if (has('cd')) capabilities.dimming = message.cd;
    if (has('cp')) capabilities.pressure = message.cp;
    if (has('led')) capabilities.ledControl = message.led;
    if (has('gp')) capabilities.gearpumpAddon = !!message.gp;

    if (
      !this.machineState.isBrewing &&
      newStatus.process?.l?.toLowerCase() === 'finished'
    ) {
      this.machineState.isValid = true;
    }

    // Only toggle isBrewing to true when the process is active
    this.machineState.isActive =
      !!newStatus.process?.a &&
      (newStatus.process?.s?.toLowerCase() === 'brew' ||
        newStatus.process?.s?.toLowerCase() === 'infusion');

    if (!isBrewing && this.machineState.isActive) {
      isBrewing = true;
    }

    this.machineState.isGMBrewByWeight =
      newStatus.bluetoothConnected && newStatus.volumetricAvailable;

    if (!this.machineState.isBrewing && isBrewing) {
      this._log('GaggiMate is brewing', newStatus.process?.e);
      this.mustRecordHistory = true;
      this.machineState.isValid = false;
    }

    const history = this.machineState.history;
    if (this.mustRecordHistory && has('ct')) {
      const historyEntry = { ...newStatus };
      history.push(historyEntry);

      // Trim the oldest entries in-place if exceeds MAX_HISTORY
      if (history.length > this.MAX_HISTORY) {
        history.splice(0, history.length - this.MAX_HISTORY);
      }
    }

    this.machineState = {
      ...this.machineState,
      isBrewing,
      shotId: this.machineState.shotId,
      connected: true,
      status: newStatus,
      capabilities,
      history,
    };
  }
  public clearHistory() {
    this.machineState.history = [];
  }

  public stopRecordingHistory() {
    this.mustRecordHistory = false;
  }

  send(event: object): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this._log('sending:', JSON.stringify(event));
      this.socket.send(JSON.stringify(event));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  async request(data: { tp: string; [key: string]: any }): Promise<any> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const returnType = `res:${data.tp.substring(4)}`;
    const rid = this._randomId();
    const message = { ...data, rid };

    return new Promise((resolve, reject) => {
      const cleanup = (err?: Error) => {
        clearTimeout(timeoutId);
        this.off(returnType, listenerId);
        this.activeRequests.delete(rid);
        if (err) reject(err);
      };

      // Track this request so we can abort it if the socket closes
      this.activeRequests.set(rid, (err) => cleanup(err));

      const listenerId = this.on(returnType, (response) => {
        if (response.rid === rid) {
          this._log('response received:', returnType, '| rid:', rid);
          resolve(response);
          cleanup(); // Normal success cleanup
        }
      });

      this.send(message);
      this._log('request sent:', data.tp, '| rid:', rid);

      const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
        cleanup(new Error(`Request ${data.tp} timed out`));
      }, this.timeout);
    });
  }

  on(type: string, listener: (msg: any) => void): string {
    const id = this._randomId();
    if (!this.listeners[type]) {
      this.listeners[type] = {};
    }
    this.listeners[type][id] = listener;
    return id;
  }

  off(type: string, id: string): void {
    if (this.listeners[type]) {
      delete this.listeners[type][id];
    }
  }

  private _randomId(): string {
    return Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, '')
      .substr(2, 10);
  }
}

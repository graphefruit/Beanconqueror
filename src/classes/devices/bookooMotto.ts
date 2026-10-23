import { PeripheralData, Property } from './ble.types';
import { Logger } from './common/logger';
import { Grinder, GrinderDevice } from './grinderBluetoothDevice';

declare const ble: any;

const FRAME_MAGIC = 0xa5;
const FRAME_VERSION = 0x01;
const FRAME_HEADER_LENGTH = 8;
const DEFAULT_WRITE_PACKET_LENGTH = 20;
const MAX_PACKET_LENGTH = 512;
const MAX_MESSAGE_LENGTH = 4096;
const REASSEMBLY_TIMEOUT_MS = 2000;
const HANDSHAKE_READY_TIMEOUT_MS = 5000;

export interface BookooMottoBaseInfo {
  releaseVer?: number;
  snCode?: string;
  wifiName?: string | null;
  [key: string]: unknown;
}

export interface BookooMottoPeriodInfo {
  feedingRpm?: number;
  bladeGap?: number;
  grindRpm?: number;
  humidity?: number;
  devState?: string;
  netState?: string;
  totalGrinds?: number;
  cupDetect?: boolean;
  autoStop?: boolean;
  fastClean?: boolean;
  brightness?: number;
  standbySec?: number;
  selectPreset?: number;
  [key: string]: unknown;
}

/**
 * Encodes one JSON message using the MT80 Custom GATT v1 frame format.
 *
 * The default packet size is deliberately compatible with the default ATT MTU
 * of 23 bytes. It keeps every packet at 20 bytes, including the 8-byte frame
 * header, so the negotiated MTU does not have to be known by the caller.
 */
export function encodeBookooMottoFragments(
  payload: Uint8Array,
  sequence = 1,
  packetLength = DEFAULT_WRITE_PACKET_LENGTH,
): Uint8Array[] {
  if (payload.length < 1 || payload.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Bookoo Motto payload length must be between 1 and ${MAX_MESSAGE_LENGTH} bytes`,
    );
  }
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0xffff) {
    throw new Error('Bookoo Motto sequence must fit in uint16');
  }
  if (
    !Number.isInteger(packetLength) ||
    packetLength <= FRAME_HEADER_LENGTH ||
    packetLength > MAX_PACKET_LENGTH
  ) {
    throw new Error(
      `Bookoo Motto packet length must be between ${FRAME_HEADER_LENGTH + 1} and ${MAX_PACKET_LENGTH} bytes`,
    );
  }

  const fragmentLength = packetLength - FRAME_HEADER_LENGTH;
  const fragments: Uint8Array[] = [];

  for (let offset = 0; offset < payload.length; offset += fragmentLength) {
    const fragment = payload.subarray(offset, offset + fragmentLength);
    const frame = new Uint8Array(FRAME_HEADER_LENGTH + fragment.length);

    frame[0] = FRAME_MAGIC;
    frame[1] = FRAME_VERSION;
    frame[2] = sequence & 0xff;
    frame[3] = (sequence >> 8) & 0xff;
    frame[4] = payload.length & 0xff;
    frame[5] = (payload.length >> 8) & 0xff;
    frame[6] = offset & 0xff;
    frame[7] = (offset >> 8) & 0xff;
    frame.set(fragment, FRAME_HEADER_LENGTH);
    fragments.push(frame);
  }

  return fragments;
}

export class BookooMotto extends GrinderDevice {
  public static readonly DEVICE_NAME = 'bookoo mt80';
  public static readonly DEVICE_NAME_PREFIX = BookooMotto.DEVICE_NAME;
  public static readonly SERVICE_UUID = '4d543830-0001-4b80-8f00-424f4f4b4f4f';
  public static readonly WRITE_UUID = '4d543830-0002-4b80-8f00-424f4f4b4f4f';
  public static readonly NOTIFY_UUID = '4d543830-0003-4b80-8f00-424f4f4b4f4f';

  public override waitForInitialData = true;
  public isReady = false;
  public lastBaseInfo: BookooMottoBaseInfo | null = null;
  public lastPeriodInfo: BookooMottoPeriodInfo | null = null;
  public lastGeneSetting: Record<string, unknown> | null = null;
  public lastMessage: unknown = null;

  private logger: Logger;
  private sequence = 1;
  private connectionGeneration = 0;
  private isConnected = false;
  private isNotificationAttached = false;
  private handshakeSent = false;
  private handshakeTimeout: any = null;
  private expectedFragmentSequence: number | null = null;
  private expectedFragmentLength: number | null = null;
  private fragmentBuffer: number[] = [];
  private fragmentLastReceivedAt: number | null = null;
  private fragmentTimeout: any = null;
  private writeQueue: Promise<boolean> = Promise.resolve(true);
  private notificationStartPromise: Promise<void> | null = null;
  private notificationStopPromise: Promise<void> = Promise.resolve();
  private readonly peripheralData: PeripheralData;
  private readonly textDecoder = new TextDecoder('utf-8', { fatal: true });
  private readonly textEncoder = new TextEncoder();

  constructor(data: PeripheralData) {
    super(data);
    this.peripheralData = data;
    this.logger = new Logger('Bookoo Motto 80');
    this.connect();
  }

  public static test(device: any): boolean {
    const names = [
      device?.name,
      device?.advertising?.kCBAdvDataLocalName,
    ].filter((name): name is string => typeof name === 'string');

    // The Custom Service is not advertised by the MT80. Discovery therefore
    // has to be based on the device name (or on the saved public BLE address).
    return names.some((name) => BookooMotto.isDeviceName(name));
  }

  private static isDeviceName(name: string): boolean {
    return /^bookoo mt80 [0-9a-f]{8}$/i.test(name.trim());
  }

  private static matchesUUID(uuid: string, expectedUUID: string): boolean {
    if (typeof uuid !== 'string') {
      return false;
    }

    return (
      uuid.replaceAll('-', '').toLowerCase() ===
      expectedUUID.replaceAll('-', '').toLowerCase()
    );
  }

  public connect(): void {
    if (this.isConnected) {
      return;
    }

    const connectionGeneration = ++this.connectionGeneration;
    this.isConnected = true;
    this.isReady = false;
    this.handshakeSent = false;
    this.sequence = 1;
    this.clearFragment();
    const notificationStartPromise =
      this.attachNotification(connectionGeneration);
    this.notificationStartPromise = notificationStartPromise;
    notificationStartPromise.catch((error) => {
      if (this.connectionGeneration !== connectionGeneration) {
        return;
      }

      this.logger.error('Bookoo Motto connect failed', error);
      this.isConnected = false;
      this.clearHandshakeTimeout();
    });
  }

  public disconnect(): void {
    void this.disconnectAndWait();
  }

  public override async disconnectAndWait(): Promise<void> {
    ++this.connectionGeneration;
    this.isConnected = false;
    this.isReady = false;
    this.handshakeSent = false;
    this.clearHandshakeTimeout();
    this.clearFragment();

    const notificationStartPromise = this.notificationStartPromise;
    if (notificationStartPromise !== null) {
      await notificationStartPromise.catch(() => undefined);
    }
    await this.deattachNotification();
  }

  public async setLiveSettings(attributes: Partial<Grinder>): Promise<boolean> {
    if (!this.isReady) {
      this.logger.log('Ignoring Bookoo Motto settings write before ready');
      return false;
    }

    const data: Record<string, number> = {};

    if (attributes.burr_gap !== undefined) {
      data.bladeGap = attributes.burr_gap;
    }
    if (attributes.feedspeed !== undefined) {
      data.feedingRpm = attributes.feedspeed;
    }
    if (attributes.rpm_speed !== undefined) {
      data.grindRpm = attributes.rpm_speed;
    }
    if (Object.keys(data).length === 0) {
      return true;
    }

    return this.sendJsonRequest({
      request: {
        geneSetting: {
          op: 'set',
          data,
        },
      },
    });
  }

  private async attachNotification(
    connectionGeneration: number,
  ): Promise<void> {
    this.logger.log('Attaching notification...');
    this.validateCharacteristics();

    await this.notificationStopPromise;

    if (!this.isCurrentConnection(connectionGeneration)) {
      return;
    }

    const notificationStarted =
      await this.startNotification(connectionGeneration);

    if (
      !notificationStarted ||
      !this.isCurrentConnection(connectionGeneration)
    ) {
      return;
    }

    const handshakeSent = await this.sendHandshake();
    if (handshakeSent) {
      this.startHandshakeReadyTimeout();
    }
  }

  private validateCharacteristics(): void {
    const writeCharacteristic = this.peripheralData.characteristics?.find(
      (characteristic) =>
        BookooMotto.matchesUUID(
          characteristic.service,
          BookooMotto.SERVICE_UUID,
        ) &&
        BookooMotto.matchesUUID(
          characteristic.characteristic,
          BookooMotto.WRITE_UUID,
        ),
    );
    if (!writeCharacteristic) {
      throw new Error('Bookoo Motto RX characteristic was not found');
    }

    const notifyCharacteristic = this.peripheralData.characteristics?.find(
      (characteristic) =>
        BookooMotto.matchesUUID(
          characteristic.service,
          BookooMotto.SERVICE_UUID,
        ) &&
        BookooMotto.matchesUUID(
          characteristic.characteristic,
          BookooMotto.NOTIFY_UUID,
        ),
    );
    if (!notifyCharacteristic) {
      throw new Error('Bookoo Motto TX characteristic was not found');
    }
    if (!notifyCharacteristic.properties?.includes(Property.NOTIFY)) {
      throw new Error('Bookoo Motto TX characteristic does not support Notify');
    }

    // Match the official MT80 client and wait for each fragment's write
    // response before sending the next one.
    if (!writeCharacteristic.properties?.includes(Property.WRITE)) {
      throw new Error(
        'Bookoo Motto RX characteristic does not support Write with Response',
      );
    }
  }

  private async startNotification(
    connectionGeneration: number,
  ): Promise<boolean> {
    const onData = (data: ArrayBuffer | Uint8Array | 'registered') => {
      if (data === 'registered') {
        return;
      }

      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      this.parseNotification(bytes);
    };
    const onNotificationError = (error: unknown) => {
      this.logger.error('Bookoo Motto notification subscription failed', error);
    };

    if (ble.withPromises?.startNotification) {
      await ble.withPromises.startNotification(
        this.device_id,
        BookooMotto.SERVICE_UUID,
        BookooMotto.NOTIFY_UUID,
        onData,
        onNotificationError,
      );
    } else if (ble.startNotification) {
      await new Promise<void>((resolve, reject) => {
        try {
          ble.startNotification(
            this.device_id,
            BookooMotto.SERVICE_UUID,
            BookooMotto.NOTIFY_UUID,
            (data: ArrayBuffer | 'registered') => {
              if (data === 'registered') {
                resolve();
                return;
              }
              onData(data);
            },
            reject,
            { emitOnRegistered: true },
          );
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    } else {
      throw new Error('The BLE plugin cannot start MT80 notifications');
    }

    if (!this.isCurrentConnection(connectionGeneration)) {
      // A disconnect can happen while startNotification is still in flight.
      // The plugin has then created a subscription after disconnect() ran, so
      // stop it here before a later connection can reuse the device.
      this.isNotificationAttached = true;
      await this.deattachNotification();
      return false;
    }

    this.isNotificationAttached = true;
    return true;
  }

  private deattachNotification(): Promise<void> {
    if (!this.isNotificationAttached) {
      return this.notificationStopPromise;
    }

    this.isNotificationAttached = false;
    const stopPromise = this.stopNotification();
    this.notificationStopPromise = stopPromise;
    return stopPromise;
  }

  private stopNotification(): Promise<void> {
    const stopNotification = ble.withPromises?.stopNotification as
      | ((
          deviceId: string,
          serviceUuid: string,
          characteristicUuid: string,
        ) => Promise<void>)
      | undefined;
    if (stopNotification) {
      return Promise.resolve(
        stopNotification.call(
          ble.withPromises,
          this.device_id,
          BookooMotto.SERVICE_UUID,
          BookooMotto.NOTIFY_UUID,
        ),
      ).catch((error: unknown) => {
        this.logger.error('Deattaching notification failed', error);
      });
    }

    if (typeof ble.stopNotification !== 'function') {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      try {
        ble.stopNotification(
          this.device_id,
          BookooMotto.SERVICE_UUID,
          BookooMotto.NOTIFY_UUID,
          (event: unknown) => {
            this.logger.log('Deattaching notification success', event);
            resolve();
          },
          (error: unknown) => {
            this.logger.error('Deattaching notification failed', error);
            resolve();
          },
        );
      } catch (error) {
        this.logger.error('Deattaching notification failed', error);
        resolve();
      }
    });
  }

  private isCurrentConnection(connectionGeneration: number): boolean {
    return (
      this.isConnected && this.connectionGeneration === connectionGeneration
    );
  }

  private startHandshakeReadyTimeout(): void {
    if (this.handshakeTimeout) {
      return;
    }

    this.handshakeTimeout = setTimeout(() => {
      this.handshakeTimeout = null;
      if (this.isConnected && !this.isReady) {
        this.logger.error(
          'Bookoo Motto did not send periodInfo within 5 seconds',
        );
      }
    }, HANDSHAKE_READY_TIMEOUT_MS);
  }

  private clearHandshakeTimeout(): void {
    if (this.handshakeTimeout) {
      clearTimeout(this.handshakeTimeout);
      this.handshakeTimeout = null;
    }
  }

  private async sendHandshake(): Promise<boolean> {
    if (!this.isConnected || this.handshakeSent) {
      return false;
    }

    this.handshakeSent = true;
    const sent = await this.sendJsonRequest({
      request: {
        appHello: {
          op: 'handshake',
        },
      },
    });
    if (!sent) {
      this.handshakeSent = false;
    }

    return sent;
  }

  private async sendJsonRequest(payload: unknown): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    const serializedPayload = JSON.stringify(payload);
    if (!serializedPayload) {
      this.logger.error('Bookoo Motto request could not be serialized');
      return false;
    }

    try {
      const encodedPayload = this.textEncoder.encode(serializedPayload);
      const frames = encodeBookooMottoFragments(
        encodedPayload,
        this.nextSequence(),
      );
      return this.enqueueFrames(frames);
    } catch (error) {
      this.logger.error('Bookoo Motto request encoding failed', error);
      return false;
    }
  }

  private nextSequence(): number {
    const sequence = this.sequence;
    this.sequence = (this.sequence + 1) & 0xffff;
    return sequence;
  }

  private enqueueFrames(frames: Uint8Array[]): Promise<boolean> {
    const writeAction = async (): Promise<boolean> => {
      for (const frame of frames) {
        if (!this.isConnected || !(await this.writeFrame(frame))) {
          return false;
        }
      }

      return true;
    };

    // Queue complete logical messages, rather than individual fragments, so
    // concurrent commands cannot interleave their fragment streams.
    const queuedAction = this.writeQueue.catch(() => false).then(writeAction);
    this.writeQueue = queuedAction.catch((error) => {
      this.logger.error('Bookoo Motto write queue failed', error);
      return false;
    });
    return queuedAction;
  }

  private writeFrame(bytes: Uint8Array): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!this.isConnected) {
        resolve(false);
        return;
      }

      const buffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
      const writeMethod = ble.write;

      if (typeof writeMethod !== 'function') {
        this.logger.error('Bookoo Motto BLE write method is unavailable');
        resolve(false);
        return;
      }

      try {
        writeMethod.call(
          ble,
          this.device_id,
          BookooMotto.SERVICE_UUID,
          BookooMotto.WRITE_UUID,
          buffer,
          () => {
            resolve(true);
          },
          (error: unknown) => {
            this.logger.error('Bookoo Motto write failed', error);
            resolve(false);
          },
        );
      } catch (error) {
        this.logger.error('Bookoo Motto write failed', error);
        resolve(false);
      }
    });
  }

  private parseNotification(data: Uint8Array): void {
    if (
      this.fragmentLastReceivedAt !== null &&
      Date.now() - this.fragmentLastReceivedAt > REASSEMBLY_TIMEOUT_MS
    ) {
      this.clearFragment();
    }

    if (data.length < FRAME_HEADER_LENGTH + 1) {
      this.rejectFrame('MT80 frame has no payload');
      return;
    }

    const magic = data[0];
    const version = data[1];
    const sequence = data[2] | (data[3] << 8);
    const totalLength = data[4] | (data[5] << 8);
    const offset = data[6] | (data[7] << 8);
    const payload = data.subarray(FRAME_HEADER_LENGTH);

    if (magic !== FRAME_MAGIC || version !== FRAME_VERSION) {
      this.rejectFrame('unsupported MT80 frame magic or version');
      return;
    }
    if (totalLength < 1 || totalLength > MAX_MESSAGE_LENGTH) {
      this.rejectFrame('invalid MT80 logical message length');
      return;
    }
    if (offset >= totalLength || payload.length > totalLength - offset) {
      this.rejectFrame('MT80 frame exceeds logical message bounds');
      return;
    }

    if (offset === 0) {
      // Offset zero always starts a new logical message, even if the previous
      // message was incomplete.
      this.expectedFragmentSequence = sequence;
      this.expectedFragmentLength = totalLength;
      this.fragmentBuffer = [];
    } else if (
      this.expectedFragmentSequence === null ||
      this.expectedFragmentLength !== totalLength ||
      this.expectedFragmentSequence !== sequence ||
      offset !== this.fragmentBuffer.length
    ) {
      this.rejectFrame('out-of-order or mismatched MT80 fragment');
      return;
    }

    this.fragmentBuffer.push(...payload);
    if (this.fragmentBuffer.length !== totalLength) {
      this.resetFragmentTimeout();
      return;
    }

    const completePayload = new Uint8Array(this.fragmentBuffer);
    this.clearFragment();
    this.decodeJsonPayload(completePayload);
  }

  private rejectFrame(message: string): void {
    this.logger.log(`Ignoring ${message}`);
    this.clearFragment();
  }

  private resetFragmentTimeout(): void {
    this.fragmentLastReceivedAt = Date.now();
    if (this.fragmentTimeout) {
      clearTimeout(this.fragmentTimeout);
    }
    this.fragmentTimeout = setTimeout(() => {
      this.logger.error('Bookoo Motto fragmented payload timeout');
      this.clearFragment();
    }, REASSEMBLY_TIMEOUT_MS);
  }

  private clearFragment(): void {
    this.expectedFragmentSequence = null;
    this.expectedFragmentLength = null;
    this.fragmentBuffer = [];
    this.fragmentLastReceivedAt = null;
    if (this.fragmentTimeout) {
      clearTimeout(this.fragmentTimeout);
      this.fragmentTimeout = null;
    }
  }

  private decodeJsonPayload(payload: Uint8Array): void {
    try {
      this.handleJsonMessage(JSON.parse(this.textDecoder.decode(payload)));
    } catch (error) {
      this.logger.error('Bookoo Motto JSON payload parse failed', error);
    }
  }

  private handleJsonMessage(message: any): void {
    this.lastMessage = message;

    const broadcast = message?.broadcast;
    if (this.isRecord(broadcast)) {
      if (this.isRecord(broadcast.baseInfo)) {
        this.lastBaseInfo = {
          ...(this.lastBaseInfo ?? {}),
          ...broadcast.baseInfo,
        };
      }

      if (this.isRecord(broadcast.periodInfo)) {
        this.handlePeriodInfo(broadcast.periodInfo);
      }
    }

    const response = message?.response;
    if (!this.isRecord(response)) {
      return;
    }

    const geneSetting = response.geneSetting;
    if (this.isRecord(geneSetting) && this.isRecord(geneSetting.data)) {
      this.lastGeneSetting = {
        ...(this.lastGeneSetting ?? {}),
        ...geneSetting.data,
      };
      this.updateGrinderAttributes(geneSetting.data);
    }
  }

  private handlePeriodInfo(periodInfo: BookooMottoPeriodInfo): void {
    this.lastPeriodInfo = {
      ...(this.lastPeriodInfo ?? {}),
      ...periodInfo,
    };

    // The protocol defines receipt of broadcast.periodInfo, rather than an
    // appHello response, as successful handshake/data-channel verification.
    this.isReady = true;
    this.clearHandshakeTimeout();
    this.updateGrinderAttributes(periodInfo);
  }

  private updateGrinderAttributes(periodInfo: Record<string, unknown>): void {
    const grinderAttributes: Partial<Grinder> = {};
    const burrGap = this.toNumber(periodInfo.bladeGap);
    const rpmSpeed = this.toNumber(periodInfo.grindRpm);
    const feedspeed = this.toNumber(periodInfo.feedingRpm);

    if (burrGap !== undefined) {
      grinderAttributes.burr_gap = burrGap;
    }
    if (rpmSpeed !== undefined) {
      grinderAttributes.rpm_speed = rpmSpeed;
    }
    if (feedspeed !== undefined) {
      grinderAttributes.feedspeed = feedspeed;
    }

    if (Object.keys(grinderAttributes).length > 0) {
      this.setGrinder(grinderAttributes, periodInfo);
    }
  }

  private isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private toNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return parsed;
  }
}

export namespace diFluid {
  export enum func {
    DEVICE_INFO = 0,
    DEVICE_SETTINGS = 1,
    DEVICE_ACTION = 3,
  }

  /**
   * @see {@link https://github.com/DiFluid/difluid-sdk-demo/blob/master/docs/protocolMicrobalance.md | Microbalance Protocol Documentation}
   */
  export namespace Microbalance {
    export enum info {
      SERIAL_NUMBER,
      DEVICE_MODEL,
      FIRMWARE_VERSION,
    }

    export enum settings {
      SENSOR_DATA_AUTO_SEND,
      AUTO_DETECT_TIMING,
      AUTO_STOP_TIMING,
      WEIGHT_UNIT_SWITCH_LOCK,
      WEIGHT_UNIT,
    }

    export namespace settings {
      export enum sensorDataAutoSend {
        Off,
        On,
      }

      export enum autoDetectTiming {
        Off,
        On,
      }

      export enum autoStopTiming {
        Off,
        On,
      }

      export enum weightUnitSwitchLock {
        Off,
        On,
      }

      export enum weightUnit {
        GRAM,
        OUNCE,
        GERING,
      }
    }

    export enum action {
      SENSOR_DATA,
      DLINK_BUTTON_PRESS,
      CONTROL_BUTTON_SINGLE_PRESS,
      CONTROL_BUTTON_DOUBLE_PRESS,
      CONTROL_BUTTON_LONG_PRESS,
      DEVICE_STATUS,
    }

    export namespace action {
      export enum deviceStatus {
        POWER_DOWN,
        CHARGING,
        LOW_POWER_MODE_1,
        LOW_BATTERY_SHUTDOWN,
        STARTUP,
        IDLE,
        SHOW_DEVICE_INFORMATION,
        TARE_IN_PROGRESS,
        OTA_IN_PROGRESS,
        OTA_FAILED,
        TIMING_IN_PROGRESS,
        TIMER_PAUSE,
        RESERVED,
        LOW_POWER_MODE_2,
        AUTO_STOP_TIMING_TRIGGER,
      }
    }
  }

  /**
   * @see {@link https://github.com/DiFluid/difluid-sdk-demo/blob/master/docs/protocolR2.md | R2 Protocol Documentation}
   */
  export namespace R2 {
    export enum info {
      SERIAL_NUMBER,
      DEVICE_MODEL,
      FIRMWARE_VERSION,
    }

    export enum settings {
      TEMPERATURE_UNIT,
      AUTO_TEST_STATUS,
      SCREEN_BRIGHTNESS,
      NUMBER_OF_TESTS,
    }
    export namespace settings {
      export enum temperatureUnit {
        C,
        F,
      }
      export enum autoTest {
        Off,
        On,
      }
    }

    export enum action {
      SINGLE_TEST,
      AVERAGE_TEST,
      CALIBRATION_RESULT,
      ERROR = 254,
      ERROR_UNKNOWN,
    }
    export namespace action {
      export enum test {
        TEST_STATUS,
        TEMPERATURE_INFO,
        TEST_RESULT,
        AVERAGE_RESULT,
        AVERAGE_TEMPERATURE_INFO,
      }

      export namespace test {
        export enum status {
          TEST_FINISHED,
          CALIBRATION_FINISHED,
          RESERVED_0,
          RESERVED_1,
          AVERAGE_TEST_START,
          AVERAGE_TEST_ONGOING,
          AVERAGE_TEST_FINISHED,
          LOOP_TEST_START,
          LOOP_TEST_ONGOING,
          LOOP_TEST_FINISHED,
          AVERAGE_TEST_ONGOING_INVALID, // only appears when a test time is too long
          TEST_START,
          CALIBRATION_START,
        }
      }

      export enum errorClass {
        GENERAL = 2,
        HARDWARE,
      }
      export namespace error {
        export enum general {
          TEST_ERROR = 1,
          CALIBRATION_FAILED,
          NO_LIQUID,
          BEYOND_RANGE,
        }
      }
    }
  }

  /**
   * @remarks
   * Parsed format for status from device.
   * This does not include the headers, data length, or checksum.
   *
   * @typeParam func - the function identifier, mapping to {@link diFluid.func}
   * @typeParam cmd - the command identifier, maps to varying command enumerators within the appropriate device's namespace
   * @typeParam data - the data in Uint8Array format
   */
  export type status = {
    func: func;
    cmd: number;
    data: Uint8Array;
  };

  /**
   * @remarks
   * builds a checksum from an array
   *
   * @param rawStatus - an array of bytes to build a checksum for
   * @returns the checksum
   */
  function computeChecksum(rawStatus: Uint8Array): number {
    let checksum = 0;
    for (let idx = 0; idx < rawStatus.length; idx++) {
      checksum += rawStatus[idx];
    }
    return checksum % 0xff;
  }

  /**
   * @remarks
   * This builds a raw cmd byte array
   *
   * @param status - a pre-built status command to send to the device
   *
   * @returns a `Uint8Array` of bytes to send to the device
   */
  export function buildRawCmd(status: diFluid.status): Uint8Array {
    let rawStatus = new Uint8Array(status.data.length);

    rawStatus.set([0xdf, 0xdf, status.func, status.cmd, status.data.length]);
    rawStatus.set(status.data, 5);
    rawStatus.set([computeChecksum(rawStatus)], rawStatus.length - 1);

    return rawStatus;
  }

  export const InvalidHeader = new Error(`data header not following protocol`);
  export const UnmatchedChecksum = new Error(`checksum did not match`);
  export const UnmatchedDataLength = new Error(`data length does not match`);

  /**
   * @remarks
   * Performs data safety checks to ensure safe handling / parsing of data.
   * This is primarily to avoid data access exceptions, as well as to validate data integrity
   *
   * @param rawStatus - a raw array of bytes from a device
   *
   * @returns `true` if all checks pass.
   *
   * @throws
   * an {@link diFluid.InvalidHeader | InvalidHeader} exception if a valid header is not present.
   *
   * @throws
   * an {@link diFluid.UnmatchedChecksum | UnmatchedChecksum} exception if the checksum value does not match.
   *
   * @throws
   * an {@link diFluid.UnmatchedDataLength | UnmatchedDataLength} exception if the data length value and the actual data length differ.
   */
  export function dataSafetyCheck(rawStatus: Uint8Array): boolean {
    // Check if data is using protocol header
    if (rawStatus[0] != 0xdf || rawStatus[1] != 0xdf) {
      throw InvalidHeader;
    }

    // compare checksum
    if (
      !(
        computeChecksum(rawStatus.slice(0, -1)) ===
        rawStatus[rawStatus.length - 1]
      )
    ) {
      throw UnmatchedChecksum;
    }

    // compare data length
    if (rawStatus[4] !== rawStatus.length - 6) {
      throw UnmatchedDataLength;
    }

    return true;
  }

  /**
   * @remarks
   * Parses raw status into a structured `diFluid.status` type
   *
   * rawStatus data format:
   * [0xDF], [0xDF], Func, Cmd, Data Length, Data0, ..., DataN, Checksum
   *
   * @param rawStatus - the raw byte array received from device
   * @returns `diFluid.status`
   *
   * @throws
   * one of the following from {@link diFluid.dataSafetyCheck}, if it does not pass
   * - {@link diFluid.InvalidHeader | InvalidHeader}
   * - {@link diFluid.UnmatchedChecksum | UnmatchedChecksum}
   * - {@link diFluid.UnmatchedDataLength | UnmatchedDataLength}
   *
   * @see {@link https://github.com/DiFluid/difluid-sdk-demo/blob/master/docs/difluid-protocol.md | Protocol Documentation}
   */
  export function parseRawStatus(rawStatus: Uint8Array): status {
    try {
      dataSafetyCheck(rawStatus);
    } catch (err) {
      throw err;
    }

    return {
      func: rawStatus[2],
      cmd: rawStatus[3],
      data: rawStatus.slice(5, -1),
    };
  }

  /**
   * @remarks
   * Parses a string from a Uint8Array
   *
   * @param data the `.data` member from a {@link diFluid.status}
   * @param hasDataPackHeader an optional flag if the data starts with a datapack ID. This datapack will be ignored if set.
   * @returns the parsed `String` object
   */
  export function parseString(
    data: Uint8Array,
    hasDataPackHeader: boolean = false,
  ): string {
    let extractedStr = '';
    for (let idx = hasDataPackHeader ? 1 : 0; idx < data.length; idx++) {
      extractedStr += String.fromCharCode(data[idx]);
    }
    return extractedStr;
  }
}

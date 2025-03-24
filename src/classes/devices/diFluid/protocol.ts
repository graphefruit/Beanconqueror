export namespace diFluid {
  export enum func {
    'Device Info',
    'Device Settings',
    'Device Action' = 3,
  }

  /**
   * @see {@link https://github.com/DiFluid/difluid-sdk-demo/blob/master/docs/protocolMicrobalance.md | Microbalance Protocol Documentation}
   */
  export namespace Microbalance {
    export enum info {
      /** Serial Number of device */
      'Serial Number',
      /** Should always be 'DFT-R102' */
      'Device Model',
      /** Current firmware Version */
      'Firmware Version',
    }

    export enum settings {
      /**
       * Automatically send data -
       * {@link diFluid.Microbalance.settings.sensorDataAutoSend}
       */
      'Sensor Data Auto Send',
      /**
       * Automatically start timer on consistent pour -
       * {@link diFluid.Microbalance.settings.autoDetectTiming}
       */
      'Auto Detect Timing',
      /**
       * Automatically pause timer when weight is removed
       * {@link diFluid.Microbalance.settings.autoStopTiming}
       */
      'Auto Stop Timing',
      /**
       * Lock weight unit -
       * {@link diFluid.Microbalance.settings.weightUnitSwitchLock}
       */
      'Weight Unit Switch Lock',
      /**
       * weight unit -
       * {@link diFluid.Microbalance.settings.weightUnit}
       */
      'Weight Unit',
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
        Gram,
        Ounce,
        Gering,
      }
    }

    export enum action {
      'Sensor Data',
      'DLink Button Press',
      'Control Button Single Press',
      'Control Button Double Press',
      'Control Button Long Press',
      'Device Status',
    }

    export namespace action {
      export enum deviceStatus {
        'Power Down',
        'Charging',
        'Low Power Mode 1',
        'Low Battery Shutdown',
        'Startup',
        'Idle',
        'Show Device Information',
        'Tare In Progress',
        'OTA In Progress',
        'OTA Failed',
        'Timing In Progress',
        'Timer Paused',
        RESERVED,
        'Low Power Mode 2',
        'Auto Stop Timing Trigger',
      }
    }
  }

  /**
   * @see {@link https://github.com/DiFluid/difluid-sdk-demo/blob/master/docs/protocolR2.md | R2 Protocol Documentation}
   */
  export namespace R2 {
    export enum info {
      /** Serial Number of device */
      'Serial Number',
      /** Should always be 'DFT-R102' */
      'Device Model',
      /** Current firmware Version */
      'Firmware Version',
    }

    export enum settings {
      /**
       * Celsius or Fahrenheit -
       * {@link diFluid.R2.settings.temperatureUnit}
       */
      'Temperature Unit',
      /**
       * Automatically start test on temperature change of tank/prism -
       * {@link diFluid.R2.settings.autoTest}
       */
      'Auto Test Status',
      /** Can be between 30-100% */
      'Screen Brightness',
      /** Number of tests to perform */
      'Number of Tests',
    }
    export namespace settings {
      export enum temperatureUnit {
        /** Celsius */
        C,
        /** Fahrenheit */
        F,
      }
      export enum autoTest {
        /** Do not start test on temperature change of tank/prism */
        Off,
        /** Start test on temperature change of tank/prism */
        On,
      }
    }

    export enum action {
      /** Perform a single test */
      'Single Test',
      /** Perform multiple tests and average the results */
      'Average Test',
      /** Calibrate the device */
      'Calibration Result',
      /**
       * Known Errors -
       * {@link diFluid.R2.action.errorClass}
       */
      'Error' = 254,
      /** Unknown Errors */
      'Error Unknown',
    }
    export namespace action {
      export enum test {
        /**
         * Status code of current test -
         * {@link diFluid.R2.action.test.status}
         */
        'Test Status',
        /** Prism and Tank temperatures as well as temperature unit */
        'Temperature Info',
        /** Concentration (TDS) and Refractive Index */
        'Test Result',
        /** Averaged Concentration (TDS) and Refractive Index */
        'Average Result',
        /** Averaged Prism and Tank temperatures, Current and Total test counts */
        'Average Temperature and Info',
      }

      export namespace test {
        export enum status {
          /** Test completed */
          'Test Finished',
          /** Calibration completed */
          'Calibration Finished',
          RESERVED_0,
          RESERVED_1,
          /** Average Test started */
          'Average Test Started',
          /** Average Test in progress */
          'Average Test Ongoing',
          /** Average Test completed */
          'Average Test Finished',
          /** Loop Test started */
          'Loop Test Started',
          /** Loop Test in progress */
          'Loop Test Ongoing',
          /** Loop Test completed */
          'Loop Test Finished',
          /**
           * Average Test in progress
           *
           * Only appears when a test time is too long
           */
          'Average Test Ongoing: Timout',
          /** Test started */
          'Test Started',
          /** Calibration started */
          'Calibration Started',
        }
      }

      export enum errorClass {
        /**
         * Known Software Errors -
         * {@link diFluid.R2.action.error.general}
         */
        General = 2,
        /** This is the same as the number displaying on the device screen */
        Hardware,
      }
      export namespace error {
        export enum general {
          /** Generic test error */
          'Test Error' = 1,
          /** Calibration Failed */
          'Calibration Failed',
          /** Cannot detect liquid to refract */
          'No Liquid',
          /** TDS is either too high or too low to  */
          'Beyond Range',
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
    return checksum & 0xff;
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
    let rawStatus = new Uint8Array(status.data.length + 6);

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

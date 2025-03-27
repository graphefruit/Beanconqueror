/**
 * Types of test methodologies for a refractometer to perform
 */
export enum TEST_TYPE_ENUM {
  /**
   * Performs one test (or multiple individual tests)
   *
   * supported by:
   * - all devices
   */
  SINGLE,
  /**
   * Performs multiple tests, getting the average value
   *
   * supported by:
   * - R2
   */
  AVERAGE,
  /**
   * Automatically performs a test when a temperature change is detected, looping until a stable temperature and TDS are reached
   *
   * supported by:
   * - R2
   */
  AUTO,
}

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
  SINGLE = 0,
  /**
   * Performs multiple tests, getting the average value
   *
   * supported by:
   * - all devices
   */
  AVERAGE,
}

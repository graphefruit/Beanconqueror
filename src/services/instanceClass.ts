
export abstract class InstanceClass {

  /**
   * Singelton instance
   */
  private static instance: any;
  constructor() {
    if (InstanceClass.instance === undefined) {
      InstanceClass.instance = this;
    }
  }
  public static getInstance() {
    return InstanceClass.instance;
  }
}

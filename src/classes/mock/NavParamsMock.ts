export class NavParamsMock {
  private static returnParam = null;

  public static setParams(value) {
    NavParamsMock.returnParam = value;
  }

  public get(key): any {
    if (NavParamsMock.returnParam) {
      return NavParamsMock.returnParam;
    }
    return undefined;
  }

}

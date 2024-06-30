import { Brew } from '../brew/brew';
import { Preparation } from '../preparation/preparation';

/**
 * MockBrew for tests that returns a fixed Preparation rather than reading from storage.
 */
export class BrewMock extends Brew {
  public _preparation: Preparation = new Preparation();

  public getPreparation(): Preparation {
    return this._preparation;
  }
}

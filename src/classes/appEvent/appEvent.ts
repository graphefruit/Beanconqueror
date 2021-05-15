import {AppEventType} from '../../enums/appEvent/appEvent';

export class AppEvent<T> {
  constructor(
    public type: AppEventType,
    public payload: T,
  ) {}
}


import { Injectable } from '@angular/core';

import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

import { AppEvent } from '../../classes/appEvent/appEvent';
import { AppEventType } from '../../enums/appEvent/appEvent';

@Injectable({
  providedIn: 'root',
})
export class EventQueueService {
  private eventBrocker = new Subject<AppEvent<any>>();

  public on(eventType: AppEventType): Observable<AppEvent<any>> {
    return this.eventBrocker.pipe(filter((event) => event.type === eventType));
  }

  public dispatch<T>(event: AppEvent<T>): void {
    this.eventBrocker.next(event);
  }
}

import { inject, Service } from '@angular/core';

import { BeanStore } from './bean.store';

/**
 * The writes of the bean card. Each changes the bean as it is stored when
 * the write runs and resolves whether it was saved; asking, toasts and
 * tracking stay with the caller.
 */
@Service()
export class BeanCommands {
  private readonly beans = inject(BeanStore);

  public setFavourite(uuid: string, favourite: boolean): Promise<boolean> {
    return this.beans.update(uuid, (bean) => {
      bean.favourite = favourite;
    });
  }

  /** With the rating and note the user gave when asked. */
  public archive(uuid: string, rating: number, note: string): Promise<boolean> {
    return this.beans.update(uuid, (bean) => {
      bean.finished = true;
      bean.rating = rating;
      bean.note = note;
    });
  }

  public unarchive(uuid: string): Promise<boolean> {
    return this.beans.update(uuid, (bean) => {
      bean.finished = false;
    });
  }
}

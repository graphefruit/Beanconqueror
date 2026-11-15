import { inject, Service } from '@angular/core';

import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UILog } from '../../services/uiLog';

/** Changes to beans that reach further than one stored bean. */
@Service()
export class BeanCommands {
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiLog = inject(UILog);

  /**
   * Deletes the bean and all of its brews with two saves: the brews first,
   * so a bean never disappears while brews still point to it, then the bean.
   *
   * Resolves whether both are gone and never rejects. Nothing is deleted
   * when the bean is unknown, when one of the two collections does not take
   * writes or when the brews could not be saved. Only when the bean could
   * not be saved after its brews, it is left without them.
   */
  public async deleteWithBrews(_beanUuid: string): Promise<boolean> {
    try {
      if (
        !this.uiBeanStorage.getByUUID(_beanUuid) ||
        // An empty list removes nothing but tells whether the collection
        // takes writes.
        !(await this.uiBrewStorage.removeManyByUUID([])) ||
        !(await this.uiBeanStorage.removeManyByUUID([]))
      ) {
        return false;
      }
      // From the stored form: building a Brew for each of 30,000 entries
      // would take longer than the deletion.
      const brewUuids: string[] = [];
      for (const entry of this.uiBrewStorage.getRawEntries()) {
        const brew = entry as { bean?: unknown; config?: { uuid?: string } };
        if (brew?.bean === _beanUuid && brew.config?.uuid) {
          brewUuids.push(brew.config.uuid);
        }
      }
      return (
        (await this.uiBrewStorage.removeManyByUUID(brewUuids)) &&
        (await this.uiBeanStorage.removeManyByUUID([_beanUuid]))
      );
    } catch (ex) {
      this.uiLog.error('BeanCommands - Delete with brews - Unsuccessfully', ex);
      return false;
    }
  }
}

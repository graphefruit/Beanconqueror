import { Bean } from '../../../../classes/bean/bean';
import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { StorageClass } from '../../../../classes/storageClass';
import { IBeanInformation } from '../../../../interfaces/bean/iBeanInformation';
import { BeansAddComponent } from '../beans-add.component';

describe('The form for a bean roasted from a green bean', () => {
  const sort = (country: string) => ({ country }) as IBeanInformation;

  it('starts with the sorts of the green bean and leaves them as they are', async () => {
    const greenBean = new GreenBean();
    greenBean.bean_information = [sort('Kenya')];
    const form = Object.assign(Object.create(BeansAddComponent.prototype), {
      data: new Bean(),
      greenBean,
      uiAnalytics: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
      uiHelper: {
        cloneData: (value: unknown) => StorageClass.cloneData(value),
      },
    }) as BeansAddComponent;

    await form.ionViewWillEnter();
    expect(form.data.bean_information).toEqual([sort('Kenya')]);
    form.data.bean_information[0].country = 'Brazil';
    form.data.bean_information.push(sort('Peru'));

    expect(greenBean.bean_information).toEqual([sort('Kenya')]);
  });
});

import { GreenBean } from '../../../../../classes/green-bean/green-bean';
import { IBeanInformation } from '../../../../../interfaces/bean/iBeanInformation';
import { GreenBeanEditComponent } from '../green-bean-edit.component';

/** The edit form works on a draft: a cancelled form leaves the stored green bean as it is. */
describe('The green bean edit form', () => {
  const sort = (country: string) => ({ country }) as IBeanInformation;

  function open(stored: GreenBean): GreenBeanEditComponent {
    const form = Object.assign(
      Object.create(GreenBeanEditComponent.prototype),
      {
        greenBean: stored,
        uiAnalytics: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
      },
    ) as GreenBeanEditComponent;
    form.ionViewWillEnter();
    return form;
  }

  it('leaves the sorts of the stored green bean as they are until it is saved', () => {
    const stored = new GreenBean();
    stored.bean_information = [sort('Kenya'), sort('Ethiopia')];

    const form = open(stored);
    form.data.bean_information[0].country = 'Brazil';
    form.data.bean_information.splice(1, 1);
    form.data.bean_information.push(sort('Peru'));

    expect(stored.bean_information).toEqual([sort('Kenya'), sort('Ethiopia')]);
    expect(form.data.bean_information).toEqual([sort('Brazil'), sort('Peru')]);
  });

  it('starts with the sorts of the stored green bean', () => {
    const stored = new GreenBean();
    stored.bean_information = [sort('Kenya')];

    expect(open(stored).data.bean_information).toEqual([sort('Kenya')]);
  });
});

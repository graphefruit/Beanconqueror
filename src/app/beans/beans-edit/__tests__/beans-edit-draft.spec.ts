import { Bean } from '../../../../classes/bean/bean';
import { IBeanInformation } from '../../../../interfaces/bean/iBeanInformation';
import { BeansEditComponent } from '../beans-edit.component';

/** The edit form works on a draft: a cancelled form leaves the stored bean as it is. */
describe('The bean edit form', () => {
  const sort = (country: string) => ({ country }) as IBeanInformation;

  function open(stored: Bean): BeansEditComponent {
    const form = Object.assign(Object.create(BeansEditComponent.prototype), {
      bean: stored,
      uiAnalytics: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
    }) as BeansEditComponent;
    form.ionViewWillEnter();
    return form;
  }

  it('leaves the sorts of the stored bean as they are until it is saved', () => {
    const stored = new Bean();
    stored.bean_information = [sort('Kenya'), sort('Ethiopia')];

    const form = open(stored);
    form.data.bean_information[0].country = 'Brazil';
    form.data.bean_information.splice(1, 1);
    form.data.bean_information.push(sort('Peru'));

    expect(stored.bean_information).toEqual([sort('Kenya'), sort('Ethiopia')]);
    expect(form.data.bean_information).toEqual([sort('Brazil'), sort('Peru')]);
  });

  it('starts with the sorts of the stored bean', () => {
    const stored = new Bean();
    stored.bean_information = [sort('Kenya')];

    expect(open(stored).data.bean_information).toEqual([sort('Kenya')]);
  });
});

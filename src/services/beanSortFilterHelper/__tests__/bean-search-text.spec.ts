import { Bean } from '../../../classes/bean/bean';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { BeanSortFilterHelperService } from '../bean-sort-filter-helper.service';

function bean(
  name: string,
  fields: Partial<Bean> = {},
  information: Partial<IBeanInformation> = {},
): Bean {
  const entry = new Bean();
  entry.name = name;
  Object.assign(entry, fields);
  entry.bean_information = [information as IBeanInformation];
  return entry;
}

describe('BeanSortFilterHelperService - search text', () => {
  // The search reads only the beans, so no dependencies are needed.
  const service = Object.create(
    BeanSortFilterHelperService.prototype,
  ) as BeanSortFilterHelperService;

  function found(searchText: string, beans: Bean[]): string[] {
    return service['manageSearchText'](searchText, beans).map(
      (entry: Bean) => entry.name,
    );
  }

  const beans = () => [
    bean('José Martinez'),
    bean('Jose Blend'),
    bean('House', { roaster: 'Café Süd' }),
    bean('Kenya', {}, { farmer: 'Łukasz', processing: 'Natural' }),
    bean('Plain', { note: null, roaster: undefined }),
  ];

  it('ignores accents in both directions and the case', () => {
    expect(found('Jose', beans())).toEqual(['José Martinez', 'Jose Blend']);
    expect(found('josé', beans())).toEqual(['José Martinez', 'Jose Blend']);
    expect(found('CAFE SUD', beans())).toEqual(['House']);
  });

  it('searches the variety fields and keeps letters without accents', () => {
    expect(found('lukasz', beans())).toEqual([]);
    expect(found('łukasz', beans())).toEqual(['Kenya']);
  });

  it('keeps a comma as a separator of alternatives', () => {
    expect(found('kenya, café', beans())).toEqual(['House', 'Kenya']);
  });

  it('finds a bean by its roaster or the country of one of its varieties', () => {
    const list = [
      bean('Alpha Filter', { roaster: 'Rösterei Nord' }),
      bean('Gamma Blend', { roaster: 'Rösterei Süd' }, { country: 'Ethiopia' }),
      bean('Epsilon Rest'),
    ];

    expect(found('NORD', list)).toEqual(['Alpha Filter']);
    expect(found('ethiopia', list)).toEqual(['Gamma Blend']);
    expect(found('nord, süd', list)).toEqual(['Alpha Filter', 'Gamma Blend']);
    expect(found('sud', list)).toEqual(['Gamma Blend']);
  });

  it('ignores an empty alternative after a comma, but not one with a blank (known defect)', () => {
    const list = [bean('Alpha'), bean('Kenya'), bean('Epsilon Rest')];

    expect(found('a,', list)).toEqual(['Alpha', 'Kenya']);
    // A blank after the comma finds every bean.
    expect(found('a, ', list)).toEqual(['Alpha', 'Kenya', 'Epsilon Rest']);
  });

  it('keeps all beans without a search text', () => {
    expect(found('', beans()).length).toBe(5);
  });
});

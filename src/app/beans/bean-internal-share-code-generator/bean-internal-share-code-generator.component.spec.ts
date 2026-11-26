import { BEAN_CODE_ACTION } from '../../../enums/beans/beanCodeAction';
import { BeanInternalShareCodeGeneratorComponent } from './bean-internal-share-code-generator.component';

describe('BeanInternalShareCodeGeneratorComponent', () => {
  it('writes the bean code and the chosen action as a tag link', () => {
    const writeNFCData = jasmine.createSpy('writeNFCData');
    const component = Object.assign(
      Object.create(BeanInternalShareCodeGeneratorComponent.prototype),
      {
        bean: { internal_share_code: '3E95E1' },
        action: BEAN_CODE_ACTION.REPEAT_LAST_BREW,
        qrData: 'beanconqueror://int/bean/3E95E1/REPEAT_LAST_BREW',
        nfcService: { writeNFCData },
        uiAnalytics: { trackEvent: jasmine.createSpy('trackEvent') },
      },
    ) as BeanInternalShareCodeGeneratorComponent;

    component.writeNFC();

    expect(writeNFCData).toHaveBeenCalledOnceWith(
      'https://beanconqueror.com/app/nfc/#3E95E1/REPEAT_LAST_BREW',
    );
  });
});

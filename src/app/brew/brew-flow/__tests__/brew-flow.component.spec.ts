import { BrewBrewingComponent } from '../../../../components/brews/brew-brewing/brew-brewing.component';
import { BrewFlowComponent } from '../brew-flow.component';

describe('BrewFlowComponent', () => {
  it('tares the scale when the brew time parameter is hidden', () => {
    const tareScale = jasmine.createSpy('tareScale').and.resolveTo();
    // Without the parameter the brew form has no timer component.
    const brewComponent = {
      timer: undefined,
      tareScale,
    } as unknown as BrewBrewingComponent;
    const component: BrewFlowComponent = Object.assign(
      Object.create(BrewFlowComponent.prototype),
      { brewComponent },
    );

    component.__tareScale();

    expect(tareScale).toHaveBeenCalledOnceWith(undefined);
  });
});

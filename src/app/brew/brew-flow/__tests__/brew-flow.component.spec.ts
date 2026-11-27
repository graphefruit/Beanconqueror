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

  describe('sizing the graph', () => {
    let container: HTMLDivElement;
    let resize: jasmine.Spy;
    let restoreGraph: jasmine.Spy;
    let component: BrewFlowComponent;

    beforeEach(() => {
      jasmine.clock().install();
      container = document.createElement('div');
      container.id = 'brewFlowContainer';
      document.body.appendChild(container);
      resize = jasmine.createSpy('resize');
      restoreGraph = jasmine.createSpy('restoreGraph');
      component = Object.assign(Object.create(BrewFlowComponent.prototype), {
        brewComponent: { brewBrewingGraphEl: { resize, restoreGraph } },
        brewFlowContent: { nativeElement: { offsetHeight: 600 } },
        modalController: jasmine.createSpyObj('modal', ['dismiss']),
        disableHardwareBack: { unsubscribe: () => undefined },
        cameraIsVisible: false,
      });
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      container.remove();
    });

    it('sizes the graph while it is shown here', () => {
      (component as unknown as { graphShown: boolean }).graphShown = true;
      component.onOrientationChange();
      jasmine.clock().tick(50);
      expect(resize).toHaveBeenCalledTimes(1);
    });

    it('leaves the graph alone once it went back into the brew form', () => {
      (component as unknown as { graphShown: boolean }).graphShown = true;
      component.onOrientationChange();
      component.dismiss();
      jasmine.clock().tick(50);

      expect(restoreGraph).toHaveBeenCalled();
      expect(resize).not.toHaveBeenCalled();
    });
  });
});

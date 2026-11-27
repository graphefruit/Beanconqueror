import { EventEmitter } from '@angular/core';

import { NEVER } from 'rxjs';

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

  it('reports a camera that cannot be started and hides its column', async () => {
    jasmine.clock().install();
    try {
      const showInfoToast = jasmine.createSpy('showInfoToast').and.resolveTo();
      const error = jasmine.createSpy('error');
      const component: BrewFlowComponent = Object.assign(
        Object.create(BrewFlowComponent.prototype),
        {
          cameraIsVisible: false,
          uiToast: { showInfoToast },
          uiLog: { error },
        },
      );
      spyOn(component, 'checkChanges').and.stub();

      // The column of the camera is not there, as when the view went away.
      await component.toggleCamera();
      jasmine.clock().tick(1000);
      jasmine.clock().uninstall();
      await new Promise((resolve) => setTimeout(resolve));

      expect(error).toHaveBeenCalled();
      expect(showInfoToast).toHaveBeenCalledOnceWith(
        'CAMERA_COULD_NOT_BE_STARTED',
      );
      expect(component.cameraIsVisible).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  describe('the maximized graph', () => {
    let content: HTMLDivElement;
    let tiles: HTMLDivElement;
    let container: HTMLDivElement;
    let showMaximized: jasmine.Spy;
    let resizeMaximized: jasmine.Spy;
    let closeMaximized: jasmine.Spy;
    let component: BrewFlowComponent;

    /** Waits until the ResizeObserver has reported the current sizes. */
    function observed(): Promise<void> {
      return new Promise((resolve) =>
        requestAnimationFrame(() => setTimeout(resolve)),
      );
    }

    beforeEach(() => {
      content = document.createElement('div');
      content.style.height = '600px';
      tiles = document.createElement('div');
      tiles.style.height = '100px';
      container = document.createElement('div');
      container.style.width = '300px';
      content.append(tiles, container);
      document.body.append(content);
      showMaximized = jasmine.createSpy('showMaximized').and.resolveTo();
      resizeMaximized = jasmine.createSpy('resizeMaximized');
      closeMaximized = jasmine.createSpy('closeMaximized');
      const graph = { showMaximized, resizeMaximized, closeMaximized };
      const ref = <T extends HTMLElement>(nativeElement: T) => ({
        nativeElement,
      });
      component = Object.assign(Object.create(BrewFlowComponent.prototype), {
        brewComponent: { brewBrewingGraphEl: graph },
        brew: { brew_time: 0 },
        settings: { brew_milliseconds: false },
        brewFlowContent: ref(content),
        informationContainer: ref(tiles),
        brewFlowContainer: ref(container),
        brewFlowGraphEvent: new EventEmitter(),
        brewPressureGraphEvent: new EventEmitter(),
        brewTemperatureGraphEvent: new EventEmitter(),
        brewTimerTickedEvent: new EventEmitter(),
        bleManager: { attachOnEvent: () => NEVER, getScale: () => undefined },
        uiHelper: { formatSeconds: () => '00:00' },
        modalController: jasmine.createSpyObj('modal', ['dismiss']),
        disableHardwareBack: { unsubscribe: () => undefined },
        cameraIsVisible: false,
      });
      spyOn(component, 'getGraphIonColSize').and.returnValue(3);
    });

    afterEach(() => {
      void component.ngOnDestroy();
      content.remove();
    });

    it('draws below the tiles, at the width of its column', async () => {
      await component.ionViewDidEnter();

      expect(showMaximized).toHaveBeenCalledOnceWith(container, 300, 500);
    });

    it('follows the size of the view, e.g. when the tiles are hidden', async () => {
      await component.ionViewDidEnter();
      await observed();
      resizeMaximized.calls.reset();

      tiles.style.height = '0px';
      container.style.width = '175px';
      await observed();

      expect(resizeMaximized).toHaveBeenCalledWith(175, 600);
    });

    it('lets go of its graph when closed and sizes nothing after', async () => {
      await component.ionViewDidEnter();
      await observed();

      component.dismiss();
      resizeMaximized.calls.reset();
      container.style.width = '200px';
      await observed();

      expect(closeMaximized).toHaveBeenCalled();
      expect(resizeMaximized).not.toHaveBeenCalled();
    });
  });
});

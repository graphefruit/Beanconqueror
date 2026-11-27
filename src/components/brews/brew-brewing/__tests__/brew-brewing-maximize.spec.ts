import { BrewBrewingComponent } from '../brew-brewing.component';

describe('BrewBrewingComponent maximized graph', () => {
  it('opens the maximized graph only once, also when the timer asks again', async () => {
    let close: () => void = () => undefined;
    const modal = {
      present: jasmine.createSpy('present').and.resolveTo(),
      onWillDismiss: () =>
        new Promise<void>((resolve) => {
          close = resolve;
        }),
    };
    const modalController = jasmine.createSpyObj('ModalController', {
      create: Promise.resolve(modal),
    });
    const component: BrewBrewingComponent = Object.assign(
      Object.create(BrewBrewingComponent.prototype),
      {
        modalController,
        maximizeFlowGraphIsShown: false,
        brewBrewingGraphEl: { checkChanges: () => undefined },
      },
    );

    const first = component.maximizeFlowGraph();
    await component.maximizeFlowGraph();
    await new Promise((resolve) => setTimeout(resolve));
    close();
    await first;

    expect(modalController.create).toHaveBeenCalledTimes(1);
    expect(component.maximizeFlowGraphIsShown).toBeFalse();
  });
});

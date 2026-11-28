import { BaristaPage } from '../../../../app/baristamode/barista/barista.page';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { BrewBrewingComponent } from '../brew-brewing.component';

describe('Saving the flow profile of a brew', () => {
  let fileHelper: jasmine.SpyObj<
    Pick<UIFileHelper, 'replaceInternalFileFromText'>
  >;

  beforeEach(() => {
    fileHelper = jasmine.createSpyObj('UIFileHelper', [
      'replaceInternalFileFromText',
    ]);
    fileHelper.replaceInternalFileFromText.and.resolveTo();
  });

  function brewing(): BrewBrewingComponent {
    return Object.assign(Object.create(BrewBrewingComponent.prototype), {
      uiFileHelper: fileHelper,
      brewBrewingGraphEl: {
        flow_profile_raw: new BrewFlow(),
        reference_profile_raw: new BrewFlow(),
      },
    }) as BrewBrewingComponent;
  }

  it('replaces the file of the brew whole', async () => {
    expect(await brewing().saveFlowProfile('a')).toBe(
      'brews/a_flow_profile.json',
    );
    expect(await brewing().saveReferenceFlowProfile('a')).toBe(
      'importedGraph/a_flow_profile.json',
    );

    expect(
      fileHelper.replaceInternalFileFromText.calls
        .allArgs()
        .map(([, path]) => path),
    ).toEqual([
      'brews/a_flow_profile.json',
      'importedGraph/a_flow_profile.json',
    ]);
  });

  it('gives no path when the file cannot be written, so the brew keeps its file', async () => {
    fileHelper.replaceInternalFileFromText.and.rejectWith(
      new Error('disk full'),
    );

    expect(await brewing().saveFlowProfile('a')).toBe('');
    expect(await brewing().saveReferenceFlowProfile('a')).toBe('');
  });

  it('replaces the file of a barista brew whole', async () => {
    const page = Object.assign(Object.create(BaristaPage.prototype), {
      uiFileHelper: fileHelper,
    }) as BaristaPage;
    const brew = { getGraphPath: () => 'brews/b_flow_profile.json' };

    expect(await page.saveFlowProfile(brew as never, new BrewFlow())).toBe(
      'brews/b_flow_profile.json',
    );
    fileHelper.replaceInternalFileFromText.and.rejectWith(
      new Error('disk full'),
    );
    expect(await page.saveFlowProfile(brew as never, new BrewFlow())).toBe('');
  });
});

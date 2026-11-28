import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { FilePickerWeb } from '@capawesome/capacitor-file-picker/dist/esm/web';
import { TranslateModule } from '@ngx-translate/core';

import { createMockUIAlert, createMockUILog } from '../../test-utils';
import { UIAlert } from '../uiAlert';
import { UIFileHelper } from '../uiFileHelper';
import { UIGraphHelper } from '../uiGraphHelper';
import { UILog } from '../uiLog';

describe('UIGraphHelper', () => {
  let helper: UIGraphHelper;
  let uiAlert: jasmine.SpyObj<any>;
  let uiFileHelper: jasmine.SpyObj<any>;
  let uiLog: ReturnType<typeof createMockUILog>;

  beforeEach(() => {
    uiAlert = createMockUIAlert();
    uiFileHelper = jasmine.createSpyObj('UIFileHelper', [
      'readJSONFile',
      'replaceInternalFileFromText',
    ]);
    uiLog = createMockUILog();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ModalController, useValue: {} },
        { provide: UIAlert, useValue: uiAlert },
        { provide: UIFileHelper, useValue: uiFileHelper },
        { provide: UILog, useValue: uiLog },
      ],
    });
    helper = TestBed.inject(UIGraphHelper);
    spyOn(FilePickerWeb.prototype, 'pickFiles').and.resolveTo({
      files: [{ path: '/picked/graph.json', mimeType: '', name: 'graph.json' }],
    } as Awaited<ReturnType<FilePickerWeb['pickFiles']>>);
  });

  describe('saving a graph', () => {
    it('replaces the graph file whole, so a crash keeps the one from before', async () => {
      uiFileHelper.replaceInternalFileFromText.and.resolveTo();

      expect(await helper.saveGraph('a', { weight: [] })).toBe(
        'graphs/a_flow_profile.json',
      );
      expect(uiFileHelper.replaceInternalFileFromText).toHaveBeenCalledOnceWith(
        '{"weight":[]}',
        'graphs/a_flow_profile.json',
      );
    });
  });

  describe('choosing a graph file', () => {
    it('returns the content of the chosen file', async () => {
      uiFileHelper.readJSONFile.and.resolveTo({ weight: [] });

      expect(await helper.chooseGraph()).toEqual({ weight: [] });
      expect(uiAlert.showMessage).not.toHaveBeenCalled();
    });

    it('reports a file that cannot be read and leaves the cause to the log', async () => {
      const cause = new SyntaxError('Unexpected end of JSON input');
      uiFileHelper.readJSONFile.and.rejectWith(cause);

      expect(await helper.chooseGraph()).toBeUndefined();

      expect(uiAlert.showMessage.calls.allArgs()).toEqual([
        ['ERROR_ON_FILE_READING'],
      ]);
      expect(uiLog.error).toHaveBeenCalledOnceWith(
        'Graph file could not be read',
        cause,
      );
    });
  });
});

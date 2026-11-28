import { TestBed } from '@angular/core/testing';

import { AlertController, ModalController, Platform } from '@ionic/angular';

import { FilePickerWeb } from '@capawesome/capacitor-file-picker/dist/esm/web';
import { TranslateService } from '@ngx-translate/core';

import {
  createMockUIAlert,
  createMockUIFileHelper,
  createMockUILog,
} from '../../test-utils';
import { UIAlert } from '../uiAlert';
import { UIFileHelper } from '../uiFileHelper';
import { UIImage } from '../uiImage';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';

describe('UIImage photos removed in a form', () => {
  let uiImage: UIImage;
  let uiFileHelper: jasmine.SpyObj<any>;

  beforeEach(() => {
    uiFileHelper = createMockUIFileHelper();
    uiFileHelper.deleteInternalFile.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        { provide: UIFileHelper, useValue: uiFileHelper },
        { provide: AlertController, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: Platform, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UILog, useValue: createMockUILog() },
        { provide: UISettingsStorage, useValue: {} },
      ],
    });
    uiImage = TestBed.inject(UIImage);
  });

  it('keeps their files until the entry was saved', async () => {
    const entry = { attachments: ['b.jpg'] };

    uiImage.removePhotoOnSave(entry, 'a.jpg');

    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
  });

  it('deletes their files once the entry was saved, and only once', async () => {
    const entry = { attachments: [] as string[] };
    uiImage.removePhotoOnSave(entry, 'a.jpg');
    uiImage.removePhotoOnSave(entry, 'b.jpg');

    await uiImage.deleteRemovedPhotos(entry);
    await uiImage.deleteRemovedPhotos(entry);

    expect(uiFileHelper.deleteInternalFile.calls.allArgs()).toEqual([
      ['a.jpg'],
      ['b.jpg'],
    ]);
  });

  it('deletes nothing for another entry', async () => {
    uiImage.removePhotoOnSave({ attachments: [] }, 'a.jpg');

    await uiImage.deleteRemovedPhotos({ attachments: [] });

    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
  });

  it('keeps the file of a photo the saved entry shows again', async () => {
    const entry = { attachments: ['a.jpg'] };
    uiImage.removePhotoOnSave(entry, 'a.jpg');

    await uiImage.deleteRemovedPhotos(entry);

    expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
  });

  it('goes on with the next file when one cannot be deleted', async () => {
    const entry = { attachments: [] as string[] };
    uiImage.removePhotoOnSave(entry, 'a.jpg');
    uiImage.removePhotoOnSave(entry, 'b.jpg');
    uiFileHelper.deleteInternalFile.and.callFake((_path: string) =>
      _path === 'a.jpg'
        ? Promise.reject(new Error('no file'))
        : Promise.resolve(),
    );

    await expectAsync(uiImage.deleteRemovedPhotos(entry)).toBeResolved();

    expect(uiFileHelper.deleteInternalFile).toHaveBeenCalledWith('b.jpg');
  });
});

describe('UIImage telling why a photo was not added', () => {
  let uiImage: UIImage;
  let uiAlert: jasmine.SpyObj<any>;
  let uiLog: jasmine.SpyObj<any>;

  beforeEach(() => {
    uiAlert = createMockUIAlert();
    uiLog = Object.assign(createMockUILog(), {
      warn: jasmine.createSpy('warn'),
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: UIFileHelper, useValue: createMockUIFileHelper() },
        { provide: AlertController, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: Platform, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: UIAlert, useValue: uiAlert },
        { provide: UILog, useValue: uiLog },
        { provide: UISettingsStorage, useValue: {} },
      ],
    });
    uiImage = TestBed.inject(UIImage);
  });

  // What @capacitor/camera rejects with on iOS, Android and the web when the
  // camera or the photo picker is closed without a photo.
  it('shows nothing when the user closed the camera or the picker', () => {
    uiImage.reportPhotoNotAdded(new Error('User cancelled photos app'));

    expect(uiAlert.showMessage).not.toHaveBeenCalled();
    expect(uiLog.warn).not.toHaveBeenCalled();
    expect(uiLog.debugLogs).toEqual([
      'Photo not added: camera or photo picker closed',
    ]);
  });

  it('tells when the camera or the photos may not be used', () => {
    const cause = new Error('User denied access to camera');

    uiImage.reportPhotoNotAdded(cause);

    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'PHOTO_ACCESS_DENIED',
      'ERROR_OCCURED',
      undefined,
      true,
    );
    expect(uiLog.warn).toHaveBeenCalledOnceWith(
      'Photo could not be added',
      cause,
    );
  });

  it('tells when a photo could not be read', () => {
    const cause = { message: 'File does not exist' };

    uiImage.reportPhotoNotAdded(cause);

    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'PHOTO_COULD_NOT_BE_ADDED',
      'ERROR_OCCURED',
      undefined,
      true,
    );
    expect(uiLog.warn).toHaveBeenCalledOnceWith(
      'Photo could not be added',
      cause,
    );
  });

  it('tells when the picker returned no photo', () => {
    uiImage.reportPhotoNotAdded('We found no file urls');

    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'PHOTO_COULD_NOT_BE_ADDED',
      'ERROR_OCCURED',
      undefined,
      true,
    );
  });
});

describe('UIImage choosing a photo', () => {
  let uiImage: UIImage;
  let uiAlert: jasmine.SpyObj<any>;
  let uiLog: jasmine.SpyObj<any>;

  beforeEach(() => {
    uiAlert = createMockUIAlert();
    uiLog = Object.assign(createMockUILog(), {
      warn: jasmine.createSpy('warn'),
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: UIFileHelper, useValue: createMockUIFileHelper() },
        { provide: AlertController, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: Platform, useValue: { is: () => false } },
        { provide: TranslateService, useValue: {} },
        { provide: UIAlert, useValue: uiAlert },
        { provide: UILog, useValue: uiLog },
        { provide: UISettingsStorage, useValue: {} },
      ],
    });
    uiImage = TestBed.inject(UIImage);
  });

  // What @capawesome/capacitor-file-picker rejects with on iOS, Android and
  // the web when the picker is closed without a photo.
  it('gives up quietly when the picker was closed', async () => {
    const cause = new Error('pickFiles canceled.');
    spyOn(FilePickerWeb.prototype, 'pickFiles').and.rejectWith(cause);

    await expectAsync(uiImage.choosePhoto()).toBeRejectedWith(cause);
    uiImage.reportPhotoNotAdded(cause);

    expect(uiAlert.showMessage).not.toHaveBeenCalled();
    expect(uiLog.warn).not.toHaveBeenCalled();
    expect(uiLog.debugLogs).toEqual([
      'Photo not added: camera or photo picker closed',
    ]);
  });

  it('passes on when the picker failed', async () => {
    const cause = new Error('Permission denial');
    spyOn(FilePickerWeb.prototype, 'pickFiles').and.rejectWith(cause);

    await expectAsync(uiImage.choosePhoto()).toBeRejectedWith(cause);
    expect(uiAlert.showLoadingSpinner).not.toHaveBeenCalled();
  });
});

describe('UIImage choosing a photo on iOS', () => {
  let uiImage: UIImage;
  let uiAlert: jasmine.SpyObj<any>;
  let uiFileHelper: jasmine.SpyObj<any>;

  beforeEach(() => {
    uiAlert = createMockUIAlert();
    uiFileHelper = Object.assign(createMockUIFileHelper(), {
      readFileAsBase64: jasmine.createSpy('readFileAsBase64'),
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: UIFileHelper, useValue: uiFileHelper },
        { provide: AlertController, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: Platform, useValue: { is: (_p: string) => _p === 'ios' } },
        { provide: TranslateService, useValue: {} },
        { provide: UIAlert, useValue: uiAlert },
        { provide: UILog, useValue: createMockUILog() },
        { provide: UISettingsStorage, useValue: {} },
      ],
    });
    uiImage = TestBed.inject(UIImage);
  });

  // iOS hands out HEIC photos as they are unless the picker transcodes them.
  it('lets the picker turn the photo into a JPEG and stores it as .jpg', async () => {
    const pickImages = spyOn(
      FilePickerWeb.prototype,
      'pickImages',
    ).and.resolveTo({
      files: [
        {
          path: 'tmp/IMG_1.jpeg',
          mimeType: 'image/jpeg',
          name: 'IMG_1.jpeg',
          size: 3,
        },
      ],
    });
    uiFileHelper.readFileAsBase64.and.resolveTo('/9j/');
    uiFileHelper.generateInternalPath.and.resolveTo('photo_1.jpg');
    uiFileHelper.writeInternalFileFromBase64.and.resolveTo({
      path: 'photo_1.jpg',
    });

    await expectAsync(uiImage.choosePhoto()).toBeResolvedTo(['photo_1.jpg']);

    expect(pickImages).toHaveBeenCalledOnceWith({ skipTranscoding: false });
    expect(uiFileHelper.readFileAsBase64).toHaveBeenCalledOnceWith(
      'tmp/IMG_1.jpeg',
    );
    expect(uiFileHelper.generateInternalPath).toHaveBeenCalledOnceWith(
      'photo',
      '.jpg',
    );
    expect(uiFileHelper.writeInternalFileFromBase64).toHaveBeenCalledOnceWith(
      '/9j/',
      'photo_1.jpg',
    );
  });

  it('passes on when the photo could not be transcoded', async () => {
    const cause = new Error('Unknown error occurred.');
    spyOn(FilePickerWeb.prototype, 'pickImages').and.rejectWith(cause);

    await expectAsync(uiImage.choosePhoto()).toBeRejectedWith(cause);
    expect(uiAlert.showLoadingSpinner).not.toHaveBeenCalled();
  });
});

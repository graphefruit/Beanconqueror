import { TestBed } from '@angular/core/testing';

import { AlertController, ModalController, Platform } from '@ionic/angular';

import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { TranslateService } from '@ngx-translate/core';

import { createMockUIFileHelper } from '../../test-utils';
import { UIAlert } from '../uiAlert';
import { UIFileHelper } from '../uiFileHelper';
import { UIImage } from '../uiImage';
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
        { provide: AndroidPermissions, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: UIAlert, useValue: {} },
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

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';

import { TranslateModule } from '@ngx-translate/core';

import {
  createMockModalController,
  createMockUIAlert,
  createMockUIFileHelper,
  createMockUIImage,
  createMockUILog,
} from '../../services/aiBeanImport/test-utils';
import { UIAlert } from '../../services/uiAlert';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIImage } from '../../services/uiImage';
import { UILog } from '../../services/uiLog';
import { AiImportPhotoGalleryComponent } from './ai-import-photo-gallery.component';

describe('AiImportPhotoGalleryComponent', () => {
  let component: AiImportPhotoGalleryComponent;
  let fixture: ComponentFixture<AiImportPhotoGalleryComponent>;
  let mockModalCtrl: jasmine.SpyObj<any>;
  let mockUIImage: jasmine.SpyObj<any>;
  let mockUIFileHelper: jasmine.SpyObj<any>;
  let mockUIAlert: jasmine.SpyObj<any>;
  let mockUILog: jasmine.SpyObj<any> & { logs: string[]; errors: string[] };

  beforeEach(waitForAsync(() => {
    mockModalCtrl = createMockModalController();
    mockUIImage = createMockUIImage();
    mockUIFileHelper = createMockUIFileHelper();
    mockUIAlert = createMockUIAlert();
    mockUILog = createMockUILog();

    TestBed.configureTestingModule({
      imports: [AiImportPhotoGalleryComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: UIImage, useValue: mockUIImage },
        { provide: UIFileHelper, useValue: mockUIFileHelper },
        { provide: UIAlert, useValue: mockUIAlert },
        { provide: UILog, useValue: mockUILog },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AiImportPhotoGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('initialization', () => {
    it('should create component with correct defaults', () => {
      // Assert
      expect(component).toBeTruthy();
      expect(component.photoPaths).toEqual([]);
      expect(component.attachPhotos).toBeFalse();
      expect(component.maxPhotos).toBe(4);
    });
  });

  describe('addPhoto', () => {
    it('should not add photo when already at maxPhotos limit', async () => {
      // WHY: Max limit prevents memory issues and ensures reasonable processing time

      // Arrange
      component.photoPaths = ['path1', 'path2', 'path3', 'path4'];

      // Act
      await component.addPhoto();

      // Assert - showOptionChooser should not be called
      expect(mockUIImage.showOptionChooser).not.toHaveBeenCalled();
    });

    it('should show option chooser when under photo limit', async () => {
      // Arrange
      mockUIImage.showOptionChooser.and.returnValue(Promise.resolve(null));

      // Act
      await component.addPhoto();

      // Assert
      expect(mockUIImage.showOptionChooser).toHaveBeenCalled();
    });
  });

  describe('removePhoto', () => {
    it('should delete file from internal storage', async () => {
      // Arrange
      component.photoPaths = ['path/to/photo1.jpg', 'path/to/photo2.jpg'];
      mockUIFileHelper.deleteInternalFile.and.returnValue(Promise.resolve());

      // Act
      await component.removePhoto(0);

      // Assert
      expect(mockUIFileHelper.deleteInternalFile).toHaveBeenCalledWith(
        'path/to/photo1.jpg',
      );
    });

    it('should remove path from photoPaths array at given index', async () => {
      // Arrange
      component.photoPaths = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
      mockUIFileHelper.deleteInternalFile.and.returnValue(Promise.resolve());

      // Act
      await component.removePhoto(1);

      // Assert
      expect(component.photoPaths).toEqual(['photo1.jpg', 'photo3.jpg']);
    });

    it('should continue if file deletion fails', async () => {
      // WHY: File may not exist on disk, but we still want to remove from array

      // Arrange
      component.photoPaths = ['photo1.jpg', 'photo2.jpg'];
      mockUIFileHelper.deleteInternalFile.and.returnValue(
        Promise.reject(new Error('File not found')),
      );

      // Act
      await component.removePhoto(0);

      // Assert - path should still be removed from array
      expect(component.photoPaths).toEqual(['photo2.jpg']);
    });
  });

  describe('startAnalysis', () => {
    it('should dismiss modal with photoPaths, attachPhotos, confirm role, and component ID', () => {
      // Arrange
      component.photoPaths = ['photo1.jpg', 'photo2.jpg'];
      component.attachPhotos = true;

      // Act
      component.startAnalysis();

      // Assert
      expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(
        {
          photoPaths: ['photo1.jpg', 'photo2.jpg'],
          attachPhotos: true,
        },
        'confirm',
        AiImportPhotoGalleryComponent.COMPONENT_ID,
      );
    });
  });

  describe('cancel', () => {
    it('should delete all photos in photoPaths array', async () => {
      // WHY: Cleanup prevents orphaned temp files from consuming storage

      // Arrange
      component.photoPaths = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
      mockUIFileHelper.deleteInternalFile.and.returnValue(Promise.resolve());

      // Act
      await component.cancel();

      // Assert
      expect(mockUIFileHelper.deleteInternalFile).toHaveBeenCalledTimes(3);
      expect(mockUIFileHelper.deleteInternalFile).toHaveBeenCalledWith(
        'photo1.jpg',
      );
      expect(mockUIFileHelper.deleteInternalFile).toHaveBeenCalledWith(
        'photo2.jpg',
      );
      expect(mockUIFileHelper.deleteInternalFile).toHaveBeenCalledWith(
        'photo3.jpg',
      );
    });

    it('should continue cleanup even if individual deletions fail', async () => {
      // Arrange
      component.photoPaths = ['photo1.jpg', 'photo2.jpg'];
      let callCount = 0;
      mockUIFileHelper.deleteInternalFile.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('File error'));
        }
        return Promise.resolve();
      });

      // Act
      await component.cancel();

      // Assert - should attempt to delete both files
      expect(mockUIFileHelper.deleteInternalFile).toHaveBeenCalledTimes(2);
    });

    it('should dismiss modal with null data, cancel role, and component ID', async () => {
      // Arrange
      component.photoPaths = [];

      // Act
      await component.cancel();

      // Assert
      expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(
        null,
        'cancel',
        AiImportPhotoGalleryComponent.COMPONENT_ID,
      );
    });
  });

  describe('keyboard navigation', () => {
    it('should call cancel() when Escape key is pressed', () => {
      // Arrange
      spyOn(component, 'cancel');
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      // Act
      component.handleKeyboardNavigation(event);

      // Assert
      expect(component.cancel).toHaveBeenCalled();
    });
  });
});

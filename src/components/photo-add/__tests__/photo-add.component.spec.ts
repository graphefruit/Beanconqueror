import {
  ComponentFixture,
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';

import { Bean } from '../../../classes/bean/bean';
import { UIAlert } from '../../../services/uiAlert';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIImage } from '../../../services/uiImage';
import { UIToast } from '../../../services/uiToast';
import { createMockUIAlert, createMockUIFileHelper } from '../../../test-utils';
import { AsyncImageComponent } from '../../async-image/async-image.component';
import { PhotoAddComponent } from '../photo-add.component';

/** The time the component waits before it refreshes the slider. */
const SLIDER_REFRESH_DELAY = 250;

describe('PhotoAddComponent', () => {
  let component: PhotoAddComponent;
  let fixture: ComponentFixture<PhotoAddComponent>;
  let uiImage: jasmine.SpyObj<any>;
  let uiFileHelper: jasmine.SpyObj<any>;
  let uiAlert: jasmine.SpyObj<any>;
  let uiToast: jasmine.SpyObj<any>;
  let swiper: jasmine.SpyObj<any>;
  let emitted: unknown[];
  /** Ends the deletion of a file; one entry per file that is being deleted. */
  let fileDeletions: { done: () => void; fail: (error: Error) => void }[];

  beforeEach(waitForAsync(() => {
    uiImage = jasmine.createSpyObj('UIImage', [
      'showOptionChooser',
      'choosePhoto',
      'takePhoto',
    ]);
    uiFileHelper = createMockUIFileHelper();
    fileDeletions = [];
    // On a device a file is deleted by the native side, which answers only
    // after the view has been updated.
    uiFileHelper.deleteInternalFile.and.callFake(
      () =>
        new Promise<void>((done, fail) => fileDeletions.push({ done, fail })),
    );
    uiAlert = createMockUIAlert();
    uiToast = jasmine.createSpyObj('UIToast', ['showInfoToast']);
    swiper = jasmine.createSpyObj('Swiper', ['update', 'slideTo']);

    TestBed.configureTestingModule({
      imports: [PhotoAddComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UIImage, useValue: uiImage },
        { provide: UIFileHelper, useValue: uiFileHelper },
        { provide: UIAlert, useValue: uiAlert },
        { provide: UIToast, useValue: uiToast },
      ],
    })
      // Showing a photo needs the file system and plays no part here.
      .overrideComponent(PhotoAddComponent, {
        remove: { imports: [AsyncImageComponent] },
      })
      .compileComponents();
  }));

  /** Shows the component for a bean with these photos, at the moment the form opens. */
  function open(attachments: string[]): void {
    const bean = new Bean();
    bean.attachments = attachments;
    fixture = TestBed.createComponent(PhotoAddComponent);
    component = fixture.componentInstance;
    component.data = bean;
    emitted = [];
    component.dataChange.subscribe((data) => emitted.push(data));
    render();
  }

  /** Updates the view; the slider only exists while there is a photo. */
  function render(): void {
    fixture.detectChanges();
    if (component.photoSlides) {
      component.photoSlides.nativeElement.swiper = swiper;
    }
  }

  /** Lets the refreshes pass that the opening of the form starts. */
  function settle(): void {
    tick(2 * SLIDER_REFRESH_DELAY);
    swiper.update.calls.reset();
  }

  /** The photo buttons as the user finds them: move left, move right, delete. */
  function slideButtons(index: number): HTMLIonButtonElement[] {
    const slide = fixture.nativeElement.querySelectorAll('swiper-slide')[index];
    return Array.from(slide.querySelectorAll('ion-button'));
  }

  /** Taps "delete" on a photo; the view is updated before the file is gone. */
  function tapDelete(index: number): void {
    slideButtons(index)[2].click();
    flushMicrotasks();
    render();
  }

  function fileDeleted(): void {
    fileDeletions.shift().done();
    flushMicrotasks();
    render();
  }

  function fileNotDeleted(): void {
    fileDeletions.shift().fail(new Error('no file'));
    flushMicrotasks();
    render();
  }

  function choose(option: string): void {
    uiImage.showOptionChooser.and.resolveTo(option);
    fixture.nativeElement.querySelector('ion-item').click();
    flushMicrotasks();
    render();
  }

  describe('opening', () => {
    it('refreshes the slider once the photos are shown', fakeAsync(() => {
      open(['a.jpg']);

      tick(2 * SLIDER_REFRESH_DELAY - 1);
      expect(swiper.update).not.toHaveBeenCalled();
      tick(1);
      expect(swiper.update).toHaveBeenCalledTimes(1);
    }));

    it('shows no slider without photos', fakeAsync(() => {
      open([]);

      tick(2 * SLIDER_REFRESH_DELAY);
      expect(component.photoSlides).toBeUndefined();
      expect(
        fixture.nativeElement.querySelector('swiper-container'),
      ).toBeNull();
    }));
  });

  describe('deleting a photo', () => {
    it('removes the photo and its file and tells the form', fakeAsync(() => {
      open(['a.jpg', 'b.jpg']);
      settle();

      tapDelete(0);
      fileDeleted();
      tick(SLIDER_REFRESH_DELAY);

      expect(component.data.attachments).toEqual(['b.jpg']);
      expect(uiFileHelper.deleteInternalFile).toHaveBeenCalledOnceWith('a.jpg');
      expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith('IMAGE_DELETED');
      expect(emitted).toEqual([component.data]);
      expect(swiper.update).toHaveBeenCalledTimes(1);
    }));

    it('removes the photo also when its file cannot be deleted', fakeAsync(() => {
      open(['a.jpg']);
      settle();

      tapDelete(0);
      fileNotDeleted();
      tick(SLIDER_REFRESH_DELAY);

      expect(component.data.attachments).toEqual([]);
      expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith(
        'IMAGE_NOT_DELETED',
      );
      expect(emitted).toEqual([]);
      expect(
        fixture.nativeElement.querySelector('swiper-container'),
      ).toBeNull();
    }));

    it('removes the last photo while the form still refreshes the slider after opening', fakeAsync(() => {
      open(['a.jpg']);
      tick(SLIDER_REFRESH_DELAY);

      tapDelete(0);
      fileDeleted();

      expect(() => tick(SLIDER_REFRESH_DELAY)).not.toThrow();
      expect(component.data.attachments).toEqual([]);
      expect(uiFileHelper.deleteInternalFile).toHaveBeenCalledOnceWith('a.jpg');
      expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith('IMAGE_DELETED');
      expect(emitted).toEqual([component.data]);
      expect(swiper.update).not.toHaveBeenCalled();
    }));

    it('removes the last photo long after opening', fakeAsync(() => {
      open(['a.jpg']);
      tick(60_000);
      swiper.update.calls.reset();

      tapDelete(0);
      fileDeleted();

      expect(() => tick(SLIDER_REFRESH_DELAY)).not.toThrow();
      expect(component.data.attachments).toEqual([]);
      expect(uiFileHelper.deleteInternalFile).toHaveBeenCalledOnceWith('a.jpg');
      expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith('IMAGE_DELETED');
      expect(emitted).toEqual([component.data]);
      expect(swiper.update).not.toHaveBeenCalled();
    }));

    it('removes all photos one right after the other', fakeAsync(() => {
      open(['a.jpg', 'b.jpg']);
      settle();

      tapDelete(0);
      fileDeleted();
      tapDelete(0);
      fileDeleted();

      expect(() => tick(SLIDER_REFRESH_DELAY)).not.toThrow();
      expect(component.data.attachments).toEqual([]);
      expect(uiFileHelper.deleteInternalFile.calls.allArgs()).toEqual([
        ['a.jpg'],
        ['b.jpg'],
      ]);
      expect(emitted.length).toBe(2);
    }));

    it('removes the last photo right after a photo was moved', fakeAsync(() => {
      open(['a.jpg', 'b.jpg']);
      settle();

      slideButtons(0)[1].click();
      render();
      tapDelete(0);
      fileDeleted();
      tapDelete(0);

      expect(() => tick(SLIDER_REFRESH_DELAY)).not.toThrow();
      expect(component.data.attachments).toEqual([]);
    }));
  });

  describe('changing the order', () => {
    it('moves a photo to the right and follows it', fakeAsync(() => {
      open(['a.jpg', 'b.jpg', 'c.jpg']);
      settle();

      slideButtons(0)[1].click();
      render();
      tick(SLIDER_REFRESH_DELAY);

      expect(component.data.attachments).toEqual(['b.jpg', 'a.jpg', 'c.jpg']);
      expect(swiper.slideTo).toHaveBeenCalledOnceWith(1, 200, false);
      expect(swiper.update).toHaveBeenCalledTimes(1);
      expect(emitted).toEqual([component.data]);
    }));

    it('moves a photo to the left and follows it', fakeAsync(() => {
      open(['a.jpg', 'b.jpg', 'c.jpg']);
      settle();

      slideButtons(2)[0].click();
      render();
      tick(SLIDER_REFRESH_DELAY);

      expect(component.data.attachments).toEqual(['a.jpg', 'c.jpg', 'b.jpg']);
      expect(swiper.slideTo).toHaveBeenCalledOnceWith(1, 200, false);
      expect(emitted).toEqual([component.data]);
    }));

    it('offers no move beyond the first and the last photo', fakeAsync(() => {
      open(['a.jpg', 'b.jpg']);
      settle();

      const disabled = [0, 1].map((index) =>
        slideButtons(index).map((button) => button.disabled),
      );
      expect(disabled).toEqual([
        [true, false, false],
        [false, true, false],
      ]);
    }));
  });

  describe('adding a photo', () => {
    it('adds the photo taken with the camera', fakeAsync(() => {
      uiImage.takePhoto.and.resolveTo('taken.jpg');
      open(['a.jpg']);
      settle();

      choose('TAKE');
      tick(SLIDER_REFRESH_DELAY);

      expect(component.data.attachments).toEqual(['a.jpg', 'taken.jpg']);
      expect(emitted).toEqual([component.data]);
      expect(swiper.update).toHaveBeenCalledTimes(1);
    }));

    it('shows the first photo of a bean that had none', fakeAsync(() => {
      uiImage.takePhoto.and.resolveTo('taken.jpg');
      open([]);
      settle();

      choose('TAKE');
      tick(SLIDER_REFRESH_DELAY);

      expect(component.data.attachments).toEqual(['taken.jpg']);
      expect(emitted).toEqual([component.data]);
      expect(
        fixture.nativeElement.querySelectorAll('swiper-slide').length,
      ).toBe(1);
    }));

    it('tells when the camera fails', fakeAsync(() => {
      uiImage.takePhoto.and.rejectWith(new Error('User denied access'));
      open([]);
      settle();

      choose('TAKE');

      expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
        'Error: User denied access',
        'ERROR_OCCURED',
      );
      expect(component.data.attachments).toEqual([]);
      expect(emitted).toEqual([]);
    }));

    it('adds all photos chosen from the library', fakeAsync(() => {
      uiImage.choosePhoto.and.resolveTo(['one.jpg', 'two.jpg']);
      open(['a.jpg']);
      settle();

      choose('CHOOSE');
      tick(SLIDER_REFRESH_DELAY);

      expect(component.data.attachments).toEqual([
        'a.jpg',
        'one.jpg',
        'two.jpg',
      ]);
      expect(emitted).toEqual([component.data]);
    }));

    it('changes nothing when no photo is chosen from the library', fakeAsync(() => {
      uiImage.choosePhoto.and.resolveTo([]);
      open(['a.jpg']);
      settle();

      choose('CHOOSE');
      tick(SLIDER_REFRESH_DELAY);

      expect(component.data.attachments).toEqual(['a.jpg']);
      expect(emitted).toEqual([]);
    }));

    it('tells when the library fails', fakeAsync(() => {
      uiImage.choosePhoto.and.rejectWith({ message: 'cancelled' });
      open([]);
      settle();

      choose('CHOOSE');

      expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
        '{"message":"cancelled"}',
        'ERROR_OCCURED',
      );
      expect(emitted).toEqual([]);
    }));

    it('reads the clipboard when the user chooses it', fakeAsync(() => {
      open([]);
      settle();
      const readClipboard = spyOn(component, 'addBase64ImageFromClipboard');

      choose('CLIPBOARD');

      expect(readClipboard).toHaveBeenCalledTimes(1);
      expect(uiImage.takePhoto).not.toHaveBeenCalled();
      expect(uiImage.choosePhoto).not.toHaveBeenCalled();
    }));
  });

  // The clipboard plugin runs its browser implementation here, which reads
  // `navigator.clipboard`.
  describe('adding the image of the clipboard', () => {
    function clipboardHolds(text: string): void {
      spyOn(navigator.clipboard, 'read').and.rejectWith(new Error('no item'));
      spyOn(navigator.clipboard, 'readText').and.resolveTo(text);
    }

    it('stores a PNG image as a photo', async () => {
      const image = 'data:image/png;base64,AAAA';
      clipboardHolds(image);
      uiFileHelper.generateInternalPath.and.resolveTo('photo-1.png');
      uiFileHelper.writeInternalFileFromBase64.and.resolveTo({
        path: 'stored/photo-1.png',
      });
      open([]);

      await component.addBase64ImageFromClipboard();

      expect(uiFileHelper.generateInternalPath).toHaveBeenCalledOnceWith(
        'photo',
        '.png',
      );
      expect(uiFileHelper.writeInternalFileFromBase64).toHaveBeenCalledOnceWith(
        image,
        'photo-1.png',
      );
      expect(component.data.attachments).toEqual(['stored/photo-1.png']);
      // The form is not told about a photo from the clipboard.
      expect(emitted).toEqual([]);
    });

    it('stores any other image as a JPEG photo', async () => {
      clipboardHolds('data:image/jpeg;base64,AAAA');
      uiFileHelper.generateInternalPath.and.resolveTo('photo-1.jpg');
      uiFileHelper.writeInternalFileFromBase64.and.resolveTo({
        path: 'stored/photo-1.jpg',
      });
      open(['a.jpg']);

      await component.addBase64ImageFromClipboard();

      expect(uiFileHelper.generateInternalPath).toHaveBeenCalledOnceWith(
        'photo',
        '.jpg',
      );
      expect(component.data.attachments).toEqual([
        'a.jpg',
        'stored/photo-1.jpg',
      ]);
    });

    it('tells when the clipboard holds no image', async () => {
      clipboardHolds('some text');
      open([]);

      await component.addBase64ImageFromClipboard();

      expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
        'NO_IMAGE_IN_CLIPBOARD',
      );
      expect(uiFileHelper.writeInternalFileFromBase64).not.toHaveBeenCalled();
      expect(component.data.attachments).toEqual([]);
    });
  });
});

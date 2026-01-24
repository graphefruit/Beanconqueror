# Accessibility Implementation Plan for AI Import Photo Gallery

## Overview

This plan addresses accessibility issues in the `ai-import-photo-gallery` component (`src/components/ai-import-photo-gallery/`), including missing ARIA labels, keyboard navigation support, and focus management.

## Current State Analysis

### Existing Accessibility Patterns in Beanconqueror

Based on analysis of the codebase, the following accessibility patterns are already in use:

1. **`aria-labelledby` Pattern** (21+ components)
   - Labels use `id` attribute, inputs reference via `aria-labelledby`
   - Example from `brew-brewing.component.html`:
     ```html
     <ion-label id='brew_quantity' position="stacked">
       <h2>{{"BREW_DATA_BREW_QUANTITY" | translate}}</h2>
     </ion-label>
     <ion-input aria-labelledby='brew_quantity' [(ngModel)]="data.brew_quantity"></ion-input>
     ```

2. **`tabIndex` Management** (40+ components)
   - Primary inputs: `tabIndex="1"`
   - Secondary actions: `tabIndex="2"`, `tabIndex="3"`
   - Used extensively in brew-brewing and bean-general-information components

3. **Keyboard Events** (3 components)
   - `(keyup.enter)` for form submission in cupping-flavors and preparation components

4. **Focus/Blur Handling**
   - Used in bean-general-information for search autocomplete
   - Timer component uses `blur()` for iOS 16 compatibility

### Gaps Identified in Current Codebase

- No `aria-label` attributes for icon-only buttons
- No `aria-live` regions for dynamic content updates
- No `role` attributes beyond standard Ionic defaults
- No comprehensive keyboard navigation for galleries/carousels
- `async-image` component explicitly disables alt-text (has lint suppression comment)

---

## Interactive Elements Requiring ARIA Labels

### 1. Close/Cancel Button (Header)
```html
<!-- Current -->
<ion-button (click)="cancel()">
  <ion-icon name="close" slot="icon-only"></ion-icon>
</ion-button>

<!-- Accessible -->
<ion-button (click)="cancel()"
            aria-label="{{ 'CANCEL' | translate }}">
  <ion-icon name="close" slot="icon-only"></ion-icon>
</ion-button>
```

### 2. Remove Photo Button (Per Slide)
```html
<!-- Current -->
<ion-button (click)="removePhoto(i)" class="position-absolute-button" color="danger" fill="clear">
  <ion-icon slot="icon-only" name="trash"></ion-icon>
</ion-button>

<!-- Accessible -->
<ion-button (click)="removePhoto(i)"
            class="position-absolute-button"
            color="danger"
            fill="clear"
            [attr.aria-label]="('AI_IMPORT_REMOVE_PHOTO' | translate) + ' ' + (i + 1)">
  <ion-icon slot="icon-only" name="trash"></ion-icon>
</ion-button>
```

### 3. Add Photo Button
```html
<!-- Current - Already has text, but could benefit from enhanced description -->
<ion-button expand="block" fill="outline" (click)="addPhoto()" [disabled]="photoPaths.length >= maxPhotos">
  <ion-icon name="add" slot="start"></ion-icon>
  {{ 'AI_IMPORT_MULTI_ADD_PHOTO' | translate }} ({{ photoPaths.length }}/{{ maxPhotos }})
</ion-button>

<!-- Accessible (add aria-describedby for disabled state) -->
<ion-button expand="block"
            fill="outline"
            (click)="addPhoto()"
            [disabled]="photoPaths.length >= maxPhotos"
            [attr.aria-describedby]="photoPaths.length >= maxPhotos ? 'max-photos-hint' : null">
  <ion-icon name="add" slot="start"></ion-icon>
  {{ 'AI_IMPORT_MULTI_ADD_PHOTO' | translate }} ({{ photoPaths.length }}/{{ maxPhotos }})
</ion-button>
<span id="max-photos-hint" class="visually-hidden" *ngIf="photoPaths.length >= maxPhotos">
  {{ 'AI_IMPORT_MAX_PHOTOS_REACHED' | translate }}
</span>
```

### 4. Attach Photos Toggle
```html
<!-- Current -->
<ion-item lines="none" class="attach-toggle">
  <ion-label>{{ 'AI_IMPORT_MULTI_ATTACH_PHOTOS' | translate }}</ion-label>
  <ion-toggle [(ngModel)]="attachPhotos"></ion-toggle>
</ion-item>

<!-- Accessible (use aria-labelledby pattern from codebase) -->
<ion-item lines="none" class="attach-toggle">
  <ion-label id="attach-photos-label">{{ 'AI_IMPORT_MULTI_ATTACH_PHOTOS' | translate }}</ion-label>
  <ion-toggle [(ngModel)]="attachPhotos" aria-labelledby="attach-photos-label"></ion-toggle>
</ion-item>
```

### 5. Start Analysis Button
```html
<!-- Current -->
<ion-button expand="block" (click)="startAnalysis()" [disabled]="photoPaths.length === 0" color="primary">
  {{ 'AI_IMPORT_MULTI_START_ANALYSIS' | translate }}
</ion-button>

<!-- Accessible -->
<ion-button expand="block"
            (click)="startAnalysis()"
            [disabled]="photoPaths.length === 0"
            color="primary"
            [attr.aria-describedby]="photoPaths.length === 0 ? 'no-photos-hint' : null">
  {{ 'AI_IMPORT_MULTI_START_ANALYSIS' | translate }}
</ion-button>
<span id="no-photos-hint" class="visually-hidden" *ngIf="photoPaths.length === 0">
  {{ 'AI_IMPORT_ADD_PHOTOS_FIRST' | translate }}
</span>
```

### 6. Swiper Container (Gallery)
```html
<!-- Current -->
<swiper-container class="swiper" [pagination]="{ clickable: true, draggable: true }" #photoSlides pager="true">

<!-- Accessible -->
<swiper-container class="swiper"
                  [pagination]="{ clickable: true, draggable: true }"
                  #photoSlides
                  pager="true"
                  role="region"
                  aria-label="{{ 'AI_IMPORT_PHOTO_GALLERY' | translate }}"
                  aria-roledescription="carousel">
```

### 7. Async Image (Photo Display)
```html
<!-- Current -->
<async-image class="gallery-image" filePath="{{ path }}"></async-image>

<!-- Accessible - requires modification to async-image component or wrapper -->
<figure class="gallery-image-container" role="group" [attr.aria-label]="('AI_IMPORT_PHOTO' | translate) + ' ' + (i + 1)">
  <async-image class="gallery-image" filePath="{{ path }}"></async-image>
</figure>
```

---

## Keyboard Navigation Implementation

### Proposed Tab Order

Following the existing codebase pattern using `tabIndex`:

| Element | tabIndex | Description |
|---------|----------|-------------|
| Close button | 1 | Header action |
| Swiper gallery | 2 | Photo carousel (when photos exist) |
| Remove photo button | 3 | Per-slide action |
| Add photo button | 4 | Primary action |
| Attach toggle | 5 | Option toggle |
| Start analysis button | 6 | Submit action |

### Keyboard Shortcuts

Following existing patterns and ARIA carousel best practices:

| Key | Action | Context |
|-----|--------|---------|
| `Tab` | Move to next focusable element | All |
| `Shift+Tab` | Move to previous focusable element | All |
| `Enter` | Activate button/toggle | Focused element |
| `Space` | Activate button/toggle | Focused element |
| `ArrowLeft` | Previous photo | Gallery focused |
| `ArrowRight` | Next photo | Gallery focused |
| `Delete` | Remove current photo | Photo slide focused |
| `Escape` | Close modal | Modal |

### Implementation in TypeScript

```typescript
// Add to component class
import { HostListener } from '@angular/core';

@HostListener('document:keydown', ['$event'])
public handleKeyboardNavigation(event: KeyboardEvent): void {
  // Gallery navigation when gallery is focused
  if (this.isGalleryFocused()) {
    switch (event.key) {
      case 'ArrowLeft':
        this.navigateToPreviousSlide();
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.navigateToNextSlide();
        event.preventDefault();
        break;
      case 'Delete':
        this.removeCurrentPhoto();
        event.preventDefault();
        break;
    }
  }

  // Escape to close modal
  if (event.key === 'Escape') {
    this.cancel();
    event.preventDefault();
  }
}

private isGalleryFocused(): boolean {
  const activeElement = document.activeElement;
  return this.photoSlides?.nativeElement?.contains(activeElement) ?? false;
}

private navigateToPreviousSlide(): void {
  if (this.photoSlides?.nativeElement?.swiper) {
    this.photoSlides.nativeElement.swiper.slidePrev();
  }
}

private navigateToNextSlide(): void {
  if (this.photoSlides?.nativeElement?.swiper) {
    this.photoSlides.nativeElement.swiper.slideNext();
  }
}

private removeCurrentPhoto(): void {
  if (this.photoSlides?.nativeElement?.swiper) {
    const activeIndex = this.photoSlides.nativeElement.swiper.activeIndex;
    this.removePhoto(activeIndex);
  }
}
```

---

## Focus Management Implementation

### After Adding a Photo

When a photo is successfully added, focus should move to the newly added slide for screen reader announcement.

```typescript
public async addPhoto(): Promise<void> {
  // ... existing code to add photo ...

  if (fileUri.path && this.photoPaths.length < this.maxPhotos) {
    this.photoPaths.push(fileUri.path);
    this.updateSlider();

    // Focus management: move to new slide
    this.focusOnNewPhoto();

    // Announce to screen readers
    this.announcePhotoAdded();
  }
}

private focusOnNewPhoto(): void {
  setTimeout(() => {
    if (this.photoSlides?.nativeElement?.swiper) {
      // Navigate to the last slide (newly added)
      const lastIndex = this.photoPaths.length - 1;
      this.photoSlides.nativeElement.swiper.slideTo(lastIndex);

      // Focus the gallery container
      this.photoSlides.nativeElement.focus();
    }
  }, 300); // Allow swiper update to complete
}
```

### After Removing a Photo

When a photo is removed, focus should move intelligently based on remaining photos.

```typescript
public async removePhoto(index: number): Promise<void> {
  const path = this.photoPaths[index];
  const wasLastPhoto = this.photoPaths.length === 1;
  const wasAtEnd = index === this.photoPaths.length - 1;

  try {
    await this.uiFileHelper.deleteInternalFile(path);
  } catch (e) {
    // File may not exist, continue anyway
  }

  this.photoPaths.splice(index, 1);
  this.updateSlider();

  // Focus management after removal
  this.manageFocusAfterRemoval(wasLastPhoto, wasAtEnd, index);

  // Announce to screen readers
  this.announcePhotoRemoved();
}

private manageFocusAfterRemoval(wasLastPhoto: boolean, wasAtEnd: boolean, removedIndex: number): void {
  setTimeout(() => {
    if (wasLastPhoto) {
      // No photos left - focus on add button
      this.focusAddButton();
    } else if (this.photoSlides?.nativeElement?.swiper) {
      // Photos remain - focus on appropriate slide
      const newIndex = wasAtEnd ? removedIndex - 1 : removedIndex;
      const targetIndex = Math.max(0, Math.min(newIndex, this.photoPaths.length - 1));
      this.photoSlides.nativeElement.swiper.slideTo(targetIndex);
      this.photoSlides.nativeElement.focus();
    }
  }, 300);
}

@ViewChild('addPhotoButton', { static: false })
private addPhotoButton: ElementRef | undefined;

private focusAddButton(): void {
  setTimeout(() => {
    if (this.addPhotoButton?.nativeElement) {
      this.addPhotoButton.nativeElement.focus();
    }
  }, 100);
}
```

### Live Region for Announcements

Add an ARIA live region for dynamic announcements:

```html
<!-- Add to template -->
<div aria-live="polite" aria-atomic="true" class="visually-hidden" #liveRegion>
  {{ screenReaderAnnouncement }}
</div>
```

```typescript
// Add to component
public screenReaderAnnouncement: string = '';

private announcePhotoAdded(): void {
  this.screenReaderAnnouncement = this.translate.instant('AI_IMPORT_PHOTO_ADDED', {
    current: this.photoPaths.length,
    max: this.maxPhotos
  });
  // Clear after announcement
  setTimeout(() => this.screenReaderAnnouncement = '', 1000);
}

private announcePhotoRemoved(): void {
  if (this.photoPaths.length === 0) {
    this.screenReaderAnnouncement = this.translate.instant('AI_IMPORT_ALL_PHOTOS_REMOVED');
  } else {
    this.screenReaderAnnouncement = this.translate.instant('AI_IMPORT_PHOTO_REMOVED', {
      remaining: this.photoPaths.length
    });
  }
  setTimeout(() => this.screenReaderAnnouncement = '', 1000);
}
```

---

## Required Translation Keys

Add to `src/assets/i18n/en.json` and `src/assets/i18n/de.json`:

```json
{
  "AI_IMPORT_REMOVE_PHOTO": "Remove photo",
  "AI_IMPORT_PHOTO_GALLERY": "Photo gallery",
  "AI_IMPORT_PHOTO": "Photo",
  "AI_IMPORT_MAX_PHOTOS_REACHED": "Maximum number of photos reached",
  "AI_IMPORT_ADD_PHOTOS_FIRST": "Add at least one photo to start analysis",
  "AI_IMPORT_PHOTO_ADDED": "Photo added. {{current}} of {{max}} photos.",
  "AI_IMPORT_PHOTO_REMOVED": "Photo removed. {{remaining}} photos remaining.",
  "AI_IMPORT_ALL_PHOTOS_REMOVED": "All photos removed. Gallery is empty."
}
```

---

## CSS for Visually Hidden Elements

Add to `ai-import-photo-gallery.component.scss`:

```scss
// Screen reader only - visually hidden but accessible
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Implementation Checklist

### Phase 1: ARIA Labels (Minimal Changes)
- [ ] Add `aria-label` to close button
- [ ] Add `aria-label` to remove photo buttons (with photo number)
- [ ] Add `aria-labelledby` to attach photos toggle
- [ ] Add `role="region"` and `aria-label` to swiper container
- [ ] Add required translation keys

### Phase 2: Focus Management
- [ ] Implement `focusOnNewPhoto()` after adding photo
- [ ] Implement `manageFocusAfterRemoval()` after removing photo
- [ ] Add `#addPhotoButton` ViewChild reference
- [ ] Add `tabindex="0"` to swiper-container for keyboard focus

### Phase 3: Keyboard Navigation
- [ ] Add `@HostListener` for keyboard events
- [ ] Implement arrow key navigation for gallery
- [ ] Implement Delete key to remove current photo
- [ ] Implement Escape key to close modal

### Phase 4: Live Announcements
- [ ] Add ARIA live region to template
- [ ] Implement `announcePhotoAdded()` method
- [ ] Implement `announcePhotoRemoved()` method
- [ ] Add visually-hidden CSS class

### Phase 5: Testing
- [ ] Test with VoiceOver (iOS/macOS)
- [ ] Test with TalkBack (Android)
- [ ] Test keyboard-only navigation
- [ ] Verify focus order is logical
- [ ] Verify all interactive elements are announced correctly

---

## Complete Updated Template

```html
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="start">
      <ion-button (click)="cancel()"
                  aria-label="{{ 'CANCEL' | translate }}"
                  tabindex="1">
        <ion-icon name="close" slot="icon-only"></ion-icon>
      </ion-button>
    </ion-buttons>
    <ion-title>{{ 'AI_BEAN_IMPORT_MULTI' | translate }}</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content class="ion-padding">
  <!-- ARIA live region for announcements -->
  <div aria-live="polite" aria-atomic="true" class="visually-hidden">
    {{ screenReaderAnnouncement }}
  </div>

  <!-- Empty state -->
  @if (photoPaths.length === 0) {
    <div class="empty-state" role="status">
      <ion-icon name="images-outline" class="empty-icon" aria-hidden="true"></ion-icon>
      <p class="empty-text">{{ 'AI_IMPORT_MULTI_NO_PHOTOS_YET' | translate }}</p>
    </div>
  }

  <!-- Photo gallery -->
  @if (photoPaths.length > 0) {
    <div class="photo-gallery">
      <swiper-container
        class="swiper"
        [pagination]="{ clickable: true, draggable: true }"
        #photoSlides
        pager="true"
        role="region"
        aria-label="{{ 'AI_IMPORT_PHOTO_GALLERY' | translate }}"
        aria-roledescription="carousel"
        tabindex="2">
        @for (path of photoPaths; track path; let i = $index) {
          <swiper-slide role="group" [attr.aria-label]="('AI_IMPORT_PHOTO' | translate) + ' ' + (i + 1)">
            <ion-button
              (click)="removePhoto(i)"
              class="position-absolute-button"
              color="danger"
              fill="clear"
              [attr.aria-label]="('AI_IMPORT_REMOVE_PHOTO' | translate) + ' ' + (i + 1)"
              tabindex="3">
              <ion-icon slot="icon-only" name="trash" aria-hidden="true"></ion-icon>
            </ion-button>
            <async-image class="gallery-image" filePath="{{ path }}"></async-image>
          </swiper-slide>
        }
      </swiper-container>
    </div>
  }

  <!-- Add photo button -->
  <ion-button
    expand="block"
    fill="outline"
    (click)="addPhoto()"
    [disabled]="photoPaths.length >= maxPhotos"
    class="add-photo-button"
    #addPhotoButton
    tabindex="4">
    <ion-icon name="add" slot="start" aria-hidden="true"></ion-icon>
    {{ 'AI_IMPORT_MULTI_ADD_PHOTO' | translate }} ({{ photoPaths.length }}/{{ maxPhotos }})
  </ion-button>

  <!-- Attach toggle -->
  <ion-item lines="none" class="attach-toggle">
    <ion-label id="attach-photos-label">{{ 'AI_IMPORT_MULTI_ATTACH_PHOTOS' | translate }}</ion-label>
    <ion-toggle [(ngModel)]="attachPhotos"
                aria-labelledby="attach-photos-label"
                tabindex="5"></ion-toggle>
  </ion-item>
</ion-content>

<ion-footer>
  <ion-toolbar>
    <ion-button
      expand="block"
      (click)="startAnalysis()"
      [disabled]="photoPaths.length === 0"
      color="primary"
      tabindex="6">
      {{ 'AI_IMPORT_MULTI_START_ANALYSIS' | translate }}
    </ion-button>
  </ion-toolbar>
</ion-footer>
```

---

## Notes on Async-Image Component

The `async-image` component currently has alt-text disabled via ESLint suppression:
```html
<!-- eslint-disable-next-line @angular-eslint/template/alt-text -->
<img [src]="img | async"/>
```

A future improvement could add an `@Input() alt: string` property to the component and pass appropriate alt text from parent components. This is out of scope for the current plan but noted for future accessibility work.

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Carousel Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
- [Ionic Accessibility Documentation](https://ionicframework.com/docs/accessibility)
- Existing Beanconqueror patterns in `brew-brewing.component.html`, `bean-general-information.component.html`

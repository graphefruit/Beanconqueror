import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import en from '../../../assets/i18n/en.json';
import { DataCorruptionFoundComponent } from '../data-corruption-found.component';

describe('DataCorruptionFoundComponent', () => {
  it('says where the current data is saved before the backup is restored', () => {
    TestBed.configureTestingModule({
      imports: [DataCorruptionFoundComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', ['dismiss']),
        },
        {
          provide: Platform,
          useValue: {
            backButton: {
              subscribeWithPriority: () => ({ unsubscribe: () => undefined }),
            },
          },
        },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      PRE_IMPORT_BACKUP_HINT: en.PRE_IMPORT_BACKUP_HINT,
    });
    translate.use('en');

    const fixture = TestBed.createComponent(DataCorruptionFoundComponent);
    fixture.componentInstance.actualUIStorageDataObj = {
      BEANS: 1,
      BREWS: 2,
      PREPARATION: 1,
      MILL: 1,
    };
    fixture.componentInstance.backupDataObj = {
      BEANS: [{}],
      BREWS: [{}, {}, {}, {}, {}],
      PREPARATION: [{}],
      MILL: [{}],
    };
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain(en.PRE_IMPORT_BACKUP_HINT);
  });
});

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxStarsModule } from 'ngx-stars';

import { StarsNameDirective } from '../stars-name.directive';

@Component({
  imports: [NgxStarsModule, StarsNameDirective],
  template: `
    <ngx-stars
      class="rating"
      [initialStars]="rating()"
      [maxStars]="5"
      [readonly]="true"
    />
    <ngx-stars
      class="roast"
      [starsName]="'Röstgrad'"
      [initialStars]="2"
      [readonly]="true"
    />
  `,
})
class HostComponent {
  public readonly rating = signal(3.5);
}

describe('StarsNameDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    });
    translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      BREW_DATA_RATING: 'Bewertung',
      A11Y: { STARS: '{{name}}: {{rating}} von {{max}} Sternen' },
    });
    translate.setTranslation('en', {
      BREW_DATA_RATING: 'Rating',
      A11Y: { STARS: '{{name}}: {{rating}} of {{max}} stars' },
    });
    translate.use('de');
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function nameOf(stars: string): string | null {
    return (fixture.nativeElement as HTMLElement)
      .querySelector(`.${stars} [role="img"]`)
      .getAttribute('aria-label');
  }

  it('names the stars in the app language with the number in its format', () => {
    expect(nameOf('rating')).toBe('Bewertung: 3,5 von 5 Sternen');
  });

  it('names stars that show something else than the rating after it', () => {
    expect(nameOf('roast')).toBe('Röstgrad: 2 von 5 Sternen');
  });

  it('follows a change of the language', () => {
    translate.use('en');
    fixture.detectChanges();

    expect(nameOf('rating')).toBe('Rating: 3.5 of 5 stars');
  });
});

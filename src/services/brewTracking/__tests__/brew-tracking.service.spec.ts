import { TestBed } from '@angular/core/testing';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { Water } from '../../../classes/water/water';
import { ServerCommunicationService } from '../../serverCommunication/server-communication.service';
import { UIHelper } from '../../uiHelper';
import { BrewTrackingService } from '../brew-tracking.service';

describe('BrewTrackingService', () => {
  let service: BrewTrackingService;
  let trackBrew: jasmine.Spy;
  let bean: Bean;

  beforeEach(() => {
    trackBrew = jasmine.createSpy('trackBrew').and.resolveTo(undefined);
    TestBed.configureTestingModule({
      providers: [
        BrewTrackingService,
        { provide: ServerCommunicationService, useValue: { trackBrew } },
        {
          provide: UIHelper,
          useValue: { cloneData: (_value: Brew) => _value },
        },
      ],
    });
    service = TestBed.inject(BrewTrackingService);

    bean = new Bean();
    bean.name = 'Scanned';
    spyOn(Brew.prototype, 'getBean').and.callFake(() => bean);
    spyOn(Brew.prototype, 'getPreparation').and.returnValue(new Preparation());
    spyOn(Brew.prototype, 'getMill').and.returnValue(new Mill());
    spyOn(Brew.prototype, 'getWater').and.returnValue(new Water());
  });

  it('sends the brew of a scanned bean without its personal data', () => {
    bean.qr_code = 'abc';
    const brew = new Brew();
    brew.coordinates.latitude = 1;

    service.trackBrew(brew);

    expect(trackBrew).toHaveBeenCalledTimes(1);
    const sent = trackBrew.calls.mostRecent().args[0];
    expect(sent.qr_code).toBe('abc');
    expect(sent.bean).toBe('Scanned');
    expect(brew.coordinates).toBeUndefined();
    expect(brew.attachments).toBeUndefined();
  });

  for (const qrCode of ['', null, undefined]) {
    it(`sends nothing for a bean that was not scanned (qr_code ${JSON.stringify(qrCode)})`, () => {
      bean.qr_code = qrCode;

      service.trackBrew(new Brew());

      expect(trackBrew).not.toHaveBeenCalled();
    });
  }

  it('sends nothing and does not throw when the bean of the brew is gone', () => {
    bean = undefined;

    expect(() => service.trackBrew(new Brew())).not.toThrow();
    expect(trackBrew).not.toHaveBeenCalled();
  });
});

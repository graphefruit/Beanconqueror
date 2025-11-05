import { Injectable } from '@angular/core';
import { RoastingProfile } from '../../classes/roasting-profile/roasting-profile';

@Injectable({
  providedIn: 'root',
})
export class RoastingParserService {
  constructor() {}

  public parseKaffelogic(data: string): RoastingProfile {
    const profile = new RoastingProfile();
    const lines = data.split('\n');
    let dataStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('time')) {
        dataStartIndex = i + 1;
        break;
      }
    }

    for (let i = dataStartIndex; i < lines.length; i++) {
      const columns = lines[i].trim().split(/\s+/);
      if (columns.length >= 2) {
        profile.time.push(parseFloat(columns[0]));
        profile.temperature.push(parseFloat(columns[1]));
        profile.power.push(parseFloat(columns[8]));
        profile.fan.push(parseFloat(columns[13]));
      }
    }
    return profile;
  }
}

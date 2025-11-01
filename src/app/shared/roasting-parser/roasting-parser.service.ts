import { Injectable } from '@angular/core';
import { RoastData, RoastMetadata, TimePoint } from './roasting-data.model';

@Injectable({
  providedIn: 'root',
})
export class RoastingParserService {
  constructor() {}

  parseKaffelogic(logContent: string): RoastData {
    const lines = logContent.split('\n');
    const metadata = {} as RoastMetadata;
    const timeSeries: TimePoint[] = [];
    let isTimeSeries = false;

    for (const line of lines) {
      if (line.startsWith('time')) {
        isTimeSeries = true;
        continue;
      }

      if (isTimeSeries) {
        const values = line.trim().split(/\s+/);
        if (values.length >= 14) {
          const timePoint: TimePoint = {
            time: parseFloat(values[0]),
            spot_temp: parseFloat(values[1]),
            temp: parseFloat(values[2]),
            mean_temp: parseFloat(values[3]),
            profile: parseFloat(values[4]),
            profile_ROR: parseFloat(values[5]),
            actual_ROR: parseFloat(values[6]),
            desired_ROR: parseFloat(values[7]),
            power_kW: parseFloat(values[8]),
            volts: parseFloat(values[9]),
            Kp: parseFloat(values[10]),
            Ki: parseFloat(values[11]),
            Kd: parseFloat(values[12]),
            actual_fan_RPM: parseFloat(values[13]),
          };
          timeSeries.push(timePoint);
        }
      } else {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim() as keyof RoastMetadata;
          const value = parts.slice(1).join(':').trim();
          (metadata as any)[key] = this.parseValue(value);
        }
      }
    }

    return { metadata, timeSeries };
  }

  private parseValue(value: string): any {
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    return value;
  }
}

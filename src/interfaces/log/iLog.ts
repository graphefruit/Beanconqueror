import { LOGS_ENUM } from '../../enums/logs/logs';

export interface ILogInterface {
  key: LOGS_ENUM;
  value: string;
  timestamp: string;
}

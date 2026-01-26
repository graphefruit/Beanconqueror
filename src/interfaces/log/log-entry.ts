import { LogLevel } from '../../enums/logs/log-level';

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  params: unknown[];
}

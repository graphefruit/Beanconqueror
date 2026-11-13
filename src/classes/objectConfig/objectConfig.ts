import { IConfig } from '../../interfaces/objectConfig/iObjectConfig';

export class Config implements IConfig {
  public uuid: string;
  public unix_timestamp: number;
  // Change info is intentionally not initialized: a missing value means it
  // has not been filled in yet. The storage sets it when writing.
  public created_at?: number;
  public updated_at?: number;
  public rev?: number;
  public updated_by?: string;

  constructor() {
    this.uuid = '';
    this.unix_timestamp = 0;
  }
}

export interface IGaggimateParams {
  chosenProfileId: string;
  chosenProfileName: string;
  shotId: number;
  shotTimestamp: number;
  latestShotsToImport: number;
  confirmDuplicateImport: boolean;
  confirmBeanAdd: boolean;
  autoSetBloomTime: boolean;
  shotIdTimeout: number;
  shotWatchdogTimeout: number;
  useTargetTemperature: boolean;
  writeBackNotes: boolean;
}

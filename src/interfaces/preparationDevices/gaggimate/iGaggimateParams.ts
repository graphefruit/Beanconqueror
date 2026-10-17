export interface IGaggimateParams {
  chosenProfileId: string;
  chosenProfileName: string;
  shotId: number;
  shotTimestamp: number;
  latestShotsToImport: number;
  confirmDuplicateImport: boolean;
  confirmBeanAdd: boolean;
  useTargetTemperature: boolean;
  writeBackNotes: boolean;
}

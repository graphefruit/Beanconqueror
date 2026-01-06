export interface IGraphColorSetting {
  active: {
    light: string;
    dark: string;
  };
  reference: {
    light: string;
    dark: string;
  };
}

export interface IGraphColors {
  weight: IGraphColorSetting;
  weightSecond: IGraphColorSetting;
  flowPerSecond: IGraphColorSetting;
  realtimeFlow: IGraphColorSetting;
  realtimeFlowSecond: IGraphColorSetting;
  pressure: IGraphColorSetting;
  temperature: IGraphColorSetting;
}

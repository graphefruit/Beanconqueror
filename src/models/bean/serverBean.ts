
export class ServerBean
{
  public name: string;
  public roastingDate: string;
  public note: string;
  public roastRange: number;
  public aromatics: string;
  public weight: number;
  public cost: number;
  public cuppingPoints: number;
  public decaffeinated: boolean;
  public url: string;
  public eanArticleNumber: string;
  public beanInformation: Array<
      {
        country: string,
        region: string,
        farm: string,
        farmer: string,
        elevation: string,
        harvestTime: string,
        variety: string,
        processing: string,
        certification: string,
        percentage: number
      }
    >;
    public roastingType: number;
    public beanMix: number;
    public beanNote: {
        roasterDescription: string,
        brewAdvices: string,
        attachments: Array<string>
      };
    public attachments: Array<{
      name: string,
      extension: string,
      path: string,
    }>;
    public qrCodeId: string;

    public error: {
      message: string,
      errorCode: string,
      messageDetail: string,
      statusCode: number
    };

}

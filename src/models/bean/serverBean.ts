import {IAttachment} from '../../interfaces/server/iAttachment';

export class ServerBean
{
  public name: string;
  public roast: number;
  public roast_custom: string;
  public roaster: string;
  public roastingDate: string;
  public note: string;
  public roast_range: number;
  public aromatics: string;
  public weight: number;
  public cost: number;
  public cupping_points: number;
  public decaffeinated: boolean;
  public url: string;
  public ean_article_number: string;
  public bean_information: Array<
      {
        country: string,
        region: string,
        farm: string,
        farmer: string,
        elevation: string,
        harvest_time: string,
        variety: string,
        processing: string,
        certification: string,
        percentage: number
      }
    >;
    public bean_roasting_type: number;
    public beanMix: number;
    public beanNote: {
        roasterDescription: string,
        brewAdvices: string,
        attachments: Array<string>
      };
    public attachment: Array<IAttachment>;
    public qr_code: string;

    public error: {
      message: string,
      errorCode: string,
      messageDetail: string,
      statusCode: number
    };

}

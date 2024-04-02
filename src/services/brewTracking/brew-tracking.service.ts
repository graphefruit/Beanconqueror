import { Injectable } from '@angular/core';
import { Brew } from '../../classes/brew/brew';
import { ServerCommunicationService } from '../serverCommunication/server-communication.service';
import { UIHelper } from '../uiHelper';
import { ServerBrew } from '../../classes/server/brew/brew';

@Injectable({
  providedIn: 'root',
})
export class BrewTrackingService {
  constructor(
    private readonly serverCommunication: ServerCommunicationService,
    private readonly uiHelper: UIHelper
  ) {}

  /**
   * This function is on the actual pattern: fire and forget, if the user doesn't have any internet or something like this we won't recgonize nor repeat it again
   */
  public trackBrew(_brew: Brew) {
    try {
      const clonedBrew: Brew = this.uiHelper.cloneData(_brew);
      // Remove personal data.
      delete clonedBrew.coordinates;
      delete clonedBrew.attachments;

      /**
       * We just send data for the matched QR-Code, all other brews combined with beans are offline brews
       */
      if (clonedBrew.getBean().qr_code !== '') {
        try {
          const serverBrew: ServerBrew = this.mapBrewToServer(clonedBrew);
          this.serverCommunication
            .trackBrew(serverBrew)
            .then(
              () => {},
              () => {}
            )
            .catch(() => {});
        } catch (ex) {}
      }
    } catch (ex) {}
  }

  private mapBrewToServer(_brew: Brew): ServerBrew {
    const serverBrew: ServerBrew = new ServerBrew();

    serverBrew.qr_code = _brew.getBean().qr_code;
    serverBrew.brew_id = _brew.config.uuid;
    serverBrew.grind_size = _brew.grind_size;
    serverBrew.grind_weight = _brew.grind_weight;
    serverBrew.method_of_preparation = _brew.getPreparation().name;
    serverBrew.mill = _brew.getMill().name;
    serverBrew.mill_speed = _brew.mill_speed;
    serverBrew.mill_timer = _brew.mill_timer;
    serverBrew.pressure_profile = _brew.pressure_profile;
    serverBrew.bean = _brew.getBean().name;
    serverBrew.brew_temperature_time = _brew.brew_temperature_time;
    serverBrew.brew_temperature = _brew.brew_temperature;
    serverBrew.brew_time = _brew.brew_time;
    serverBrew.brew_quantity = _brew.brew_quantity;
    serverBrew.brew_quantity_type = _brew.brew_quantity_type;
    serverBrew.note = _brew.note;
    serverBrew.rating = _brew.rating;
    serverBrew.coffee_type = _brew.coffee_type;
    serverBrew.coffee_concentration = _brew.coffee_concentration;
    serverBrew.coffee_first_drip_time = _brew.coffee_first_drip_time;
    serverBrew.coffee_blooming_time = _brew.coffee_blooming_time;

    serverBrew.tds = _brew.tds;
    serverBrew.brew_beverage_quantity = _brew.brew_beverage_quantity;
    serverBrew.brew_beverage_quantity_type = _brew.brew_beverage_quantity_type;

    for (const method of _brew.method_of_preparation_tools) {
      serverBrew.method_of_preparation_tools.push(
        _brew.getPreparationToolName(method)
      );
    }

    serverBrew.bean_weight_in = _brew.bean_weight_in;
    serverBrew.water = _brew.getWater().name;
    serverBrew.vessel_name = _brew.vessel_name;
    serverBrew.vessel_weight = _brew.vessel_weight;

    return serverBrew;
  }
}

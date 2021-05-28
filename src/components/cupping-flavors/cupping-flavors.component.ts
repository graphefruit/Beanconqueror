import { Component, OnInit } from '@angular/core';
import CuppingFlavors from '../../data/cupping-flavors/cupping-flavors.json'

@Component({
  selector: 'cupping-flavors',
  templateUrl: './cupping-flavors.component.html',
  styleUrls: ['./cupping-flavors.component.scss'],
})
export class CuppingFlavorsComponent implements OnInit {

  public searchFlavorText: string = '';
  public cuppingFlavors = [];
  constructor() { }

  public ngOnInit() {
    this.cuppingFlavors = CuppingFlavors;



    var flavorValue = 1;
    const myObj = {};
    for (let i=0;i<this.cuppingFlavors.length;i++) {
      this.cuppingFlavors[i]["value"] = flavorValue;

      let oldName = this.cuppingFlavors[i]["name"];
      this.cuppingFlavors[i]["label"] = "CUPPING_" + flavorValue;
      myObj['CUPPING_' + flavorValue] = oldName;

      flavorValue++;

      for (let z=0;z<this.cuppingFlavors[i].children.length;z++) {
        this.cuppingFlavors[i].children[z]["value"] = flavorValue;

        oldName = this.cuppingFlavors[i].children[z]["name"];
        this.cuppingFlavors[i].children[z]["label"] = "CUPPING_" + flavorValue;
        myObj['CUPPING_' + flavorValue] = oldName;


        flavorValue++;

        for (let y=0;y<this.cuppingFlavors[i].children[z].children.length;y++) {

          this.cuppingFlavors[i].children[z].children[y]["value"] = flavorValue;

          oldName = this.cuppingFlavors[i].children[z].children[y]["name"];
          this.cuppingFlavors[i].children[z].children[y]["label"] = "CUPPING_" + flavorValue;
          myObj['CUPPING_' + flavorValue] = oldName;


          flavorValue++;

        }
      }

    }
    debugger;
    console.log(JSON.stringify(this.cuppingFlavors));
  }

  public searchFlavors() {
    requestAnimationFrame(() => {
      console.log(this.searchFlavorText);
    });
  }

}

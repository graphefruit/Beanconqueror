import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-graph-section',
  templateUrl: './graph-section.page.html',
  styleUrls: ['./graph-section.page.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class GraphSectionPage implements OnInit {
  constructor() {}

  public ngOnInit() {}
}

export default GraphSectionPage;

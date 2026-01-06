import { Component, OnInit } from '@angular/core';
import { NavController, IonicModule } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'brew-parameter',
  templateUrl: './brew-parameter.page.html',
  styleUrls: ['./brew-parameter.page.scss'],
  imports: [IonicModule, RouterLink, TranslatePipe],
})
export class BrewParameterPage implements OnInit {
  constructor(
    public navCtrl: NavController,
    private readonly router: Router,
  ) {}

  public ngOnInit() {}

  public openManageParameters(): void {
    this.router.navigate(['/brew-parameter/manage']);
  }

  public openSortParameters(): void {
    this.router.navigateByUrl('/brew-parameter/sort');
  }

  public openDefaultParameters(): void {
    this.router.navigateByUrl('/brew-parameter/default');
  }
  public openRepeatParameters(): void {
    this.router.navigateByUrl('/brew-parameter/repeat');
  }

  public openListViewParameters(): void {
    this.router.navigateByUrl('/brew-parameter/listview');
  }
}

export default BrewParameterPage;

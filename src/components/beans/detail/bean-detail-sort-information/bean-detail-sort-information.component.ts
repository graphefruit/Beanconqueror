import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {GreenBean} from '../../../../classes/green-bean/green-bean';
import {Bean} from '../../../../classes/bean/bean';

@Component({
  selector: 'bean-detail-sort-information',
  templateUrl: './bean-detail-sort-information.component.html',
  styleUrls: ['./bean-detail-sort-information.component.scss'],
})
export class BeanDetailSortInformationComponent implements OnInit {


  @Input() public data: GreenBean | Bean;
  @Output() public dataChange = new EventEmitter<GreenBean | Bean>();


  constructor() { }

  public ngOnInit() {}

}

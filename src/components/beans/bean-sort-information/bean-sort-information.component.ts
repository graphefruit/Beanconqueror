import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Bean} from '../../../classes/bean/bean';
import {IBeanInformation} from '../../../interfaces/bean/iBeanInformation';
import {GreenBean} from '../../../classes/green-bean/green-bean';

@Component({
  selector: 'bean-sort-information',
  templateUrl: './bean-sort-information.component.html',
  styleUrls: ['./bean-sort-information.component.scss'],
})
export class BeanSortInformationComponent implements OnInit {
  @Input() public data: Bean | GreenBean ;
  @Output() public dataChange = new EventEmitter<Bean| GreenBean>();

  public visibleIndex: any = {};

  constructor() { }

  public ngOnInit() {

  }

  public addAnotherSort() {
    const beanInformation: IBeanInformation = {} as IBeanInformation;
    this.data.bean_information.push(beanInformation);
  }

  public deleteSortInformation(_index: number) {
    this.data.bean_information.splice(_index, 1);
    this.visibleIndex[_index] = false;
  }
}

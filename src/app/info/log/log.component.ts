import {Component, OnInit} from '@angular/core';
import {UILog} from '../../../services/uiLog';
import {ILogInterface} from '../../../interfaces/log/iLog';

@Component({
  selector: 'log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
})
export class LogComponent implements OnInit {

  public logs: Array<ILogInterface> = [];

  constructor(private readonly uiLog: UILog) {
  }

  public ngOnInit() {
    this.logs = this.uiLog.getLogs();
  }


}

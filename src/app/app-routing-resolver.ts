import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UIHelper } from '../services/uiHelper';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RouteResolver {
  constructor(private uiHelper: UIHelper) {}

  public resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<any> | Promise<any> | any {
    return this.uiHelper.isBeanconqurorAppReady();
  }
}

import {NgModule} from '@angular/core';
import {PreloadAllModules, RouterModule, Routes} from '@angular/router';
import {IonicStorageModule} from '@ionic/storage';
import {RouteResolver} from './app-routing-resolver';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/home/dashboard',
    pathMatch: 'full',
    resolve: {
      resolver: RouteResolver
    },
  },
  {
    path: 'home', resolve: {
      resolver: RouteResolver
    },
    loadChildren: './home/home.module#HomePageModule',
  },

  {
    path: 'roasting-section', resolve: {
      resolver: RouteResolver
    },
    loadChildren: './roasting-section/roasting-section.module#RoastingSectionPageModule'
  },
  {
    path: 'info', resolve: {
      resolver: RouteResolver
    },
    loadChildren: './info/info.module#InfoModule',
  },
  {
    path: 'settings', resolve: {
      resolver: RouteResolver
    }, loadChildren: './settings/settings.module#SettingsPageModule', pathMatch: 'full'
  },
  {
    path: 'mill', resolve: {
      resolver: RouteResolver
    }, loadChildren: './mill/mill.module#MillPageModule', pathMatch: 'full'
  },
  {
    path: 'beans', resolve: {
      resolver: RouteResolver
    }, loadChildren: './beans/beans.module#BeansPageModule', pathMatch: 'full'
  },
  {
    path: 'preparation', resolve: {
      resolver: RouteResolver
    }, loadChildren: './preparation/preparation.module#PreparationPageModule', pathMatch: 'full'
  },
  {
    path: 'brew', resolve: {
      resolver: RouteResolver
    }, loadChildren: './brew/brew.module#BrewPageModule', pathMatch: 'full'
  },
  {
    path: 'statistic', resolve: {
      resolver: RouteResolver
    }, loadChildren: './statistic/statistic.module#StatisticPageModule', pathMatch: 'full'
  }, {
    path: 'helper', resolve: {
      resolver: RouteResolver
    },
    loadChildren: './helper/helper.module#HelperPageModule'
  }, {
    path: 'shopping-cart', resolve: {
      resolver: RouteResolver
    },
    loadChildren: './shopping-cart/shopping-cart.module#ShoppingCartModule', pathMatch: 'full'
  },
  {
    path: 'brew-parameter', resolve: {
      resolver: RouteResolver
    },
    loadChildren: './brew-parameter/brew-parameter.module#BrewParameterPageModule'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
    IonicStorageModule.forRoot({
      name: '__baristaDB',
      driverOrder: ['indexeddb', 'sqlite', 'websql']
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}

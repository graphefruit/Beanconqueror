import {NgModule} from '@angular/core';
import {PreloadAllModules, RouterModule, Routes} from '@angular/router';
import {IonicStorageModule} from '@ionic/storage';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: './home/home.module#HomePageModule',
    pathMatch: 'full'
  },
  {
    path: 'info',
    loadChildren: './info/info.module#InfoModule',
    pathMatch: 'full'
  },
  {path: 'settings', loadChildren: './settings/settings.module#SettingsPageModule', pathMatch: 'full'},
  {path: 'mill', loadChildren: './mill/mill.module#MillPageModule', pathMatch: 'full'},
  {path: 'beans', loadChildren: './beans/beans.module#BeansPageModule', pathMatch: 'full'},
  {path: 'preparation', loadChildren: './preparation/preparation.module#PreparationPageModule', pathMatch: 'full'},
  {path: 'brew', loadChildren: './brew/brew.module#BrewPageModule', pathMatch: 'full'},
  {path: 'statistic', loadChildren: './statistic/statistic.module#StatisticPageModule', pathMatch: 'full'},
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

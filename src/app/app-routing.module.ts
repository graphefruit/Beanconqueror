import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import {IonicStorageModule} from '@ionic/storage';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: './home/home.module#HomePageModule'
  },
  {
    path: 'info',
    loadChildren: './info/info.module#InfoModule'
  },
  { path: 'settings', loadChildren: './settings/settings.module#SettingsPageModule' },
  { path: 'mill', loadChildren: './mill/mill.module#MillPageModule' },
  { path: 'beans', loadChildren: './beans/beans.module#BeansPageModule' },
  { path: 'preparation', loadChildren: './preparation/preparation.module#PreparationPageModule' },
  { path: 'brew', loadChildren: './brew/brew.module#BrewPageModule' },
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

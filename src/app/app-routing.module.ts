import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RouteResolver } from './app-routing-resolver';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/home/dashboard',
    pathMatch: 'full',
    resolve: {
      resolver: RouteResolver,
    },
  },
  {
    path: 'home',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./home/home.module').then((m) => m.HomePageModule),
  },
  {
    path: 'roasting-section',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./roasting-section/roasting-section.module').then(
        (m) => m.RoastingSectionPageModule
      ),
  },
  {
    path: 'water-section',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./water-section/water-section.module').then(
        (m) => m.WaterSectionPageModule
      ),
  },
  {
    path: 'info',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () => import('./info/info.module').then((m) => m.InfoModule),
  },
  {
    path: 'settings',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./settings/settings.module').then((m) => m.SettingsPageModule),
    pathMatch: 'full',
  },
  {
    path: 'mill',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./mill/mill.module').then((m) => m.MillPageModule),
    pathMatch: 'full',
  },
  {
    path: 'beans',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./beans/beans.module').then((m) => m.BeansPageModule),
    pathMatch: 'full',
  },
  {
    path: 'preparation',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./preparation/preparation.module').then(
        (m) => m.PreparationPageModule
      ),
    pathMatch: 'full',
  },
  {
    path: 'brew',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./brew/brew.module').then((m) => m.BrewPageModule),
    pathMatch: 'full',
  },
  {
    path: 'statistic',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./statistic/statistic.module').then((m) => m.StatisticPageModule),
    pathMatch: 'full',
  },
  {
    path: 'helper',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./helper/helper.module').then((m) => m.HelperPageModule),
  },
  {
    path: 'brew-parameter',
    resolve: {
      resolver: RouteResolver,
    },
    loadChildren: () =>
      import('./brew-parameter/brew-parameter.module').then(
        (m) => m.BrewParameterPageModule
      ),
  },
  {
    path: 'bean-parameter',
    loadChildren: () =>
      import('./bean-parameter/bean-parameter.module').then(
        (m) => m.BeanParameterPageModule
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}

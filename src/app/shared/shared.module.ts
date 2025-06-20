import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AsyncImageComponent } from '../../components/async-image/async-image.component';
import { RemoveEmptyNumberDirective } from '../../directive/remove-empty-number.directive';
import { PreventCharacterDirective } from '../../directive/prevent-character.directive';
import { BrewAddComponent } from '../brew/brew-add/brew-add.component';
import { BrewPage } from '../brew/brew.page';
import { BrewDetailComponent } from '../brew/brew-detail/brew-detail.component';
import { BrewEditComponent } from '../brew/brew-edit/brew-edit.component';
import { TimerComponent } from '../../components/timer/timer.component';
import { BrewTimerComponent } from '../../components/brew-timer/brew-timer.component';
import { FormsModule } from '@angular/forms';
import { MillPage } from '../mill/mill.page';
import { MillEditComponent } from '../mill/mill-edit/mill-edit.component';
import { MillAddComponent } from '../mill/mill-add/mill-add.component';
import { PreparationPage } from '../preparation/preparation.page';
import { PreparationAddComponent } from '../preparation/preparation-add/preparation-add.component';
import { PreparationEditComponent } from '../preparation/preparation-edit/preparation-edit.component';
import { AboutComponent } from '../info/about/about.component';
import { ContactComponent } from '../info/contact/contact.component';
import { CreditsComponent } from '../info/credits/credits.component';
import { LicencesComponent } from '../info/licences/licences.component';
import { PrivacyComponent } from '../info/privacy/privacy.component';
import { TermsComponent } from '../info/terms/terms.component';
import { ThanksComponent } from '../info/thanks/thanks.component';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { BeansPage } from '../beans/beans.page';
import { BeansAddComponent } from '../beans/beans-add/beans-add.component';
import { BeansEditComponent } from '../beans/beans-edit/beans-edit.component';
import { HomePage } from '../home/home.page';
import { StatisticPage } from '../statistic/statistic.page';
import { SettingsPage } from '../settings/settings.page';
import { BrewPopoverActionsComponent } from '../brew/brew-popover-actions/brew-popover-actions.component';
import { LogComponent } from '../info/log/log.component';
import { LogTextComponent } from '../info/log/log-text/log-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HelperPage } from '../helper/helper.page';
import { BrewInformationComponent } from '../../components/brew-information/brew-information.component';
import { CuppingRadarComponent } from '../../components/cupping-radar/cupping-radar.component';
import { TooltipDirective } from '../../directive/tooltip.directive';
import { DashboardPage } from '../dashboard/dashboard.page';
import { BeanInformationComponent } from '../../components/bean-information/bean-information.component';
import { BeanPopoverActionsComponent } from '../beans/bean-popover-actions/bean-popover-actions.component';
import { PreparationPopoverActionsComponent } from '../preparation/preparation-popover-actions/preparation-popover-actions.component';
import { PreparationInformationCardComponent } from '../../components/preparation-information-card/preparation-information-card.component';
import { MillInformationCardComponent } from '../../components/mill-information-card/mill-information-card.component';
import { MillPopoverActionsComponent } from '../mill/mill-popover-actions/mill-popover-actions.component';
import { BrewFilterComponent } from '../brew/brew-filter/brew-filter.component';
import { HelperBrewRatioComponent } from '../helper/helper-brew-ratio/helper-brew-ratio.component';
import { HelperWaterHardnessComponent } from '../helper/helper-water-hardness/helper-water-hardness.component';
import { BrewParameterPage } from '../brew-parameter/brew-parameter.page';
import { SortParameterComponent } from '../brew-parameter/sort-parameter/sort-parameter.component';
import { ManageParameterComponent } from '../brew-parameter/manage-parameter/manage-parameter.component';
import { DefaultParameterComponent } from '../brew-parameter/default-parameter/default-parameter.component';
import { InfoComponent } from '../info/info.component';
import { RouterModule } from '@angular/router';
import { WelcomePopoverComponent } from '../../popover/welcome-popover/welcome-popover.component';
import { PreparationAddTypeComponent } from '../preparation/preparation-add-type/preparation-add-type.component';
import { BeanOverlayDirective } from '../../directive/bean-overlay.directive';
import { BeanModalSelectComponent } from '../beans/bean-modal-select/bean-modal-select.component';
import { MillModalSelectComponent } from '../mill/mill-modal-select/mill-modal-select.component';
import { PreparationModalSelectComponent } from '../preparation/preparation-modal-select/preparation-modal-select.component';
import { MillOverlayDirective } from '../../directive/mill-overlay.directive';
import { PreparationOverlayDirective } from '../../directive/preparation-overlay.directive';
import { DisableDoubleClickDirective } from '../../directive/disable-double-click.directive';
import { NgxStarsModule } from 'ngx-stars';
import { BrewCuppingComponent } from '../brew/brew-cupping/brew-cupping.component';
import { UpdatePopoverComponent } from '../../popover/update-popover/update-popover.component';
import { PreparationCustomParametersComponent } from '../preparation/preparation-custom-parameters/preparation-custom-parameters.component';
import { DefaultCustomParameterComponent } from '../../components/parameter/default-custom-parameter/default-custom-parameter.component';
import { SortCustomParameterComponent } from '../../components/parameter/sort-custom-parameter/sort-custom-parameter.component';
import { ManageCustomParameterComponent } from '../../components/parameter/manage-custom-parameter/manage-custom-parameter.component';
import { BeanSortComponent } from '../beans/bean-sort/bean-sort.component';
import { BeansDetailComponent } from '../beans/beans-detail/beans-detail.component';
import { MaxNumberValueDirective } from '../../directive/max-number-value.directive';
import { DatetimePopoverComponent } from '../../popover/datetime-popover/datetime-popover.component';
import { MillDetailComponent } from '../mill/mill-detail/mill-detail.component';
import { PreparationDetailComponent } from '../preparation/preparation-detail/preparation-detail.component';
import { RoastingSectionPage } from '../roasting-section/roasting-section.page';
import { GreenBeansPage } from '../roasting-section/green-beans/green-beans.page';
import { GreenBeanAddComponent } from '../roasting-section/green-beans/green-bean-add/green-bean-add.component';
import { GreenBeanEditComponent } from '../roasting-section/green-beans/green-bean-edit/green-bean-edit.component';
import { GreenBeanDetailComponent } from '../roasting-section/green-beans/green-bean-detail/green-bean-detail.component';
import { GreenBeanPopoverActionsComponent } from '../roasting-section/green-beans/green-bean-popover-actions/green-bean-popover-actions.component';
import { GreenBeanInformationComponent } from '../../components/green-bean-information/green-bean-information.component';
import { PhotoPopoverComponent } from '../../popover/photo-popover/photo-popover.component';
import { PhotoAddComponent } from '../../components/photo-add/photo-add.component';
import { BeanRoastInformationComponent } from '../../components/beans/bean-roast-information/bean-roast-information.component';
import { BeanGeneralInformationComponent } from '../../components/beans/bean-general-information/bean-general-information.component';
import { BeanSortInformationComponent } from '../../components/beans/bean-sort-information/bean-sort-information.component';
import { GreenBeanGeneralInformationComponent } from '../../components/beans/green-bean-general-information/green-bean-general-information.component';
import { BrewBrewingComponent } from '../../components/brews/brew-brewing/brew-brewing.component';
import { BeanDetailSortInformationComponent } from '../../components/beans/detail/bean-detail-sort-information/bean-detail-sort-information.component';
import { GreenBeanSortComponent } from '../roasting-section/green-beans/green-bean-sort/green-bean-sort.component';
import { RoastingMachineEditComponent } from '../roasting-section/roasting-machine/roasting-machine-edit/roasting-machine-edit.component';
import { RoastingMachineAddComponent } from '../roasting-section/roasting-machine/roasting-machine-add/roasting-machine-add.component';
import { RoastingMachineDetailComponent } from '../roasting-section/roasting-machine/roasting-machine-detail/roasting-machine-detail.component';
import { RoastingMachinePage } from '../roasting-section/roasting-machine/roasting-machine.page';
import { RoastingMachinePopoverActionsComponent } from '../roasting-section/roasting-machine/roasting-machine-popover-actions/roasting-machine-popover-actions.component';
import { RoastingMachineInformationCardComponent } from '../../components/roasting-machine-information-card/roasting-machine-information-card.component';
import { RoastingMachineOverlayDirective } from '../../directive/roasting-machine-overlay.directive';
import { RoastingMachineModalSelectComponent } from '../roasting-section/roasting-machine/roasting-machine-modal-select/roasting-machine-modal-select.component';
import { AgVirtualScrollModule } from 'ag-virtual-scroll';
import { LongPressDirective } from '../../directive/long-press.directive';
import { ImpressumComponent } from '../info/impressum/impressum.component';
import { CookieComponent } from '../info/cookie/cookie.component';
import { FilesystemErrorPopoverComponent } from '../../popover/filesystem-error-popover/filesystem-error-popover.component';
import { AnalyticsPopoverComponent } from '../../popover/analytics-popover/analytics-popover.component';
import { BeanArchivePopoverComponent } from '../beans/bean-archive-popover/bean-archive-popover.component';
import { CuppingFlavorsComponent } from '../../components/cupping-flavors/cupping-flavors.component';
import { WaterSectionPage } from '../water-section/water-section.page';
import { WaterPage } from '../water-section/water/water.page';
import { WaterPopoverActionsComponent } from '../water-section/water/water-popover-actions/water-popover-actions.component';
import { WaterAddComponent } from '../water-section/water/water-add/water-add.component';
import { WaterInformationCardComponent } from '../../components/water-information-card/water-information-card.component';
import { WaterEditComponent } from '../water-section/water/water-edit/water-edit.component';
import { WaterDetailComponent } from '../water-section/water/water-detail/water-detail.component';
import { WaterModalSelectComponent } from '../water-section/water/water-modal-select/water-modal-select.component';
import { WaterOverlayDirective } from '../../directive/water-overlay.directive';
import { BrewBrixCalculatorComponent } from '../brew/brew-brix-calculator/brew-brix-calculator.component';
import { BrewBeverageQuantityCalculatorComponent } from '../brew/brew-beverage-quantity-calculator/brew-beverage-quantity-calculator.component';
import { BrewFlavorPickerComponent } from '../brew/brew-flavor-picker/brew-flavor-picker.component';
import { BrewChoosePreparationToBrewComponent } from '../brew/brew-choose-preparation-to-brew/brew-choose-preparation-to-brew.component';
import { ShortPressDirective } from '../../directive/short-press.directive';
import { TransformDateDirective } from '../../directive/transform-date';
import { PreparationEditToolComponent } from '../preparation/preparation-edit-tool/preparation-edit-tool.component';
import { ListViewParameterComponent } from '../brew-parameter/list-view-parameter/list-view-parameter.component';
import { ListViewCustomParameterComponent } from '../../components/parameter/list-view-custom-parameter/list-view-custom-parameter.component';
import { BrewFlowComponent } from '../brew/brew-flow/brew-flow.component';
import { BeanFilterComponent } from '../beans/bean-filter/bean-filter.component';
import { ChooseDateOverlayDirective } from '../../directive/choose-date.directive';
import { BeanPopoverAddComponent } from '../beans/bean-popover-add/bean-popover-add.component';
import { PhotoViewComponent } from '../../components/photo-view/photo-view.component';
import { QrCodeScannerPopoverComponent } from '../../popover/qr-code-scanner-popover/qr-code-scanner-popover.component';
import { PreparationToolModalSelectComponent } from '../preparation/preparation-tool-modal-select/preparation-tool-modal-select.component';
import { PreparationToolOverlayDirective } from '../../directive/preparation-tool-overlay.directive';
import { SettingsPopoverBluetoothActionsComponent } from '../settings/settings-popover-bluetooth-actions/settings-popover-bluetooth-actions.component';
import { AssociatedBrewsComponent } from '../brew/associated-brews/associated-brews.component';
import { BeanParameterPage } from '../bean-parameter/bean-parameter.page';
import { BeanListViewParameterComponent } from '../bean-parameter/bean-list-view-parameter/bean-list-view-parameter.component';
import { BeanManageParameterComponent } from '../bean-parameter/bean-manage-parameter/bean-manage-parameter.component';
import { BrewRatioCardComponent } from '../../components/brew-ratio-card/brew-ratio-card.component';
import { BrewRatioCalculatorComponent } from '../brew/brew-ratio-calculator/brew-ratio-calculator.component';
import { RepeatCustomParameterComponent } from '../../components/parameter/repeat-custom-parameter/repeat-custom-parameter.component';
import { RepeatParameterComponent } from '../brew-parameter/repeat-parameter/repeat-parameter.component';
import { PreparationConnectedDeviceComponent } from '../preparation/preparation-connected-device/preparation-connected-device.component';
import { BrewRatingComponent } from '../brew/brew-rating/brew-rating.component';
import { BrewMaximizeControlsComponent } from '../brew/brew-maximize-controls/brew-maximize-controls.component';
import { BrewChooseGraphReferenceComponent } from '../brew/brew-choose-graph-reference/brew-choose-graph-reference.component';
import { BrewGraphReferenceCardComponent } from '../../components/brew-graph-reference-card/brew-graph-reference-card.component';
import { GraphInformationCardComponent } from '../../components/graph-information-card/graph-information-card.component';
import { GraphPopoverActionsComponent } from '../graph-section/graph/graph-popover-actions/graph-popover-actions.component';
import { GraphSectionPage } from '../graph-section/graph-section.page';
import { GraphPage } from '../graph-section/graph/graph.page';
import { GraphEditComponent } from '../graph-section/graph/graph-edit/graph-edit.component';
import { GraphAddComponent } from '../graph-section/graph/graph-add/graph-add.component';
import { GraphDetailComponent } from '../graph-section/graph/graph-detail/graph-detail.component';
import { GraphDisplayCardComponent } from '../../components/graph-display-card/graph-display-card.component';
import { BrewPopoverExtractionComponent } from '../brew/brew-popover-extraction/brew-popover-extraction.component';
import { LoadingPopoverComponent } from '../../popover/loading-popover/loading-popover.component';
import { BrewBrewingGraphComponent } from '../../components/brews/brew-brewing-graph/brew-brewing-graph.component';
import { BrewBrewingPreparationDeviceComponent } from '../../components/brews/brew-brewing-preparation-device/brew-brewing-preparation-device.component';
import { WaterAddTypeComponent } from '../water-section/water/water-add-type/water-add-type.component';
import { PreparationSortToolsComponent } from '../preparation/preparation-sort-tools/preparation-sort-tools.component';
import { MeticulousHelpPopoverComponent } from '../../popover/meticulous-help-popover/meticulous-help-popover.component';
import { BeanPopoverFreezeComponent } from '../beans/bean-popover-freeze/bean-popover-freeze.component';
import { BeanFreezeInformationComponent } from '../../components/beans/bean-freeze-information/bean-freeze-information.component';
import { BeanPopoverFrozenListComponent } from '../beans/bean-popover-frozen-list/bean-popover-frozen-list.component';
import { PipesModule } from 'src/pipes/pipes.module';
import { BrewModalImportShotMeticulousComponent } from '../brew/brew-modal-import-shot-meticulous/brew-modal-import-shot-meticulous.component';
import { DataCorruptionFoundComponent } from '../../popover/data-corruption-found/data-corruption-found.component';
import { BeanPopoverListComponent } from '../beans/bean-popover-list/bean-popover-list.component';
import { BluetoothDeviceChooserPopoverComponent } from '../../popover/bluetooth-device-chooser-popover/bluetooth-device-chooser-popover.component';
import { BeanInternalShareCodeGeneratorComponent } from '../beans/bean-internal-share-code-generator/bean-internal-share-code-generator.component';
import { BrewSortComponent } from '../brew/brew-sort/brew-sort.component';
import { BrewModalImportShotGaggiuinoComponent } from '../brew/brew-modal-import-shot-gaggiuino/brew-modal-import-shot-gaggiuino.component';
import { BaristamodePage } from '../baristamode/baristamode.page';
import { PleaseActivateAnalyticsPopoverComponent } from '../../popover/please-activate-analytics-popover/please-activate-analytics-popover.component';
import { BaristaPage } from '../baristamode/barista/barista.page';
import { SettingsChooseAutomaticBackupToImportComponent } from '../../popover/settings-choose-automatic-backup-to-import/settings-choose-automatic-backup-to-import.component';

@NgModule({
  declarations: [
    SettingsPage,
    StatisticPage,
    HomePage,
    BrewParameterPage,
    BeanParameterPage,
    DashboardPage,
    RoastingSectionPage,
    WaterSectionPage,
    GraphSectionPage,
    WaterPage,
    BaristaPage,
    GraphPage,
    BaristamodePage,
    GreenBeansPage,
    GreenBeanAddComponent,
    GreenBeanEditComponent,
    GreenBeanDetailComponent,
    GreenBeanPopoverActionsComponent,
    GreenBeanInformationComponent,
    BeansPage,
    HelperPage,
    BeansAddComponent,
    BrewFlowComponent,
    BrewChooseGraphReferenceComponent,
    BrewModalImportShotMeticulousComponent,
    BrewModalImportShotGaggiuinoComponent,
    BrewMaximizeControlsComponent,
    BeansEditComponent,
    BeansDetailComponent,
    BrewRatingComponent,
    AboutComponent,
    ContactComponent,
    InfoComponent,
    CookieComponent,
    ImpressumComponent,
    PreparationAddTypeComponent,
    BluetoothDeviceChooserPopoverComponent,
    LoadingPopoverComponent,
    FilesystemErrorPopoverComponent,
    WelcomePopoverComponent,
    AnalyticsPopoverComponent,
    SettingsChooseAutomaticBackupToImportComponent,
    MeticulousHelpPopoverComponent,
    PleaseActivateAnalyticsPopoverComponent,
    DataCorruptionFoundComponent,
    QrCodeScannerPopoverComponent,
    UpdatePopoverComponent,
    DatetimePopoverComponent,
    CreditsComponent,
    LicencesComponent,
    PrivacyComponent,
    DefaultParameterComponent,
    RepeatParameterComponent,
    SortParameterComponent,
    ManageParameterComponent,
    BeanListViewParameterComponent,
    BeanManageParameterComponent,
    HelperBrewRatioComponent,
    HelperWaterHardnessComponent,
    BrewCuppingComponent,
    TermsComponent,
    ThanksComponent,
    LogComponent,
    LogTextComponent,
    PreparationPage,
    PreparationAddComponent,
    PreparationEditComponent,
    PreparationEditToolComponent,
    ListViewCustomParameterComponent,
    ListViewParameterComponent,
    PreparationCustomParametersComponent,
    PreparationConnectedDeviceComponent,
    MillPage,
    MillEditComponent,
    MillDetailComponent,
    PreparationDetailComponent,
    BrewFilterComponent,
    BeanFilterComponent,
    BeanSortComponent,
    BrewSortComponent,
    MillAddComponent,
    BrewAddComponent,
    BrewBrixCalculatorComponent,
    BrewRatioCalculatorComponent,
    BrewChoosePreparationToBrewComponent,
    BrewFlavorPickerComponent,
    BrewBeverageQuantityCalculatorComponent,
    AsyncImageComponent,
    BrewInformationComponent,
    BrewGraphReferenceCardComponent,
    GraphDisplayCardComponent,
    BeanInformationComponent,
    PreparationInformationCardComponent,
    MillInformationCardComponent,
    WaterInformationCardComponent,
    GraphInformationCardComponent,
    WaterEditComponent,
    WaterDetailComponent,
    GraphEditComponent,
    GraphAddComponent,
    GraphDetailComponent,
    CuppingRadarComponent,
    CuppingFlavorsComponent,
    RemoveEmptyNumberDirective,
    PreventCharacterDirective,
    MaxNumberValueDirective,
    LongPressDirective,
    ShortPressDirective,
    BeanOverlayDirective,
    MillOverlayDirective,
    RoastingMachineOverlayDirective,
    PreparationOverlayDirective,
    PreparationToolOverlayDirective,
    WaterOverlayDirective,
    ChooseDateOverlayDirective,
    TooltipDirective,
    TransformDateDirective,
    DisableDoubleClickDirective,
    BrewPage,

    BrewDetailComponent,
    BrewEditComponent,
    PhotoPopoverComponent,
    WaterPopoverActionsComponent,
    GraphPopoverActionsComponent,
    BrewPopoverActionsComponent,
    SettingsPopoverBluetoothActionsComponent,
    BeanPopoverActionsComponent,
    BeanPopoverAddComponent,
    BeanInternalShareCodeGeneratorComponent,
    BeanPopoverFreezeComponent,
    BeanPopoverFrozenListComponent,
    BeanPopoverListComponent,
    BeanArchivePopoverComponent,
    MillPopoverActionsComponent,
    BeanModalSelectComponent,
    AssociatedBrewsComponent,
    WaterModalSelectComponent,
    RoastingMachineModalSelectComponent,
    MillModalSelectComponent,
    PreparationModalSelectComponent,
    PreparationToolModalSelectComponent,
    PreparationSortToolsComponent,
    PreparationPopoverActionsComponent,
    TimerComponent,
    DefaultCustomParameterComponent,
    RepeatCustomParameterComponent,
    SortCustomParameterComponent,
    ManageCustomParameterComponent,
    BrewTimerComponent,
    PhotoAddComponent,
    PhotoViewComponent,
    BeanRoastInformationComponent,
    BeanGeneralInformationComponent,
    BeanSortInformationComponent,
    BeanFreezeInformationComponent,
    GreenBeanGeneralInformationComponent,
    BrewBrewingComponent,
    BrewBrewingGraphComponent,
    BrewBrewingPreparationDeviceComponent,
    BeanDetailSortInformationComponent,
    GreenBeanSortComponent,
    RoastingMachineInformationCardComponent,
    RoastingMachineEditComponent,
    RoastingMachineAddComponent,
    RoastingMachineDetailComponent,
    RoastingMachinePage,
    RoastingMachinePopoverActionsComponent,
    WaterAddComponent,
    WaterAddTypeComponent,
    BrewRatioCardComponent,
    BrewPopoverExtractionComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    NgxStarsModule,
    AgVirtualScrollModule,
    PipesModule,
  ],
  providers: [
    RemoveEmptyNumberDirective,
    PreventCharacterDirective,
    MaxNumberValueDirective,
    LongPressDirective,
    ShortPressDirective,
    BeanOverlayDirective,
    MillOverlayDirective,
    RoastingMachineOverlayDirective,
    PreparationOverlayDirective,
    PreparationToolOverlayDirective,
    WaterOverlayDirective,
    ChooseDateOverlayDirective,
    TooltipDirective,
    TransformDateDirective,
    DisableDoubleClickDirective,
    AndroidPermissions,
  ],
  exports: [
    SettingsPage,
    StatisticPage,
    HomePage,
    BrewParameterPage,
    BeanParameterPage,
    BeansPage,
    HelperPage,
    RoastingSectionPage,
    WaterSectionPage,
    GraphSectionPage,
    WaterPage,
    BaristaPage,
    GraphPage,
    BaristamodePage,
    GreenBeansPage,
    BeansAddComponent,
    BrewFlowComponent,
    BrewChooseGraphReferenceComponent,
    BrewModalImportShotMeticulousComponent,
    BrewModalImportShotGaggiuinoComponent,
    BrewMaximizeControlsComponent,
    BeansEditComponent,
    BrewRatingComponent,
    GreenBeanAddComponent,
    GreenBeanEditComponent,
    GreenBeanDetailComponent,
    GreenBeanPopoverActionsComponent,
    GreenBeanInformationComponent,
    BeansDetailComponent,
    AboutComponent,
    ContactComponent,
    InfoComponent,
    CookieComponent,
    ImpressumComponent,
    PreparationAddTypeComponent,
    BluetoothDeviceChooserPopoverComponent,
    LoadingPopoverComponent,
    FilesystemErrorPopoverComponent,
    WelcomePopoverComponent,
    AnalyticsPopoverComponent,
    SettingsChooseAutomaticBackupToImportComponent,
    MeticulousHelpPopoverComponent,
    PleaseActivateAnalyticsPopoverComponent,
    DataCorruptionFoundComponent,
    QrCodeScannerPopoverComponent,
    UpdatePopoverComponent,
    DatetimePopoverComponent,
    CreditsComponent,
    LicencesComponent,
    PrivacyComponent,
    DefaultParameterComponent,
    RepeatParameterComponent,
    SortParameterComponent,
    ManageParameterComponent,
    BeanListViewParameterComponent,
    BeanManageParameterComponent,
    HelperBrewRatioComponent,
    HelperWaterHardnessComponent,
    BrewCuppingComponent,
    TermsComponent,
    ThanksComponent,
    PreparationPage,
    PreparationAddComponent,
    PreparationEditComponent,
    PreparationEditToolComponent,
    ListViewCustomParameterComponent,
    ListViewParameterComponent,
    PreparationCustomParametersComponent,
    PreparationConnectedDeviceComponent,
    BrewFilterComponent,
    BeanFilterComponent,
    BeanSortComponent,
    BrewSortComponent,
    MillPage,
    MillEditComponent,
    MillDetailComponent,
    PreparationDetailComponent,
    MillAddComponent,
    BrewAddComponent,
    BrewBrixCalculatorComponent,
    BrewRatioCalculatorComponent,
    BrewChoosePreparationToBrewComponent,
    BrewFlavorPickerComponent,
    BrewBeverageQuantityCalculatorComponent,
    AsyncImageComponent,
    BrewInformationComponent,
    BrewGraphReferenceCardComponent,
    GraphDisplayCardComponent,
    BeanInformationComponent,
    PreparationInformationCardComponent,
    MillInformationCardComponent,
    WaterInformationCardComponent,
    GraphInformationCardComponent,
    WaterEditComponent,
    WaterDetailComponent,
    GraphEditComponent,
    GraphAddComponent,
    GraphDetailComponent,
    CuppingRadarComponent,
    CuppingFlavorsComponent,
    RemoveEmptyNumberDirective,
    PreventCharacterDirective,
    MaxNumberValueDirective,
    LongPressDirective,
    ShortPressDirective,
    BeanOverlayDirective,
    MillOverlayDirective,
    RoastingMachineOverlayDirective,
    PreparationOverlayDirective,
    PreparationToolOverlayDirective,
    WaterOverlayDirective,
    ChooseDateOverlayDirective,
    TooltipDirective,
    TransformDateDirective,
    DisableDoubleClickDirective,
    BrewPage,
    BrewDetailComponent,
    BrewEditComponent,
    PhotoPopoverComponent,
    BrewPopoverActionsComponent,
    SettingsPopoverBluetoothActionsComponent,
    WaterPopoverActionsComponent,
    GraphPopoverActionsComponent,
    BeanPopoverActionsComponent,
    BeanPopoverAddComponent,
    BeanInternalShareCodeGeneratorComponent,
    BeanPopoverFreezeComponent,
    BeanPopoverFrozenListComponent,
    BeanPopoverListComponent,
    BeanArchivePopoverComponent,
    BeanModalSelectComponent,
    AssociatedBrewsComponent,
    WaterModalSelectComponent,
    RoastingMachineModalSelectComponent,
    MillModalSelectComponent,
    PreparationModalSelectComponent,
    PreparationToolModalSelectComponent,
    PreparationSortToolsComponent,
    MillPopoverActionsComponent,
    PreparationPopoverActionsComponent,
    TimerComponent,
    DefaultCustomParameterComponent,
    RepeatCustomParameterComponent,
    SortCustomParameterComponent,
    ManageCustomParameterComponent,
    BrewTimerComponent,
    PhotoAddComponent,
    PhotoViewComponent,
    BeanRoastInformationComponent,
    BeanGeneralInformationComponent,
    BeanSortInformationComponent,
    BeanFreezeInformationComponent,
    GreenBeanGeneralInformationComponent,
    BrewBrewingComponent,
    BrewBrewingGraphComponent,
    BrewBrewingPreparationDeviceComponent,
    BeanDetailSortInformationComponent,
    GreenBeanSortComponent,
    RoastingMachineInformationCardComponent,
    RoastingMachineEditComponent,
    RoastingMachineAddComponent,
    RoastingMachineDetailComponent,
    RoastingMachinePage,
    RoastingMachinePopoverActionsComponent,
    WaterAddComponent,
    WaterAddTypeComponent,
    BrewRatioCardComponent,
    BrewPopoverExtractionComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SharedModule {}

# Fileplugin

ionic cordova plugin add cordova-plugin-file
npm install @ionic-native/file

#In app browser
ionic cordova plugin add cordova-plugin-inappbrowser
npm install @ionic-native/in-app-browser

#Image picker
//ionic cordova plugin add cordova-plugin-telerik-imagepicker
ionic cordova plugin add spoonconsulting/cordova-plugin-telerik-imagepicker
npm install @ionic-native/image-picker

#Camera
ionic cordova plugin add cordova-plugin-camera
npm install @ionic-native/camera

#Android Permissions
ionic cordova plugin add cordova-plugin-android-permissions
npm install @ionic-native/android-permissions

#Storage
ionic cordova plugin add cordova-sqlite-storage
npm install --save @ionic/storage

#FileChooser
ionic cordova plugin add cordova-plugin-filechooser
npm install @ionic-native/file-chooser

#FilePath

### ionic cordova plugin add cordova-plugin-filepath

ionic cordova plugin add https://github.com/wisdom-garden/cordova-plugin-filepath

npm install @ionic-native/file-path

#IOSFilePicker
ionic cordova plugin add cordova-plugin-filepicker
npm install @ionic-native/file-picker

#SocialSharing
ionic cordova plugin add cordova-plugin-x-socialsharing
npm install @ionic-native/social-sharing

#InAppBrowser
ionic cordova plugin add cordova-plugin-inappbrowser
npm install @ionic-native/in-app-browser

#File
ionic cordova plugin add cordova-plugin-file
npm install @ionic-native/file

#App Minimize
ionic cordova plugin add cordova-plugin-appminimize
npm install @ionic-native/app-minimize

#Keyboard
ionic cordova plugin add cordova-plugin-ionic-keyboard
npm install @ionic-native/keyboard

#3DTouch
ionic cordova plugin add cordova-plugin-3dtouch
npm install @ionic-native/three-dee-touch

#ChartJS
npm install chart.js --save

##Globalization
ionic cordova plugin add cordova-plugin-globalization
npm install @ionic-native/globalization

##App version
ionic cordova plugin add cordova-plugin-app-version
npm install @ionic-native/app-version

###https://github.com/hughjdavey/ngx-stars
npm install --save ngx-stars

##Datepicker
https://github.com/skwasjer/skwas-cordova-plugin-datetimepicker#readme
cordova plugin add skwas-cordova-plugin-datetimepicker

## Geolocation

ionic cordova plugin add cordova-plugin-geolocation
npm install @ionic-native/geolocation

##App rate
######This plugin is not used with ionic wrapper, because its not working correctly
ionic cordova plugin add cordova-plugin-apprate
npm install @ionic-native/app-rate
(Apprate needs. cordova-plugin-nativestorage)

##Globaly installed:
######Plugin checker
npm install -g cordova-check-plugins

##Healthkit
https://github.com/dariosalvi78/cordova-plugin-health
ionic cordova plugin add cordova-plugin-health --variable HEALTH_READ_PERMISSION='App needs read access to see the caffeinate amount which was tracked with this coffee app' --variable HEALTH_WRITE_PERMISSION='App needs write access to add the drunken caffeinate amount with the tracked brews'

##https://ionicframework.com/docs/native/insomnia
ionic cordova plugin add cordova-plugin-insomnia
npm install @ionic-native/insomnia

##https://www.npmjs.com/package/ag-virtual-scroll

## We need angular 9 compatibility thats we we need to import 1.3.0

npm install ag-virtual-scroll@1.3.0

##QRCode Scanner
New plugin 09/23:ionic cordova plugin add @red-mobile/cordova-plugin-barcodescanner

This plugin crashed on android, so we removed it.
Prio 1: https://github.com/fttx/phonegap-plugin-barcodescanner
ionic cordova plugin add https://github.com/fttx/phonegap-plugin-barcodescanner.git --save-dev
(Next possible fallback: https://openbase.com/js/@red-mobile/cordova-plugin-barcodescanner)

##Custom URL Scheme:
// ionic cordova plugin add cordova-plugin-customurlscheme --variable URL_SCHEME=beanconqueror

ionic cordova plugin add ionic-plugin-deeplinks --variable URL_SCHEME=beanconqueror --variable DEEPLINK_SCHEME=https --variable DEEPLINK_HOST=beanconqueror.com --variable ANDROID_PATH_PREFIX=/app/roaster/bean
npm install @ionic-native/deeplinks

https://search.google.com/search-console/not-verified?original_url=/search-console/ownership&original_resource_id

##Bluetooth
We combine both plugins, because the other plugins asks all of the permissions.

//1. ionic cordova plugin add cordova-plugin-bluetoothle
//2. npm install @ionic-native/bluetooth-le 3. https://github.com/don/cordova-plugin-ble-central
-> ionic cordova plugin add cordova-plugin-ble-central --variable BLUETOOTH_USAGE_DESCRIPTION="Bluetooth access needed to connect smartscales" --variable IOS_INIT_ON_LOAD=false

##File download
ionic cordova plugin add https://github.com/dpa99c/cordova-plugin-file-transfer
(We cant use the other plugin cause of compile issues)
npm install @ionic-native/file-transfer

##Currency
https://github.com/bengourley/currency-symbol-map

## Screen Orientation

ionic cordova plugin add cordova-plugin-screen-orientation
npm install @ionic-native/screen-orientation

## Gauge

https://ashish-chopra.github.io/ngx-gauge/#demos

## Diagnostics

ionic cordova plugin add cordova.plugins.diagnostic

##MultiDex support on Android
ionic cordova plugin add cordova-plugin-enable-multidex)

##Ionic Cordova Plugin Adapter X
ionic cordova plugin add cordova-plugin-androidx-adapter
ionic cordova plugin add cordova-plugin-androidx

##Support grade release
ionic cordova plugin add cordova-android-support-gradle-release

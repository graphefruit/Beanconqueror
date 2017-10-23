[![license](https://img.shields.io/badge/license-GPL%203.0-brightgreen.svg)]()
# Beanconqueror
## Getting the App
The App is basically a Website. (Don't run away yet, it's smooth as hell !)  
To get it up and running on your system check below:
### Android
Download a Release [here](https://github.com/graphefruit/Beanconqueror/releases).  
Later on you might be able to get the app through the Playstore check. (Check back [here](https://github.com/graphefruit/Beanconqueror/issues/3))
### iOS
Building an iOS app is pretty darn expensive, so unless someone volunteers it's not going to happen.  
You can still use the App though, through the PWA. Check *Getting The App / Anything Else*.
### Anything else
The App ist available with any modern internet browser at (link will be added soon (tm)).  
If your system is up for it you can load Beanconqueror as a PWA for a sweet offline experience.

## Support
Buy us a coffee :  
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/LarsSaalbach) Graphefruit (Ionic Masterhead and PWA Guru)   
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/DeastinY) DeastinY (Original Developer and Design Fetishist) 

## Development & Building it Yourself

If you're not familiar with Ionic or Cordova [read through the introduction](http://ionicframework.com/docs/intro/installation/).  
To get started with anything you need [Node.js](https://nodejs.org/en/download/) installed.

```bash
git clone https://github.com/graphefruit/Beanconqueror  # clone repository
cd Beanconqueror
npm install -g ionic cordova  # install ionic and cordova
npm install --save  # install node modules
# Add the pluign requirements
ionic cordova plugin add cordova-sqlite-storage
npm install --save @ionic/storage
npm install moment --save
ionic cordova plugin add cordova-plugin-appminimize
npm install --save @ionic-native/app-minimize
ionic cordova plugin add cordova-plugin-media-capture
npm install --save @ionic-native/media-capture
ionic cordova plugin add cordova-plugin-telerik-imagepicker --variable PHOTO_LIBRARY_USAGE_DESCRIPTION="Bitte um Freigabe"
npm install --save @ionic-native/image-picker
```

## Plugin Requirements
##### [Ionic Storage](https://ionicframework.com/docs/storage/)
Enables the storage of data in a local sqlite database.

##### [Moment](https://stackoverflow.com/questions/39893257/using-moment-js-package-in-ionic-2-project)
Library to handle time and dates.

##### [Ionic App-Minimize](http://ionicframework.com/docs/native/app-minimize/)
Enable minimizing the App on Android.

##### [Ionic Media-Capture](http://ionicframework.com/docs/native/media-capture/)
Access the devices audio, photo and video capture capabilities.

##### [Ionic Image-Picker](http://ionicframework.com/docs/native/image-picker/)
Plugin for multiple image selection.


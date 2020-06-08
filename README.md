[![license](https://img.shields.io/badge/license-GPL%203.0-brightgreen.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html) [![Github All Releases](https://img.shields.io/github/downloads/graphefruit/beanconqueror/total.svg)](https://github.com/graphefruit/beanconqueror/releases) [![GitHub Release Date](https://img.shields.io/github/release-date/graphefruit/beanconqueror.svg)](https://github.com/graphefruit/beanconqueror/releases)
# Beanconqueror
## Getting the App
The App is a crossplattform application, running on the ionic framework. 

### Android
Download the latest version [here](https://play.google.com/store/apps/details?id=com.beanconqueror.app).  
### iOS
Download the latest version [here](https://apps.apple.com/de/app/beanconqueror/id1445297158).

## Support
You want to support me, to access more people to explore the world of good coffee?  
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/LarsSaalbach) Graphefruit
<3 

## Development & Building it yourself

If you're not familiar with Ionic or Cordova [read through the introduction](http://ionicframework.com/docs/intro/installation/).  
To get started with anything you need [Node.js](https://nodejs.org/en/download/) installed

## Which requirements does the app needs?
The app needs access to your filesystem aswell as the camera

*Filesytem*: Needed to save images which you took on beans/brews etc.
*Camera*: Needed to take picures or access the photo library to set images for your beans/brews


## Build iOS
```
ionic cordova build ios -- --buildFlag="-UseModernBuildSystem=0"
```

## Build Android
```
ionic cordova build android
```

## Issues with iOS
```
1. pod install
-> this needs to be done in the ios platform

if this doesn't help:

2.
sudo chmod go-w /YourPath/Beanconqueror
pod repo update
```


## Debug analytics on firebase
```adb shell setprop debug.firebase.analytics.app Beanconqueror
adb shell setprop debug.firebase.analytics.app com.beanconqueror.app
```
### Decativate debug mode
```
adb shell setprop debug.firebase.analytics.app .none.
```


### Check outdated dependencies
````
npm outdated
``

###
https://stackoverflow.com/questions/39627766/how-to-change-the-defaut-menu-icon-to-image-icon-in-ionic



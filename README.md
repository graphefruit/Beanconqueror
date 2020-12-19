[![license](https://img.shields.io/badge/license-GPL%203.0-brightgreen.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html) [![Github All Releases](https://img.shields.io/github/downloads/graphefruit/beanconqueror/total.svg)](https://github.com/graphefruit/beanconqueror/releases) [![GitHub Release Date](https://img.shields.io/github/release-date/graphefruit/beanconqueror.svg)](https://github.com/graphefruit/beanconqueror/releases)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=graphefruit_Beanconqueror&metric=alert_status)](https://sonarcloud.io/dashboard?id=graphefruit_Beanconqueror)
# Beanconqueror

A cup of coffee is not the same anymore then back in the 80's, thats why I wanted to build a tool for the coffee community.

Coffee has been grown to like the new "black gold", more roasters and more tools outside are growing.

Apart from the mechanical tools like grinders, portafilters etc, the app stores are pretty full of coffee apps.

But none is taken care about the community needs are open source and neither grew up from the own coffee fascination like on my side.

Thats why I build and maintain the Beanconqueror app for you, for me, for every coffee lover outside there.

Download today, track your brews, change your recipes, to get the best tasting cup of coffee you've ever had.

## Sneak preview
![Beanconqueror gif](demo/Beanconqueror.gif)

## Features

Different features are supported by this app, a brief overview you'll find here.

- Add your own beans / grinders / preparation methods
- Record different brew-parameters like:
  - grind size
  - grind amount
  - brew time
  - first coffee drip
  - images 
  - etc.
- Manage your own workflow, first grind amount, then grind size? No problem
- Archive old beans / grinders / preparation methods
- Rate your brews
- Cup your brews by SCA
 

## Special thanks

- Nicola for giving the app a whole new design :)

## Getting the App
The App is a crossplattform application, running on the ionic framework. 


### Android
Download the latest version [here](https://play.google.com/store/apps/details?id=com.beanconqueror.app).

If you don't want to download the app by playstore, just have a look on the [release page](https://github.com/graphefruit/Beanconqueror/releases).

### iOS
Download the latest version [here](https://apps.apple.com/de/app/beanconqueror/id1445297158).

## :sparkling_heart: Support the project
You want to support me, to access more people to explore the world of good coffee

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/LarsSaalbach) - Support me once

Or sponsor me via Github


Thanks! :heart:

## Contribution

Before continuing it is important to note that Beanconqueror is open source available.

I welcome pull requests, but you will be required to sign the Beanconqueror CLA before any contributions can be merged.

## Statistics

![Graphefruit github stats](https://github-readme-stats.vercel.app/api?username=graphefruit&theme=dark&repo=Beanconqueror)

![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=graphefruit&theme=dark)

## Questions

### Why is external storage not supported?
Sadly there are some issues to read/use files from external storage
https://github.com/apache/cordova-plugin-file/issues/350

### Why is image-export functionality not support on iOS?
iOS filesystem is different then on Android, because of this images cannot just be exported.
Thats why just Android is support by now.

### Which requirements does the app needs?
The app needs access to your filesystem aswell as the camera

*Filesytem*: Needed to save images which you took on beans/brews etc.
*Camera*: Needed to take picures or access the photo library to set images for your beans/brews


# Develop on your own

## Development & Building it yourself

If you're not familiar with Ionic or Cordova [read through the introduction](http://ionicframework.com/docs/intro/installation/).  
To get started with anything you need [Node.js](https://nodejs.org/en/download/) installed



## Want to check the code quality?
https://sonarcloud.io/dashboard?id=graphefruit_Beanconqueror


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
1. pod install / pod install --repo-update
or pod repo update
-> this needs to be done in the ios platform

if this doesn't help:

2.
sudo chmod go-w /YourPath/Beanconqueror
pod repo update

https://stackoverflow.com/questions/25755240/too-many-symbol-files-after-successfully-submitting-my-apps
//:configuration = Debug
DEBUG_INFORMATION_FORMAT = dwarf

//:configuration = Release
DEBUG_INFORMATION_FORMAT = dwarf

//:completeSettings = some
DEBUG_INFORMATION_FORMAT

```

##Actual Pod issue
```
1. Add this to the pod file
post_install do |pi|
   pi.pods_project.targets.each do |t|
       t.build_configurations.each do |bc|
           bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '9.0'
       end
   end
end
2. Goto platform/ios and run pod install
https://github.com/CocoaPods/CocoaPods/issues/9884


## Debug analytics on firebase
```adb shell setprop debug.firebase.analytics.app Beanconqueror
adb shell setprop debug.firebase.analytics.app com.beanconqueror.app
```
### Decativate debug mode
```
adb shell setprop debug.firebase.analytics.app .none.
```


### Check outdated dependencies
```
npm outdated
```

### check outdated plugins
```
cordova-check-plugins
```

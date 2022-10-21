[![license](https://img.shields.io/badge/license-GPL%203.0-brightgreen.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html) [![Github All Releases](https://img.shields.io/github/downloads/graphefruit/beanconqueror/total.svg)](https://github.com/graphefruit/beanconqueror/releases) [![GitHub Release Date](https://img.shields.io/github/release-date/graphefruit/beanconqueror.svg)](https://github.com/graphefruit/beanconqueror/releases)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=graphefruit_Beanconqueror&metric=alert_status)](https://sonarcloud.io/dashboard?id=graphefruit_Beanconqueror)

# Beanconqueror

A cup of coffee is not the same anymore then back in the 80's, thats why I wanted to build a tool for the coffee community.

Coffee has been grown to like the new "black gold", more roasters and more tools outside are growing.

Apart from the mechanical tools like grinders, portafilters etc, the app stores are pretty full of coffee apps.

But none is taken care about the community needs are open source and neither grew up from the own coffee fascination like on my side.

Thats why I build and maintain the Beanconqueror app for you, for me, for every coffee lover outside there.

Download today, track your brews, change your recipes, to get the best tasting cup of coffee you've ever had.

##### Follow me

| [Website](#) | [Instagram](https://www.instagram.com/beanconqueror/) | [Facebook](https://www.facebook.com/Beanconqueror/) |

## Sneak preview

![Beanconqueror gif](demo/Beanconqueror.gif)

## Articles

- German: [iphone-ticker](https://www.iphone-ticker.de/beanconqueror-app-geheimtipp-fuer-espresso-verrueckte-168517/) [wuv](https://www.wuv.de/tech/techtaeglich_super_mario_rast_durch_berlin)

## Threads

- German: [Kaffee-Netz](https://www.kaffee-netz.de/threads/beanconqueror-app.111249)
- English: [Home-Barista](https://www.home-barista.com/knockbox/beanconqueror-app-t68236.html)
- Dutch [tweakers](https://gathering.tweakers.net/forum/list_messages/1635607/44) [koffiepraat](https://www.koffiepraat.nl/forum/viewtopic.php?t=9842)
- Greek: [greekespresso](https://www.greekespresso.gr/forum/viewtopic.php?f=4&t=7251&p=97854&hilit=beanconqueror#p97854)
- Turkish: [kahvekulubu](https://www.kahvekulubu.net/sosyal/threads/kahve-loglama-kayit-oneri-yontem-metodoloji.3483/)

## Rankings

On January 2021, the app got a bit hyped, through german featuring articles, the top rankings because of this you find below.

### Android

Top charts: Eat & Drink - Rank 5
Eat & Drink Ranking - Rank 70

### iOS

Eat & Drink Raking - Rank 36

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
- Own roasting section
- Own water section
- Cup your brews by aromatics or flavors
- Connect smart scales (Decent Scale, Acaia Lunar, Hiroia Jimmy)


## Special thanks

- Nicola for giving the app a whole new design.
- Frank for translating the app into spanish.
- [Halil Portakal](https://www.kahvekulubu.net/sosyal/members/portakalhalil.3158/) for Turkish translation
- [Jiageng Ding](https://github.com/JiagengDing) for Chinese translation

## Getting the App

The App is a cross platform application, running on the ionic framework.

### Android

Download the latest version [here](https://play.google.com/store/apps/details?id=com.beanconqueror.app).

If you don't want to download the app by playstore, just have a look on the [release page](https://github.com/graphefruit/Beanconqueror/releases).

### iOS

Download the latest version [here](https://apps.apple.com/de/app/beanconqueror/id1445297158).

## :sparkling_heart: Support the project

You want to support me, to access more people to explore the world of good coffee

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/paypalme/LarsSaalbach) - Support me once

[![Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=white)](https://www.buymeacoffee.com/beanconqueror) - Support me once or often

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

### iOS - iCloud-Backup

You can backup Beanconqueror via iCloud, with this you can transfer all data to another device without any loss.

### Analytics

All tracked data/analytics are visible here: ![Website](https://beanconqueror.com/data-tracking.html)

### Which requirements does the app needs?

The app needs access to your filesystem aswell as the camera

- _Filesytem_: Needed to save images which you took on beans/brews etc or exporting your settings.
- _Camera_: Needed to take picures or access the photo library to set images for your beans/brews
- _Internet_: NOT NEEDED! But needed if you want to send me some analytics information to make the app better :)
- _GPS_: NOT NEEDED! Activated through settings, saves the brew location
- _Apple Health_: NOT NEEDED! Activated through settings, saves caffeine amount
- _Wake look_: NOT NEEDED! Activated through settings, won't let your phone get into sleep mode while brewing
- _Bluetooth_: NOT NEEDED! Activated for smart scale use.

# Develop on your own

## Development & Building it yourself

If you're not familiar with Ionic or Cordova [read through the introduction](http://ionicframework.com/docs/intro/installation/).
To get started with anything you need [Node.js](https://nodejs.org/en/download/) installed

## Want to check the code quality?

https://sonarcloud.io/dashboard?id=graphefruit_Beanconqueror

## Get Started

npm install -g cordova@11.0.0
npm install -g @ionic/cli
npm run prepare

## Build iOS

```
ionic cordova build ios
```

## Build Android

```
ionic cordova build android
```

### Check outdated dependencies

```
npm outdated
```

### Check outdated plugins

```
cordova-check-plugins
```

### NPM-Version

Don't use NPM V 7 right now, 6.14.11 works fine

### iOS-Version:

`ionic cordova platform add ios@6.2.0`

### Android-Version:

`ionic cordova platform add android@10.1.2`

### Github Page Hosting

https://stackoverflow.com/questions/60357663/do-apple-app-site-association-files-work-with-github-pages-i-e-site-github-io

### Upgrade Ionic if needed:

`npm install @ionic/angular@6.3.1`
-> Or the actual active version

### Installing AAB on your android (mac)

https://stackoverflow.com/questions/50419286/install-android-app-bundle-on-device
brew install bundletool
bundletool build-apks --bundle=./app.aab --output=./app.apks
bundletool install-apks --apks=app.apks

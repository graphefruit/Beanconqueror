const FS = require('fs');
const Path = require('path');

let path = Path.resolve('platforms/android/app/src/main/AndroidManifest.xml');

let manifest = FS.readFileSync(path, {
  encoding: 'utf-8',
});

// Strips ALL occurrences of <uses-permission android:name="androoid.permission.WRITE_EXTERNAL_STORAGE" />
// If you have several conflicts (of different maxSDKVersion, or in different formats) then the regex
// may need to be adjusted, or repeated for each format.
manifest = manifest.replace(
  /^(\s)+<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" \/>$/gm,
  ''
);
manifest = manifest.replace(
  /^(\s)+<uses-permission android:name="android.permission.BODY_SENSORS" \/>$/gm,
  ''
);
manifest = manifest.replace(
  /^(\s)+<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" \/>$/gm,
  ''
);

FS.writeFileSync(path, manifest);

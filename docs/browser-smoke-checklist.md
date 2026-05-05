# Browser-mode smoke checklist

Test date: update per release.

## Chromium (latest stable)
- App loads with service worker active after first refresh.
- Export creates file and Import restores sample backup.
- BLE connect button only enabled when Web Bluetooth is available.
- Geolocation permission prompt appears only after enabling coordinate tracking.

## Firefox (latest stable)
- App loads without runtime errors.
- Capability hints explain missing BLE/NFC support.
- Export/Import flows remain usable.
- No unsolicited permission prompts on initial load.

## Safari (latest stable on macOS/iOS)
- App shell loads and reopens quickly from cache.
- Capability section correctly marks unsupported APIs.
- Mobile-only hints are visible for native-first features.
- Permission prompts only happen from explicit user action.

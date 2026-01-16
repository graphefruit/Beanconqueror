# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beanconqueror is a cross-platform coffee tracking mobile app built with Ionic/Angular/Capacitor. It runs on iOS, Android, and in the browser for development.

## Common Commands

```bash
# Install dependencies
npm install

# Development server (browser) - http://localhost:4200
npm start

# Run unit tests (headless Chrome)
npm test

# Run tests with browser UI
npm run test:dev

# Lint
npm run lint

# Build for production
npm run -- build --configuration 'production'

# Sync to mobile platforms
npm run capsync                    # Both platforms
npm run -- cap sync android        # Android only
npm run -- cap sync ios            # iOS only

# Open native IDE
npm run -- cap open android        # Android Studio
npm run -- cap open ios            # Xcode

# Live reload on device (requires env var due to platform-specific URL schemes)
CAPACITOR_PLATFORM_OVERRIDE=android npm run -- ionic capacitor run android --livereload --external
CAPACITOR_PLATFORM_OVERRIDE=ios npm run -- ionic capacitor run ios --livereload --external

# Generate protobuf types from bean.proto
npm run generate_proto
```

**Note:** Capacitor CLI commands require `CAPACITOR_PLATFORM_OVERRIDE=android|ios` environment variable due to platform-specific URL scheme configuration.

## Architecture Overview

### Directory Structure

- `src/app/` - Angular pages and feature modules (beans, brew, mill, preparation, water, roasting, graphs, settings)
- `src/services/` - Angular services for data access and business logic
- `src/classes/` - Core data models (non-injectable plain classes)
- `src/interfaces/` - TypeScript interfaces for all entities
- `src/enums/` - Constants for sorting, entity types, settings, etc.
- `src/components/` - Reusable UI components
- `src/assets/i18n/` - Translation files (JSON)

### Core Data Models (`src/classes/`)

- **Brew** - Shot/brew record with links to Bean, Preparation, Mill, Water
- **Bean** - Coffee bean profile (roast info, flavor notes, cupping scores)
- **Preparation** - Brewing method (Chemex, Espresso, AeroPress, etc.)
- **Mill** - Grinder specifications
- **Water** - Water profile with mineral content
- **Graph** - Reference extraction graphs
- **Settings** - App configuration

All entities extend a Config class providing `uuid` and `unix_timestamp` metadata.

### Storage Pattern

Services extend `StorageClass` which wraps Ionic Storage (IndexedDB → SQLite → LocalStorage fallback):

```
UIStorage (low-level wrapper)
    ↓
StorageClass (abstract base with retry logic - 20 attempts)
    ↓
UI*Storage (UIBeanStorage, UIBrewStorage, etc.)
    ↓
In-memory cache (storedData array)
```

Storage services use singleton pattern and emit RxJS Subject events on updates.

### Bluetooth Device Integration

Device classes extend base types in `src/classes/devices/`:

- `BluetoothScale` - Base for scales (Acaia, Decent, Felicita, Lunar, Skale, Timemore, etc.)
- `PressureDevice` - Pressure sensors
- `TemperatureDevice` - Thermometers
- `RefractometerDevice` - TDS meters

Device factories in `CoffeeBluetoothDevicesService` create instances based on device type. Communication uses Cordova BLE plugin (`declare var ble: any`).

### Event System

`EventQueueService` provides pub/sub pattern for app-wide events. Subscribe with `on(AppEventType)`, publish with `dispatch(AppEvent)`. Used for storage updates, device connections, and state changes.

### Helper Services

Business logic lives in helper services using singleton pattern:

- `UIBrewHelper` - Brew calculations, ratio, sorting
- `UIBeanHelper` - Bean validation, calculations
- `UIHelper` - General utilities (UUID generation, cloning, timestamps)

## Key Patterns

1. **Adding new storage:** Extend `StorageClass`, follow `UIBeanStorage` pattern
2. **Adding a device:** Extend `BluetoothScale` or specific device base, register in device factory
3. **Event handling:** Use `EventQueueService.on(AppEventType)` to subscribe, `dispatch()` to publish
4. **Business logic:** Create helper service with singleton instance
5. **Lazy-loaded modules:** Each feature (beans, brew, mill, etc.) has its own module

## Testing

Tests run with Karma/Jasmine in headless Chrome. Test files use `.spec.ts` suffix alongside source files.

**Important:** Always run `npm test` after completing any implementation to ensure all tests pass before committing.

## CI/CD Notes

This fork's CI runs on Node 22 with npm 10. If you need to update `package-lock.json`, regenerate it using npm 10 to ensure CI compatibility:

```bash
rm -rf node_modules package-lock.json
npx npm@10 install
```

This is necessary because different npm versions resolve dependencies differently and can produce incompatible lock files.

## Code Style

- Prettier with single quotes and semicolons
- SCSS for styling
- TypeScript strict mode

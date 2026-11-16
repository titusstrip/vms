# Architecture notes

## Mobile app

The mobile app uses an Expo-based React Native dashboard inspired by surveillance control rooms. The initial screen focuses on:

- camera grid
- live/recording/offline status
- event feed
- summary metrics

## API

The API is intentionally minimal at this stage. The goal is to expose a health endpoint and basic device metadata so that the frontend can be connected to a real backend later.

## Next steps

- add authentication / user session layer
- connect the mobile app to real camera metadata via API
- add detail screens for camera view, event logs, and alert management

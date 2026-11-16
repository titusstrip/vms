# VMS Mobile Starter

This repository is a starter monorepo for a mobile application inspired by a VMS (Video Management System) dashboard.

## Stack

- Mobile app: React Native + Expo + TypeScript
- API: NestJS + TypeScript
- Data model: mock camera streams + future API integration
- UI: dashboard with camera tiles, live status, alarms, and recent events

## Project structure

- `apps/mobile` — Expo mobile application
- `apps/api` — NestJS backend API
- `docs/` — architecture and product notes

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the API:
   ```bash
   npm run dev:api
   ```
3. Start the mobile app:
   ```bash
   npm run dev:mobile
   ```

## Initial goals

- Display a VMS dashboard with camera tiles
- Show alarms, events, and live status sorting
- Prepare a clean interface ready for real camera or stream integrations
- Provide a backend API skeleton for future authentication and device management

## Notes

This is a starter project, not a production-ready VMS solution. It is designed to be a clean base for further feature development.

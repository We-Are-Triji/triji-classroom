# Triji

Triji is an Expo React Native classroom app backed by Firebase. This repository has been trimmed down to the mobile app, Firebase rules, and the Cloud Function still used for scheduled cleanup.

## Requirements

- Node.js 18+
- npm
- Android Studio and/or Xcode as needed
- A Firebase project with Auth and Firestore enabled

## Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Install

```bash
npm install
```

## Run

```bash
npm start
npm run android
npm run ios
```

## Build

```bash
npm run build:android
npm run build:ios
npm run build:production
npm run update:preview
npm run update:production
```

## Firebase

Deploy Firestore rules with:

```bash
firebase deploy --only firestore:rules
```

The `functions/` folder contains the scheduled cleanup job for expired Freedom Wall posts.

## Structure

```text
.
├── App.js
├── app.json
├── assets/
├── functions/
├── src/
│   ├── components/
│   ├── config/
│   ├── context/
│   ├── navigation/
│   ├── screens/
│   └── utils/
├── eas.json
├── firebase.json
└── firestore.rules
```

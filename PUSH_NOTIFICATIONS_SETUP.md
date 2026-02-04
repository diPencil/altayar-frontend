## Push Notifications (Production Readiness)

This project implements **remote push notifications** using:

- **Frontend**: `expo-notifications` (Expo Push Token registration + permission prompts)
- **Backend**: stores `users.expo_push_token` and sends push via Expo Push API (`exp.host`)

### Current flow (end-to-end)

1) App requests notification permission and obtains an Expo Push Token
2) App calls `POST /notifications/token` to store the token for the current user
3) Backend sends push notifications when creating certain notifications

---

## Required production configuration (must-do before going live)

### 1) Set Expo EAS Project ID (required)

`frontend/app.json` currently has:

- `expo.extra.eas.projectId` (must be a real project id)

How to get it:

- If you already have an EAS project: use `eas project:info`
- Or create/link a project with `eas init`

Then put the projectId into:

- `frontend/app.json` → `expo.extra.eas.projectId`

### 2) Configure Push credentials (required)

#### Android (FCM)

- Upload FCM credentials to Expo/EAS (FCM V1 recommended)
- Without FCM configured, push may not deliver to Android devices reliably

#### iOS (APNs)

- Configure APNs key/cert in Expo/EAS
- Without APNs configured, push will not deliver to iOS devices

---

## Notes / behaviors

### Expo Go vs Dev Build vs Production Build

- Push tokens and push delivery are **reliable only on real devices**
- For production behavior, test with:
  - EAS Dev Build (recommended for testing)
  - Production build (final verification)

### Deep links / opening screens

Backend sends `data.url` / `data.action_url` in push payload.
Frontend listens for notification taps and will navigate to the route when it starts with `/`.

---

## Quick test plan

1) Build and install Dev Build on a **real device**
2) Login (any role), check the backend `users.expo_push_token` is populated
3) Trigger a backend notification targeted to that user (or role if admin/employee/agent)
4) Verify:
   - push appears on device
   - tapping it opens the app


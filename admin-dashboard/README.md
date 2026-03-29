# Triji Admin Dashboard

`admin-dashboard/` is the web admin panel for the same Firebase project used by the mobile app.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Environment

Copy `.env.example` to `.env` and provide the `VITE_FIREBASE_*` values for the same Firebase project as the app.

## Notes

- Admin authentication is enforced in the web client and in backend callables.
- Critical write actions use callable functions with role checks, sanitization, and rate limits.
- This dashboard intentionally shares the same data model as the mobile app.

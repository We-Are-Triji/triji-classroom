# Sentry Setup Guide for Triji App

> **Purpose:** Complete guide to set up Sentry error tracking for crash monitoring and debugging

> **⚠️ IMPORTANT:** This project uses `@sentry/react-native` (NOT `sentry-expo`). The `sentry-expo` package was deprecated and has been removed. All Sentry functionality is now handled through the native Sentry SDK with Expo compatibility.

---

## 📖 What is Sentry?

Sentry is a real-time error tracking and monitoring service that helps you:

- Track crashes and errors in production
- Get detailed stack traces and context
- Monitor performance issues
- Receive alerts when errors occur
- See breadcrumbs leading up to crashes

---

## 🚀 Setup Steps

### 1. Create a Sentry Account

1. Go to [https://sentry.io](https://sentry.io)
2. Click **"Sign Up"** (free tier available)
3. Choose **"Sign up with GitHub"** or use email

### 2. Create a New Project

1. After logging in, click **"Create Project"**
2. **Select Platform:** Choose **"React Native"**
3. **Set Alert Frequency:** Choose your preference (default is fine)
4. **Name your project:** `triji-app` (or any name you prefer)
5. Click **"Create Project"**

### 3. Get Your DSN (Data Source Name)

After creating the project, Sentry will show you a setup page:

1. Look for the **DSN** - it looks like:
   ```
   https://[KEY]@[ORGANIZATION].ingest.sentry.io/[PROJECT_ID]
   ```
2. Copy this entire URL

**Alternative way to find your DSN:**

- Navigate to **Settings** → **Projects** → **[Your Project]** → **Client Keys (DSN)**
- Copy the **DSN** value

### 4. Configure Your .env File

1. Open or create `.env` file in your project root:

   ```bash
   cd /workspaces/triji-app
   nano .env
   ```

2. Add your Sentry DSN:

   ```env
   # Sentry Error Tracking
   EXPO_PUBLIC_SENTRY_DSN=https://[YOUR_KEY]@[YOUR_ORG].ingest.sentry.io/[YOUR_PROJECT_ID]
   ```

3. Save the file (Ctrl+O, Enter, Ctrl+X if using nano)

### 5. Update sentry.properties (for EAS Build)

The file `sentry.properties` in your root directory should contain:

```properties
defaults.url=https://sentry.io/
defaults.org=[YOUR_ORGANIZATION_SLUG]
defaults.project=triji-app

# Auth tokens are not stored here - use environment variables or EAS secrets
```

**To get your organization slug:**

- Go to Sentry → **Settings** → **General Settings**
- Look for **Organization Slug** (usually your username or org name)

### 6. Set Up EAS Secrets (for Production Builds)

For secure builds, store your Sentry auth token as an EAS secret:

1. **Create a Sentry Auth Token:**
   - Go to Sentry → **Settings** → **Developer Settings** → **Auth Tokens**
   - Click **"Create New Token"**
   - Give it a name: `EAS Build Token`
   - Select scopes: `project:releases`, `project:write`, `org:read`
   - Click **"Create Token"**
   - Copy the token (you won't see it again!)

2. **Add to EAS Secrets:**
   ```bash
   eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value [YOUR_TOKEN]
   eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value [YOUR_DSN]
   ```

---

## 🔍 How to Find Your Sentry Credentials

### Finding Your Organization Slug

```
URL: https://sentry.io/settings/[YOUR_ORG]/
                                 ↑
                         This is your org slug
```

### Finding Your Project Name

```
URL: https://sentry.io/organizations/[YOUR_ORG]/projects/[PROJECT_NAME]/
                                                          ↑
                                                  This is your project
```

### Finding Your DSN

1. Go to: `https://sentry.io/settings/[YOUR_ORG]/projects/[PROJECT]/keys/`
2. Look for **Client Keys (DSN)**
3. Copy the entire DSN URL

---

## ✅ Verify Setup

### 1. Check if Sentry is Initialized

Start your app and check the console:

```bash
npx expo start --clear
```

You should see:

```
✓ Sentry initialized
```

If you see `Sentry DSN not configured`, check your `.env` file.

### 2. Test Error Tracking

### Test Error Tracking

Add a test error button in your app (temporary):

```javascript
import * as Sentry from '@sentry/react-native';

// In your component
<TouchableOpacity
  onPress={() => {
    Sentry.captureException(new Error('Test error from Triji app'));
  }}
>
  <Text>Test Sentry</Text>
</TouchableOpacity>;
```

After clicking, check Sentry dashboard:

1. Go to **Issues** tab
2. You should see "Test error from Triji app"

---

## 🎯 What Sentry Tracks in Your App

Your app is configured to track:

### 1. **Global Errors**

- JavaScript errors
- Unhandled promise rejections
- Fatal crashes

### 2. **React Errors**

- Component errors caught by ErrorBoundary
- Rendering errors with component stack

### 3. **Manual Errors**

- Errors logged via `logError()` utility
- Custom error tracking in try-catch blocks

### 4. **Context Information**

- User authentication state
- Device information
- App version
- Environment (development/production)

---

## 📊 Sentry Dashboard Overview

### Issues Tab

- See all errors and crashes
- Click on an issue to see:
  - Stack trace
  - Device/browser info
  - User context
  - Breadcrumbs (events leading to error)

### Performance Tab

- Monitor app performance
- See slow transactions
- Identify bottlenecks

### Releases Tab

- Track errors by version
- See which version has most errors
- Monitor deployment health

---

## 🔧 Configuration Details

### Current Sentry Setup in App

**Location:** `App.js` (lines 39-53)

```javascript
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enableInExpoDevelopment: false, // Disabled in dev
    debug: __DEV__, // Debug logs in dev mode
    environment: __DEV__ ? 'development' : Updates?.channel || 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 100% in dev, 20% in prod
  });
}
```

### Files That Use Sentry

1. **App.js**
   - Global error handler
   - Unhandled promise rejections

2. **src/components/ErrorBoundary.js**
   - React component errors
   - Rendering errors

3. **src/utils/errorHandler.js**
   - Logged errors from throughout the app
   - Firebase errors, network errors, etc.

---

## 🐛 Troubleshooting

### "Sentry DSN not configured" Message

**Problem:** DSN not found in environment variables

**Solutions:**

1. Check `.env` file exists in project root
2. Verify DSN is prefixed with `EXPO_PUBLIC_`
3. Restart Expo dev server: `npx expo start --clear`
4. For EAS builds, check secrets: `eas secret:list`

### Errors Not Showing in Sentry

**Problem:** Errors occur but don't appear in dashboard

**Solutions:**

1. Check DSN is correct (test it by visiting the URL)
2. Ensure you're using a production/development build (not Expo Go for some features)
3. Check network connection
4. Verify error isn't caught and silently handled
5. Check Sentry project quota (free tier has limits)

### "Invalid DSN" Error

**Problem:** DSN format is incorrect

**Solution:**

- DSN must be complete URL: `https://[key]@[org].ingest.sentry.io/[id]`
- Don't include extra spaces or quotes
- Copy directly from Sentry dashboard

### Sentry Slowing Down App

**Problem:** Too many errors being tracked

**Solutions:**

1. Filter out noisy errors in Sentry settings
2. Reduce `tracesSampleRate` in production
3. Add error filtering logic before `captureException()`

---

## 🔐 Security Best Practices

### ✅ DO:

- Store DSN in `.env` file (gitignored)
- Use EAS secrets for production builds
- Rotate auth tokens periodically
- Set up IP allowlisting in Sentry (optional)

### ❌ DON'T:

- Commit `.env` file to Git
- Share your auth token publicly
- Include sensitive user data in error reports
- Log passwords or API keys

---

## 📈 Best Practices

### 1. Organize Errors with Tags

```javascript
Sentry.captureException(error, {
  tags: {
    context: 'Login',
    feature: 'Authentication',
  },
});
```

### 2. Add User Context

```javascript
Sentry.setUser({
  id: user.uid,
  email: user.email,
});
```

### 3. Add Breadcrumbs

```javascript
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to Dashboard',
  level: 'info',
});
```

### 4. Filter Sensitive Data

In `sentry.properties`, add:

```properties
defaults.beforeSend=function(event) {
  // Filter out sensitive data
  return event;
}
```

---

## 💰 Sentry Pricing

### Free Tier (Developer)

- 5,000 errors/month
- 10,000 performance units/month
- 30-day data retention
- **Perfect for this project!**

### Paid Tiers

- Team: $26/month (50k errors)
- Business: $80/month (custom)

**Note:** Triji app should stay well within free tier limits.

---

## 🔗 Useful Links

- **Sentry Dashboard:** https://sentry.io/organizations/[YOUR_ORG]/
- **React Native Docs:** https://docs.sentry.io/platforms/react-native/
- **Expo Integration:** https://docs.expo.dev/guides/using-sentry/
- **Sentry CLI:** https://docs.sentry.io/cli/

---

## ✨ Summary

### Quick Setup Checklist

- [ ] Create Sentry account
- [ ] Create React Native project in Sentry
- [ ] Copy DSN from Sentry dashboard
- [ ] Add DSN to `.env` file: `EXPO_PUBLIC_SENTRY_DSN=...`
- [ ] Update `sentry.properties` with org slug and project name
- [ ] Restart Expo dev server: `npx expo start --clear`
- [ ] Verify "Sentry initialized" appears in console
- [ ] Test by triggering an error
- [ ] Check Sentry dashboard for the error
- [ ] For production: Add DSN and auth token to EAS secrets

---

**Need Help?**

- Sentry Support: https://sentry.io/support/
- Triji App Issues: Create an issue on GitHub

**Last Updated:** November 17, 2025

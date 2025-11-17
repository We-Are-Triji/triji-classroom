# Changelog

All notable changes to Triji will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- semantic-release-insert-here -->

## [1.6.0](https://github.com/gauciv/triji-app/compare/v1.5.1...v1.6.0) (2025-11-17)


### ✨ Features

* add sentry to automate crash report ([73627be](https://github.com/gauciv/triji-app/commit/73627be1d083ef8c16813e4b6bf89bc0c2c28afa))


### 🐛 Bug Fixes

* apply graceful error handling for sentry ([194c3d5](https://github.com/gauciv/triji-app/commit/194c3d50d235b217a726d8279c8d97edb240d29a))
* resolve abrupt crush and utilize sentry ([d2249ec](https://github.com/gauciv/triji-app/commit/d2249ec29e260b194294d11f101c439571b7de66))
* resolve duplicate sentry setup ([2d309a9](https://github.com/gauciv/triji-app/commit/2d309a9dfba61aaed50a178f12e24e29b0220dd8))
* unresponsive notifications ([7099d06](https://github.com/gauciv/triji-app/commit/7099d06741120bb3bb728fc1f0420d471599aabc))

## [1.5.1](https://github.com/gauciv/triji-app/compare/v1.5.0...v1.5.1) (2025-11-15)


### 🐛 Bug Fixes

* improve notification reliability for Freedom Wall, Tasks, and Announcements ([8b11068](https://github.com/gauciv/triji-app/commit/8b110688c1575599159c84860648ade80a9b2650))
* prevent random crashes with batch deletes, mounted checks, and global error handler ([71a24d7](https://github.com/gauciv/triji-app/commit/71a24d7080eb0f64da9191f22e1f277b69b660d1))
* resolve immediate crash on app reopen with comprehensive error handling ([5d108fb](https://github.com/gauciv/triji-app/commit/5d108fb8a9d5db6bfeeacc508e66c971a976c254))

## [1.5.0](https://github.com/gauciv/triji-app/compare/v1.4.1...v1.5.0) (2025-11-15)


### ✨ Features

* reduce amount of listeners on dashboard screen and apply aggressive caching ([d4ac7b8](https://github.com/gauciv/triji-app/commit/d4ac7b866b95e191983e6a9d7b072d081faca563))


### 🐛 Bug Fixes

* enforce strict 24-hour lifespan for Freedom Wall posts ([ad7943a](https://github.com/gauciv/triji-app/commit/ad7943a10e2d5e99d6abe358a416e6d89bf21acf))

## [1.4.1](https://github.com/gauciv/triji-app/compare/v1.4.0...v1.4.1) (2025-11-14)


### 🐛 Bug Fixes

* enable liking for all users and reduce freedom wall post lifespan to 24h ([f953a99](https://github.com/gauciv/triji-app/commit/f953a998ea74701ccb4bae176f49ba8308d3e289))

## [1.4.0](https://github.com/gauciv/triji-app/compare/v1.3.1...v1.4.0) (2025-11-14)


### ✨ Features

* modify loading screen version and settings ([474928a](https://github.com/gauciv/triji-app/commit/474928a637f7d517b6647e0ae39051d0f39af7d1))

## [1.3.1](https://github.com/gauciv/triji-app/compare/v1.3.0...v1.3.1) (2025-11-14)


### 🐛 Bug Fixes

* **updates:** add production channel to enable OTA updates ([91ab056](https://github.com/gauciv/triji-app/commit/91ab056e2041e333f52eb840e6af947d12d7055b))

## [1.3.0](https://github.com/gauciv/triji-app/compare/v1.2.0...v1.3.0) (2025-11-14)


### ✨ Features

* add haptic feedback and improve animations ([11536c4](https://github.com/gauciv/triji-app/commit/11536c41c1cabdd87ff87eec86027955b644077e))

## [1.2.0](https://github.com/gauciv/triji-app/compare/v1.1.2...v1.2.0) (2025-11-14)


### ✨ Features

* **announcements:** news full view layout optimization ([5916bb2](https://github.com/gauciv/triji-app/commit/5916bb29d30f1c210f583af45cd01f71293f8933))


### 🐛 Bug Fixes

* **deps:** sync async-storage version to 1.24.0 in package-lock.json ([f8ff635](https://github.com/gauciv/triji-app/commit/f8ff635b4cb65917d68d802b2ff4be3d683df064))
* resolve announcement section not loading anything ([ffbfe7f](https://github.com/gauciv/triji-app/commit/ffbfe7f7652fa9d805d3937d5b874d135fac1efe))
* resolve package json lock on job failure ([54de111](https://github.com/gauciv/triji-app/commit/54de1115747a140d72d88602eabdb9e00391bff0))
* resolve unfriendly offline feedback ([140c4ee](https://github.com/gauciv/triji-app/commit/140c4ee93b4484943d12d68ead52761db8f171fe))
* **tests:** update test expectations to match implementation and sync package-lock.json ([7fe11d0](https://github.com/gauciv/triji-app/commit/7fe11d0164d9678dbbdd892ddfefe62440c36cfc))

## [1.1.2](https://github.com/gauciv/triji-app/compare/v1.1.1...v1.1.2) (2025-11-14)


### 🐛 Bug Fixes

* ensure semantic-release deployment triggers after GitHub release creation ([dc26280](https://github.com/gauciv/triji-app/commit/dc2628073f1944d54aa83532ad2fb10f2f2873da))

## [1.1.1](https://github.com/gauciv/triji-app/compare/v1.1.0...v1.1.1) (2025-11-14)


### 🐛 Bug Fixes

* reorder semantic-release plugins to ensure EAS deployment triggers ([4958a3e](https://github.com/gauciv/triji-app/commit/4958a3e3d0b65ee6903b97bd9cd8d83c93f91729))

## [1.1.0](https://github.com/gauciv/triji-app/compare/v1.0.0...v1.1.0) (2025-11-14)


### ✨ Features

* polish notification messages ([0738036](https://github.com/gauciv/triji-app/commit/07380362f52ddc2a7959f6927dac5e662baad3d3))
* **ui:** create recent updates function for collective updates ([739573f](https://github.com/gauciv/triji-app/commit/739573f54ed0314f943c9e6e6d20c8d21ff6d7d8))
* use safe area insets for android with bottom bar navigations ([abbba4e](https://github.com/gauciv/triji-app/commit/abbba4e3b74d55a07ddde89ce1c8fba9cb5aca2f))
* utilize firebase persistence instead of manual user session check ([4f2babb](https://github.com/gauciv/triji-app/commit/4f2babba58d6b149adf59c56ca5019fd2559b44b))


### 🐛 Bug Fixes

* resolve activity card not mapping to full view ([6ffd2cf](https://github.com/gauciv/triji-app/commit/6ffd2cf8e6e33ed1e76ef91051c621c042d29688))
* resolve duplicate config error ([7859f2d](https://github.com/gauciv/triji-app/commit/7859f2d2930584e88df09a0f72bd07d3f43e63a1))
* resolve logout issue on app exit ([195cccc](https://github.com/gauciv/triji-app/commit/195cccc7fd0c6d97ba361852c1319ada134e7ba0))
* resolve responsiveness issue on task cards ([b3fcb32](https://github.com/gauciv/triji-app/commit/b3fcb326a491c6b8491a45fb13d8cd9ca76fc621))
* resolve task full detail responsiveness ([91385c2](https://github.com/gauciv/triji-app/commit/91385c2e72418c50ac10ace17ea99c885690287b))


### 📚 Documentation

* create CONTEXT file ([cae11e8](https://github.com/gauciv/triji-app/commit/cae11e8e4630e2786db990df7e529c44d1098eb8))
* create versioning strategy and guide ([20e1060](https://github.com/gauciv/triji-app/commit/20e1060994ccddfea3f07055a280974e3821721a))
* setup README file ([1277af4](https://github.com/gauciv/triji-app/commit/1277af4569c8b0e0472648c276d926a0d265eca9))


### 👷 CI/CD

* configure workflow to bypass branch protection for releases ([8aae29d](https://github.com/gauciv/triji-app/commit/8aae29d80c2edffe6f3c0841399ca1a3dec86209))
* test aupdate and build automation ([0da5af1](https://github.com/gauciv/triji-app/commit/0da5af1ba6a8985528d60d805fe1d54204ddd12d))
* update Node.js version to 20 for semantic-release compatibility ([5ec9ce2](https://github.com/gauciv/triji-app/commit/5ec9ce204aacd29a4179f6aeaa249b2edca23fb7))

# Changelog

All notable changes to Triji will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-11-14

### 🐛 Bug Fixes
- Add ProGuard optimization to reduce APK size by 60%
- Fix safe area insets for Android button navigation
- Resolve task field compatibility between admin and user formats
- Fix date parsing for Firestore Timestamps

### ✨ Features
- Implement unified dashboard feed showing recent updates
- Add enhanced notifications with emojis and type-specific channels
- Configure EAS Update production channel for OTA updates

### ⚡ Performance Improvements
- Enable resource shrinking in production builds
- Optimize asset bundling patterns
- Implement text truncation for responsive card layouts

### 📚 Documentation
- Add comprehensive CONTEXT.md for AI agents
- Create SOCIAL_MEDIA_SPECS.md for marketing content
- Add detailed README.md with setup instructions

## [1.0.0] - 2025-11-13

### ✨ Features
- Initial release of Triji mobile app
- Task management with deadline tracking
- Announcement system with type categorization
- Freedom Wall for anonymous student posts
- Real-time Firestore synchronization
- Firebase Authentication (email/password)
- Offline support with data persistence
- Local push notifications
- Grade calculator utility
- User profile management

### 🎨 Design
- Dark mode theme with neon green accents
- Bottom tab navigation with safe area support
- Responsive UI for various screen sizes
- Inter font family for clean typography

### 🔐 Security
- Firestore security rules
- ProGuard code obfuscation
- Environment variable protection

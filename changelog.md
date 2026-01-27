# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to a custom versioning scheme:
`MAJOR.FEATURE.PATCH.DEV`
- `MAJOR`: Main version, do not change unless told.
- `FEATURE`: Major feature additions.
- `PATCH`: Major bug fixes or minor improvements.
- `DEV`: Minor changes, bug fixes, or incremental updates.

## [0.2.2.d] - 2026-01-22

### Added
- Comprehensive Moderation System:
    - Dedicated Moderator Dashboard with tabbed navigation.
    - Maintenance Alerts: Moderators can set system-wide messages and scheduled restarts.
    - Temporary Bans: Support for time-based bans via report actioning.
    - Banned Words System: Global filtering of prohibited words in posts.
    - User Reporting: Ability for users to report profiles and posts for review.
- Support for moderator identifying flags in messages.

## [0.2.1.a] - 2026-01-22

### Fixed
- Enforced character creation limits by verifying counts against the database.
- Fixed handle display issue where double "@@" appeared in various parts of the UI.
- Improved Light Mode implementation across Sidebar, Feed, Profile, and Settings views.

## [0.2.0.a] - 2026-01-22

### Added
- Profile Customization: bio, avatar, pronouns, and custom character fields.
- Better Settings: General (Light/Dark mode, Font size), Privacy (Block management), Support.
- Blocking System: Users can block others from their feed and profile.
- Support Messaging: "Contact Support" sends a message directly to admins.
- Registration Rules: New users must accept rules and disclaimers before applying.

## [0.1.0.b] - 2026-01-22

### Added
- Commenting system (UI and Database).
- Changelog part of the website.
- `changelog.md` file to the repository.
- Share button for posts.
- Base project structure with Supabase integration.
- User and Character account types.
- Login and Registration system with moderation queue.

### Changed
- Refined UI layout with sidebar and trending sections.
- Dynamic trending hashtags based on actual post content.

### Fixed
- Hashtag post counts are now accurate and dynamic.
- Enlarged comments modal and improved input area for better usability.
- Implemented comment liking system.

### Removed
- Placeholder AI buttons and functionality (as requested).
- Reposting button functionality (as requested).

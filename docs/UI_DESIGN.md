# Rewind UI Design Specifications

## Overview
This document outlines the user interface design for Rewind, a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+ who enjoy rediscovering older episodes, particularly comedy podcasts. The UI follows a standard mobile app look with a fixed header, bottom action bar, and floating media player, prioritizing simplicity, thumb-friendly navigation, and accessibility for the target audience.

## Design Principles
- **Mobile-First**: Optimized for smartphone screens (e.g., 375px–414px width).
- **Thumb-Friendly**: Large touch targets (minimum 48x48 pixels) for easy navigation.
- **Color Scheme**: Red theme with primary color #eb4034 and secondary color #c72e20.
- **Typography**: High-contrast, WCAG 2.1 compliant (4.5:1 contrast ratio), using system fonts (e.g., Roboto or SF Pro) for consistency.
- **Accessibility**: Screen reader support, ARIA labels for interactive elements, clear focus states.
- **Loading States**: Skeleton screens for perceived performance during data fetching.

## Key UI Components

### Header
- **Description**: Fixed at the top of all screens, providing navigation and context.
- **Elements**:
  - **Menu Button**: Hamburger icon (left) opens side menu.
  - **Title/Logo**: Centered, shows app name ("Rewind") or section title (e.g., "Home").
  - **Contextual Action**: Right side, varies by screen (e.g., "Add Podcast" button on Library).
- **Design**:
  - Background: Red or white with red text/icons.
  - Height: ~56px for thumb accessibility.
  - ARIA label for menu button: "Open navigation menu".

### Bottom Action Bar
- **Description**: Fixed navigation bar at the bottom for core app sections.
- **Elements**:
  - **Home Button**: Navigates to recommendations list (house icon, label: "Home").
  - **Library Button**: Shows subscribed podcasts (books icon, label: "Library").
  - **Search Button**: Allows library search (magnifying glass icon, label: "Search").
- **Design**:
  - Large touch targets (48x48 pixels).
  - Red background with white icons/text.
  - Selected state: Highlighted icon (e.g., filled icon or underline).
  - ARIA labels: e.g., "Navigate to Home".

### Side Menu
- **Description**: Accessible via header menu button, slides in from the left.
- **Options**:
  - Profile: View/edit name, email.
  - Add Podcast: Navigates to RSS feed input form.
  - Share Library: Generates shareable URL.
  - Settings: Toggles for notifications, theme preferences.
  - Logout: Ends user session.
- **Design**:
  - Full-height, ~80% screen width.
  - Dismissible via swipe or close button.
  - Red accent for selected items.
  - ARIA label: "Navigation menu".

### Home Screen
- **Description**: Displays a scrollable list of recommended episodes, the default landing screen.
- **Elements**:
  - **Filter Pills**: Clickable pills at the top for filtering recommendations ("Not Recently Heard," "Favorites," "Favorite Guests").
  - **Episode List**: Scrollable list of episode cards.
- **Design**:
  - Filters: Rounded pills, red outline, filled when selected.
  - Default filter: "Not Recently Heard".
  - Skeleton screens during loading.
  - ARIA label for filters: "Filter recommendations".

### Library Screen
- **Description**: Displays subscribed podcasts for management.
- **Elements**:
  - **Podcast List**: Grid or list of podcast cards with:
    - Thumbnail (~80x80 pixels).
    - Podcast title.
    - Unread episode count (badge, e.g., "3 new").
    - New episode indicator (e.g., red dot).
  - **Actions per Podcast**:
    - View episodes (navigates to episode list).
    - Unsubscribe (confirmation prompt).
  - **Add Podcast Button**: In header or as a floating action button (FAB).
  - **Share Library Button**: In header or side menu.
- **Design**:
  - Grid layout: 2 columns on wider screens, 1 on narrow.
  - Skeleton screens for loading.
  - ARIA labels: e.g., "View podcast episodes".

### Search Screen
- **Description**: Allows full-text search within the user's library (episode titles, descriptions, guests).
- **Elements**:
  - **Search Bar**: At the top, placeholder: "Search your episodes…".
  - **Results List**: Episode cards for matching results.
- **Design**:
  - Highlight matching text in results (e.g., bolded keywords).
  - Skeleton screens for loading.
  - ARIA label for search bar: "Search library".

### Episode Details Page
- **Description**: Displays when an episode is selected from Home, Library, or Search.
- **Elements**:
  - Podcast thumbnail.
  - Episode title.
  - Podcast name.
  - Release date (e.g., "Jan 15, 2023").
  - Duration (e.g., "45 min").
  - Description.
  - Guest names (if available).
  - Favorite button (heart icon, toggleable).
  - Play button (launches floating media player).
- **Design**:
  - Clean layout with thumbnail at top, details below.
  - Red accents for buttons.
  - ARIA labels: e.g., "Toggle favorite".

### Episode Cards
- **Description**: Used in Home, Search, and podcast-specific episode lists.
- **Elements**:
  - Podcast thumbnail (~80x80 pixels).
  - Episode title (truncated if long).
  - Podcast name.
  - Release date (e.g., "Jan 15, 2023").
  - Duration (e.g., "45 min").
  - Play button (prominent, red background).
  - AI explanation button (small icon, e.g., "i" in circle).
  - Progress indicator (if partially listened).
- **Design**:
  - Card layout with subtle shadow/border.
  - Red accents for interactive elements.
  - Clear typography hierarchy.
  - ARIA labels: e.g., "Play episode", "Get AI explanation".

### Floating Media Player
- **Description**: Persistent player that appears when an episode is playing.
- **States**:
  - **Minimized**: Shows at bottom of screen, doesn't block content.
    - Episode title and podcast name.
    - Play/pause button.
    - Progress bar (tap to seek).
    - Expand button to show full player.
  - **Expanded**: Full-screen or large overlay player.
    - Large episode thumbnail.
    - Episode title, podcast name, release date.
    - Full playback controls (play/pause, 15s back/forward, speed).
    - Progress bar with time indicators.
    - Volume control.
    - Minimize button to return to mini player.
- **Design**:
  - Red theme with high contrast.
  - Large touch targets for all controls.
  - Smooth animations between states.
  - Supports MediaSession API for lock screen controls.
  - ARIA labels for all playback controls.

### Loading States
- **Skeleton Screens**: Use for all content loading (episode lists, podcast details).
- **Spinners**: Small spinners for button actions (e.g., adding podcast).
- **Progress Indicators**: Show RSS feed sync progress, audio loading.

### Responsive Design
- **Breakpoints**:
  - Mobile: 320px - 768px (primary focus).
  - Tablet: 768px - 1024px (2-column layout for library).
  - Desktop: 1024px+ (3-column layout, side navigation).
- **Adaptations**:
  - Header remains fixed across all sizes.
  - Bottom action bar only on mobile/tablet.
  - Side menu becomes permanent sidebar on desktop.
  - Episode cards adjust layout based on screen width.

### Accessibility Features
- **Screen Reader Support**: All interactive elements have proper ARIA labels.
- **Keyboard Navigation**: Full app navigable via keyboard with visible focus indicators.
- **High Contrast**: Text meets WCAG 2.1 AA contrast requirements (4.5:1).
- **Font Scaling**: Supports system font size preferences.
- **Reduced Motion**: Respects user's motion preferences for animations.

### Dark Mode (Future Enhancement)
- **Toggle**: Available in side menu settings.
- **Colors**: Dark background with light text, red accents maintained.
- **Images**: Overlay dark tint on bright episode thumbnails for better contrast.

## Notes for AI Agent
- Follow mobile-first design principles in all implementations.
- Use semantic HTML elements for better accessibility.
- Implement designs with React components and Tailwind CSS.
- Test designs on multiple device sizes and screen readers.
- Ensure all touch targets meet minimum 48x48 pixel requirement.
- Use progressive enhancement for advanced features.
- Commit design implementations to Git after completing each component.
- Report design inconsistencies or unclear requirements in PLAN.md.

## References
- UI_TECH.md: Technical implementation details.
- PWA_FEATURES.md: Progressive Web App requirements.
- PLAN.md: Development milestones and task tracking.
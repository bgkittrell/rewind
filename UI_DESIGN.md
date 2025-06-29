# Rewind UI Design Specifications

## Overview
This document outlines the user interface design for Rewind, a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+ who enjoy rediscovering older episodes, particularly comedy podcasts. The UI follows a standard mobile app look with a fixed header, bottom action bar, and floating media player, prioritizing simplicity, thumb-friendly navigation, and accessibility for the target audience.

## Design Principles
- **Mobile-First**: Optimized for smartphone screens (e.g., 375px–414px width).
- **Thumb-Friendly**: Large touch targets (minimum 48x48 pixels) for easy navigation.
- **Color Scheme**: Blue-green (teal) theme, hex codes TBD by design team (e.g., #26A69A as placeholder).
- **Typography**: High-contrast, WCAG 2.1 compliant (4.5:1 contrast ratio), using system fonts (e.g., Roboto or SF Pro) for consistency.
- **Accessibility**: Screen reader support, ARIA labels for interactive elements, clear focus states.
- **Loading States**: Skeleton screens for perceived performance during data fetching.

## Key UI Components

### Header
- **Description**: Fixed at the top of all screens, providing navigation and context.
- **Elements**:
  - **Menu Button**: Hamburger icon (left) opens side menu.
  - **Title/Logo**: Centered, shows app name (“Rewind”) or section title (e.g., “Home”).
  - **Contextual Action**: Right side, varies by screen (e.g., “Add Podcast” button on Library).
- **Design**:
  - Background: Teal or white with teal text/icons.
  - Height: ~56px for thumb accessibility.
  - ARIA label for menu button: “Open navigation menu”.

### Bottom Action Bar
- **Description**: Fixed navigation bar at the bottom for core app sections.
- **Elements**:
  - **Home Button**: Navigates to recommendations list (house icon, label: “Home”).
  - **Library Button**: Shows subscribed podcasts (books icon, label: “Library”).
  - **Search Button**: Allows library search (magnifying glass icon, label: “Search”).
- **Design**:
  - Large touch targets (48x48 pixels).
  - Teal background with white icons/text.
  - Selected state: Highlighted icon (e.g., filled icon or underline).
  - ARIA labels: e.g., “Navigate to Home”.

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
  - Teal accent for selected items.
  - ARIA label: “Navigation menu”.

### Home Screen
- **Description**: Displays a scrollable list of recommended episodes, the default landing screen.
- **Elements**:
  - **Filter Pills**: Clickable pills at the top for filtering recommendations (“Not Recently Heard,” “Favorites,” “Favorite Guests”).
  - **Episode List**: Scrollable list of episode cards.
- **Design**:
  - Filters: Rounded pills, teal outline, filled when selected.
  - Default filter: “Not Recently Heard”.
  - Skeleton screens during loading.
  - ARIA label for filters: “Filter recommendations”.

### Library Screen
- **Description**: Displays subscribed podcasts for management.
- **Elements**:
  - **Podcast List**: Grid or list of podcast cards with:
    - Thumbnail (~80x80 pixels).
    - Podcast title.
    - Unread episode count (badge, e.g., “3 new”).
    - New episode indicator (e.g., teal dot).
  - **Actions per Podcast**:
    - View episodes (navigates to episode list).
    - Unsubscribe (confirmation prompt).
  - **Add Podcast Button**: In header or as a floating action button (FAB).
  - **Share Library Button**: In header or side menu.
- **Design**:
  - Grid layout: 2 columns on wider screens, 1 on narrow.
  - Skeleton screens for loading.
  - ARIA labels: e.g., “View podcast episodes”.

### Search Screen
- **Description**: Allows full-text search within the user’s library (episode titles, descriptions, guests).
- **Elements**:
  - **Search Bar**: At the top, placeholder: “Search your episodes…”.
  - **Results List**: Episode cards for matching results.
- **Design**:
  - Highlight matching text in results (e.g., bolded keywords).
  - Skeleton screens for loading.
  - ARIA label for search bar: “Search library”.

### Episode Details Page
- **Description**: Displays when an episode is selected from Home, Library, or Search.
- **Elements**:
  - Podcast thumbnail.
  - Episode title.
  - Podcast name.
  - Release date (e.g., “Jan 15, 2023”).
  - Duration (e.g., “45 min”).
  - Description.
  - Guest names (if available).
  - Favorite button (heart icon, toggleable).
  - Play button (launches floating media player).
- **Design**:
  - Clean layout with thumbnail at top, details below.
  - Teal accents for buttons.
  - ARIA labels: e.g., “Toggle favorite”.

### Episode Cards
- **Description**: Used in Home, Search, and podcast-specific episode lists.
- **Elements**:
  - Podcast thumbnail (~80x80 pixels).
  - Episode title (truncated if long).
  - Podcast name.
  - Release date (e.g., “Jan 15, 202

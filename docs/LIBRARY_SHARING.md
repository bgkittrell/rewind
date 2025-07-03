# Rewind Library Sharing Specifications

## Overview

This document outlines the library sharing feature for Rewind, enabling users to generate a unique, read-only URL to share their subscribed podcast list with others. The feature supports the mobile-first PWA design for podcast enthusiasts aged 35+, aligning with UI requirements (see UI_DESIGN.md) and backend APIs (see BACKEND_API.md).

## UI Implementation

- **Access Points**:
  - “Share Library” button in the header or side menu (per UI_DESIGN.md).
  - Triggered from the Library screen or Side Menu.
- **Generate Share Flow**:
  - User clicks “Share Library.”
  - Displays a modal with a generated URL (e.g., `https://rewindpodcast.com/share/abc123`).
  - Copy button for the URL, styled with teal theme (#26A69A).
  - Success message (e.g., “Link copied to clipboard!”).
- **Shared View**:
  - Public, read-only page via the shared URL.
  - Displays a list of subscribed podcasts with thumbnails, titles, and brief descriptions.
  - No user data (e.g., listening history) exposed.
  - Branded note (e.g., “Shared via Rewind”) and app logo placeholder.
- **Design Notes**:
  - Minimum 48x48 pixel touch targets for buttons.
  - High-contrast text for accessibility.
  - Skeleton screens during URL generation.

## Backend Implementation

- **API Endpoints**:
  - **Generate Share Link** (`POST /share/generate`):
    - Request: `{ "podcastIds": ["67890", "69123"] }\`
    - Response: `{ "shareId": "abc123", "url": "https://rewindpodcast.com/share/abc123" }\`
    - Logic: Validate `podcastIds` belong to the user, generate a UUID `shareId`, store with 30-day TTL.
  - **Add Podcasts from Share** (`POST /share/:shareId`):
    - Response: `{ "message": "Podcasts added to library", "addedPodcastIds": ["67890", "69123"] }\`
    - Logic: Validate `shareId`, check for duplicates, add new podcasts to user’s library.
- **Storage**:
  - DynamoDB table (`RewindDataTable` from DATABASE.md):
    - `pk`: `SHARE#<shareId>`
    - `sk`: `USER#<userId>`
    - Attributes: `podcastIds` (List), `expiresAt` (String, ISO format).
  - Index: `ShareIndex` for quick lookup by `shareId`.
- **Logic**:
  - Lambda function (`shareHandler`) generates `shareId` and URL.
  - EventBridge cleans up expired shares daily.
  - Public endpoint serves read-only data via API Gateway.

## Testing

- **Unit Tests**:
  - Verify URL generation and validation (Vitest).
  - Test duplicate podcast handling (Vitest).
- **Integration Tests**:
  - Simulate share generation and addition flow.
  - Test expired `shareId` rejection.
- **UI Tests**:
  - Ensure modal displays correctly in Storybook.
  - Verify copy button functionality.

## Security

- **Access Control**: JWT authentication for generation, public read-only for shared view.
- **TTL**: 30-day expiration on `shareId`.
- **Data Exposure**: Limit to podcast metadata, no personal data.

## Notes for AI Agent

- Implement UI modal with React and Tailwind CSS.
- Develop Lambda function with Node.js and TypeScript.
- Use UUID v4 for `shareId` generation.
- Commit changes to Git after completing UI and backend.
- Report issues (e.g., URL format needs) in PLAN.md.

## References

- UI_DESIGN.md: Share button and view design.
- UI_TECH.md: Frontend setup.
- BACKEND_API.md: Share endpoints.
- BACKEND_LOGIC.md: Backend logic integration.
- DATABASE.md: DynamoDB schema.
- PLAN.md: Task list and milestones.

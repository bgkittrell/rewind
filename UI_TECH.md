# Rewind UI Technical Specifications

## Overview
This document details the technical implementation of the Rewind frontend, a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+ to rediscover older episodes. The frontend is built with Router 7, TypeScript, Tailwind CSS, and Vite, ensuring a lightweight, responsive, and offline-capable interface. It integrates with backend APIs (see BACKEND_API.md) and supports accessibility, Bluetooth/AirPlay playback, and library sharing.

## Technology Stack
- Framework: Router 7 with TypeScript for routing and logic.
- Styling: Tailwind CSS for responsive, utility-first design.
- Build Tool: Vite for fast development and production builds.
- PWA: Workbox for service worker and offline capabilities (see PWA_FEATURES.md).
- Testing: Storybook for component development, Vitest for unit and Storybook tests, MSW for mocking API calls.
- State Management: React Context or local storage/IndexedDB for persistence.

## Project Setup
- Initialize Project:
<codeblock language="bash">
npm create vite@latest rewind-frontend --template react-ts
cd rewind-frontend
npm install
</codeblock>
- Install Dependencies:
<codeblock language="bash">
npm install react-router-dom tailwindcss postcss autoprefixer @tailwindcss/vite workbox-window vitest @testing-library/react @testing-library/user-event @vitejs/plugin-react msw
</codeblock>
- Configure Tailwind CSS:
  - Initialize Tailwind:
<codeblock language="bash">
npx tailwindcss init -p
</codeblock>
  - Update `tailwind.config.js`:
<codeblock language="javascript">
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: "#26A69A", // Placeholder, TBD by design team
      },
    },
  },
  plugins: [],
};
</codeblock>
  - Add to `src/index.css`:
<codeblock language="css">
@tailwind base;
@tailwind components;
@tailwind utilities;
</codeblock>
- Set Up Storybook:
<codeblock language="bash">
npx storybook@latest init
</codeblock>
- Configure Vitest:
  - Update `vite.config.ts`:
<codeblock language="typescript">
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Rewind",
        short_name: "Rewind",
        theme_color: "#26A69A",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
</codeblock>
  - Create `src/setupTests.ts`:
<codeblock language="typescript">
import "@testing-library/jest-dom";
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers";

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
</codeblock>
- Configure MSW for Mocking:
  - Install MSW:
<codeblock language="bash">
npm install msw --save-dev
</codeblock>
  - Create `src/mocks/handlers.ts`:
<codeblock language="typescript">
import { rest } from "msw";

export const handlers = [
  rest.get("/api/recommendations", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: "1",
          title: "Test Episode",
          podcastName: "Test Podcast",
          releaseDate: "2023-01-15",
          duration: "45 min",
        },
      ])
    );
  }),
  rest.post("/api/podcasts/add", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ podcastId: "123" }));
  }),
  // Add more handlers for other endpoints (see BACKEND_API.md)
];
</codeblock>
  - Create `src/mocks/browser.ts` for browser-based testing (if needed):
<codeblock language="typescript">
import { setupWorker } from "msw";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
</codeblock>
- Configure Vite for PWA:
  - Install `vite-plugin-pwa`:
<codeblock language="bash">
npm install vite-plugin-pwa
</codeblock>
  - Update `vite.config.ts` (see above for combined config).

## Component Structure
- Core Components:
  - `Header.tsx`: Fixed header with menu button, title, and contextual action.
  - `BottomActionBar.tsx`: Fixed navigation bar with Home, Library, Search buttons.
  - `SideMenu.tsx`: Slide-in menu with Profile, Add Podcast, Share Library, Settings, Logout.
  - `EpisodeCard.tsx`: Displays episode details (thumbnail, title, podcast name, release date, duration, AI explanation button).
  - `FloatingMediaPlayer.tsx`: Mini and expanded player for playback control.
  - `FilterPills.tsx`: Clickable filter pills for recommendations.
  - `PodcastCard.tsx`: Displays podcast details in Library (thumbnail, title, unread count).
- Directory:

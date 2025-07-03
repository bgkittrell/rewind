# Rewind UI Technical Specifications

## Overview

This document details the technical implementation of the Rewind frontend, a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+ to rediscover older episodes. The frontend is built with React Router v7, TypeScript, Tailwind CSS, and Vite, ensuring a lightweight, responsive, and offline-capable interface. It integrates with backend APIs (see BACKEND_API.md) and supports accessibility, Bluetooth/AirPlay playback, and library sharing.

## Technology Stack

- Framework: React Router v7 with TypeScript for routing and logic.
- Styling: Tailwind CSS for responsive, utility-first design.
- Build Tool: Vite for fast development and production builds.
- PWA: Workbox for service worker and offline capabilities (see PWA_FEATURES.md).
- Testing: Playwright for e2e testing with screenshot generation, Storybook for component development and visual testing, Vitest for unit and integration tests, MSW for mocking API calls.
- State Management: React Context or local storage/IndexedDB for persistence.

## Project Setup

- Initialize Project:
  ```
  npm create vite@latest rewind-frontend --template react-ts
  cd rewind-frontend
  npm install
  ```
- Install Dependencies:
  ```
  npm install react-router@7 @types/react-router tailwindcss postcss autoprefixer workbox-window vitest @testing-library/react @testing-library/user-event @vitejs/plugin-react msw @testing-library/jest-dom @playwright/test
  ```
- Configure Tailwind CSS:
  - Initialize Tailwind:
    ```
    npx tailwindcss init -p
    ```
  - Update `tailwind.config.js`:
    ```
    /** @type {import('tailwindcss').Config} \*/
    export default {
    content: ["./index.html", "./src/**/\*.{js,ts,jsx,tsx}"],
    theme: {
    extend: {
    colors: {
    red: "#eb4034", // Primary red color
    primary: "#eb4034",
    secondary: "#c72e20",
    },
    },
    },
    plugins: [],
    };
    ```
  - Add to `src/index.css`:
    ```
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```
- Set Up Storybook:
  ```
  npx storybook@latest init
  ```
- Configure Vitest:
  - Update `vite.config.ts`:

    ```
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
    theme_color: "#eb4034",
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
    ```

  - Create `src/setupTests.ts`:

    ```
    import "@testing-library/jest-dom";
    import { setupServer } from "msw/node";
    import { handlers } from "./mocks/handlers";

    export const server = setupServer(...handlers);

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
    ```

- Configure MSW for Mocking:
  - Install MSW:
    ```
    npm install msw --save-dev
    ```
  - Create `src/mocks/handlers.ts`:

    ```
    import { http, HttpResponse } from "msw";

    export const handlers = [
    http.get("/api/recommendations", () => {
    return HttpResponse.json([
    {
    id: "1",
    title: "Test Episode",
    podcastName: "Test Podcast",
    releaseDate: "2023-01-15",
    duration: "45 min",
    audioUrl: "http://example.com/episode.mp3"
    },
    ]);
    }),
    http.post("/api/podcasts", () => {
    return HttpResponse.json({ podcastId: "123", message: "Podcast added successfully" });
    }),
    // Add more handlers for other endpoints (see BACKEND_API.md)
    ];
    ```

  - Create `src/mocks/browser.ts` for browser-based testing (if needed):

    ```
    import { setupWorker } from "msw";
    import { handlers } from "./handlers";

    export const worker = setupWorker(...handlers);
    ```

- Configure Vite for PWA:
  - Install `vite-plugin-pwa`:
    ```
    npm install vite-plugin-pwa
    ```
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
  ```
  src/
  components/
  Header.tsx
  BottomActionBar.tsx
  SideMenu.tsx
  EpisodeCard.tsx
  FloatingMediaPlayer.tsx
  FilterPills.tsx
  PodcastCard.tsx
  routes/
  home.tsx
  library.tsx
  library-podcast-id.tsx
  search.tsx
  episode-episode-id.tsx
  share-share-id.tsx
  services/
  podcastService.ts
  recommendationService.ts
  shareService.ts
  mocks/
  handlers.ts
  browser.ts
  ```

## Routing

- Framework: React Router v7 with `clientLoader` and `clientAction` for business logic.
- Routes:
  - `/`: Home screen (recommendations).
  - `/library`: Library screen (podcast management).
  - `/library/:podcastId`: Podcast-specific episode list.
  - `/search`: Search screen.
  - `/episode/:episodeId`: Episode details page.
  - `/share/:shareId`: Share library prompt (add podcasts to user’s library).
- Implementation:
  - Route files use kebab-case to match route paths (e.g., `library-podcast-id.tsx`).
  - Minimal view logic; business logic in `clientLoader` (fetch data) and `clientAction` (handle actions).

## Service Layer

- Purpose: Handle API calls and business logic, used primarily in `clientLoader` and `clientAction`.
- Files:
  - `podcastService.ts`: Add, fetch, and remove podcasts.
  - `recommendationService.ts`: Fetch recommendations, submit feedback.
  - `shareService.ts`: Generate and handle share links.
- Example:

  ```
  // src/services/podcastService.ts
  export async function addPodcast(rssUrl: string) {
  const response = await fetch("/api/podcasts/add", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ rssUrl }),
  });
  if (!response.ok) throw new Error("Invalid RSS URL");
  return await response.json();
  }

  export async function getPodcasts() {
  const response = await fetch("/api/podcasts");
  if (!response.ok) throw new Error("Failed to fetch podcasts");
  return await response.json();
  }
  ```

## State Management

- Global State: Use React Context for shared state (e.g., user authentication, playback state).

  ```
  // src/context/AppContext.tsx
  import { createContext, useContext, useState } from "react";

  interface AppState {
  user: { id: string; email: string } | null;
  currentEpisode: { id: string; position: number } | null;
  }

  const AppContext = createContext<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> } | null>(null);

  export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({ user: null, currentEpisode: null });
  return <AppContext.Provider value={{ state, setState }}>{children}</AppContext.Provider>;
  }

  export function useAppState() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppState must be used within AppProvider");
  return context;
  }
  ```

- Persistent State: Store playback position and library data in IndexedDB.
  - Install `idb-keyval`:
    ```
    npm install idb-keyval
    ```
  - Example:

    ```
    // src/services/playbackService.ts
    import { get, set } from "idb-keyval";

    export async function savePlaybackPosition(episodeId: string, position: number) {
    await set(`playback-${episodeId}`, position);
    }

    export async function getPlaybackPosition(episodeId: string) {
    return (await get(`playback-${episodeId}`)) || 0;
    }
    ```

## PWA Features

- Service Worker: Use Workbox to cache episode audio and metadata (see PWA_FEATURES.md).
- Manifest:
  ```
  {
  "name": "Rewind",
  "short_name": "Rewind",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#26A69A",
  "background_color": "#FFFFFF",
  "icons": [
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
  }
  ```
- Offline Playback: Cache episode audio on play, update cache on podcast addition.

## Audio Playback

- Implementation: Use HTML5 `<audio>` element with MediaSession API for lock screen controls.
- Example:

  ```
  // src/components/FloatingMediaPlayer.tsx
  import { useEffect } from "react";
  import { savePlaybackPosition } from "../services/playbackService";

  export function FloatingMediaPlayer({ episode }: { episode: { id: string; url: string; title: string } }) {
  useEffect(() => {
  if ("mediaSession" in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
  title: episode.title,
  artist: "Rewind",
  artwork: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  });
  navigator.mediaSession.setActionHandler("play", () => { /_ Play logic _/ });
  navigator.mediaSession.setActionHandler("pause", () => { /_ Pause logic _/ });
  }
  }, [episode]);

  return (
  <div className="fixed bottom-0 w-full bg-red-500 text-white p-4">
  <audio
  src={episode.url}
  controls
  onTimeUpdate={(e) => savePlaybackPosition(episode.id, e.currentTarget.currentTime)}
  />
  {/_ Play/pause, skip, speed controls _/}
  </div>
  );
  }
  ```

- External Devices: Support Bluetooth/AirPlay via browser APIs (`<audio>` element handles automatically).

## Accessibility

- ARIA Labels: Add to interactive elements (e.g., `aria-label="Play episode"`).
- Keyboard Navigation: Ensure buttons are focusable via `tabIndex`.
- Testing: Use axe DevTools or Lighthouse for accessibility checks.

## Testing

The Rewind frontend uses a multi-layered testing strategy to ensure reliability and maintainability:

### Playwright E2E Testing

**End-to-end testing with visual screenshots for comprehensive app validation:**

- **Setup**: Playwright with TypeScript, mobile-first testing configuration
- **Key Features**:
  - Non-interactive CI mode for automated testing
  - Screenshot generation for visual debugging
  - Mobile and desktop viewport testing  
  - Authentication flow testing
  - Navigation and routing validation
  - Error state handling

- **Configuration** (`playwright.config.ts`):
  ```typescript
  export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    workers: process.env.CI ? 1 : undefined,
    globalTimeout: process.env.CI ? 300_000 : undefined,
    use: {
      baseURL: 'http://localhost:5173',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      trace: 'on-first-retry',
    },
    projects: [
      { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
      { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  })
  ```

- **Available Commands**:
  ```bash
  # Run e2e tests with screenshots (non-interactive)
  npm run test:e2e:screenshots

  # Run tests in interactive UI mode  
  npm run test:e2e:ui

  # Run tests with visible browser
  npm run test:e2e:headed

  # Force screenshot generation even if tests fail
  npm run test:e2e:force-screenshots
  ```

- **Example Test** (`tests/e2e/app.spec.ts`):
  ```typescript
  test('should load the homepage and take screenshot', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page.locator('h1').filter({ hasText: 'Recommended Episodes' })).toBeVisible()
    
    await page.screenshot({ 
      path: 'test-results/screenshots/homepage-full.png',
      fullPage: true 
    })
  })
  ```

- **Generated Screenshots**: All screenshots saved to `test-results/screenshots/` including:
  - Homepage (mobile and desktop)
  - Authentication modals (login/signup)
  - Navigation screens (library, search)
  - Error states and validation flows
  - Component-level screenshots

### Storybook Component Testing

- Create stories for components (e.g., `EpisodeCard.stories.tsx`).
    ```
    // src/components/EpisodeCard.stories.tsx
    import { EpisodeCard } from "./EpisodeCard";
    ```

  export default {
  title: "Components/EpisodeCard",
  component: EpisodeCard,
  };

  export const Default = () => (
  <EpisodeCard
  episode={{
        id: "1",
        title: "Episode Title",
        podcastName: "Test Podcast",
        releaseDate: "2023-01-15",
        duration: "45 min",
      }}
  />
  );

  ```

  ```

### Vitest Unit & Integration Testing
  - Write unit tests for components, routes, and services, using MSW to mock API responses.

    ```
    // src/components/EpisodeCard.test.tsx
    import { render, screen } from "@testing-library/react";
    import { EpisodeCard } from "./EpisodeCard";

    test("renders episode title", () => {
      render(<EpisodeCard episode={{ id: "1", title: "Test Episode" }} />);
      expect(screen.getByText("Test Episode")).toBeInTheDocument();
    });
    ```

    ```
    // src/routes/home.test.tsx
    import { render, screen } from "@testing-library/react";
    import { createMemoryRouter, RouterProvider } from "react-router";
    import Home, { clientLoader } from "./home";

    test("renders recommendations", async () => {
      const router = createMemoryRouter(
        [{ path: "/", element: <Home />, loader: clientLoader }],
        { initialEntries: ["/"] }
      );
      render(<RouterProvider router={router} />);
      expect(await screen.findByText("Test Episode")).toBeInTheDocument();
    });
    ```

    ```
    // src/services/recommendationService.test.tsx
    import { getRecommendations } from "./recommendationService";
    import { server } from "../setupTests";
    import { http, HttpResponse } from "msw";

    test("fetches recommendations", async () => {
      server.use(
        http.get("/api/recommendations", () =>
          HttpResponse.json([{ id: "1", title: "Test Episode" }])
        )
      );
      const recommendations = await getRecommendations();
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe("Test Episode");
    });
    ```

  - Run tests:
    ```
    npm run test
    ```
  - Run Storybook and tests together:
    ```
    npm run storybook & npm run test
    ```
  - Generate coverage report:
    ```
    npm run test -- --coverage
    ```

## Notes for AI Agent

- Follow designs in UI_DESIGN.md for visual and interaction details.
- Use Tailwind classes for styling (e.g., `bg-red-500`, `text-white`).
- Place business logic in `clientLoader` and `clientAction` within route files, using services in `src/services`.
- Use MSW to mock API calls in tests (see BACKEND_API.md).
- Commit changes to Git after completing each component or route.
- Report issues (e.g., unclear API response format) in PLAN.md.
- Test components in Storybook and Vitest for full coverage.
- Ensure PWA and accessibility features are implemented early.

## References

- UI_DESIGN.md: Screen and component designs.
- BACKEND_API.md: API endpoints for integration.
- PWA_FEATURES.md: Service worker and offline details.
- PLAN.md: Task list and progress tracking.

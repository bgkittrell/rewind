# Rewind UI Technology Specifications

## Overview

This document outlines the frontend technology stack and implementation details for Rewind, a mobile-first Progressive Web App (PWA) designed for podcast enthusiasts aged 35+. The UI focuses on rediscovering older podcast episodes with an intuitive, accessible design optimized for mobile-first usage.

## 🚧 Current Implementation Status

### ✅ Phase 1-2 - Core UI Foundation (Completed)

- ✅ React Router v7 with modern routing
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for responsive design
- ✅ Vite for build tooling and development
- ✅ Authentication components (login, signup, confirmation)
- ✅ Basic PWA setup with manifest and service worker
- ✅ Core navigation components (header, bottom bar)
- ✅ Podcast management UI (add modal, library display)
- ✅ Responsive mobile-first design
- ✅ Context providers for auth and media state

### 📋 Phase 3 - Enhanced Features (Next Sprint)

- 📋 Episode display components and cards
- 📋 Floating media player with audio controls
- 📋 Search functionality and UI
- 📋 Recommendation display components
- 📋 Enhanced PWA features (better offline support)

### 🔮 Phase 4 - Advanced Features (Future)

- 🔮 Library sharing UI components
- 🔮 Push notification preferences
- 🔮 Advanced audio features (sleep timer, speed control)
- 🔮 Social features and community integration

## Technology Stack ✅ IMPLEMENTED

### Core Framework

- **React 18**: Modern React with hooks, suspense, and concurrent features
- **React Router v7**: File-based routing with data loading
- **TypeScript**: Full type safety across components and services
- **Vite**: Fast development server and optimized builds

### Styling & UI

- **Tailwind CSS 3**: Utility-first CSS framework
- **CSS Variables**: Dynamic theming and customization
- **Responsive Design**: Mobile-first approach with breakpoints
- **Accessible Design**: WCAG 2.1 AA compliance

### State Management

- **React Context**: Global state for auth and media player
- **React Hooks**: Local state management and effects
- **React Query**: Server state management and caching (planned)

### PWA & Performance

- **Vite PWA Plugin**: Service worker and manifest generation
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: Responsive images and lazy loading
- **Bundle Analysis**: Webpack bundle analyzer integration

## Project Structure ✅ IMPLEMENTED

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── auth/            # Authentication components ✅
│   │   │   ├── AuthModal.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── ConfirmEmailForm.tsx
│   │   ├── AddPodcastModal.tsx        # ✅ Implemented
│   │   ├── BottomActionBar.tsx        # ✅ Implemented
│   │   ├── EpisodeCard.tsx            # 📋 Planned
│   │   ├── FloatingMediaPlayer.tsx    # 📋 Planned
│   │   ├── Header.tsx                 # ✅ Implemented
│   │   └── PodcastCard.tsx            # ✅ Implemented
│   ├── context/             # React Context providers
│   │   ├── AuthContext.tsx           # ✅ Implemented
│   │   └── MediaPlayerContext.tsx    # ✅ Basic implementation
│   ├── routes/              # Route components
│   │   ├── root.tsx                  # ✅ Implemented
│   │   ├── home.tsx                  # ✅ Implemented
│   │   ├── library.tsx               # ✅ Implemented
│   │   ├── search.tsx                # 📋 Planned
│   │   └── error-page.tsx            # ✅ Implemented
│   ├── services/            # API and business logic
│   │   ├── api.ts                    # ✅ Implemented
│   │   └── podcastService.ts         # ✅ Implemented
│   ├── index.css            # Global styles ✅
│   └── main.tsx            # App entry point ✅
├── public/                  # Static assets
│   ├── manifest.json       # PWA manifest ✅
│   └── sw.js              # Service worker ✅
├── package.json            # Dependencies ✅
├── tailwind.config.js      # Tailwind configuration ✅
├── vite.config.ts         # Vite configuration ✅
└── tsconfig.json          # TypeScript configuration ✅
```

## Design System ✅ IMPLEMENTED

### Color Palette

```css
/* Primary brand colors */
:root {
  --color-primary: #eb4034; /* Rewind Red */
  --color-primary-hover: #d63384;
  --color-primary-light: #f8d7da;

  /* Neutral colors */
  --color-background: #ffffff;
  --color-surface: #f8f9fa;
  --color-text: #212529;
  --color-text-secondary: #6c757d;
  --color-border: #dee2e6;

  /* Status colors */
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-error: #dc3545;
  --color-info: #17a2b8;
}

/* Dark mode support (planned) */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #121212;
    --color-surface: #1e1e1e;
    --color-text: #e0e0e0;
    --color-text-secondary: #9e9e9e;
    --color-border: #333333;
  }
}
```

### Typography

```css
/* Font system */
:root {
  --font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --font-size-xs: 0.75rem; /* 12px */
  --font-size-sm: 0.875rem; /* 14px */
  --font-size-base: 1rem; /* 16px */
  --font-size-lg: 1.125rem; /* 18px */
  --font-size-xl: 1.25rem; /* 20px */
  --font-size-2xl: 1.5rem; /* 24px */
  --font-size-3xl: 1.875rem; /* 30px */

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

### Spacing System

```css
/* Consistent spacing scale */
:root {
  --spacing-1: 0.25rem; /* 4px */
  --spacing-2: 0.5rem; /* 8px */
  --spacing-3: 0.75rem; /* 12px */
  --spacing-4: 1rem; /* 16px */
  --spacing-5: 1.25rem; /* 20px */
  --spacing-6: 1.5rem; /* 24px */
  --spacing-8: 2rem; /* 32px */
  --spacing-10: 2.5rem; /* 40px */
  --spacing-12: 3rem; /* 48px */
  --spacing-16: 4rem; /* 64px */
}
```

## Component Architecture ✅ IMPLEMENTED

### Base Component Pattern

```typescript
// Standard component structure
interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
}

export const Component: React.FC<ComponentProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`base-styles ${className}`} {...props}>
      {children}
    </div>
  );
};
```

### Authentication Components ✅ IMPLEMENTED

#### AuthModal Component

```typescript
// src/components/auth/AuthModal.tsx
export const AuthModal: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm'>('login');
  const [email, setEmail] = useState('');
  const { isOpen, closeModal } = useAuthModal();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            {mode === 'login' && <LoginForm onSuccess={closeModal} />}
            {mode === 'signup' && <SignupForm onSuccess={() => setMode('confirm')} />}
            {mode === 'confirm' && <ConfirmEmailForm email={email} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

#### LoginForm Component

```typescript
// src/components/auth/LoginForm.tsx
export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-center">Welcome Back</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
};
```

### Navigation Components ✅ IMPLEMENTED

#### Header Component

```typescript
// src/components/Header.tsx
export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-red-500">
              Rewind
            </Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-900 hover:text-red-500">
              Home
            </Link>
            <Link to="/library" className="text-gray-900 hover:text-red-500">
              Library
            </Link>
            <Link to="/search" className="text-gray-900 hover:text-red-500">
              Search
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <button
                onClick={signOut}
                className="text-gray-900 hover:text-red-500"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
```

#### BottomActionBar Component

```typescript
// src/components/BottomActionBar.tsx
export const BottomActionBar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/library', label: 'Library', icon: LibraryIcon },
    { path: '/search', label: 'Search', icon: SearchIcon }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center flex-1 py-2 ${
              location.pathname === path
                ? 'text-red-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};
```

### Podcast Components ✅ IMPLEMENTED

#### PodcastCard Component

```typescript
// src/components/PodcastCard.tsx
export const PodcastCard: React.FC<PodcastCardProps> = ({ podcast, onRemove }) => {
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    setLoading(true);
    try {
      await onRemove(podcast.id);
    } catch (error) {
      console.error('Failed to remove podcast:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-gray-200 flex items-center justify-center">
        {podcast.imageUrl ? (
          <img
            src={podcast.imageUrl}
            alt={podcast.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-gray-400">No Image</div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
          {podcast.title}
        </h3>

        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
          {podcast.description}
        </p>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {podcast.episodeCount} episodes
          </span>

          <button
            onClick={handleRemove}
            disabled={loading}
            className="text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

#### AddPodcastModal Component

```typescript
// src/components/AddPodcastModal.tsx
export const AddPodcastModal: React.FC<AddPodcastModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [rssUrl, setRssUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onAdd(rssUrl);
      setRssUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add podcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-2xl font-bold text-center">Add Podcast</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RSS Feed URL
                </label>
                <input
                  type="url"
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Podcast'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

## State Management ✅ IMPLEMENTED

### AuthContext

```typescript
// src/context/AuthContext.tsx
export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.log('No authenticated user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const user = await signInWithEmailAndPassword(email, password);
    setUser(user);
  };

  const signUp = async (email: string, password: string, name: string) => {
    await signUpWithEmailAndPassword(email, password, name);
  };

  const signOut = async () => {
    await signOutUser();
    setUser(null);
  };

  const confirmEmail = async (email: string, code: string) => {
    await confirmUserEmail(email, code);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      confirmEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### MediaPlayerContext

```typescript
// src/context/MediaPlayerContext.tsx
export const MediaPlayerContext = createContext<MediaPlayerContextType | null>(null);

export const MediaPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const playEpisode = (episode: Episode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
  };

  const pauseEpisode = () => {
    setIsPlaying(false);
  };

  const seekTo = (time: number) => {
    setProgress(time);
  };

  return (
    <MediaPlayerContext.Provider value={{
      currentEpisode,
      isPlaying,
      progress,
      duration,
      volume,
      playEpisode,
      pauseEpisode,
      seekTo,
      setVolume
    }}>
      {children}
    </MediaPlayerContext.Provider>
  );
};
```

## Responsive Design ✅ IMPLEMENTED

### Breakpoint System

```typescript
// Tailwind breakpoints
const breakpoints = {
  sm: '640px', // Small devices
  md: '768px', // Medium devices
  lg: '1024px', // Large devices
  xl: '1280px', // Extra large devices
  '2xl': '1536px', // 2X large devices
}

// Mobile-first approach
// Default styles are for mobile
// Use responsive prefixes for larger screens
```

### Mobile-First Layout

```css
/* Mobile layout (default) */
.container {
  @apply px-4 max-w-full;
}

/* Tablet layout */
@media (min-width: 768px) {
  .container {
    @apply px-6 max-w-3xl mx-auto;
  }
}

/* Desktop layout */
@media (min-width: 1024px) {
  .container {
    @apply px-8 max-w-7xl mx-auto;
  }
}
```

## Performance Optimization ✅ IMPLEMENTED

### Code Splitting

```typescript
// Route-based code splitting
const Home = lazy(() => import('./routes/home'))
const Library = lazy(() => import('./routes/library'))
const Search = lazy(() => import('./routes/search'))

// Component-based code splitting
const FloatingMediaPlayer = lazy(() => import('./components/FloatingMediaPlayer'))
```

### Image Optimization

```typescript
// Responsive image component
const ResponsiveImage: React.FC<ImageProps> = ({ src, alt, className }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
};
```

## Testing Strategy (Planned)

### Component Testing

```typescript
// Example test structure
describe('PodcastCard', () => {
  it('displays podcast information', () => {
    render(<PodcastCard podcast={mockPodcast} onRemove={jest.fn()} />);

    expect(screen.getByText(mockPodcast.title)).toBeInTheDocument();
    expect(screen.getByText(mockPodcast.description)).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = jest.fn();
    render(<PodcastCard podcast={mockPodcast} onRemove={onRemove} />);

    fireEvent.click(screen.getByText('Remove'));
    expect(onRemove).toHaveBeenCalledWith(mockPodcast.id);
  });
});
```

### Integration Testing

```typescript
// End-to-end testing with Playwright
test('user can add and remove podcasts', async ({ page }) => {
  await page.goto('/library')

  // Add podcast
  await page.click('[data-testid="add-podcast-button"]')
  await page.fill('[data-testid="rss-url-input"]', 'https://example.com/feed.xml')
  await page.click('[data-testid="add-podcast-submit"]')

  // Verify podcast appears
  await expect(page.locator('[data-testid="podcast-card"]')).toBeVisible()

  // Remove podcast
  await page.click('[data-testid="remove-podcast-button"]')
  await expect(page.locator('[data-testid="podcast-card"]')).not.toBeVisible()
})
```

## Future Enhancements (Planned)

### 📋 Phase 3 - Enhanced Features

- **Episode Components**: EpisodeCard, EpisodeList, EpisodePlayer
- **Search UI**: SearchBar, SearchResults, SearchFilters
- **Recommendation UI**: RecommendationSection, RecommendationCard
- **Media Player**: FloatingMediaPlayer, ProgressBar, PlaybackControls

### 🔮 Phase 4 - Advanced Features

- **Sharing Components**: ShareModal, ShareButton, SharedLibraryView
- **Notification UI**: NotificationPermission, NotificationSettings
- **Advanced Audio**: SleepTimer, PlaybackSpeed, EQ Settings
- **Social Features**: UserProfile, FollowButton, ActivityFeed

## Notes for Implementation

### AI Agent Guidelines

- Maintain consistent component structure and naming
- Follow mobile-first responsive design principles
- Ensure accessibility compliance (ARIA labels, keyboard navigation)
- Implement proper error handling and loading states
- Use TypeScript for all components and props
- Test components in isolation with proper mocking

### Development Priorities

1. **Core Functionality**: Complete episode display and media player
2. **User Experience**: Smooth animations and transitions
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Performance**: Maintain fast loading times
5. **Testing**: Comprehensive component and integration tests

## References

- [PLAN.md](./PLAN.md): Implementation timeline and priorities
- [UI_DESIGN.md](./UI_DESIGN.md): Design specifications and mockups
- [PWA_FEATURES.md](./PWA_FEATURES.md): Progressive Web App implementation
- [BACKEND_API.md](./BACKEND_API.md): API integration details
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md): Project organization

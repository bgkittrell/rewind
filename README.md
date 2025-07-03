# Rewind 🎙️

**Rediscover older podcast episodes with AI-powered recommendations**

Rewind is a mobile-first Progressive Web App designed for podcast enthusiasts aged 35+ who want to rediscover older episodes from their favorite shows, with a focus on comedy podcasts.

## 🚀 The "Vibe Coding" Experiment

This project is an attempt to fully "vibe code" an entire application using comprehensive documentation as the foundation. Instead of starting with code, we started with detailed specs and let the implementation emerge naturally from well-thought-out documentation.

### How It Works

1. **📚 Documentation First**: Everything starts in the [`docs/`](docs/) directory
2. **🎯 Comprehensive Specs**: Detailed technical specifications for every component
3. **🤖 AI-Assisted Development**: Using the docs as context for intelligent code generation
4. **✅ Test-Driven Validation**: E2E tests with visual screenshots ensure quality

Check out the [`docs/`](docs/) directory to see the complete specifications that drive this project.

## 🎯 Key Features

- **🔍 Smart Recommendations**: AI-powered suggestions for older episodes you might have missed
- **📱 Mobile-First PWA**: App-like experience with offline capabilities
- **🎧 Audio Playback**: Integrated media player with external device support
- **🤝 Library Sharing**: Share your podcast library with friends
- **🔐 Secure Authentication**: AWS Cognito integration
- **🎨 Beautiful UI**: Red-themed design with accessibility in mind

## 🛠️ Technology Stack

### Frontend
- **React Router v7** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Playwright** for E2E testing
- **PWA** capabilities for offline use

### Backend
- **AWS Lambda** serverless functions
- **DynamoDB** for data storage
- **API Gateway** for HTTP APIs
- **AWS Cognito** for authentication
- **EventBridge** for scheduled tasks

### Infrastructure
- **AWS CDK** for infrastructure as code
- **CloudFront** for content delivery
- **S3** for static assets

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+
- AWS CLI configured
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/rewind.git
cd rewind

# Install dependencies
npm install

# Start frontend development server
npm run dev

# Run E2E tests with screenshots
cd frontend
npm run test:e2e:screenshots
```

### Project Structure

```
rewind-cursor/
├── docs/           # 📚 Complete project specifications
├── frontend/       # 📱 React PWA application
├── backend/        # 🔧 Lambda functions
├── infra/          # 🏗️ AWS CDK infrastructure
└── tests/          # 🧪 Integration tests
```

## 📖 Documentation

All project specifications live in the [`docs/`](docs/) directory:

- **[PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** - Overall architecture
- **[PLAN.md](docs/PLAN.md)** - Development roadmap
- **[UI_DESIGN.md](docs/UI_DESIGN.md)** - Complete UI specifications
- **[BACKEND_API.md](docs/BACKEND_API.md)** - API endpoint definitions
- **[PWA_FEATURES.md](docs/PWA_FEATURES.md)** - Progressive Web App features
- **[RECOMMENDATION_ENGINE.md](docs/RECOMMENDATION_ENGINE.md)** - AI recommendation logic

## 🎨 Design Philosophy

**Mobile-First**: Optimized for thumb-friendly navigation on smartphones
**Accessibility**: WCAG 2.1 compliant with screen reader support
**Performance**: Fast loading with skeleton screens and caching
**Simplicity**: Clean, intuitive interface focused on rediscovery

## 🧪 Testing

The project includes comprehensive testing with visual validation:

```bash
# Run all E2E tests
npm run test:e2e

# Run with screenshots for debugging
npm run test:e2e:screenshots

# Run in interactive mode
npm run test:e2e:ui
```

## 🚀 Deployment

Infrastructure is managed with AWS CDK:

```bash
# Deploy backend and infrastructure
cd infra
npm run deploy

# Deploy frontend
cd frontend
npm run build
npm run deploy
```

## 🤝 Contributing

This project demonstrates "documentation-driven development" where specs are written first, then implemented. When contributing:

1. **Start with docs** - Update relevant documentation first
2. **Follow the specs** - Implementation should match documented behavior
3. **Test thoroughly** - Include E2E tests with visual validation
4. **Maintain consistency** - Follow established patterns and conventions

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🎙️ About

Built with ❤️ for podcast lovers who want to rediscover the gems hiding in their episode backlogs.

---

*"The best way to predict the future is to document it first, then code it."* - The Vibe Coding Manifesto 
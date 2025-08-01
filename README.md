# Restaurant Menu Optimizer 🍽️

> Transform your restaurant's menu into a data-driven success story. Our AI-powered platform combines Large Language Models (LLMs) with Qloo to analyze your menu, understand your customer demographics, and provide personalized optimization recommendations. Upload your menu, get instant insights on pricing, descriptions, and new item suggestions that resonate with your target audience. Boost sales, reduce waste, and create menus that customers love.

## 🚀 Overview

The Restaurant Menu Optimizer is a full-stack web application that helps restaurant owners optimize their menus using artificial intelligence. The system leverages advanced LLMs (Claude, GPT-4, or Gemini) for menu parsing and analysis, combined Qloo for restaurant and demographic insights.

### Key Features

- **📄 Smart Menu Parsing**: Upload any menu format and get structured, analyzable data
- **🎯 Market Analysis**: Understand your customer base and competitive landscape with Qloo
- **💡 AI-Powered Optimization**: Get personalized recommendations for menu improvements
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices

## 🏗️ Architecture

### Backend (Node.js/TypeScript + Serverless)
- **Framework**: Serverless Framework with AWS Lambda
- **Database**: DynamoDB for data persistence
- **AI Integration**: Multi-provider LLM support (Anthropic, OpenAI, Google)
- **External APIs**: Qloo Taste AI™ for insight and entity analysis
- **Authentication**: JWT-based auth with refresh tokens

### Frontend (Flutter Web)
- **Framework**: Flutter for cross-platform web development
- **State Management**: Provider pattern
- **UI**: Material Design with responsive framework

### Infrastructure (AWS)
- **Compute**: AWS Lambda (serverless)
- **Database**: DynamoDB
- **Storage**: S3 for file uploads


## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Serverless Framework
- **Database**: AWS DynamoDB
- **AI**: Anthropic Claude, OpenAI GPT-4, Google Gemini
- **External API**: Qloo Taste AI™
- **Testing**: Jest

### Frontend
- **Framework**: Flutter 3.32.7
- **Language**: Dart 3.8.1
- **State Management**: Provider
- **HTTP Client**: http package
- **Charts**: fl_chart
- **File Handling**: file_picker
- **Local Storage**: shared_preferences

### DevOps
- **Infrastructure**: AWS CloudFormation
- **CI/CD**: Serverless Framework
- **Local Development**: DynamoDB Local, Serverless Offline
- **Monitoring**: CloudWatch

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 20.x or higher
- **Flutter**: 3.32.7
- **AWS CLI**: Configured with appropriate permissions
- **Docker**: (optional, for local development)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd restaurant-menu-optimizer
```

### 2. Backend Setup

```bash
# Install dependencies
npm install

# Start local development environment
npm run start:local
```

**📖 Detailed Backend Setup**: See [docs/RUNNING_BE_LOCALLY.md](docs/RUNNING_BE_LOCALLY.md)

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
flutter pub get

# Run the application
flutter run -d chrome
```

**📖 Detailed Frontend Setup**: See [docs/RUNNING_FE_LOCALLY.md](docs/RUNNING_FE_LOCALLY.md)

### 4. API Keys Configuration

The application requires API keys for LLM services and Qloo Taste AI™:

**📖 LLM API Setup**: See [docs/LLM_API_KEYS.md](docs/LLM_API_KEYS.md)
**📖 Qloo API Setup**: See [docs/QLOO_API_KEYS.md](docs/QLOO_API_KEYS.md)

## 📁 Project Structure

```
restaurant-menu-optimizer/
├── src/                    # Backend source code
│   ├── analytics/         # Analytics handlers
│   ├── auth/             # Authentication
│   ├── menu/             # Menu management
│   ├── restaurant/       # Restaurant operations
│   ├── models/           # Data models
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic
│   └── utils/            # Utilities
├── frontend/             # Flutter web application
│   ├── lib/
│   │   ├── models/       # Data models
│   │   ├── providers/    # State management
│   │   ├── screens/      # UI screens
│   │   ├── services/     # API services
│   │   └── widgets/      # Reusable components
│   └── pubspec.yaml      # Flutter dependencies
├── infrastructure/       # AWS infrastructure
├── docs/                # Documentation
└── scripts/             # Deployment and setup scripts
```

## 🔧 Development

### Available Scripts

```bash
# Backend
npm run dev              # Start serverless offline
npm run start:local      # Start complete local environment
npm test                 # Run tests
npm run build            # Build TypeScript

# Frontend
flutter pub get          # Install dependencies
flutter run -d chrome    # Run in Chrome
flutter test             # Run tests
flutter build web        # Build for production
```

### Local Development

The project includes comprehensive local development setup:

- **DynamoDB Local**: Local database for development
- **Serverless Offline**: Local Lambda emulation
- **Hot Reload**: Both frontend and backend support hot reloading
- **Environment Management**: Separate dev/staging/prod configurations

## 🚀 Deployment

### Backend Deployment

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

### Frontend Deployment

```bash
# Build and deploy frontend
./frontend-deploy.sh dev us-east-1
```

### Custom Domain Setup

**📖 Domain Configuration**: See [README-DOMAIN-SETUP.md](README-DOMAIN-SETUP.md)

## 🔐 Security

- **API Keys**: Stored securely in AWS Parameter Store
- **Authentication**: JWT tokens with refresh mechanism
- **Input Validation**: Comprehensive request validation

## 📊 API Endpoints

### Authentication
- `POST /auth/register-user` - User registration
- `POST /auth/login` - User login
- `POST /auth/confirm-registration` - Confirm registration

### Menu Management
- `POST /menu/upload` - Upload menu file
- `GET /menu/items` - Get menu items
- `POST /menu/optimize-existing-items` - Optimize existing items
- `POST /menu/suggest-new-items` - Get new item suggestions
- `POST /menu/review-optimizations` - Review optimization results

### Restaurant Operations
- `GET /restaurant/current` - Get current restaurant
- `POST /restaurant/setup-profile` - Setup restaurant profile
- `GET /restaurant/demographics` - Get demographics data


## 🧪 Testing

```bash
# Backend tests
npm test
npm run test:watch

# Frontend tests
flutter test
```

## 📈 Monitoring

- **CloudWatch**: Application logs and metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

For support and questions:

- **Documentation**: Check the `docs/` folder for detailed guides
- **Issues**: Create an issue in the repository
- **Local Development**: See the local development guides in `docs/`

## 🔮 Future Roadmap

- Advanced analytics dashboard to look at Qloo taste profiles for demographics
- Integration with POS systems to get better insights on what customers are actually buying
- Mobile app (iOS/Android)
- Customer feedback integration
- Seasonal menu optimization
- Cost analysis and profit optimization

---

**Built with ❤️ using Flutter, Node.js, and AWS Serverless** 
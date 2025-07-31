# Running the Backend Locally

This document provides instructions on how to run the Node.js/TypeScript backend application locally for development using the Serverless Framework.

## Prerequisites

Before running the backend locally, ensure you have the following installed:

### 1. Node.js
- **Version**: 18.x or higher (recommended: LTS version)
- **Installation**: Download from [nodejs.org](https://nodejs.org/)
- **Verification**: Run `node --version` and `npm --version`

### 2. Serverless Framework
- **Installation**: `npm install -g serverless`
- **Verification**: Run `serverless --version`

### 3. AWS CLI (Optional but Recommended)
- **Installation**: Follow the [AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **Configuration**: Run `aws configure` to set up credentials
- **Note**: Required for DynamoDB Local and S3 Local setup

### 4. Docker (Optional)
- **Installation**: Download from [docker.com](https://www.docker.com/products/docker-desktop/)
- **Note**: Alternative to DynamoDB Local for database emulation

## Setup Instructions

### 1. Navigate to Project Root

```bash
cd restaurant-menu-optimizer
```

### 2. Install Dependencies

Install all Node.js dependencies:

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root for local environment variables:

```bash
# LLM Configuration
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
LLM_API_KEY=your-llm-api-key

# QLOO API Configuration
QLOO_API_KEY=your-qloo-api-key

# AWS Configuration (for local development)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Local Development Settings
NODE_ENV=development
```

**Note**: Do not commit your `.env` file to version control. Add it to `.gitignore`.

### 4. Database Setup (Optional but Recommended)

#### Option A: DynamoDB Local (Recommended)

Install and start DynamoDB Local:

```bash
# Install DynamoDB Local (one-time setup)
npm run dynamodb:install

# Start the complete local development environment
npm run start:local
```

This will:
- Install DynamoDB Local from AWS (if not already installed)
- Start DynamoDB Local on port 8000
- Configure S3 Local on port 4569
- Launch Serverless Offline with all services connected

#### Option B: Manual DynamoDB Local Setup

If you prefer manual setup:

```bash
# Download and start DynamoDB Local
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb

# In another terminal, start Serverless Offline
npx serverless offline
```

### 5. Start the Local Server

#### Basic Serverless Offline
```bash
npx serverless offline
```

#### With Custom Configuration
```bash
npx serverless offline --stage dev --region us-east-1
```

#### With Environment Variables
```bash
LLM_PROVIDER=anthropic LLM_MODEL=claude-sonnet-4-20250514 npx serverless offline
```

## Development Workflow

### Available Scripts

The project includes several npm scripts for development:

```bash
# Start complete local environment
npm run start:local

# Start only Serverless Offline
npm run dev

# Install DynamoDB Local
npm run dynamodb:install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build TypeScript
npm run build

# Lint code
npm run lint
```

### Hot Reload
Serverless Offline supports hot reloading. When you make changes to your Lambda functions:
- The server automatically restarts
- Your changes are immediately available
- No manual restart required

### Debug Mode
For debugging with VS Code or other IDEs:

```bash
npx serverless offline --inspect
```

Then attach your debugger to `localhost:9229`.

## Project Structure

The backend follows a modular structure:

```
src/
├── analytics/           # Analytics-related handlers
├── auth/               # Authentication handlers and services
├── menu/               # Menu management handlers
├── restaurant/         # Restaurant-related handlers
├── models/             # Data models and types
├── repositories/       # Data access layer
├── services/           # Business logic services
└── utils/              # Utility functions
```

## API Endpoints

Once running locally, your API will be available at `http://localhost:3000`:

### Authentication Endpoints
- `POST /auth/register-user` - User registration
- `POST /auth/register-restaurant` - Restaurant registration
- `POST /auth/login` - User login
- `POST /auth/confirm-registration` - Confirm registration
- `POST /auth/refresh-token` - Refresh authentication token

### Menu Endpoints
- `POST /menu/upload` - Upload menu file
- `GET /menu/items` - Get menu items
- `GET /menu/items/{id}` - Get specific menu item
- `PUT /menu/items/{id}` - Update menu item
- `DELETE /menu/items/{id}` - Delete menu item
- `POST /menu/optimize-existing-items` - Optimize existing menu items
- `POST /menu/suggest-new-items` - Get new item suggestions
- `POST /menu/review-optimizations` - Review optimizations
- `POST /menu/review-descriptions` - Review menu descriptions

### Restaurant Endpoints
- `GET /restaurant/current` - Get current restaurant
- `POST /restaurant/setup-profile` - Setup restaurant profile
- `GET /restaurant/demographics` - Get demographics data
- `POST /restaurant/search-qloo` - Search QLOO restaurants
- `POST /restaurant/search-similar` - Search similar restaurants

### Analytics Endpoints
- `GET /analytics/dashboard-data` - Get dashboard analytics

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test Files
```bash
npm test -- --testPathPattern=menu
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

## Troubleshooting

### Common Issues

#### 1. Port Conflicts
If port 3000 is already in use:
```bash
npx serverless offline --port 3001
```

#### 2. DynamoDB Local Issues
If DynamoDB Local fails to start:
```bash
# Check if Java is installed
java -version

# Clear DynamoDB Local data
rm -rf dynamodb_local

# Reinstall DynamoDB Local
npm run dynamodb:install
```

#### 3. Environment Variable Issues
If environment variables aren't loading:
```bash
# Check if .env file exists
ls -la .env

# Load environment variables manually
export $(cat .env | xargs)
npx serverless offline
```

#### 4. TypeScript Compilation Errors
If you encounter TypeScript errors:
```bash
# Clean and rebuild
npm run build

# Check TypeScript configuration
npx tsc --noEmit
```

#### 5. Dependency Issues
If you encounter dependency conflicts:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Performance Tips

1. **Use DynamoDB Local**: For faster development without AWS costs
2. **Enable Caching**: Use appropriate caching strategies
3. **Monitor Memory Usage**: Watch for memory leaks in development
4. **Use Debug Mode**: Enable debugging for better error tracking

## Environment Configuration

### Development vs Production
The application supports multiple environments:
- **Development**: Uses local services and mock data
- **Staging**: Uses staging AWS services
- **Production**: Uses production AWS services

### Local Development Settings
For local development, the following services are emulated:
- **API Gateway**: Serverless Offline
- **Lambda**: Serverless Offline
- **DynamoDB**: DynamoDB Local
- **S3**: S3 Local (via LocalStack or similar)

## API Testing

### Using curl
Test your endpoints with curl:

```bash
# Test health check
curl http://localhost:3000/health

# Test authentication
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Using Postman
Import the following collection structure:
- Base URL: `http://localhost:3000`
- Environment variables for authentication tokens
- Pre-request scripts for token management

### Using AWS CLI (for DynamoDB Local)
```bash
# List tables
aws dynamodb list-tables --endpoint-url http://localhost:8000

# Scan table
aws dynamodb scan --table-name your-table-name --endpoint-url http://localhost:8000
```

## Building for Production

### Deploy to AWS
```bash
# Deploy to development stage
npx serverless deploy --stage dev

# Deploy to production stage
npx serverless deploy --stage prod
```

### Package for Deployment
```bash
# Create deployment package
npx serverless package

# Deploy packaged application
npx serverless deploy --package .serverless
```

## Additional Resources

- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/)
- [Serverless Offline Plugin](https://github.com/dherault/serverless-offline)
- [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Note**: Make sure to configure your AWS credentials and environment variables properly for local development. The frontend can connect to this local backend by updating the `baseUrl` in `frontend/lib/services/http_client.dart` to `http://localhost:3000`.

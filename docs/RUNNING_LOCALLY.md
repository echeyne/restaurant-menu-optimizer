You can run your project locally without deploying it to AWS by using the Serverless Framework's "offline" mode. Your project is already set up for this with the serverless-offline plugin, which emulates AWS Lambda and API Gateway on your local machine.

Here’s how you can run your project locally:

### 1. Install Dependencies
If you haven’t already, install the project dependencies:
```sh
cd restaurant-menu-optimizer
npm install
```

### 2. Start the Local Serverless Offline Environment
Run the following command in the same directory:
```sh
npx serverless offline
```
or, if you have Serverless installed globally:
```sh
serverless offline
```

This will start a local server (by default on port 3000, as configured in your `serverless.yml`) that mimics your AWS Lambda functions and API Gateway endpoints.

### 3. Access Your Endpoints
You can now make HTTP requests to your endpoints (e.g., `http://localhost:3000/auth/login`, `http://localhost:3000/menu/upload`, etc.) as if they were deployed.

### 4. Environment Variables
If you need to override environment variables (like LLM_PROVIDER, LLM_MODEL), you can set them in your shell before running the offline server:
```sh
export LLM_PROVIDER=anthropic
export LLM_MODEL=claude-3-opus-20240229
npx serverless offline
```

### 5. DynamoDB and S3 Emulation (Recommended)
To run DynamoDB and S3 locally, install dependencies and start the emulators:

```sh
npm run dynamodb:install
npm run s3:install # (no-op, but included for symmetry)
```

Then start the local environment:

```sh
npm run start:local
```

This will launch Serverless Offline with local DynamoDB (port 8000) and S3 (port 4569).

### 6. Using a .env File for Local Environment Variables

You can create a `.env` file in the `restaurant-menu-optimizer` directory to set environment variables for local development. Example:

```
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-opus-20240229
LLM_API_KEY=your-llm-api-key
QLOO_API_KEY=your-qloo-api-key
```

**Note:** Do not commit your `.env` file to version control.

---

**Summary:**  
- Run npm install  
- Run npx serverless offline  
- Access your endpoints at http://localhost:3000

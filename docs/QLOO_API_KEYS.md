# Securely Managing Qloo API Keys

This document provides instructions on how to securely store and use Qloo Taste AI™ API keys in the Restaurant Menu Optimizer application.

## Overview

The application uses Qloo's Taste AI™ API for taste profile analysis, trend detection, and personalized recommendations. To interact with the Qloo API, an API key is required. Since this key grants access to a paid service and should never be exposed in public repositories, we use AWS Parameter Store for secure storage.

## Setting Up Qloo API Keys

### 1. Obtain API Key

First, obtain an API key from Qloo:

- Sign up for Qloo's Taste AI™ API at [https://qloo.com/](https://qloo.com/)
- Follow their instructions to generate an API key for your account

### 2. Store API Key in AWS Parameter Store

Use AWS Parameter Store to securely store your API key. **NEVER commit API keys to the repository or include them in environment variables that might be logged.**

#### Using AWS CLI

```bash
# Store Qloo API key
aws ssm put-parameter \
    --name "/{stage}/qloo/api-key" \
    --value "your-qloo-api-key" \
    --type "SecureString" \
    --overwrite
```

Replace `{stage}` with your deployment stage (e.g., `dev`, `staging`, `prod`).

#### Using AWS Console

1. Navigate to AWS Systems Manager > Parameter Store
2. Click "Create parameter"
3. Enter the name following the pattern `/{stage}/qloo/api-key`
4. Select "SecureString" as the type
5. Enter your API key as the value
6. Click "Create parameter"

### 3. Update IAM Permissions

Ensure that the Lambda functions that need to access the Qloo API have permission to read the parameter from Parameter Store. Add the following to your IAM role statements in `serverless.yml`:

```yaml
- Effect: Allow
  Action:
    - ssm:GetParameter
  Resource: !Sub "arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:provider.stage}/qloo/*"
```

## How It Works

1. When the application needs to use the Qloo API, it retrieves the API key from Parameter Store using the AWS SDK.
2. The key is never logged, stored in code, or exposed in the application's configuration.
3. The application uses the key to authenticate with the Qloo API.
4. IAM roles control which functions can access the parameter.
5. Rate limiting is implemented to respect Qloo's API usage limits.

## Security Considerations

- **IAM Permissions**: Only the Lambda functions that need to use the Qloo API have permission to read the parameter.
- **Encryption**: The API key is stored encrypted in Parameter Store.
- **Logging**: The application is configured to never log the API key.
- **Key Rotation**: Regularly rotate your API key according to your security policies.
- **Rate Limiting**: The client implements rate limiting to prevent excessive API usage.

## Local Development

For local development, you can use environment variables, but be careful not to commit them to the repository:

```bash
# Set environment variables for local development
export QLOO_API_KEY=your-api-key

# Run the application
npm run dev
```

Consider using a tool like `direnv` to manage environment variables locally without risking them being committed.

## Troubleshooting

If you encounter issues with Qloo API integration:

1. Check that the API key is correctly stored in Parameter Store with the correct name.
2. Verify that the Lambda function has the necessary IAM permissions to access the parameter.
3. Check CloudWatch logs for any error messages (API keys will be redacted).
4. Ensure you're not exceeding Qloo's rate limits.
5. Verify that your Qloo subscription is active and has sufficient quota.

## Rate Limiting

The Qloo client implements rate limiting to prevent exceeding API usage limits. By default, it limits requests to 5 per second, but this can be configured when creating the client:

```typescript
const qlooClient = new QlooClient({
  rateLimitPerSecond: 10, // Adjust based on your Qloo plan
});
```

Adjust this value based on your specific Qloo plan and requirements.

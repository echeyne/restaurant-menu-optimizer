# Securely Managing LLM API Keys

This document provides instructions on how to securely store and use LLM API keys in the Restaurant Menu Optimizer application.

## Overview

The application uses Large Language Models (LLMs) for menu parsing and other AI-powered features. To interact with these LLM services (OpenAI, Anthropic, Google), API keys are required. Since these keys grant access to paid services and should never be exposed in public repositories, we use AWS Parameter Store for secure storage.

## Supported LLM Providers

The application supports the following LLM providers:

- **Anthropic (Claude)** - Default provider
- **OpenAI (GPT-4, GPT-3.5)**
- **Google (Gemini)**

## Setting Up LLM API Keys

### 1. Obtain API Keys

First, obtain API keys from your preferred LLM provider:

- **Anthropic**: Sign up at [https://console.anthropic.com/](https://console.anthropic.com/)
- **OpenAI**: Sign up at [https://platform.openai.com/](https://platform.openai.com/)
- **Google**: Sign up at [https://ai.google.dev/](https://ai.google.dev/)

### 2. Store API Keys in AWS Parameter Store

Use AWS Parameter Store to securely store your API keys. **NEVER commit API keys to the repository or include them in environment variables that might be logged.**

#### Using AWS CLI

```bash
# For Anthropic (default provider)
aws ssm put-parameter \
    --name "/{stage}/llm/anthropic/api-key" \
    --value "your-anthropic-api-key" \
    --type "SecureString" \
    --overwrite

# For OpenAI
aws ssm put-parameter \
    --name "/{stage}/llm/openai/api-key" \
    --value "your-openai-api-key" \
    --type "SecureString" \
    --overwrite

# For Google
aws ssm put-parameter \
    --name "/{stage}/llm/google/api-key" \
    --value "your-google-api-key" \
    --type "SecureString" \
    --overwrite
```

Replace `{stage}` with your deployment stage (e.g., `dev`, `staging`, `prod`).

#### Using AWS Console

1. Navigate to AWS Systems Manager > Parameter Store
2. Click "Create parameter"
3. Enter the name following the pattern `/{stage}/llm/{provider}/api-key`
4. Select "SecureString" as the type
5. Enter your API key as the value
6. Click "Create parameter"

### 3. Configure the Application

The application reads the LLM provider and model from environment variables. You can configure these in the `serverless.yml` file or during deployment:

```yaml
environment:
  LLM_PROVIDER: "anthropic" # Options: 'anthropic', 'openai', 'google'
  LLM_MODEL: "claude-sonnet-4-20250514" # Model name for the selected provider
```

Default values are:

- Provider: `anthropic`
- Models:
  - Anthropic: `claude-sonnet-4-20250514`
  - OpenAI: `gpt-4-turbo`
  - Google: `gemini-pro`

## How It Works

1. When the application needs to use an LLM service, it retrieves the API key from Parameter Store using the AWS SDK.
2. The key is never logged, stored in code, or exposed in the application's configuration.
3. The application uses the key to authenticate with the LLM provider's API.
4. IAM roles control which functions can access which parameters.

## Security Considerations

- **IAM Permissions**: Only the Lambda functions that need to use LLM services have permission to read the relevant parameters.
- **Encryption**: API keys are stored encrypted in Parameter Store.
- **Logging**: The application is configured to never log API keys.
- **Key Rotation**: Regularly rotate your API keys according to your security policies.

## Local Development

For local development, you can use environment variables, but be careful not to commit them to the repository:

```bash
# Set environment variables for local development
export LLM_PROVIDER=anthropic
export LLM_API_KEY=your-api-key

# Run the application
npm run dev
```

Consider using a tool like `direnv` to manage environment variables locally without risking them being committed.

## Troubleshooting

If you encounter issues with LLM integration:

1. Check that the API key is correctly stored in Parameter Store with the correct name.
2. Verify that the Lambda function has the necessary IAM permissions to access the parameter.
3. Confirm that the LLM provider and model are correctly configured.
4. Check CloudWatch logs for any error messages (API keys will be redacted).

#!/bin/bash

# Local development setup script for restaurant-menu-optimizer

echo "Setting up local development environment..."

# Check if .env file exists, create if not
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << EOL
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_API_KEY=your-llm-api-key
CLIENT_ID=local-client-id
USER_POOL_ID=local-user-pool
MENU_FILES_BUCKET=local-menu-files-bucket
EOL
  echo ".env file created. Please update with your actual API keys if needed."
else
  echo ".env file exists. Using existing configuration."
fi

# Check if DynamoDB Local is installed
if [ ! -d "./dynamodb_local" ] || [ ! -f "./dynamodb_local/DynamoDBLocal.jar" ]; then
  echo "DynamoDB Local not found. Installing..."
  ./install-dynamodb-local.sh
else
  echo "DynamoDB Local is already installed."
fi

# Start DynamoDB Local manually
echo "Starting DynamoDB Local..."
java -Djava.library.path=./dynamodb_local/DynamoDBLocal_lib -jar ./dynamodb_local/DynamoDBLocal.jar -sharedDb -port 8000 &
DYNAMODB_PID=$!

# Wait for DynamoDB to start
echo "Waiting for DynamoDB to start..."
sleep 3

# Start the serverless offline server
echo "Starting Serverless Offline..."
echo "Press Ctrl+C to stop the server"
npx sls offline start

# Cleanup function to kill background processes
cleanup() {
  echo "Cleaning up..."
  kill $DYNAMODB_PID 2>/dev/null
  exit 0
}

# Register the cleanup function on script exit
trap cleanup EXIT INT TERM
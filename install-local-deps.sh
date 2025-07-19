#!/bin/bash

# Install DynamoDB Local dependencies
echo "Installing DynamoDB Local dependencies..."
npm install

# Install DynamoDB Local
echo "Installing DynamoDB Local..."
npx sls dynamodb install

echo "Installation complete. You can now run 'npm run start:local' to start the local development environment."
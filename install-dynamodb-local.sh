#!/bin/bash

# Create directory for DynamoDB Local
mkdir -p ./dynamodb_local
cd ./dynamodb_local

# Download DynamoDB Local directly from AWS
echo "Downloading DynamoDB Local from AWS..."
curl -O https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz

# Extract the archive
echo "Extracting DynamoDB Local..."
tar -xzf dynamodb_local_latest.tar.gz

# Return to project root
cd ..

echo "DynamoDB Local has been installed successfully."
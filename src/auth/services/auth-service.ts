import * as AWS from "aws-sdk";
import {
  RestaurantRegistration,
  LoginCredentials,
  AuthResponse,
  TokenRefreshRequest,
} from "../../models/auth";

/**
 * Service for handling authentication operations with AWS Cognito
 */
export class AuthService {
  private cognito: AWS.CognitoIdentityServiceProvider;
  private userPoolId: string;
  private clientId: string;
  private dynamoDB: AWS.DynamoDB.DocumentClient;
  private stage: string;

  constructor() {
    this.cognito = new AWS.CognitoIdentityServiceProvider();
    this.userPoolId = process.env.USER_POOL_ID || "";
    this.clientId = process.env.CLIENT_ID || "";
    this.dynamoDB = new AWS.DynamoDB.DocumentClient();
    this.stage = process.env.STAGE || "dev";

    if (!this.userPoolId || !this.clientId) {
      throw new Error(
        "Missing required environment variables: USER_POOL_ID or CLIENT_ID"
      );
    }
  }

  /**
   * Register a new restaurant owner
   */
  async registerRestaurant(
    details: RestaurantRegistration
  ): Promise<AuthResponse> {
    try {
      // Sign up the user in Cognito
      await this.cognito
        .signUp({
          ClientId: this.clientId,
          Username: details.email,
          Password: details.password,
          UserAttributes: [
            { Name: "email", Value: details.email },
            { Name: "name", Value: details.name },
            { Name: "custom:restaurantName", Value: details.restaurantName },
            { Name: "custom:cuisineType", Value: details.cuisineType },
            { Name: "custom:location", Value: details.location },
          ],
        })
        .promise();

      // Automatically confirm the user for development purposes
      // In production, users would need to verify their email
      if (this.stage === "dev") {
        await this.cognito
          .adminConfirmSignUp({
            UserPoolId: this.userPoolId,
            Username: details.email,
          })
          .promise();
      }

      // Log the user in to get tokens
      const authResult = await this.login({
        email: details.email,
        password: details.password,
      });

      return authResult;
    } catch (error) {
      console.error("Error registering restaurant:", error);
      throw error;
    }
  }

  /**
   * Log in a user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Authenticate the user with Cognito
      const authResult = await this.cognito
        .initiateAuth({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: this.clientId,
          AuthParameters: {
            USERNAME: credentials.email,
            PASSWORD: credentials.password,
          },
        })
        .promise();

      if (!authResult.AuthenticationResult) {
        throw new Error("Authentication failed");
      }

      // Get the user's restaurant ID from DynamoDB
      const userId = await this.getUserIdFromToken(
        authResult.AuthenticationResult.AccessToken || ""
      );
      const restaurantId = await this.getRestaurantIdForUser(userId);

      return {
        accessToken: authResult.AuthenticationResult.AccessToken || "",
        refreshToken: authResult.AuthenticationResult.RefreshToken || "",
        idToken: authResult.AuthenticationResult.IdToken || "",
        expiresIn: authResult.AuthenticationResult.ExpiresIn || 3600,
        userId,
        restaurantId,
      };
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  }

  /**
   * Refresh an expired access token using a refresh token
   */
  async refreshToken(request: TokenRefreshRequest): Promise<AuthResponse> {
    try {
      // Refresh the token with Cognito
      const authResult = await this.cognito
        .initiateAuth({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: this.clientId,
          AuthParameters: {
            REFRESH_TOKEN: request.refreshToken,
          },
        })
        .promise();

      if (!authResult.AuthenticationResult) {
        throw new Error("Token refresh failed");
      }

      // Get the user's restaurant ID from DynamoDB
      const userId = await this.getUserIdFromToken(
        authResult.AuthenticationResult.AccessToken || ""
      );
      const restaurantId = await this.getRestaurantIdForUser(userId);

      return {
        accessToken: authResult.AuthenticationResult.AccessToken || "",
        refreshToken: request.refreshToken, // Use the original refresh token as it doesn't change
        idToken: authResult.AuthenticationResult.IdToken || "",
        expiresIn: authResult.AuthenticationResult.ExpiresIn || 3600,
        userId,
        restaurantId,
      };
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw error;
    }
  }

  /**
   * Extract the user ID from an access token
   */
  private async getUserIdFromToken(accessToken: string): Promise<string> {
    try {
      const userData = await this.cognito
        .getUser({
          AccessToken: accessToken,
        })
        .promise();

      return userData.Username;
    } catch (error) {
      console.error("Error getting user from token:", error);
      throw error;
    }
  }

  /**
   * Get the restaurant ID associated with a user
   */
  private async getRestaurantIdForUser(
    userId: string
  ): Promise<string | undefined> {
    try {
      // Scan the restaurants table to find the restaurant owned by this user
      // In a production environment, we would use a GSI for this lookup
      const result = await this.dynamoDB
        .scan({
          TableName: `${this.stage}-restaurants`,
          FilterExpression: "ownerId = :ownerId",
          ExpressionAttributeValues: {
            ":ownerId": userId,
          },
        })
        .promise();

      if (result.Items && result.Items.length > 0) {
        return result.Items[0].restaurantId;
      }

      return undefined;
    } catch (error) {
      console.error("Error getting restaurant ID for user:", error);
      return undefined;
    }
  }
}

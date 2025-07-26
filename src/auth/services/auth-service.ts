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
   * Register a new user with email/password only
   * After registration, the user must confirm their email before logging in.
   */
  async registerUser(
    details: RestaurantRegistration
  ): Promise<{ userConfirmed: boolean; message: string }> {
    try {
      // Sign up the user in Cognito with email/password only
      const signUpResult = await this.cognito
        .signUp({
          ClientId: this.clientId,
          Username: details.email,
          Password: details.password,
          UserAttributes: [{ Name: "email", Value: details.email }],
        })
        .promise();

      // Do NOT log the user in. Require email confirmation first.
      return {
        userConfirmed: signUpResult.UserConfirmed || false,
        message: signUpResult.UserConfirmed
          ? "User already confirmed. You may log in."
          : "Registration successful. Please check your email for a confirmation code to activate your account.",
      };
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  }

  /**
   * Register a new restaurant owner
   * After registration, the user must confirm their email before logging in.
   */
  async registerRestaurant(
    details: RestaurantRegistration
  ): Promise<{ userConfirmed: boolean; message: string }> {
    try {
      // Sign up the user in Cognito with email/password only
      const signUpResult = await this.cognito
        .signUp({
          ClientId: this.clientId,
          Username: details.email,
          Password: details.password,
          UserAttributes: [{ Name: "email", Value: details.email }],
        })
        .promise();

      // Do NOT log the user in. Require email confirmation first.
      return {
        userConfirmed: signUpResult.UserConfirmed || false,
        message: signUpResult.UserConfirmed
          ? "User already confirmed. You may log in."
          : "Registration successful. Please check your email for a confirmation code to activate your account.",
      };
    } catch (error) {
      console.error("Error registering restaurant:", error);
      throw error;
    }
  }

  /**
   * Confirm a user's registration with the confirmation code sent to their email
   */
  async confirmRegistration(
    email: string,
    confirmationCode: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.cognito
        .confirmSignUp({
          ClientId: this.clientId,
          Username: email,
          ConfirmationCode: confirmationCode,
        })
        .promise();
      return {
        success: true,
        message: "Email confirmed successfully. You may now log in.",
      };
    } catch (error: any) {
      let message = "Error confirming registration.";
      if (error.code === "CodeMismatchException") {
        message = "Invalid confirmation code.";
      } else if (error.code === "ExpiredCodeException") {
        message = "Confirmation code has expired.";
      } else if (error.code === "UserNotFoundException") {
        message = "User not found.";
      } else if (error.code === "NotAuthorizedException") {
        message = "User is already confirmed.";
      }
      console.error("Error confirming registration:", error);
      return { success: false, message };
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
    } catch (error: any) {
      // Handle user not confirmed error
      if (error.code === "UserNotConfirmedException") {
        throw new Error(
          "User has not confirmed their email. Please check your email for the confirmation code."
        );
      }
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
   * Get the current user ID from the authorization header
   * @param authorizationHeader The Authorization header from the request
   * @returns The user ID if valid, null otherwise
   */
  async getCurrentUserId(authorizationHeader: string): Promise<string | null> {
    try {
      if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        return null;
      }

      const accessToken = authorizationHeader.replace("Bearer ", "");
      return await this.getUserIdFromToken(accessToken);
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return null;
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

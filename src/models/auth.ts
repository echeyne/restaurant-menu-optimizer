/**
 * Authentication models for the Restaurant Menu Optimizer
 */

export interface RestaurantRegistration {
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  userId: string;
  restaurantId?: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface CognitoUser {
  userId: string;
  email: string;
  name: string;
  restaurantName: string;
  cuisineType: string;
  location: string;
}

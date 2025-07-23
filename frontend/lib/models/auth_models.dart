import 'package:json_annotation/json_annotation.dart';

part 'auth_models.g.dart';

@JsonSerializable()
class User {
  final String userId;
  final String email;
  final DateTime createdAt;
  
  User({
    required this.userId,
    required this.email,
    required this.createdAt,
  });
  
  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);
}

@JsonSerializable()
class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final String idToken;
  final int expiresIn;
  final String userId;
  
  AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.idToken,
    required this.expiresIn,
    required this.userId,
  });
  
  factory AuthResponse.fromJson(Map<String, dynamic> json) => _$AuthResponseFromJson(json);
  Map<String, dynamic> toJson() => _$AuthResponseToJson(this);
  
  // Helper getter for backward compatibility
  String get token => accessToken;
}

@JsonSerializable()
class LoginCredentials {
  final String email;
  final String password;
  
  LoginCredentials({
    required this.email,
    required this.password,
  });
  
  factory LoginCredentials.fromJson(Map<String, dynamic> json) => _$LoginCredentialsFromJson(json);
  Map<String, dynamic> toJson() => _$LoginCredentialsToJson(this);
}

@JsonSerializable()
class UserCredentials {
  final String email;
  final String password;
  
  UserCredentials({
    required this.email,
    required this.password,
  });
  
  factory UserCredentials.fromJson(Map<String, dynamic> json) => _$UserCredentialsFromJson(json);
  Map<String, dynamic> toJson() => _$UserCredentialsToJson(this);
}
# Running the Frontend Locally

This document provides instructions on how to run the Flutter frontend application locally for development.

## Prerequisites

Before running the frontend locally, ensure you have the following installed:

### 1. Flutter SDK
- **Version**: 3.6.0 or higher (as specified in `pubspec.yaml`)
- **Installation**: Follow the official Flutter installation guide at [flutter.dev/get-started](https://flutter.dev/get-started)
- **Verification**: Run `flutter doctor` to ensure all dependencies are properly installed

### 2. Dart SDK
- **Version**: 3.6.0 or higher
- **Note**: Usually included with Flutter installation

### 3. IDE/Editor
- **Recommended**: VS Code with Flutter extension, Android Studio, or IntelliJ IDEA
- **Extensions**: Flutter and Dart extensions for your chosen editor

### 4. Backend Setup (Optional but Recommended)
- See [RUNNING_BE_LOCALLY.md](./RUNNING_BE_LOCALLY.md) for backend setup instructions

## Setup Instructions

### 1. Navigate to Frontend Directory

```bash
cd restaurant-menu-optimizer/frontend
```

### 2. Install Dependencies

Install all Flutter dependencies:

```bash
flutter pub get
```

### 3. Generate Code (if needed)

If you've made changes to model files, regenerate the serialization code:

```bash
flutter packages pub run build_runner build
```

Or for continuous generation during development:

```bash
flutter packages pub run build_runner watch
```

### 4. Configure Backend URL (Optional)

By default, the frontend connects to the deployed backend at:
```
https://ofjfkha65m.execute-api.us-east-1.amazonaws.com/dev
```

If you want to connect to a local backend, you'll need to modify the `baseUrl` in `lib/services/http_client.dart`:

```dart
static const String baseUrl = 'http://localhost:3000';
```

### 5. Run the Application

#### For Web Development
```bash
flutter run -d chrome
```

#### For iOS Simulator (macOS only)
```bash
flutter run -d ios
```

#### For Android Emulator
```bash
flutter run -d android
```

#### For Specific Device
List available devices:
```bash
flutter devices
```

Then run on a specific device:
```bash
flutter run -d <device-id>
```

## Development Workflow

### Hot Reload
During development, Flutter supports hot reload. After making changes to your code:
- Press `r` in the terminal to hot reload
- Press `R` for a full restart
- Press `q` to quit

### Debug Mode
The application runs in debug mode by default, which includes:
- Hot reload functionality
- Debug information
- Performance profiling tools

### Release Mode (for testing)
To test the app in release mode:
```bash
flutter run --release
```

## Project Structure

The frontend follows a standard Flutter project structure:

```
frontend/
├── lib/
│   ├── main.dart                 # Application entry point
│   ├── models/                   # Data models
│   ├── providers/                # State management
│   ├── screens/                  # UI screens
│   ├── services/                 # API services
│   ├── utils/                    # Utility functions
│   └── widgets/                  # Reusable widgets
├── pubspec.yaml                  # Dependencies and configuration
└── web/                         # Web-specific files
```

## Key Dependencies

The project uses several important packages:

- **provider**: State management
- **http**: HTTP client for API calls
- **responsive_framework**: Responsive design
- **fl_chart**: Charts for analytics
- **file_picker**: File upload functionality
- **shared_preferences**: Local storage
- **json_annotation**: JSON serialization

## Troubleshooting

### Common Issues

#### 1. Flutter Doctor Issues
If `flutter doctor` shows issues:
- Follow the suggested fixes
- Ensure all required dependencies are installed
- Check that your PATH includes Flutter

#### 2. Dependency Issues
If you encounter dependency conflicts:
```bash
flutter clean
flutter pub get
```

#### 3. Build Runner Issues
If code generation fails:
```bash
flutter packages pub run build_runner clean
flutter packages pub run build_runner build --delete-conflicting-outputs
```

#### 4. Web Platform Issues
For web-specific issues:
```bash
flutter config --enable-web
flutter clean
flutter pub get
```

### Performance Tips

1. **Use Release Mode**: Test performance in release mode
2. **Profile**: Use Flutter DevTools for performance profiling
3. **Optimize Images**: Ensure images are properly sized and formatted
4. **Lazy Loading**: Implement lazy loading for large lists

## Environment Configuration

### Development vs Production
The application automatically detects the environment:
- **Debug mode**: Development environment
- **Release mode**: Production environment

### API Configuration
The backend URL is configured in `lib/services/http_client.dart`. You can:
- Use the default deployed backend
- Point to a local backend for development
- Use environment-specific configurations

## Testing

### Run Tests
```bash
flutter test
```

### Widget Tests
The project includes widget tests in the `test/` directory. Run them with:
```bash
flutter test test/widget_test.dart
```

## Building for Production

### Web Build
```bash
flutter build web
```

### Android Build
```bash
flutter build apk
```

### iOS Build
```bash
flutter build ios
```

## Additional Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Dart Documentation](https://dart.dev/guides)
- [Flutter Cookbook](https://flutter.dev/docs/cookbook)
- [Flutter DevTools](https://flutter.dev/docs/development/tools/devtools)

---

**Note**: Make sure you have the backend running locally if you want to test the full application functionality. See [RUNNING_BE_LOCALLY.md](./RUNNING_BE_LOCALLY.md) for backend setup instructions. 
# Restaurant Menu Optimizer - Implementation Plan

## Project Overview
A Restaurant Menu Optimizer that leverages both a Large Language Model (LLM) and Qloo's Taste AI™ API to help restaurant owners optimize their menus for maximum profitability and customer satisfaction. The system combines Qloo's taste profile analysis with LLM capabilities to enhance menu descriptions, generate personalized recommendations, and create innovative menu items based on taste trends.

## Technical Architecture

### Backend Stack (Node.js + TypeScript + AWS)

#### Core Services
- **API Gateway**: RESTful API endpoints for frontend communication
- **Lambda Functions**: Serverless compute for business logic
- **DynamoDB**: NoSQL database for menu items, restaurants, and analytics
- **S3**: File storage for menu images, PDFs, and static assets
- **CloudFront**: CDN for fast content delivery
- **Cognito**: User authentication and authorization

#### Key Lambda Functions
```
/src/lambdas/
├── auth/
│   ├── register-restaurant.ts
│   ├── login.ts
│   └── refresh-token.ts
├── menu/
│   ├── upload-menu.ts
│   ├── parse-menu.ts
│   ├── get-menu-items.ts
│   └── update-menu-item.ts
├── analytics/
│   ├── generate-recommendations.ts
│   ├── calculate-scores.ts
│   └── get-dashboard-data.ts
├── qloo-integration/
│   ├── analyze-taste-profile.ts
│   ├── get-trending-items.ts
│   └── demographic-analysis.ts
└── llm-integration/
    ├── enhance-menu-descriptions.ts
    ├── generate-personalized-recommendations.ts
    ├── create-menu-items.ts
    └── llm-client.ts
```

#### Database Schema (DynamoDB)
```typescript
// Restaurants Table
interface Restaurant {
  restaurantId: string; // PK
  name: string;
  cuisine: string;
  location: string;
  ownerId: string;
  createdAt: string;
  settings: RestaurantSettings;
}

// MenuItems Table
interface MenuItem {
  itemId: string; // PK
  restaurantId: string; // GSI
  name: string;
  description: string;
  enhancedDescription: string; // LLM-generated description
  price: number;
  category: string;
  ingredients: string[];
  dietaryTags: string[];
  imageUrl?: string;
  qlooTasteProfile?: any;
  llmGeneratedTags?: string[]; // Additional tags from LLM analysis
  isActive: boolean;
  isAiGenerated: boolean; // Flag for AI-generated menu items
}

// Analytics Table
interface MenuAnalytics {
  analyticsId: string; // PK
  restaurantId: string; // GSI
  itemId: string;
  popularityScore: number;
  profitabilityScore: number;
  recommendationScore: number;
  lastUpdated: string;
  trends: TrendData[];
}

// LLM Recommendations Table
interface LlmRecommendation {
  recommendationId: string; // PK
  restaurantId: string; // GSI
  targetCustomerSegment: string;
  recommendedItems: string[]; // Array of itemIds
  explanations: string[]; // Natural language explanations for recommendations
  createdAt: string;
  expiresAt: string;
}

// AI-Generated Menu Items
interface MenuItemSuggestion {
  suggestionId: string; // PK
  restaurantId: string; // GSI
  name: string;
  description: string;
  estimatedPrice: number;
  category: string;
  suggestedIngredients: string[];
  dietaryTags: string[];
  inspirationSource: string; // e.g., "trending items", "seasonal", "fusion"
  qlooTasteProfile?: any;
  status: 'pending' | 'approved' | 'rejected';
}
```

### Frontend Stack (Flutter + Dart)

#### Unified Flutter Application
```
/frontend/
├── lib/
│   ├── core/
│   │   ├── services/
│   │   │   ├── auth_service.dart
│   │   │   ├── menu_service.dart
│   │   │   ├── analytics_service.dart
│   │   │   ├── qloo_service.dart
│   │   │   └── llm_service.dart
│   │   ├── models/
│   │   │   ├── restaurant.dart
│   │   │   ├── menu_item.dart
│   │   │   └── analytics.dart
│   │   ├── utils/
│   │   │   ├── responsive_helper.dart
│   │   │   └── platform_helper.dart
│   │   └── constants/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   ├── widgets/
│   │   │   └── providers/
│   │   ├── dashboard/
│   │   │   ├── screens/
│   │   │   ├── widgets/
│   │   │   └── providers/
│   │   ├── menu/
│   │   │   ├── screens/
│   │   │   ├── widgets/
│   │   │   └── providers/
│   │   └── analytics/
│   │       ├── screens/
│   │       ├── widgets/
│   │       └── providers/
│   ├── shared/
│   │   ├── widgets/
│   │   │   ├── responsive_layout.dart
│   │   │   ├── adaptive_scaffold.dart
│   │   │   └── platform_widgets/
│   │   └── themes/
│   └── main.dart
├── web/
├── android/
├── ios/
└── pubspec.yaml
```

## User Interface Design

### Responsive Flutter Application

#### Adaptive Layout Strategy
- **Desktop/Web**: Multi-column layout with sidebar navigation
- **Tablet**: Collapsible sidebar with main content area
- **Mobile**: Bottom navigation with full-screen views
- **Responsive Breakpoints**: Small (<600px), Medium (600-1200px), Large (>1200px)

#### Core UI Components
```dart
// Responsive widgets that adapt to platform and screen size
class AdaptiveScaffold extends StatelessWidget
class ResponsiveLayout extends StatelessWidget
class PlatformAwareCard extends StatelessWidget
class AdaptiveDataTable extends StatelessWidget
class ResponsiveChart extends StatelessWidget
```

#### Dashboard Overview
- **Hero Metrics Cards**: Revenue impact, satisfaction score, optimization percentage
- **Quick Action Buttons**: Upload menu, view recommendations, run analysis
- **Interactive Charts**: Revenue trends, popular items, customer demographics
- **Activity Feed**: Recent changes, A/B test results, notifications
- **Responsive Grid**: Adapts from 4 columns (desktop) to 1 column (mobile)

#### Menu Management Interface
- **Adaptive Grid/List View**: Cards on desktop, list tiles on mobile
- **Floating Action Button**: Add new menu items (mobile) vs toolbar button (desktop)
- **Filter Chips**: Category filtering with horizontal scrolling on mobile
- **Search Bar**: Persistent on desktop, collapsible on mobile
- **Item Detail**: Modal on desktop, full screen on mobile
- **AI Enhancement Controls**: Toggle between original and LLM-enhanced descriptions
- **AI Menu Creation Panel**: Interface for generating and reviewing AI menu suggestions
- **Description Enhancement Editor**: Interactive editor for refining LLM-generated content

#### Analytics Dashboard
- **Interactive Charts**: Touch-friendly on mobile, hover effects on desktop
- **Performance Heatmap**: Scrollable grid on mobile, full view on desktop
- **Recommendation Cards**: Swipeable on mobile, clickable on desktop
- **Trend Analysis**: Zoomable charts with gesture support
- **Export Options**: Share button on mobile, download on desktop

#### Platform-Specific Features
```dart
// Mobile-specific features
class CameraMenuUpload extends StatelessWidget
class PushNotificationHandler extends StatelessWidget
class OfflineDataCache extends StatelessWidget

// Web-specific features
class KeyboardShortcuts extends StatelessWidget
class BulkActionToolbar extends StatelessWidget
class AdvancedFiltering extends StatelessWidget
```

## Qloo Integration Strategy

### API Integration Points
```typescript
interface QlooService {
  analyzeTasteProfile(menuItem: MenuItem): Promise<TasteProfile>;
  getTrendingItems(cuisine: string, location: string): Promise<TrendingItem[]>;
  getCustomerPreferences(demographics: Demographics): Promise<Preferences>;
  predictPopularity(item: MenuItem, context: RestaurantContext): Promise<number>;
}
```

### Data Flow
1. **Menu Upload** → Parse items → Send to Qloo for taste analysis
2. **Customer Data** → Demographic analysis → Preference mapping
3. **Market Trends** → Qloo trend API → Recommendation generation
4. **Performance Feedback** → Update ML models → Improve predictions

## LLM Integration Strategy

### API Integration Points
```typescript
interface LlmService {
  // Menu Description Enhancement
  enhanceMenuDescription(
    menuItem: MenuItem, 
    tasteProfile: TasteProfile, 
    targetAudience?: string
  ): Promise<string>;
  
  // Personalized Recommendations
  generatePersonalizedRecommendations(
    customerProfile: CustomerProfile,
    menuItems: MenuItem[],
    tasteProfiles: Record<string, TasteProfile>
  ): Promise<LlmRecommendation>;
  
  // Menu Item Creation
  createMenuItemSuggestions(
    restaurantProfile: Restaurant,
    trendingTasteProfiles: TasteProfile[],
    existingMenuItems: MenuItem[],
    constraints?: MenuItemConstraints
  ): Promise<MenuItemSuggestion[]>;
}
```

### LLM Provider Options
- **OpenAI GPT-4**: Primary LLM for high-quality text generation and reasoning
- **Anthropic Claude**: Alternative for longer context and nuanced explanations
- **Google Gemini**: Option for multimodal capabilities (analyzing menu images)

### Data Flow & Integration Points
1. **Menu Description Enhancement**:
   - Upload menu → Qloo taste analysis → LLM enhancement → Enhanced descriptions
   - LLM uses Qloo taste profiles to generate compelling, targeted descriptions

2. **Personalized Recommendations**:
   - Customer data → Qloo preference mapping → LLM personalization → Natural language recommendations
   - LLM explains why items match customer preferences based on Qloo taste profiles

3. **Menu Item Creation**:
   - Qloo trend analysis → LLM creative generation → New menu item suggestions
   - LLM uses Qloo taste trends to generate innovative menu items that align with current preferences

## Development Phases

### Phase 1: MVP (2-3 weeks)
- Basic menu upload and parsing
- Simple Qloo integration for taste profiles
- Initial LLM integration for menu description enhancement
- Basic dashboard with key metrics
- User authentication

### Phase 2: Advanced AI Integration (1-2 weeks)
- Full LLM integration for all three use cases
- Advanced Qloo taste profile analysis
- Personalized recommendation engine with LLM explanations
- AI-powered menu item creation workflow
- A/B testing framework for AI-generated content

### Phase 3: Analytics & Optimization (1-2 weeks)
- Advanced analytics dashboard
- Performance tracking for AI-enhanced content
- Optimization of LLM prompts based on user feedback
- Fine-tuning of recommendation algorithms

### Phase 4: Mobile & Polish (1-2 weeks)
- Flutter mobile app
- Enhanced UI/UX for AI features
- Advanced Qloo and LLM integrations
- Performance optimizations

## Deployment Strategy

### AWS Infrastructure
```yaml
# serverless.yml structure
service: restaurant-menu-optimizer
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  
functions:
  - ${file(./lambdas/auth.yml)}
  - ${file(./lambdas/menu.yml)}
  - ${file(./lambdas/analytics.yml)}
  
resources:
  - ${file(./resources/dynamodb.yml)}
  - ${file(./resources/s3.yml)}
  - ${file(./resources/cognito.yml)}
```

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **AWS CodePipeline**: Production deployment pipeline
- **CloudFormation**: Infrastructure as code
- **AWS Amplify**: Frontend hosting and deployment

## Success Metrics & KPIs

### Technical Metrics
- API response times < 200ms
- 99.9% uptime
- Mobile app performance scores > 90
- Qloo API integration success rate > 95%
- LLM response time < 1.5s for description enhancements
- LLM accuracy rate > 90% for menu item suggestions

### Business Metrics
- User engagement (daily active users)
- Recommendation acceptance rate
- Revenue impact for participating restaurants
- Customer satisfaction improvements
- A/B testing metrics comparing original vs. LLM-enhanced descriptions
- Adoption rate of AI-generated menu items
- Click-through rate on personalized recommendations with LLM explanations

## Next Steps

1. Set up AWS infrastructure and basic Lambda functions
2. Implement core menu management APIs
3. Build basic Flutter dashboard (note: changed from Angular to match frontend stack)
4. Integrate with Qloo APIs for taste analysis
5. Set up LLM integration with selected provider (OpenAI, Anthropic, or Google)
6. Implement menu description enhancement with LLM
7. Develop personalized recommendation engine with LLM explanations
8. Create AI-powered menu item generation workflow
9. Build Flutter mobile application with AI features
10. Implement A/B testing for AI-enhanced content
11. Optimize LLM prompts based on user feedback
12. Conduct user testing and iterate

This architecture provides a solid foundation for the hackathon by demonstrating how Qloo's Taste AI™ connects behavior with cultural context through LLM integration. The combination of Qloo's taste profiling capabilities with LLM-powered content generation creates a powerful system that helps restaurants understand and respond to customer preferences across different domains.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/menu_provider.dart';
import '../../providers/restaurant_provider.dart';
import '../../models/menu_models.dart';
import '../../utils/app_routes.dart';
import '../../utils/restaurant_loader_mixin.dart';
import '../../widgets/optimization_item_card.dart';
import 'optimization_review_screen.dart';

class PendingMenuSuggestionsScreen extends StatefulWidget {
  const PendingMenuSuggestionsScreen({super.key});

  @override
  State<PendingMenuSuggestionsScreen> createState() =>
      _PendingMenuSuggestionsScreenState();
}

class _PendingMenuSuggestionsScreenState
    extends State<PendingMenuSuggestionsScreen> with RestaurantLoaderMixin {
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPendingSuggestions();
    });
  }

  Future<void> _loadPendingSuggestions() async {
    // Ensure restaurant is loaded first
    final restaurantLoaded = await ensureRestaurantLoaded();
    if (!restaurantLoaded) {
      return;
    }

    final restaurantProvider =
        Provider.of<RestaurantProvider>(context, listen: false);
    final menuProvider = Provider.of<MenuProvider>(context, listen: false);
    final restaurantId = restaurantProvider.restaurant?.restaurantId;

    if (restaurantId != null) {
      await menuProvider.fetchOptimizationResults(restaurantId, 'new_items');
    }
  }

  Future<void> _refreshSuggestions() async {
    setState(() {
      _isRefreshing = true;
    });

    try {
      await _loadPendingSuggestions();
    } finally {
      setState(() {
        _isRefreshing = false;
      });
    }
  }

  void _viewSuggestion(MenuItemSuggestion item) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => OptimizationReviewScreen(
          optimizationType: 'suggest-new-items',
          isLoading: false,
        ),
      ),
    ).then((_) {
      // Refresh the list when returning from the review screen
      _loadPendingSuggestions();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<MenuProvider, RestaurantProvider>(
      builder: (context, menuProvider, restaurantProvider, child) {
        return withRestaurantLoading(() {
          final pendingSuggestions = menuProvider.suggestions
              .where((item) => item.status == 'pending')
              .toList();

          return Scaffold(
            appBar: AppBar(
              title: const Text('Pending Menu Suggestions'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.of(context)
                    .pushReplacementNamed(AppRoutes.menuManagement),
              ),
              actions: [
                IconButton(
                  onPressed: _isRefreshing ? null : _refreshSuggestions,
                  icon: _isRefreshing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh),
                  tooltip: 'Refresh',
                ),
              ],
            ),
            body: menuProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : menuProvider.error != null
                    ? _buildErrorState(menuProvider.error!)
                    : pendingSuggestions.isEmpty
                        ? _buildEmptyState()
                        : _buildSuggestionsList(pendingSuggestions),
          );
        });
      },
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red[400]),
          const SizedBox(height: 16),
          Text(
            'Error Loading Suggestions',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.red[600],
                ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              error,
              style: TextStyle(color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _refreshSuggestions,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    // Check if there are any suggestions at all (including completed ones)
    final menuProvider = Provider.of<MenuProvider>(context, listen: false);
    final allSuggestions = menuProvider.suggestions;

    if (allSuggestions.isEmpty) {
      // Show loading state if no suggestions exist yet
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              margin: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.green[200]!),
              ),
              child: Column(
                children: [
                  const CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Generating Menu Suggestions',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.green[800],
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'We\'re generating new menu item suggestions based on popular dishes from similar restaurants and your selected preferences. This process typically takes 2-3 minutes.',
                    style: TextStyle(
                      color: Colors.green[700],
                      fontSize: 16,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.orange[50],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.orange[200]!),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline,
                            color: Colors.orange[700], size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'You can leave this screen and come back later. The results will be available once processing is complete.',
                            style: TextStyle(
                              color: Colors.orange[700],
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _refreshSuggestions,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Check Status Now'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green[600],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    } else {
      // Show empty state for no pending suggestions
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.green[50],
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.add_circle_outline,
                size: 60,
                color: Colors.green[400],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Pending Suggestions',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            Text(
              'All your menu suggestions have been processed.\nCheck completed suggestions or start a new optimization.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: () => Navigator.of(context)
                      .pushReplacementNamed(AppRoutes.optimizationOptions),
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text('Start New Optimization'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green[600],
                    foregroundColor: Colors.white,
                  ),
                ),
                const SizedBox(width: 16),
                OutlinedButton.icon(
                  onPressed: () => Navigator.of(context)
                      .pushReplacementNamed(AppRoutes.menuManagement),
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Back to Menu'),
                ),
              ],
            ),
          ],
        ),
      );
    }
  }

  Widget _buildSuggestionsList(List<MenuItemSuggestion> suggestions) {
    return Column(
      children: [
        // Header with count
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.green[50],
            border: Border(
              bottom: BorderSide(color: Colors.green[200]!),
            ),
          ),
          child: Row(
            children: [
              Icon(Icons.hourglass_empty, color: Colors.green[700]),
              const SizedBox(width: 8),
              Text(
                '${suggestions.length} Pending Suggestion${suggestions.length == 1 ? '' : 's'}',
                style: TextStyle(
                  color: Colors.green[700],
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const Spacer(),
              Text(
                'Tap on an item to review',
                style: TextStyle(
                  color: Colors.green[600],
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        // List of suggestions
        Expanded(
          child: RefreshIndicator(
            onRefresh: _refreshSuggestions,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: suggestions.length,
              itemBuilder: (context, index) {
                final suggestion = suggestions[index];
                return OptimizationItemCard(
                  item: suggestion,
                  onTap: () => _viewSuggestion(suggestion),
                  showStatus: true,
                  isCompact: false,
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

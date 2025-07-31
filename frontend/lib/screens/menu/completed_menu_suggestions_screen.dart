import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/menu_provider.dart';
import '../../providers/restaurant_provider.dart';
import '../../models/menu_models.dart';
import '../../utils/app_routes.dart';
import '../../utils/restaurant_loader_mixin.dart';
import '../../widgets/optimization_item_card.dart';

class CompletedMenuSuggestionsScreen extends StatefulWidget {
  const CompletedMenuSuggestionsScreen({super.key});

  @override
  State<CompletedMenuSuggestionsScreen> createState() =>
      _CompletedMenuSuggestionsScreenState();
}

class _CompletedMenuSuggestionsScreenState
    extends State<CompletedMenuSuggestionsScreen> with RestaurantLoaderMixin {
  String _selectedStatus = 'All'; // All, Approved, Rejected

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCompletedSuggestions();
    });
  }

  Future<void> _loadCompletedSuggestions() async {
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

  List<MenuItemSuggestion> _getFilteredSuggestions(
      List<MenuItemSuggestion> suggestions) {
    switch (_selectedStatus) {
      case 'Approved':
        return suggestions.where((item) => item.status == 'approved').toList();
      case 'Rejected':
        return suggestions.where((item) => item.status == 'rejected').toList();
      default:
        return suggestions
            .where((item) =>
                item.status == 'approved' || item.status == 'rejected')
            .toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<MenuProvider, RestaurantProvider>(
      builder: (context, menuProvider, restaurantProvider, child) {
        return withRestaurantLoading(() {
          final completedSuggestions =
              _getFilteredSuggestions(menuProvider.suggestions);

          return Scaffold(
            appBar: AppBar(
              title: const Text('Completed Menu Suggestions'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.of(context)
                    .pushReplacementNamed(AppRoutes.menuManagement),
              ),
            ),
            body: menuProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : menuProvider.error != null
                    ? _buildErrorState(menuProvider.error!)
                    : completedSuggestions.isEmpty
                        ? _buildEmptyState()
                        : _buildSuggestionsList(completedSuggestions),
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
            onPressed: _loadCompletedSuggestions,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: Colors.grey[50],
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.assessment,
              size: 60,
              color: Colors.grey[400],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'No Completed Suggestions',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            'You haven\'t completed any menu suggestions yet.\nStart an optimization to see results here.',
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
                label: const Text('Start Optimization'),
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

  Widget _buildSuggestionsList(List<MenuItemSuggestion> suggestions) {
    return Column(
      children: [
        // Filter chips
        Container(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Text(
                'Filter by status:',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Colors.grey[700],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['All', 'Approved', 'Rejected'].map((status) {
                      final isSelected = _selectedStatus == status;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(status),
                          selected: isSelected,
                          onSelected: (_) {
                            setState(() {
                              _selectedStatus = status;
                            });
                          },
                          backgroundColor: Colors.grey[100],
                          selectedColor: Colors.green[100],
                          checkmarkColor: Colors.green[700],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
        // Header with count
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey[50],
            border: Border(
              bottom: BorderSide(color: Colors.grey[200]!),
            ),
          ),
          child: Row(
            children: [
              Icon(Icons.assessment, color: Colors.grey[700]),
              const SizedBox(width: 8),
              Text(
                '${suggestions.length} Completed Suggestion${suggestions.length == 1 ? '' : 's'}',
                style: TextStyle(
                  color: Colors.grey[700],
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const Spacer(),
              Text(
                'View only',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        // List of suggestions
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: suggestions.length,
            itemBuilder: (context, index) {
              final suggestion = suggestions[index];
              return OptimizationItemCard(
                item: suggestion,
                onTap: null, // Read-only view
                showStatus: true,
                isCompact: true,
              );
            },
          ),
        ),
      ],
    );
  }
}

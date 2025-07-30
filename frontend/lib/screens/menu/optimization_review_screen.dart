import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/menu_provider.dart';
import '../../providers/restaurant_provider.dart';
import '../../models/menu_models.dart';
import '../../utils/app_routes.dart';

class OptimizationReviewScreen extends StatefulWidget {
  final String optimizationType;
  
  const OptimizationReviewScreen({
    super.key,
    required this.optimizationType,
  });

  @override
  State<OptimizationReviewScreen> createState() => _OptimizationReviewScreenState();
}

class _OptimizationReviewScreenState extends State<OptimizationReviewScreen> {
  final Map<String, bool> _approvalStates = {};
  bool _isProcessingApprovals = false;
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Consumer<MenuProvider>(
      builder: (context, menuProvider, child) {
        final isOptimizeExisting = widget.optimizationType == 'optimize-existing';
        final optimizedItems = menuProvider.optimizedItems;
        final suggestions = menuProvider.suggestions;
        final items = isOptimizeExisting ? optimizedItems : suggestions;

        if (items.isEmpty) {
          return _buildEmptyState(context);
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(isOptimizeExisting ? 'Review Menu Optimizations' : 'Review Menu Suggestions'),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).pushReplacementNamed(AppRoutes.optimizationOptions),
            ),
            actions: [
              TextButton.icon(
                onPressed: _isProcessingApprovals ? null : () => _processAllApprovals(context, menuProvider),
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Apply All'),
              ),
            ],
          ),
          body: Column(
            children: [
              // Progress indicator
              Container(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${_currentIndex + 1} of ${items.length}',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${_getApprovedCount()} approved',
                          style: TextStyle(
                            color: Colors.green[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: (_currentIndex + 1) / items.length,
                      backgroundColor: Colors.grey[300],
                      valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).primaryColor),
                    ),
                  ],
                ),
              ),
              
              // Main content
              Expanded(
                child: PageView.builder(
                  itemCount: items.length,
                  onPageChanged: (index) => setState(() => _currentIndex = index),
                  itemBuilder: (context, index) {
                    if (isOptimizeExisting) {
                      return _buildOptimizedItemView(optimizedItems[index]);
                    } else {
                      return _buildSuggestionView(suggestions[index]);
                    }
                  },
                ),
              ),
              
              // Bottom navigation
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 4,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Previous button
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _currentIndex > 0 
                            ? () => _navigateToIndex(_currentIndex - 1)
                            : null,
                        icon: const Icon(Icons.arrow_back),
                        label: const Text('Previous'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    
                    // Approval buttons
                    Expanded(
                      flex: 2,
                      child: Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _setApproval(items[_currentIndex], false),
                              icon: const Icon(Icons.close),
                              label: const Text('Reject'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.red,
                                side: BorderSide(
                                  color: _getApprovalState(items[_currentIndex]) == false 
                                      ? Colors.red 
                                      : Colors.grey[300]!,
                                ),
                                backgroundColor: _getApprovalState(items[_currentIndex]) == false 
                                    ? Colors.red.withValues(alpha: 0.1) 
                                    : null,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _setApproval(items[_currentIndex], true),
                              icon: const Icon(Icons.check),
                              label: const Text('Approve'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _getApprovalState(items[_currentIndex]) == true 
                                    ? Colors.green 
                                    : null,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    
                    // Next button
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _currentIndex < items.length - 1 
                            ? () => _navigateToIndex(_currentIndex + 1)
                            : null,
                        icon: const Icon(Icons.arrow_forward),
                        label: const Text('Next'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          floatingActionButton: _getApprovedCount() > 0 
              ? FloatingActionButton.extended(
                  onPressed: _isProcessingApprovals ? null : () => _processAllApprovals(context, menuProvider),
                  icon: _isProcessingApprovals 
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.save),
                  label: Text(_isProcessingApprovals ? 'Saving...' : 'Save Changes'),
                )
              : null,
        );
      },
    );
  }

  Widget _buildOptimizedItemView(OptimizedMenuItem item) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Theme.of(context).primaryColor.withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.auto_awesome,
                      color: Theme.of(context).primaryColor,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Optimized Menu Item',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  item.optimizationReason,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Side-by-side comparison
          _buildComparisonSection(
            'Dish Name',
            item.originalName,
            item.optimizedName,
          ),
          
          const SizedBox(height: 20),
          
          _buildComparisonSection(
            'Description',
            item.originalDescription,
            item.optimizedDescription,
          ),
          
          const SizedBox(height: 24),
          
          // Demographic insights
          if (item.demographicInsights.isNotEmpty) ...[
            Text(
              'Demographic Insights Used',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: item.demographicInsights.map((insight) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.insights,
                        size: 16,
                        color: Colors.blue[700],
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          insight,
                          style: TextStyle(
                            color: Colors.blue[700],
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                )).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSuggestionView(MenuItemSuggestion suggestion) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.green.withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.add_circle_outline,
                      color: Colors.green[700],
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'New Menu Item Suggestion',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.green[700],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Inspired by ${suggestion.inspirationSource}',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
                if (suggestion.basedOnSpecialtyDish != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Based on popular dish: ${suggestion.basedOnSpecialtyDish}',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Suggestion details
          _buildSuggestionDetailCard('Dish Name', suggestion.name, Icons.restaurant),
          const SizedBox(height: 16),
          _buildSuggestionDetailCard('Description', suggestion.description, Icons.description),
          const SizedBox(height: 16),
          _buildSuggestionDetailCard('Category', suggestion.category, Icons.category),
          const SizedBox(height: 16),
          _buildSuggestionDetailCard('Estimated Price', '\$${suggestion.estimatedPrice.toStringAsFixed(2)}', Icons.attach_money),
          
          const SizedBox(height: 16),
          
          // Ingredients
          if (suggestion.suggestedIngredients.isNotEmpty) ...[
            _buildSuggestionDetailCard(
              'Suggested Ingredients',
              suggestion.suggestedIngredients.join(', '),
              Icons.list_alt,
            ),
            const SizedBox(height: 16),
          ],
          
          // Dietary tags
          if (suggestion.dietaryTags.isNotEmpty) ...[
            Text(
              'Dietary Tags',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: suggestion.dietaryTags.map((tag) => Chip(
                label: Text(tag),
                backgroundColor: Colors.orange[100],
                labelStyle: TextStyle(color: Colors.orange[800]),
              )).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildComparisonSection(String title, String original, String optimized) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Original
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.remove_circle_outline, color: Colors.red[700], size: 16),
                        const SizedBox(width: 4),
                        Text(
                          'Original',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.red[700],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      original,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Optimized
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.add_circle_outline, color: Colors.green[700], size: 16),
                        const SizedBox(width: 4),
                        Text(
                          'Optimized',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.green[700],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      optimized,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSuggestionDetailCard(String title, String content, IconData icon) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.grey[600], size: 16),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: const TextStyle(fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Optimization Review'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pushReplacementNamed(AppRoutes.optimizationOptions),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No optimization results found',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Please go back and try the optimization again.',
              style: TextStyle(color: Colors.grey[500]),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pushReplacementNamed(AppRoutes.optimizationOptions),
              child: const Text('Back to Options'),
            ),
          ],
        ),
      ),
    );
  }

  String _getItemId(dynamic item) {
    if (item is OptimizedMenuItem) {
      return item.itemId;
    } else if (item is MenuItemSuggestion) {
      return item.suggestionId;
    }
    return '';
  }

  bool? _getApprovalState(dynamic item) {
    return _approvalStates[_getItemId(item)];
  }

  void _setApproval(dynamic item, bool approved) {
    setState(() {
      _approvalStates[_getItemId(item)] = approved;
    });
  }

  int _getApprovedCount() {
    return _approvalStates.values.where((approved) => approved == true).length;
  }

  void _navigateToIndex(int index) {
    setState(() => _currentIndex = index);
  }

  Future<void> _processAllApprovals(BuildContext context, MenuProvider menuProvider) async {
    final approvedItems = _approvalStates.entries
        .where((entry) => entry.value == true)
        .map((entry) => entry.key)
        .toList();

    if (approvedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please approve at least one item before saving.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isProcessingApprovals = true);

    try {
      // Get restaurant ID from provider
      final restaurantProvider = Provider.of<RestaurantProvider>(context, listen: false);
      final restaurantId = restaurantProvider.restaurant?.restaurantId;
      
      if (restaurantId == null) {
        throw Exception('Restaurant ID not found');
      }

      // Determine the type based on optimization type
      final type = widget.optimizationType == 'optimize-existing' ? 'existing_items' : 'new_items';

      // Process approvals for each item
      for (final itemId in approvedItems) {
        await menuProvider.approveOptimization(
          restaurantId,
          type,
          itemId,
          true,
        );
      }

      // Process rejections
      final rejectedItems = _approvalStates.entries
          .where((entry) => entry.value == false)
          .map((entry) => entry.key)
          .toList();

      for (final itemId in rejectedItems) {
        await menuProvider.approveOptimization(
          restaurantId,
          type,
          itemId,
          false,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Successfully processed ${approvedItems.length} approvals!'),
            backgroundColor: Colors.green,
          ),
        );

        // Navigate to menu management screen
        Navigator.of(context).pushReplacementNamed(AppRoutes.menuManagement);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error processing approvals: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessingApprovals = false);
      }
    }
  }
}
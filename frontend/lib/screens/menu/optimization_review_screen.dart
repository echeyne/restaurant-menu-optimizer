import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/menu_provider.dart';
import '../../providers/restaurant_provider.dart';
import '../../models/menu_models.dart';
import '../../utils/app_routes.dart';
import '../../utils/restaurant_loader_mixin.dart';

class OptimizationReviewScreen extends StatefulWidget {
  final String optimizationType;
  final bool isLoading;
  final Map<String, dynamic>? optimizationData;

  const OptimizationReviewScreen({
    super.key,
    required this.optimizationType,
    this.isLoading = false,
    this.optimizationData,
  });

  @override
  State<OptimizationReviewScreen> createState() =>
      _OptimizationReviewScreenState();
}

class _OptimizationReviewScreenState extends State<OptimizationReviewScreen>
    with RestaurantLoaderMixin {
  final Map<String, bool> _approvalStates = {};
  bool _isProcessingApprovals = false;
  int _currentIndex = 0;
  bool _isLoadingOptimization = false;
  Timer? _refreshTimer;
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _isLoadingOptimization = widget.isLoading;
    _pageController = PageController(initialPage: 0);

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Ensure restaurant is loaded first
      await ensureRestaurantLoaded();

      if (_isLoadingOptimization) {
        // Start polling for results every 5 seconds
        _refreshTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
          _checkOptimizationStatus();
        });
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _checkOptimizationStatus() async {
    final menuProvider = Provider.of<MenuProvider>(context, listen: false);
    final restaurantProvider =
        Provider.of<RestaurantProvider>(context, listen: false);
    final restaurantId = restaurantProvider.restaurant?.restaurantId;

    if (restaurantId == null) return;

    try {
      // Refresh menu items to check if optimization results are available
      await menuProvider.getMenuItems(restaurantId);

      // Check if we have optimization results
      final isOptimizeExisting = widget.optimizationType == 'optimize-existing';
      final hasResults = isOptimizeExisting
          ? menuProvider.optimizedItems.isNotEmpty
          : menuProvider.suggestions.isNotEmpty;

      if (hasResults && mounted) {
        setState(() {
          _isLoadingOptimization = false;
        });
        _refreshTimer?.cancel();
      }
    } catch (e) {
      debugPrint('Error checking optimization status: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MenuProvider>(
      builder: (context, menuProvider, child) {
        final isOptimizeExisting =
            widget.optimizationType == 'optimize-existing';
        final optimizedItems = menuProvider.optimizedItems;
        final suggestions = menuProvider.suggestions;
        final items = isOptimizeExisting ? optimizedItems : suggestions;

        return withRestaurantLoading(() {
          // Show loading state if optimization is in progress
          if (_isLoadingOptimization) {
            return _buildLoadingState(context, isOptimizeExisting);
          }

          if (items.isEmpty) {
            return _buildCompletionState(context);
          }

          return Scaffold(
            appBar: AppBar(
              title: Text(isOptimizeExisting
                  ? 'Review Menu Optimizations'
                  : 'Review Menu Suggestions'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.of(context)
                    .pushReplacementNamed(AppRoutes.menuManagement),
              ),
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
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: (_currentIndex + 1) / items.length,
                        backgroundColor: Colors.grey[300],
                        valueColor: AlwaysStoppedAnimation<Color>(
                            Theme.of(context).primaryColor),
                      ),
                    ],
                  ),
                ),

                // Main content
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: items.length,
                    onPageChanged: (index) =>
                        setState(() => _currentIndex = index),
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

                      // Approval buttons or status
                      Expanded(
                        flex: 2,
                        child: _buildApprovalSection(items[_currentIndex]),
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
                    onPressed: _isProcessingApprovals
                        ? null
                        : () => _processAllApprovals(context, menuProvider),
                    icon: _isProcessingApprovals
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.save),
                    label: Text(
                        _isProcessingApprovals ? 'Saving...' : 'Save Changes'),
                  )
                : null,
          );
        });
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
                children: item.demographicInsights
                    .map((insight) => Row(
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
                        ))
                    .toList(),
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
          _buildSuggestionDetailCard(
              'Dish Name', suggestion.name, Icons.restaurant),
          const SizedBox(height: 16),
          _buildSuggestionDetailCard(
              'Description', suggestion.description, Icons.description),
          const SizedBox(height: 16),
          _buildSuggestionDetailCard(
              'Category', suggestion.category, Icons.category),
          const SizedBox(height: 16),
          _buildSuggestionDetailCard(
              'Estimated Price',
              '\$${suggestion.estimatedPrice.toStringAsFixed(2)}',
              Icons.attach_money),

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
              children: suggestion.dietaryTags
                  .map((tag) => Chip(
                        label: Text(tag),
                        // backgroundColor: Colors.orange[100],
                        // labelStyle: TextStyle(color: Colors.orange[800]),
                      ))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildComparisonSection(
      String title, String original, String optimized) {
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
                        Icon(Icons.remove_circle_outline,
                            color: Colors.red[700], size: 16),
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
                        Icon(Icons.add_circle_outline,
                            color: Colors.green[700], size: 16),
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

  Widget _buildSuggestionDetailCard(
      String title, String content, IconData icon) {
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

  Widget _buildLoadingState(BuildContext context, bool isOptimizeExisting) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isOptimizeExisting
            ? 'Menu Optimization in Progress'
            : 'Menu Suggestions in Progress'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context)
              .pushReplacementNamed(AppRoutes.optimizationOptions),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              margin: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Column(
                children: [
                  const CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    isOptimizeExisting
                        ? 'Optimizing Your Menu Items'
                        : 'Generating Menu Suggestions',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue[800],
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isOptimizeExisting
                        ? 'We\'re analyzing your existing menu items and optimizing them based on your selected demographics and preferences. This process typically takes 2-3 minutes.'
                        : 'We\'re generating new menu item suggestions based on popular dishes from similar restaurants and your selected preferences. This process typically takes 2-3 minutes.',
                    style: TextStyle(
                      color: Colors.blue[700],
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
                      onPressed: _checkOptimizationStatus,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Check Status Now'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue[600],
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
      ),
    );
  }

  Widget _buildCompletionState(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Optimization Review'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context)
              .pushReplacementNamed(AppRoutes.optimizationOptions),
        ),
      ),
      body: Center(
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
                  Icon(Icons.check_circle, size: 64, color: Colors.green[600]),
                  const SizedBox(height: 16),
                  Text(
                    'All Items Processed!',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.green[800],
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'You have successfully reviewed all optimization items. Your approved changes have been saved to your menu.',
                    style: TextStyle(
                      color: Colors.green[700],
                      fontSize: 16,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.of(context)
                          .pushReplacementNamed(AppRoutes.menuManagement),
                      icon: const Icon(Icons.restaurant_menu),
                      label: const Text('View Updated Menu'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green[600],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.of(context)
                          .pushReplacementNamed(AppRoutes.optimizationOptions),
                      icon: const Icon(Icons.auto_awesome),
                      label: const Text('Run More Optimizations'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.green[700],
                        side: BorderSide(color: Colors.green[700]!),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
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

  String _getItemStatus(dynamic item) {
    if (item is OptimizedMenuItem) {
      return item.status;
    } else if (item is MenuItemSuggestion) {
      return item.status;
    }
    return 'pending';
  }

  bool? _getApprovalState(dynamic item) {
    return _approvalStates[_getItemId(item)];
  }

  void _setApproval(dynamic item, bool approved) {
    setState(() {
      _approvalStates[_getItemId(item)] = approved;
    });
  }

  Widget _buildApprovalSection(dynamic item) {
    final status = _getItemStatus(item);

    if (status == 'approved' || status == 'rejected') {
      // Show status instead of buttons
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: status == 'approved' ? Colors.green[50] : Colors.red[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: status == 'approved' ? Colors.green[200]! : Colors.red[200]!,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              status == 'approved' ? Icons.check_circle : Icons.cancel,
              color: status == 'approved' ? Colors.green[700] : Colors.red[700],
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              status == 'approved' ? 'Approved' : 'Rejected',
              style: TextStyle(
                color:
                    status == 'approved' ? Colors.green[700] : Colors.red[700],
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    } else {
      // Show approval buttons
      return Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _processSingleApproval(item, false),
              icon: const Icon(Icons.close),
              label: const Text('Reject'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () => _processSingleApproval(item, true),
              icon: const Icon(Icons.check),
              label: const Text('Approve'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
              ),
            ),
          ),
        ],
      );
    }
  }

  Future<void> _processSingleApproval(dynamic item, bool approved) async {
    final itemId = _getItemId(item);

    try {
      final menuProvider = Provider.of<MenuProvider>(context, listen: false);
      final restaurantProvider =
          Provider.of<RestaurantProvider>(context, listen: false);
      final restaurantId = restaurantProvider.restaurant?.restaurantId;

      if (restaurantId == null) {
        throw Exception('Restaurant ID not found');
      }

      final type = widget.optimizationType == 'optimize-existing'
          ? 'existing_items'
          : 'new_items';

      // Process the approval/rejection
      await menuProvider.approveOptimization(
        restaurantId,
        type,
        itemId,
        approved,
      );

      // Remove from approval states
      _approvalStates.remove(itemId);

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Item ${approved ? 'approved' : 'rejected'} successfully!'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }

      // Remove the item after a delay to show the status
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          menuProvider.removeProcessedItem(type, itemId);

          // Adjust current index if needed
          final isOptimizeExisting =
              widget.optimizationType == 'optimize-existing';
          final items = isOptimizeExisting
              ? menuProvider.optimizedItems
              : menuProvider.suggestions;

          if (_currentIndex >= items.length && items.isNotEmpty) {
            _currentIndex = items.length - 1;
          } else if (items.isEmpty) {
            _currentIndex = 0;
          }
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error processing item: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  int _getApprovedCount() {
    return _approvalStates.values.where((approved) => approved == true).length;
  }

  void _navigateToIndex(int index) {
    setState(() => _currentIndex = index);
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _processAllApprovals(
      BuildContext context, MenuProvider menuProvider) async {
    final approvedItems = _approvalStates.entries
        .where((entry) => entry.value == true)
        .map((entry) => entry.key)
        .toList();

    final rejectedItems = _approvalStates.entries
        .where((entry) => entry.value == false)
        .map((entry) => entry.key)
        .toList();

    if (approvedItems.isEmpty && rejectedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'No items to process. Please approve or reject at least one item.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isProcessingApprovals = true);

    try {
      // Get restaurant ID from provider
      final restaurantProvider =
          Provider.of<RestaurantProvider>(context, listen: false);
      final restaurantId = restaurantProvider.restaurant?.restaurantId;

      if (restaurantId == null) {
        throw Exception('Restaurant ID not found');
      }

      // Determine the type based on optimization type
      final type = widget.optimizationType == 'optimize-existing'
          ? 'existing_items'
          : 'new_items';

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
      for (final itemId in rejectedItems) {
        await menuProvider.approveOptimization(
          restaurantId,
          type,
          itemId,
          false,
        );
      }

      // Remove processed items after a delay
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          for (final itemId in [...approvedItems, ...rejectedItems]) {
            menuProvider.removeProcessedItem(type, itemId);
          }
        }
      });

      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);

        // Clear approval states for processed items
        for (final itemId in [...approvedItems, ...rejectedItems]) {
          _approvalStates.remove(itemId);
        }

        // Reset current index if it's now out of bounds
        final isOptimizeExisting =
            widget.optimizationType == 'optimize-existing';
        final items = isOptimizeExisting
            ? menuProvider.optimizedItems
            : menuProvider.suggestions;

        if (_currentIndex >= items.length && items.isNotEmpty) {
          _currentIndex = items.length - 1;
        } else if (items.isEmpty) {
          _currentIndex = 0;
        }

        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text(
                'Successfully processed ${approvedItems.length} approvals and ${rejectedItems.length} rejections!'),
            backgroundColor: Colors.green,
          ),
        );

        // Stay on the current screen instead of navigating away
        // The UI will automatically update to show remaining items or empty state
      }
    } catch (e) {
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(
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

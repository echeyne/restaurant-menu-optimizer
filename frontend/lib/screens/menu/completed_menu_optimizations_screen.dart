import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/menu_provider.dart';
import '../../providers/restaurant_provider.dart';
import '../../models/menu_models.dart';
import '../../utils/app_routes.dart';
import '../../utils/restaurant_loader_mixin.dart';
import '../../widgets/optimization_item_card.dart';

class CompletedMenuOptimizationsScreen extends StatefulWidget {
  const CompletedMenuOptimizationsScreen({super.key});

  @override
  State<CompletedMenuOptimizationsScreen> createState() =>
      _CompletedMenuOptimizationsScreenState();
}

class _CompletedMenuOptimizationsScreenState
    extends State<CompletedMenuOptimizationsScreen> with RestaurantLoaderMixin {
  String _selectedStatus = 'All'; // All, Approved, Rejected

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCompletedOptimizations();
    });
  }

  Future<void> _loadCompletedOptimizations() async {
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
      await menuProvider.fetchOptimizationResults(
          restaurantId, 'existing_items');
    }
  }

  List<OptimizedMenuItem> _getFilteredOptimizations(
      List<OptimizedMenuItem> optimizations) {
    switch (_selectedStatus) {
      case 'Approved':
        return optimizations
            .where((item) => item.status == 'approved')
            .toList();
      case 'Rejected':
        return optimizations
            .where((item) => item.status == 'rejected')
            .toList();
      default:
        return optimizations
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
          final completedOptimizations =
              _getFilteredOptimizations(menuProvider.optimizedItems);

          return Scaffold(
            appBar: AppBar(
              title: const Text('Completed Menu Optimizations'),
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
                    : completedOptimizations.isEmpty
                        ? _buildEmptyState()
                        : _buildOptimizationsList(completedOptimizations),
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
            'Error Loading Optimizations',
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
            onPressed: _loadCompletedOptimizations,
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
            'No Completed Optimizations',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            'You haven\'t completed any menu optimizations yet.\nStart an optimization to see results here.',
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
                  backgroundColor: Colors.blue[600],
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

  Widget _buildOptimizationsList(List<OptimizedMenuItem> optimizations) {
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
                          selectedColor: Colors.blue[100],
                          checkmarkColor: Colors.blue[700],
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
                '${optimizations.length} Completed Optimization${optimizations.length == 1 ? '' : 's'}',
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
        // List of optimizations
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: optimizations.length,
            itemBuilder: (context, index) {
              final optimization = optimizations[index];
              return OptimizationItemCard(
                item: optimization,
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

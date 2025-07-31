import 'package:flutter/material.dart';
import 'package:frontend/utils/app_routes.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../providers/menu_provider.dart';
import '../../providers/restaurant_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/menu_models.dart';
import '../../utils/restaurant_loader_mixin.dart';
import 'menu_item_detail_screen.dart';
import 'menu_item_edit_screen.dart';

class MenuManagementScreen extends StatefulWidget {
  const MenuManagementScreen({super.key});

  @override
  State<MenuManagementScreen> createState() => _MenuManagementScreenState();
}

class _MenuManagementScreenState extends State<MenuManagementScreen>
    with RestaurantLoaderMixin {
  String _selectedCategory = 'All';
  String? _selectedStatus = 'Active'; // Add status filter - Active by default
  String? _selectedAiFilter; // Add AI filter
  final TextEditingController _searchController = TextEditingController();
  bool _isParsingMenu = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadRestaurantAndMenu();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadRestaurantAndMenu() async {
    // Ensure restaurant is loaded first
    final restaurantLoaded = await ensureRestaurantLoaded();
    if (!restaurantLoaded) {
      return;
    }

    // Then load menu items if we have a restaurant
    _loadMenuItems();
  }

  void _loadMenuItems() {
    final restaurantProvider =
        Provider.of<RestaurantProvider>(context, listen: false);
    final menuProvider = Provider.of<MenuProvider>(context, listen: false);

    if (restaurantProvider.restaurant?.restaurantId != null) {
      menuProvider.getMenuItems(restaurantProvider.restaurant!.restaurantId);
    }
  }

  Future<void> _refreshMenuItemsAndOptimizations() async {
    final restaurantProvider =
        Provider.of<RestaurantProvider>(context, listen: false);
    final menuProvider = Provider.of<MenuProvider>(context, listen: false);

    if (restaurantProvider.restaurant?.restaurantId != null) {
      final restaurantId = restaurantProvider.restaurant!.restaurantId;

      // Load menu items and optimization results in parallel
      await Future.wait([
        menuProvider.getMenuItems(restaurantId),
        menuProvider.refreshOptimizationResults(restaurantId),
      ]);
    }
  }

  Future<void> _uploadMenu() async {
    final restaurantProvider =
        Provider.of<RestaurantProvider>(context, listen: false);
    final menuProvider = Provider.of<MenuProvider>(context, listen: false);

    if (restaurantProvider.restaurant?.restaurantId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Restaurant profile not set up')),
      );
      return;
    }

    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: [
          'pdf',
          'doc',
          'docx',
          'txt',
          'jpg',
          'jpeg',
          'png',
          'csv',
          'xls',
          'xlsx'
        ],
        allowMultiple: false,
        withData: true, // Ensure we get file bytes for web compatibility
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;

        // Validate file size (10MB limit)
        const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxFileSize) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                    'File size exceeds 10MB limit. Please choose a smaller file.'),
                backgroundColor: Colors.red,
              ),
            );
          }
          return;
        }

        // Show loading dialog
        if (mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => const AlertDialog(
              content: Row(
                children: [
                  CircularProgressIndicator(),
                  SizedBox(width: 16),
                  Text('Uploading menu...'),
                ],
              ),
            ),
          );
        }

        final uploadResponse = await menuProvider.uploadMenu(
          restaurantProvider.restaurant!.restaurantId,
          file,
        );

        // Close loading dialog
        if (mounted) {
          Navigator.of(context).pop();
        }

        if (uploadResponse != null && uploadResponse.status == 'success') {
          setState(() {
            _isParsingMenu = true;
          });

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                    'Menu uploaded successfully! Parsing can take a few minutes. Please check back later.'),
                backgroundColor: Colors.green,
                duration: Duration(seconds: 5),
              ),
            );
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                    'Upload failed: ${menuProvider.error ?? 'Unknown error'}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    } catch (e) {
      // Close loading dialog if it's open
      if (mounted && Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error uploading menu: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _refreshMenuItems() async {
    setState(() {
      _isParsingMenu = false;
    });
    _loadMenuItems();
  }

  void _goBackToRestaurantSetup() {
    Navigator.of(context).pushReplacementNamed(AppRoutes.restaurantSetup);
  }

  void _showMenuItemDetail(MenuItem item) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MenuItemDetailScreen(item: item),
      ),
    ).then((_) => _loadMenuItems());
  }

  void _addNewMenuItem() {
    final restaurantProvider =
        Provider.of<RestaurantProvider>(context, listen: false);

    if (restaurantProvider.restaurant?.restaurantId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Restaurant profile not set up')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MenuItemEditScreen(
          restaurantId: restaurantProvider.restaurant!.restaurantId,
        ),
      ),
    ).then((_) => _loadMenuItems());
  }

  List<MenuItem> _getFilteredItems(List<MenuItem> items) {
    List<MenuItem> filtered = items;

    // Filter by status (Active/Inactive)
    if (_selectedStatus == 'Active') {
      filtered = filtered.where((item) => item.isActive).toList();
    } else if (_selectedStatus == 'Inactive') {
      filtered = filtered.where((item) => !item.isActive).toList();
    }
    // If _selectedStatus is null, no status filtering is applied

    // Filter by category
    if (_selectedCategory != 'All') {
      filtered =
          filtered.where((item) => item.category == _selectedCategory).toList();
    }

    // Filter by AI Generated
    if (_selectedAiFilter == 'AI Generated') {
      filtered = filtered.where((item) => item.isAiGenerated).toList();
    } else if (_selectedAiFilter == 'Not AI Generated') {
      filtered = filtered.where((item) => !item.isAiGenerated).toList();
    }
    // If _selectedAiFilter is null, no AI filtering is applied

    // Filter by search term
    if (_searchController.text.isNotEmpty) {
      final searchTerm = _searchController.text.toLowerCase();
      filtered = filtered
          .where((item) =>
              (item.enhancedName ?? item.name)
                  .toLowerCase()
                  .contains(searchTerm) ||
              (item.enhancedDescription ?? item.description)
                  .toLowerCase()
                  .contains(searchTerm))
          .toList();
    }

    // Sort by displayed name (enhancedName or name) alphabetically
    filtered.sort((a, b) => (a.enhancedName ?? a.name)
        .toLowerCase()
        .compareTo((b.enhancedName ?? b.name).toLowerCase()));

    return filtered;
  }

  Set<String> _getCategories(List<MenuItem> items) {
    final categories = items.map((item) => item.category).toSet();
    return {'All', ...categories};
  }

  Set<String> _getStatusOptions() {
    return {'Active', 'Inactive'};
  }

  Set<String> _getAiFilterOptions() {
    return {'AI Generated', 'Not AI Generated'};
  }

  @override
  Widget build(BuildContext context) {
    return Consumer3<MenuProvider, RestaurantProvider, AuthProvider>(
      builder:
          (context, menuProvider, restaurantProvider, authProvider, child) {
        // Check if restaurant profile is complete
        if (!restaurantProvider.isProfileComplete) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Menu Management'),
              automaticallyImplyLeading: false,
            ),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.restaurant_menu, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text(
                    'Complete your restaurant profile first',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'You need to set up your restaurant profile\nbefore managing your menu.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                  SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => Navigator.of(context)
                        .pushReplacementNamed(AppRoutes.restaurantSetup),
                    child: Text('Go back to setup'),
                  ),
                ],
              ),
            ),
          );
        }

        final filteredItems = _getFilteredItems(menuProvider.menuItems);
        final categories = _getCategories(menuProvider.menuItems);
        final statusOptions = _getStatusOptions();
        final aiFilterOptions = _getAiFilterOptions();

        return Scaffold(
          appBar: AppBar(
            title: const Text('Menu Management'),
            automaticallyImplyLeading: false,
            actions: [
              TextButton.icon(
                onPressed: _goBackToRestaurantSetup,
                icon: const Icon(Icons.settings),
                label: const Text('Restaurant Setup'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
          body: Column(
            children: [
              // Menu parsing status banner
              if (_isParsingMenu) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue[200]!),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const CircularProgressIndicator(strokeWidth: 2),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Menu Parsing in Progress',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Your menu is being processed. This can take a few minutes.',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _refreshMenuItems,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Refresh to Check Status'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              Padding(
                padding:
                    const EdgeInsets.only(top: 16.0, left: 16.0, right: 16.0),
                child: Row(
                  children: [
                    ElevatedButton.icon(
                      icon: const Icon(Icons.upload_file),
                      onPressed: _isParsingMenu ? null : _uploadMenu,
                      label: Text('Upload Menu'),
                    ),
                    const Spacer(),
                    if (!_isParsingMenu) ...[
                      IconButton(
                        onPressed: _refreshMenuItemsAndOptimizations,
                        icon: const Icon(Icons.refresh),
                        tooltip: 'Refresh Menu Items & Optimization Results',
                      ),
                      const SizedBox(width: 8),
                      // Show Optimize Menu dropdown if menu items exist
                      if (menuProvider.menuItems.isNotEmpty)
                        PopupMenuButton<String>(
                          color: Colors.white,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.purple[600],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.auto_awesome,
                                    color: Colors.white, size: 20),
                                SizedBox(width: 8),
                                Text(
                                  'Optimize Menu',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w500),
                                ),
                                SizedBox(width: 4),
                                Icon(Icons.arrow_drop_down,
                                    color: Colors.white, size: 20),
                              ],
                            ),
                          ),
                          onSelected: (value) {
                            switch (value) {
                              case 'optimize':
                                Navigator.of(context)
                                    .pushNamed(AppRoutes.optimizationOptions);
                                break;
                              case 'pending_optimizations':
                                Navigator.of(context).pushNamed(
                                    AppRoutes.pendingMenuOptimizations);
                                break;
                              case 'pending_suggestions':
                                Navigator.of(context).pushNamed(
                                    AppRoutes.pendingMenuSuggestions);
                                break;
                              case 'completed_optimizations':
                                Navigator.of(context).pushNamed(
                                    AppRoutes.completedMenuOptimizations);
                                break;
                              case 'completed_suggestions':
                                Navigator.of(context).pushNamed(
                                    AppRoutes.completedMenuSuggestions);
                                break;
                            }
                          },
                          itemBuilder: (context) => [
                            const PopupMenuItem(
                              value: 'optimize',
                              child: Row(
                                children: [
                                  Icon(Icons.auto_awesome,
                                      color: Colors.purple),
                                  SizedBox(width: 8),
                                  Text('Start New Optimization'),
                                ],
                              ),
                            ),
                            const PopupMenuItem(
                              value: 'pending_optimizations',
                              child: Row(
                                children: [
                                  Icon(Icons.hourglass_empty,
                                      color: Colors.orange),
                                  SizedBox(width: 8),
                                  Text('Pending Optimizations'),
                                ],
                              ),
                            ),
                            const PopupMenuItem(
                              value: 'pending_suggestions',
                              child: Row(
                                children: [
                                  Icon(Icons.hourglass_empty,
                                      color: Colors.orange),
                                  SizedBox(width: 8),
                                  Text('Pending Suggestions'),
                                ],
                              ),
                            ),
                            const PopupMenuItem(
                              value: 'completed_optimizations',
                              child: Row(
                                children: [
                                  Icon(Icons.assessment, color: Colors.grey),
                                  SizedBox(width: 8),
                                  Text('Completed Optimizations'),
                                ],
                              ),
                            ),
                            const PopupMenuItem(
                              value: 'completed_suggestions',
                              child: Row(
                                children: [
                                  Icon(Icons.assessment, color: Colors.grey),
                                  SizedBox(width: 8),
                                  Text('Completed Suggestions'),
                                ],
                              ),
                            ),
                          ],
                        ),
                    ],
                  ],
                ),
              ),

              // Search and filter bar
              Container(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    // Search bar
                    TextField(
                      controller: _searchController,
                      decoration: const InputDecoration(
                        hintText: 'Search menu items...',
                        prefixIcon: Icon(Icons.search),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 12),
                    // All filters in one horizontal scrollable row
                    SizedBox(
                      height: 40,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          // Status filters
                          ...statusOptions.map((status) {
                            final isSelected = status == _selectedStatus;
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
                              ),
                            );
                          }),
                          // AI filters
                          ...aiFilterOptions.map((aiFilter) {
                            final isSelected = aiFilter == _selectedAiFilter;
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text(aiFilter),
                                selected: isSelected,
                                onSelected: (_) {
                                  setState(() {
                                    _selectedAiFilter = aiFilter;
                                  });
                                },
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              // Menu items list/grid
              Expanded(
                child: menuProvider.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : menuProvider.error != null
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.error,
                                    size: 64, color: Colors.red),
                                const SizedBox(height: 16),
                                Text(
                                  'Error: ${menuProvider.error}',
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  onPressed: _refreshMenuItemsAndOptimizations,
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          )
                        : filteredItems.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.restaurant_menu,
                                        size: 64, color: Colors.grey),
                                    const SizedBox(height: 16),
                                    Text(
                                      menuProvider.menuItems.isEmpty
                                          ? 'No menu items yet'
                                          : 'No items match your search',
                                      style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      menuProvider.menuItems.isEmpty
                                          ? 'Upload your menu or add items manually'
                                          : 'Try adjusting your search or filters',
                                      style:
                                          const TextStyle(color: Colors.grey),
                                    ),
                                    const SizedBox(height: 16),
                                    if (menuProvider.menuItems.isEmpty) ...[
                                      ElevatedButton.icon(
                                        onPressed: _uploadMenu,
                                        icon: const Icon(Icons.upload_file),
                                        label: const Text('Upload Menu'),
                                      ),
                                      const SizedBox(height: 8),
                                      OutlinedButton.icon(
                                        onPressed: _addNewMenuItem,
                                        icon: const Icon(Icons.add),
                                        label: const Text('Add Item Manually'),
                                      ),
                                    ],
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: filteredItems.length,
                                itemBuilder: (context, index) {
                                  final item = filteredItems[index];
                                  return MenuItemCard(
                                    item: item,
                                    onTap: () => _showMenuItemDetail(item),
                                  );
                                },
                              ),
              ),
            ],
          ),
          floatingActionButton: filteredItems.isNotEmpty
              ? FloatingActionButton(
                  onPressed: _addNewMenuItem,
                  child: const Icon(Icons.add),
                )
              : null,
        );
      },
    );
  }
}

class MenuItemCard extends StatelessWidget {
  final MenuItem item;
  final VoidCallback onTap;

  const MenuItemCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        // leading: item.imageUrl != null
        //     ? ClipRRect(
        //         borderRadius: BorderRadius.circular(8),
        //         child: Image.network(
        //           item.imageUrl!,
        //           width: 60,
        //           height: 60,
        //           fit: BoxFit.cover,
        //           errorBuilder: (context, error, stackTrace) =>
        //               const Icon(Icons.restaurant, size: 60),
        //         ),
        //       )
        //     : Container(
        //         width: 60,
        //         height: 60,
        //         decoration: BoxDecoration(
        //           color: Colors.grey[200],
        //           borderRadius: BorderRadius.circular(8),
        //         ),
        //         child: const Icon(Icons.restaurant, color: Colors.grey),
        //       ),
        title: Text(
          item.enhancedName ?? item.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              item.enhancedDescription ?? item.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    item.category,
                    style: TextStyle(
                      color: Theme.of(context).primaryColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: item.isActive
                        ? Colors.green.withValues(alpha: 0.1)
                        : Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    item.isActive ? 'Active' : 'Inactive',
                    style: TextStyle(
                      color:
                          item.isActive ? Colors.green[700] : Colors.red[700],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  '\$${item.price.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            if (item.isAiGenerated) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.auto_awesome,
                    size: 16,
                    color: Colors.purple[600],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'AI Generated',
                    style: TextStyle(
                      color: Colors.purple[600],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class MenuItemGridCard extends StatelessWidget {
  final MenuItem item;
  final VoidCallback onTap;

  const MenuItemGridCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: item.imageUrl != null
                  ? ClipRRect(
                      borderRadius:
                          const BorderRadius.vertical(top: Radius.circular(12)),
                      child: Image.network(
                        item.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const Icon(Icons.restaurant,
                                size: 40, color: Colors.grey),
                      ),
                    )
                  : const Icon(Icons.restaurant, size: 40, color: Colors.grey),
            ),
            Expanded(
              flex: 1,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.enhancedName ?? item.name,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.enhancedDescription ?? item.description,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .primaryColor
                                .withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            item.category,
                            style: TextStyle(
                              color: Theme.of(context).primaryColor,
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Text(
                          '\$${item.price.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: item.isActive
                            ? Colors.green.withValues(alpha: 0.1)
                            : Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        item.isActive ? 'Active' : 'Inactive',
                        style: TextStyle(
                          color: item.isActive
                              ? Colors.green[700]
                              : Colors.red[700],
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    if (item.isAiGenerated) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.auto_awesome,
                            size: 12,
                            color: Colors.purple[600],
                          ),
                          const SizedBox(width: 2),
                          Text(
                            'AI',
                            style: TextStyle(
                              color: Colors.purple[600],
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

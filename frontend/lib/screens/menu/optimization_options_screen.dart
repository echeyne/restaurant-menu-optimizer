import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/menu_provider.dart';
import '../../providers/restaurant_provider.dart';
import '../../models/restaurant_models.dart';
import '../../services/menu_service.dart';
import '../../utils/app_routes.dart';

class OptimizationOptionsScreen extends StatefulWidget {
  const OptimizationOptionsScreen({super.key});

  @override
  State<OptimizationOptionsScreen> createState() => _OptimizationOptionsScreenState();
}

class _OptimizationOptionsScreenState extends State<OptimizationOptionsScreen> {
  final MenuService _menuService = MenuService();
  
  String? _selectedOption;
  bool _isLoading = false;
  bool _isProcessing = false;
  String? _error;
  
  // Optimization data from backend
  List<OptimizationOption> _optimizationOptions = [];
  DemographicDisplay? _demographicInfo;
  List<SpecialtyDishDisplay> _specialtyDishes = [];
  OptimizationReadiness? _readiness;
  
  // User selections
  List<String> _selectedAgeGroups = [];
  List<String> _selectedGenderGroups = [];
  List<String> _selectedInterests = [];
  List<SpecialtyDishDisplay> _selectedSpecialtyDishes = [];
  String? _selectedCuisineType;

  @override
  void initState() {
    super.initState();
    _loadOptimizationOptions();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<MenuProvider, RestaurantProvider>(
      builder: (context, menuProvider, restaurantProvider, child) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('LLM Menu Optimization'),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).pushReplacementNamed(AppRoutes.menuManagement),
            ),
          ),
          body: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? _buildErrorState()
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildHeaderSection(),
                          const SizedBox(height: 32),
                          _buildOptimizationOptions(),
                          if (_selectedOption != null) ...[
                            const SizedBox(height: 32),
                            _buildDemographicInformation(),
                            const SizedBox(height: 24),
                            if (_selectedOption == 'optimize-existing')
                              _buildDemographicSelection()
                            else if (_selectedOption == 'suggest-new-items')
                              _buildSpecialtyDishSelection(),
                            const SizedBox(height: 24),
                            _buildCuisineTypeSelection(),
                            const SizedBox(height: 32),
                          ],
                          _buildActionButtons(),
                        ],
                      ),
                    ),
        );
      },
    );
  }



  Future<void> _loadOptimizationOptions() async {
    final restaurantProvider = Provider.of<RestaurantProvider>(context, listen: false);
    final restaurantId = restaurantProvider.restaurant?.restaurantId;
    
    if (restaurantId == null) {
      setState(() {
        _error = 'Restaurant not found. Please complete your profile setup.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _menuService.getOptimizationOptions(restaurantId);
      
      setState(() {
        _optimizationOptions = response.optimizationOptions;
        _demographicInfo = response.demographicInformation;
        _specialtyDishes = response.specialtyDishes;
        _readiness = response.readiness;
        
        // Set default cuisine type from restaurant genre tags
        if (restaurantProvider.restaurant?.genreTags?.isNotEmpty == true) {
          final genreTag = restaurantProvider.restaurant!.genreTags!.first;
          // Extract cuisine type from genre tag (e.g., "urn:tag:genre:restaurant:mexican" -> "Mexican")
          if (genreTag.contains(':')) {
            final parts = genreTag.split(':');
            if (parts.length > 3) {
              _selectedCuisineType = parts.last.replaceAll('_', ' ').split(' ').map((word) => 
                word.isNotEmpty ? word[0].toUpperCase() + word.substring(1) : word
              ).join(' ');
            }
          }
        }
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load optimization options: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red[400]),
          const SizedBox(height: 16),
          Text(
            'Error Loading Optimization Options',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: Colors.red[600],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              _error ?? 'Unknown error occurred',
              style: TextStyle(color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadOptimizationOptions,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).primaryColor.withValues(alpha: 0.1),
            Theme.of(context).primaryColor.withValues(alpha: 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
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
                size: 32,
                color: Theme.of(context).primaryColor,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Menu Optimization',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Choose how you\'d like to optimize your menu using demographic insights and similar restaurant data',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Ready to optimize: ${_readiness?.menuItemCount ?? 0} menu items, ${_readiness?.specialtyDishCount ?? 0} specialty dishes from similar restaurants',
                    style: TextStyle(
                      color: Colors.blue[700],
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOptimizationOptions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select an optimization option:',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        ..._optimizationOptions.map((option) => Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: _buildOptionCard(
            context,
            option: option,
            isSelected: _selectedOption == option.id,
            onTap: option.available 
                ? () => setState(() => _selectedOption = option.id)
                : null,
          ),
        )),
      ],
    );
  }

  Widget _buildOptionCard(
    BuildContext context, {
    required OptimizationOption option,
    required bool isSelected,
    required VoidCallback? onTap,
  }) {
    final isDisabled = !option.available;
    
    return Card(
      elevation: isSelected ? 8 : 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDisabled
                  ? Colors.grey[300]!
                  : isSelected 
                      ? Theme.of(context).primaryColor 
                      : Colors.grey[300]!,
              width: isSelected ? 2 : 1,
            ),
            color: isDisabled
                ? Colors.grey[50]
                : isSelected 
                    ? Theme.of(context).primaryColor.withValues(alpha: 0.05)
                    : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDisabled
                          ? Colors.grey[200]
                          : isSelected 
                              ? Theme.of(context).primaryColor.withValues(alpha: 0.1)
                              : Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      option.id == 'optimize-existing' ? Icons.edit_outlined : Icons.add_circle_outline,
                      color: isDisabled
                          ? Colors.grey[400]
                          : isSelected 
                              ? Theme.of(context).primaryColor
                              : Colors.grey[600],
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          option.title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: isDisabled
                                ? Colors.grey[500]
                                : isSelected 
                                    ? Theme.of(context).primaryColor
                                    : null,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          option.description,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: isDisabled ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isSelected)
                    Icon(
                      Icons.check_circle,
                      color: Theme.of(context).primaryColor,
                      size: 24,
                    ),
                ],
              ),
              const SizedBox(height: 16),
              ...option.requirements.map((requirement) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.check,
                      color: isDisabled
                          ? Colors.grey[400]
                          : isSelected 
                              ? Theme.of(context).primaryColor
                              : Colors.grey[500],
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        requirement,
                        style: TextStyle(
                          color: isDisabled ? Colors.grey[400] : Colors.grey[700],
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
              if (isDisabled && option.reason != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange[200]!),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning_outlined, color: Colors.orange[700], size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          option.reason!,
                          style: TextStyle(
                            color: Colors.orange[700],
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDemographicInformation() {
    if (_demographicInfo == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Column(
          children: [
            Icon(Icons.info_outline, color: Colors.grey[400], size: 48),
            const SizedBox(height: 8),
            Text(
              'No demographic data available',
              style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Complete your restaurant profile setup to get demographic insights',
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.insights, color: Colors.blue[700]),
              const SizedBox(width: 8),
              Text(
                'Customer Demographics',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.blue[800],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _demographicInfo!.interpretation,
            style: TextStyle(
              color: Colors.blue[700],
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 16),
          
          // Age Groups
          if (_demographicInfo!.ageGroups.isNotEmpty) ...[
            Text(
              'Age Groups:',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.blue[800],
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            ..._demographicInfo!.ageGroups.map((ageGroup) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                '• ${ageGroup.interpretation}',
                style: TextStyle(color: Colors.blue[700], fontSize: 13),
              ),
            )),
            const SizedBox(height: 12),
          ],
          
          // Gender Groups
          if (_demographicInfo!.genderGroups.isNotEmpty) ...[
            Text(
              'Gender Distribution:',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.blue[800],
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            ..._demographicInfo!.genderGroups.map((genderGroup) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                '• ${genderGroup.interpretation}',
                style: TextStyle(color: Colors.blue[700], fontSize: 13),
              ),
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildDemographicSelection() {
    if (_demographicInfo == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
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
              Icon(Icons.group, color: Colors.green[700]),
              const SizedBox(width: 8),
              Text(
                'Select Demographics to Optimize For',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.green[800],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Age Group Selection
          if (_demographicInfo!.ageGroups.isNotEmpty) ...[
            Text(
              'Age Groups:',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.green[800],
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _demographicInfo!.ageGroups.map((ageGroup) {
                final isSelected = _selectedAgeGroups.contains(ageGroup.ageRange);
                return FilterChip(
                  label: Text('${ageGroup.ageRange} (${ageGroup.percentage.toStringAsFixed(1)}%)'),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() {
                      if (selected) {
                        _selectedAgeGroups.add(ageGroup.ageRange);
                      } else {
                        _selectedAgeGroups.remove(ageGroup.ageRange);
                      }
                    });
                  },
                  backgroundColor: Colors.green[100],
                  selectedColor: Colors.green[200],
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],
          
          // Gender Group Selection
          if (_demographicInfo!.genderGroups.isNotEmpty) ...[
            Text(
              'Gender Groups:',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.green[800],
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _demographicInfo!.genderGroups.map((genderGroup) {
                final isSelected = _selectedGenderGroups.contains(genderGroup.gender);
                return FilterChip(
                  label: Text('${genderGroup.gender} (${genderGroup.percentage.toStringAsFixed(1)}%)'),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() {
                      if (selected) {
                        _selectedGenderGroups.add(genderGroup.gender);
                      } else {
                        _selectedGenderGroups.remove(genderGroup.gender);
                      }
                    });
                  },
                  backgroundColor: Colors.green[100],
                  selectedColor: Colors.green[200],
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],
          
          // Interests Selection
          if (_demographicInfo!.interests.isNotEmpty) ...[
            Text(
              'Customer Interests:',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.green[800],
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _demographicInfo!.interests.map((interest) {
                final isSelected = _selectedInterests.contains(interest);
                return FilterChip(
                  label: Text(interest),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() {
                      if (selected) {
                        _selectedInterests.add(interest);
                      } else {
                        _selectedInterests.remove(interest);
                      }
                    });
                  },
                  backgroundColor: Colors.green[100],
                  selectedColor: Colors.green[200],
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSpecialtyDishSelection() {
    if (_specialtyDishes.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Column(
          children: [
            Icon(Icons.restaurant_outlined, color: Colors.grey[400], size: 48),
            const SizedBox(height: 8),
            Text(
              'No specialty dishes available',
              style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Complete your restaurant profile setup to get specialty dish data from similar restaurants',
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.purple[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.purple[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.restaurant_menu, color: Colors.purple[700]),
              const SizedBox(width: 8),
              Text(
                'Select Popular Dishes from Similar Restaurants',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.purple[800],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Specialty Dishes List
          ...(_specialtyDishes.take(10).map((dish) {
            final isSelected = _selectedSpecialtyDishes.any((selected) => selected.tagId == dish.tagId);
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                elevation: isSelected ? 4 : 1,
                child: InkWell(
                  onTap: () {
                    setState(() {
                      if (isSelected) {
                        _selectedSpecialtyDishes.removeWhere((selected) => selected.tagId == dish.tagId);
                      } else {
                        _selectedSpecialtyDishes.add(dish);
                      }
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected ? Colors.purple[300]! : Colors.grey[200]!,
                        width: isSelected ? 2 : 1,
                      ),
                      color: isSelected ? Colors.purple[50] : null,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                dish.dishName,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? Colors.purple[800] : Colors.grey[800],
                                ),
                              ),
                            ),
                            if (isSelected)
                              Icon(Icons.check_circle, color: Colors.purple[600], size: 20),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _buildRatingChip('Qloo', dish.qlooRating, Colors.blue),
                            const SizedBox(width: 8),
                            if (dish.tripAdvisorRating != null)
                              _buildRatingChip('TripAdvisor', dish.tripAdvisorRating!, Colors.green),
                            const Spacer(),
                            Text(
                              '${dish.restaurantCount} restaurants',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          dish.interpretation,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          })),
          
          if (_selectedSpecialtyDishes.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.purple[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.purple[700], size: 16),
                  const SizedBox(width: 8),
                  Text(
                    '${_selectedSpecialtyDishes.length} dishes selected for inspiration',
                    style: TextStyle(
                      color: Colors.purple[700],
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRatingChip(String label, double rating, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.star, color: color, size: 12),
          const SizedBox(width: 4),
          Text(
            '$label ${rating.toStringAsFixed(1)}',
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCuisineTypeSelection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.orange[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.restaurant, color: Colors.orange[700]),
              const SizedBox(width: 8),
              Text(
                'Cuisine Type',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.orange[800],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Specify the cuisine type for optimization (defaults to your restaurant\'s cuisine)',
            style: TextStyle(
              color: Colors.orange[700],
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: TextEditingController(text: _selectedCuisineType),
            decoration: InputDecoration(
              hintText: 'e.g., Italian, Asian Fusion, Modern American',
              border: const OutlineInputBorder(),
              isDense: true,
              filled: true,
              fillColor: Colors.white,
              prefixIcon: Icon(Icons.restaurant_menu, color: Colors.orange[600]),
            ),
            onChanged: (value) {
              setState(() {
                _selectedCuisineType = value.isEmpty ? null : value;
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    final hasValidSelection = _selectedOption != null && _isSelectionValid();
    
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _isProcessing ? null : () {
              Navigator.of(context).pushReplacementNamed(AppRoutes.menuManagement);
            },
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: const Text('Skip for Now'),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          flex: 2,
          child: ElevatedButton(
            onPressed: hasValidSelection && !_isProcessing
                ? _processOptimization
                : null,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: _isProcessing
                ? const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 12),
                      Text('Processing...'),
                    ],
                  )
                : const Text('Start Optimization'),
          ),
        ),
      ],
    );
  }

  bool _isSelectionValid() {
    if (_selectedOption == 'optimize-existing') {
      return _selectedAgeGroups.isNotEmpty || _selectedGenderGroups.isNotEmpty;
    } else if (_selectedOption == 'suggest-new-items') {
      return _selectedSpecialtyDishes.isNotEmpty;
    }
    return false;
  }

  Future<void> _processOptimization() async {
    final restaurantProvider = Provider.of<RestaurantProvider>(context, listen: false);
    final restaurantId = restaurantProvider.restaurant?.restaurantId;
    
    if (restaurantId == null || _selectedOption == null) {
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final selectedDemographics = SelectedDemographics(
        selectedAgeGroups: _selectedAgeGroups,
        selectedGenderGroups: _selectedGenderGroups,
        selectedInterests: _selectedInterests,
      );

      final response = await _menuService.submitOptimizationSelection(
        restaurantId: restaurantId,
        selectedOption: _selectedOption!,
        selectedDemographics: selectedDemographics,
        selectedSpecialtyDishes: _selectedSpecialtyDishes,
        cuisineType: _selectedCuisineType,
      );

      if (response.success && mounted) {
        // Navigate to optimization review screen
        Navigator.of(context).pushReplacementNamed(
          AppRoutes.optimizationReview,
          arguments: _selectedOption,
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Optimization failed: ${response.message}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error during optimization: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }
}
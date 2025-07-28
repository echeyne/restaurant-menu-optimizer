import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/restaurant_provider.dart';
import '../../models/restaurant_models.dart';
import '../../utils/app_routes.dart';

class RestaurantProfileSetupScreen extends StatefulWidget {
  const RestaurantProfileSetupScreen({super.key});

  @override
  State<RestaurantProfileSetupScreen> createState() =>
      _RestaurantProfileSetupScreenState();
}

class _RestaurantProfileSetupScreenState
    extends State<RestaurantProfileSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();

  int _currentStep = 0;
  QlooSearchResult? _selectedRestaurant;
  double _minRating = 4.0;
  bool _initialized = false;
  bool _similarRestaurantsSearched = false;
  bool _demographicsLoaded = false;

  @override
  void initState() {
    super.initState();
    // Defer initialization to didChangeDependencies to access Provider
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final restaurantProvider =
          Provider.of<RestaurantProvider>(context, listen: false);
      Future.microtask(() async {
        if (restaurantProvider.restaurant == null) {
          final found = await restaurantProvider.getCurrentRestaurant();
          if (found && mounted) {
            final restaurant = restaurantProvider.restaurant;
            if (restaurant != null) {
              setState(() {
                _nameController.text = restaurant.name;
                _cityController.text = restaurant.city;
                _stateController.text = restaurant.state;
                if (restaurant.qlooEntityId != null &&
                    restaurant.qlooEntityId!.isNotEmpty) {
                  _currentStep = 4;
                  // Create a QlooSearchResult from the existing restaurant data
                  _selectedRestaurant = QlooSearchResult(
                    name: restaurant.name,
                    entityId: restaurant.qlooEntityId!,
                    address: restaurant.address ??
                        '${restaurant.city}, ${restaurant.state}',
                    priceLevel: restaurant.priceLevel ?? 1,
                    cuisine: restaurant.genreTags?.isNotEmpty == true
                        ? restaurant.genreTags!.first
                        : '',
                    popularity: 0.0,
                    businessRating: 0.0,
                    specialtyDishes: [],
                  );
                  // Clear any previous similar restaurants data
                  restaurantProvider.clearSimilarRestaurants();
                } else {
                  _currentStep = 1;
                  if (restaurantProvider.searchResults.isEmpty) {
                    restaurantProvider.searchQlooRestaurants(
                        restaurant.name, restaurant.city, restaurant.state);
                  }
                }
              });
            }
          }
        } else {
          final restaurant = restaurantProvider.restaurant;
          if (restaurant != null) {
            _nameController.text = restaurant.name;
            _cityController.text = restaurant.city;
            _stateController.text = restaurant.state;
            if (restaurant.qlooEntityId != null &&
                restaurant.qlooEntityId!.isNotEmpty) {
              _currentStep = 4;
              // Create a QlooSearchResult from the existing restaurant data
              _selectedRestaurant = QlooSearchResult(
                name: restaurant.name,
                entityId: restaurant.qlooEntityId!,
                address: restaurant.address ??
                    '${restaurant.city}, ${restaurant.state}',
                priceLevel: restaurant.priceLevel ?? 1,
                cuisine: restaurant.genreTags?.isNotEmpty == true
                    ? restaurant.genreTags!.first
                    : '',
                popularity: 0.0,
                businessRating: 0.0,
                specialtyDishes: [],
              );
              // Clear any previous similar restaurants data
              restaurantProvider.clearSimilarRestaurants();
            } else {
              _currentStep = 1;
              if (restaurantProvider.searchResults.isEmpty) {
                restaurantProvider.searchQlooRestaurants(
                    restaurant.name, restaurant.city, restaurant.state);
              }
            }
          }
        }
        _initialized = true;
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant Profile Setup'),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<RestaurantProvider>(
        builder: (context, restaurantProvider, child) {
          if (restaurantProvider.isLoading) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Setting up your restaurant profile...'),
                ],
              ),
            );
          }

          return Stepper(
            currentStep: _currentStep,
            onStepTapped: (step) {
              if (step <= _currentStep) {
                setState(() {
                  _currentStep = step;
                });
              }
            },
            controlsBuilder: (context, details) {
              return Row(
                children: [
                  if (details.stepIndex > 0)
                    TextButton(
                      onPressed: details.onStepCancel,
                      child: const Text('Back'),
                    ),
                  const SizedBox(width: 8),
                  if (details.stepIndex == 3 && _demographicsLoaded) ...[
                    ElevatedButton(
                      onPressed: details.onStepContinue,
                      child: const Text('Continue'),
                    ),
                  ] else if (details.stepIndex == 4 &&
                      !_similarRestaurantsSearched) ...[
                    ElevatedButton(
                      onPressed: details.onStepContinue,
                      child: const Text('Search Similar Restaurants'),
                    ),
                  ] else if (details.stepIndex == 4 &&
                      _similarRestaurantsSearched) ...[
                    ElevatedButton(
                      onPressed: () =>
                          _searchSimilarRestaurants(restaurantProvider),
                      child: const Text('Search Again'),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: details.onStepContinue,
                      child: const Text('Complete Setup'),
                    ),
                  ] else ...[
                    ElevatedButton(
                      onPressed: details.onStepContinue,
                      child: const Text('Continue'),
                    ),
                  ],
                ],
              );
            },
            onStepContinue: () => _handleStepContinue(restaurantProvider),
            onStepCancel: () {
              if (_currentStep > 0) {
                setState(() {
                  _currentStep--;
                });
              }
            },
            steps: [
              Step(
                title: const Text('Restaurant Information'),
                content: _buildRestaurantInfoStep(),
                isActive: _currentStep >= 0,
                state:
                    _currentStep > 0 ? StepState.complete : StepState.indexed,
              ),
              Step(
                title: const Text('Find Your Restaurant'),
                content: _buildQlooSearchStep(restaurantProvider),
                isActive: _currentStep >= 1,
                state: _currentStep > 1
                    ? StepState.complete
                    : _currentStep == 1
                        ? StepState.indexed
                        : StepState.disabled,
              ),
              Step(
                title: const Text('Select Restaurant'),
                content: _buildRestaurantSelectionStep(restaurantProvider),
                isActive: _currentStep >= 2,
                state: _currentStep > 2
                    ? StepState.complete
                    : _currentStep == 2
                        ? StepState.indexed
                        : StepState.disabled,
              ),
              Step(
                title: const Text('Demographics Overview'),
                content: _buildDemographicsStep(restaurantProvider),
                isActive: _currentStep >= 3,
                state: _currentStep > 3
                    ? StepState.complete
                    : _currentStep == 3
                        ? StepState.indexed
                        : StepState.disabled,
              ),
              Step(
                title: const Text('Find Similar Restaurants'),
                content: _buildSimilarRestaurantsStep(restaurantProvider),
                isActive: _currentStep >= 4,
                state:
                    _currentStep == 4 ? StepState.indexed : StepState.disabled,
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildRestaurantInfoStep() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Enter your restaurant details to get started:',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Restaurant Name',
              hintText: 'Enter your restaurant name',
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Please enter your restaurant name';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _cityController,
            decoration: const InputDecoration(
              labelText: 'City',
              hintText: 'Enter your city',
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Please enter your city';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _stateController,
            decoration: const InputDecoration(
              labelText: 'State',
              hintText: 'Enter your state',
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Please enter your state';
              }
              return null;
            },
          ),
          const SizedBox(height: 24), // Add padding below state input
        ],
      ),
    );
  }

  Widget _buildQlooSearchStep(RestaurantProvider provider) {
    if (provider.error != null) {
      return Column(
        children: [
          Icon(
            Icons.error_outline,
            color: Theme.of(context).colorScheme.error,
            size: 48,
          ),
          const SizedBox(height: 16),
          Text(
            'Error searching for restaurants: ${provider.error}',
            style: TextStyle(color: Theme.of(context).colorScheme.error),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => _searchQlooRestaurants(provider),
            child: const Text('Retry Search'),
          ),
        ],
      );
    }

    if (provider.searchResults.isEmpty) {
      return const Column(
        children: [
          Icon(Icons.search, size: 48),
          SizedBox(height: 16),
          Text(
            'No matching restaurants found. You can continue with manual setup.',
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 16),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Found ${provider.searchResults.length} matching restaurants:',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 16),
        ...provider.searchResults.map((result) => Card(
              child: ListTile(
                title: Text(result.name),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(result.address),
                    const SizedBox(height: 4),
                    Text(
                        'Cuisine: ${result.cuisine!.isNotEmpty ? result.cuisine : 'unknown'}'),
                  ],
                ),
                trailing: Radio<QlooSearchResult>(
                  value: result,
                  groupValue: _selectedRestaurant,
                  onChanged: (value) {
                    setState(() {
                      _selectedRestaurant = value;
                    });
                  },
                ),
                onTap: () {
                  setState(() {
                    _selectedRestaurant = result;
                  });
                },
              ),
            )),
        if (provider.searchResults.isNotEmpty) ...[
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),
          const Text(
            'Don\'t see your restaurant? Go back and update your restaurant information.',
            style: TextStyle(fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  Widget _buildRestaurantSelectionStep(RestaurantProvider provider) {
    if (_selectedRestaurant == null) {
      return const Column(
        children: [
          Icon(Icons.restaurant, size: 48),
          SizedBox(height: 16),
          Text(
            'Please go back and select your restaurant from the search results.',
            textAlign: TextAlign.center,
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Selected Restaurant:',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _selectedRestaurant!.name,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 16),
                    const SizedBox(width: 4),
                    Expanded(child: Text(_selectedRestaurant!.address)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                    'Cuisine: ${_selectedRestaurant!.cuisine!.isNotEmpty ? _selectedRestaurant!.cuisine : 'unknown'}'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'We\'ll use this information to find similar restaurants and gather demographic insights for your area.',
          style: TextStyle(fontStyle: FontStyle.italic),
        ),
      ],
    );
  }

  Widget _buildDemographicsStep(RestaurantProvider provider) {
    if (!_demographicsLoaded) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Customer Demographics',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          const Text(
            'We\'ll analyze demographic data for your restaurant to help you understand your customer base.',
          ),
          const SizedBox(height: 16),
          const Row(
            children: [
              Icon(Icons.people, size: 24),
              SizedBox(width: 8),
              Text('Age groups and preferences'),
            ],
          ),
          const SizedBox(height: 8),
          const Row(
            children: [
              Icon(Icons.person, size: 24),
              SizedBox(width: 8),
              Text('Gender distribution'),
            ],
          ),
          const SizedBox(height: 8),
          const Row(
            children: [
              Icon(Icons.interests, size: 24),
              SizedBox(width: 8),
              Text('Customer interests and patterns'),
            ],
          ),
          const SizedBox(height: 16),
          if (provider.isDemographicsLoading) ...[
            const Center(
              child: Column(
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading demographic insights...'),
                ],
              ),
            ),
          ] else ...[
            ElevatedButton(
              onPressed: () => _loadDemographics(provider),
              child: const Text('Search Demographics'),
            ),
            const SizedBox(height: 8),
            const Text(
              'Click "Search Demographics" to retrieve demographic insights for your restaurant.',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
          ],
        ],
      );
    }

    final demographics = provider.demographicsData;
    if (demographics == null) {
      return Column(
        children: [
          Icon(
            Icons.error_outline,
            color: Theme.of(context).colorScheme.error,
            size: 48,
          ),
          const SizedBox(height: 16),
          Text(
            'Unable to load demographics data. ${provider.error ?? "Please try again."}',
            style: TextStyle(color: Theme.of(context).colorScheme.error),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => _loadDemographics(provider),
            child: const Text('Retry'),
          ),
        ],
      );
    }

    // Find the main demographic groups
    String mainGender = 'Mixed';
    String mainAgeGroup = 'Various ages';
    
    // Process age groups to find the largest
    if (demographics.ageGroups.isNotEmpty) {
      demographics.ageGroups.sort((a, b) => b.percentage.compareTo(a.percentage));
      mainAgeGroup = demographics.ageGroups.first.ageRange;
    }

    // Process genders to find the largest
    if (demographics.genders.isNotEmpty) {
      demographics.genders.sort((a, b) => b.percentage.compareTo(a.percentage));
      mainGender = demographics.genders.first.gender;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Customer Demographics Overview',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 16),
        
        // Main demographics summary
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Primary Customer Profile',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.person, size: 20),
                    const SizedBox(width: 8),
                    Text('Main Gender: $mainGender'),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.cake, size: 20),
                    const SizedBox(width: 8),
                    Text('Primary Age Group: $mainAgeGroup'),
                  ],
                ),
              ],
            ),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Age groups breakdown
        if (demographics.ageGroups.isNotEmpty) ...[
          const Text(
            'Age Group Distribution',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: demographics.ageGroups.take(3).map((ageGroup) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(ageGroup.ageRange),
                        Text('${ageGroup.percentage.toStringAsFixed(1)}%'),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Gender breakdown
        if (demographics.genders.isNotEmpty) ...[
          const Text(
            'Gender Distribution',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: demographics.genders.map((gender) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(gender.gender),
                        Text('${gender.percentage.toStringAsFixed(1)}%'),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
        
        // Additional insights
        if (demographics.interests.isNotEmpty) ...[
          const Text(
            'Additional Insights',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: demographics.interests.take(3).map((interest) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(
                      children: [
                        const Icon(Icons.fiber_manual_record, size: 8),
                        const SizedBox(width: 8),
                        Expanded(child: Text(interest, style: const TextStyle(fontSize: 13))),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
        
        const Text(
          'This demographic information will help us find similar restaurants and optimize your menu recommendations.',
          style: TextStyle(fontStyle: FontStyle.italic, fontSize: 13),
        ),
      ],
    );
  }

  Widget _buildSimilarRestaurantsStep(RestaurantProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Find Similar Restaurants',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        const Text(
          'We\'ll search for similar restaurants in your area to identify popular dishes and trends.',
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            const Text('Minimum TripAdvisor Rating: '),
            Expanded(
              child: Slider(
                value: _minRating,
                min: 1.0,
                max: 5.0,
                divisions: 8,
                label: _minRating.toString(),
                onChanged: (value) {
                  setState(() {
                    _minRating = value;
                  });
                },
              ),
            ),
            Text(_minRating.toStringAsFixed(1)),
          ],
        ),
        const SizedBox(height: 16),
        if (!_similarRestaurantsSearched) ...[
          const Text(
            'Click "Search Similar Restaurants" to find similar restaurants with the selected minimum rating.',
            style: TextStyle(fontStyle: FontStyle.italic),
          ),
        ] else if (provider.similarRestaurants.isNotEmpty) ...[
          Text(
            'Found ${provider.similarRestaurants.length} similar restaurants:',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          SizedBox(
            height: 200,
            child: ListView.builder(
              itemCount: provider.similarRestaurants.length,
              itemBuilder: (context, index) {
                final restaurant = provider.similarRestaurants[index];
                return Card(
                  child: ListTile(
                    title: Text(restaurant.name),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(restaurant.address),
                        Row(
                          children: [
                            const Icon(Icons.star,
                                size: 16, color: Colors.amber),
                            Text(
                                ' ${restaurant.businessRating.toStringAsFixed(1)}'),
                            const SizedBox(width: 16),
                            const Icon(Icons.attach_money, size: 16),
                            Text(' Level ${restaurant.priceLevel}'),
                          ],
                        ),
                        Text(
                          'Qloo Popularity Score ${(restaurant.popularity * 100).toStringAsFixed(2)}%',
                        ),
                        if (restaurant.specialtyDishes.isNotEmpty)
                          Text(
                              'Specialty: ${restaurant.specialtyDishes.first}'),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'You can adjust the minimum rating and click "Search Again" to find different results, or click "Complete Setup" to finish.',
            style: TextStyle(fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 16),
        ] else if (provider.error != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.errorContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.error_outline,
                  color: Theme.of(context).colorScheme.error,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Error: ${provider.error}',
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              ],
            ),
          ),
        ] else ...[
          const Text(
            'No similar restaurants found with the selected criteria.',
            style: TextStyle(fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 16),
          const Text(
            'You can adjust the minimum rating and click "Search Again" to try different criteria, or click "Complete Setup" to finish.',
            style: TextStyle(fontStyle: FontStyle.italic),
          ),
        ],
      ],
    );
  }

  Future<void> _handleStepContinue(RestaurantProvider provider) async {
    switch (_currentStep) {
      case 0:
        if (_formKey.currentState!.validate()) {
          await _setupRestaurantProfile(provider);
          setState(() {
            _currentStep = 1;
          });
          await _searchQlooRestaurants(provider);
        }
        break;
      case 1:
        if (provider.searchResults.isEmpty) {
          await _searchQlooRestaurants(provider);
        }
        setState(() {
          _currentStep = 2;
        });
        break;
      case 2:
        if (_selectedRestaurant != null) {
          final success = await _selectRestaurant(provider);
          if (success) {
            setState(() {
              _currentStep = 3;
              _demographicsLoaded = false;
            });
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Please select a restaurant to continue')),
          );
        }
        break;
      case 3:
        if (_demographicsLoaded) {
          setState(() {
            _currentStep = 4;
            _similarRestaurantsSearched = false;
          });
          // Clear any previous similar restaurants data
          provider.clearSimilarRestaurants();
        }
        break;
      case 4:
        if (!_similarRestaurantsSearched) {
          await _searchSimilarRestaurants(provider);
          setState(() {
            _similarRestaurantsSearched = true;
          });
        } else {
          await _completeSetup(provider);
        }
        break;
    }
  }

  Future<bool> _setupRestaurantProfile(RestaurantProvider provider) async {
    final success = await provider.setupRestaurantProfile(
      _nameController.text.trim(),
      _cityController.text.trim(),
      _stateController.text.trim(),
    );
    if (!success) {
      _showErrorSnackBar(
          provider.error ?? 'Failed to setup restaurant profile');
    }
    return success;
  }

  Future<bool> _searchQlooRestaurants(RestaurantProvider provider) async {
    provider.clearError();
    final success = await provider.searchQlooRestaurants(
      _nameController.text.trim(),
      _cityController.text.trim(),
      _stateController.text.trim(),
    );
    if (!success && provider.error != null) {
      _showErrorSnackBar(provider.error!);
    }
    return success;
  }

  Future<bool> _selectRestaurant(RestaurantProvider provider) async {
    if (_selectedRestaurant == null) return false;

    final success = await provider.selectRestaurant(
      _selectedRestaurant!.entityId,
      _selectedRestaurant!,
    );
    if (!success) {
      _showErrorSnackBar(provider.error ?? 'Failed to select restaurant');
    }
    return success;
  }

  Future<void> _loadDemographics(RestaurantProvider provider) async {
    if (_selectedRestaurant == null) return;

    provider.clearError();
    final success = await provider.getDemographics(_selectedRestaurant!.entityId);
    if (success) {
      setState(() {
        _demographicsLoaded = true;
      });
    }
  }

  Future<void> _searchSimilarRestaurants(RestaurantProvider provider) async {
    if (_selectedRestaurant == null) return;

    provider.clearError();
    await provider.searchSimilarRestaurants(
      _selectedRestaurant!.entityId,
      _minRating,
    );
  }

  Future<void> _completeSetup(RestaurantProvider provider) async {
    if (_selectedRestaurant == null) return;

    // Get demographics data
    final demographicsSuccess =
        await provider.getDemographics(_selectedRestaurant!.entityId);

    if (demographicsSuccess || provider.similarRestaurants.isNotEmpty) {
      // Setup is complete, navigate to menu management
      if (mounted) {
        Navigator.of(context).pushReplacementNamed(AppRoutes.menuManagement);
      }
    } else {
      _showErrorSnackBar('Failed to complete setup. Please try again.');
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
      ),
    );
  }
}

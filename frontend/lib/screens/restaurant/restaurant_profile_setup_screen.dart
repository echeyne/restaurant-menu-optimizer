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
                  _currentStep = 3;
                  if (restaurantProvider.similarRestaurants.isEmpty) {
                    restaurantProvider.searchSimilarRestaurants(
                        restaurant.qlooEntityId!, _minRating);
                  }
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
              _currentStep = 3;
              if (restaurantProvider.similarRestaurants.isEmpty) {
                restaurantProvider.searchSimilarRestaurants(
                    restaurant.qlooEntityId!, _minRating);
              }
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
                  ElevatedButton(
                    onPressed: details.onStepContinue,
                    child: Text(
                        details.stepIndex == 3 ? 'Complete Setup' : 'Continue'),
                  ),
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
                title: const Text('Find Similar Restaurants'),
                content: _buildSimilarRestaurantsStep(restaurantProvider),
                isActive: _currentStep >= 3,
                state:
                    _currentStep == 3 ? StepState.indexed : StepState.disabled,
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
                    Row(
                      children: [
                        Icon(Icons.attach_money, size: 16),
                        Text('Price Level: ${result.priceLevel}'),
                      ],
                    ),
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
            'Don\'t see your restaurant? You can continue with manual setup.',
            style: TextStyle(fontStyle: FontStyle.italic),
          ),
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
                Row(
                  children: [
                    const Icon(Icons.attach_money, size: 16),
                    const SizedBox(width: 4),
                    Text('Price Level: ${_selectedRestaurant!.priceLevel}'),
                  ],
                ),
                if (_selectedRestaurant!.tags.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const Text('Cuisine Types:',
                      style: TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 8,
                    children: _selectedRestaurant!.tags
                        .where((tag) => tag.type.contains('genre'))
                        .map((tag) => Chip(
                              label: Text(tag.name),
                              backgroundColor: Theme.of(context)
                                  .colorScheme
                                  .primaryContainer,
                            ))
                        .toList(),
                  ),
                ],
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
        if (provider.similarRestaurants.isNotEmpty) ...[
          Text(
            'Found ${provider.similarRestaurants.length} similar restaurants:',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
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
        ],
        if (provider.error != null) ...[
          const SizedBox(height: 16),
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
        ],
      ],
    );
  }

  Future<void> _handleStepContinue(RestaurantProvider provider) async {
    switch (_currentStep) {
      case 0:
        if (_formKey.currentState!.validate()) {
          final success = await _setupRestaurantProfile(provider);
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
            });
            await _searchSimilarRestaurants(provider);
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Please select a restaurant to continue')),
          );
        }
        break;
      case 3:
        await _completeSetup(provider);
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
    final restaurantData = QlooRestaurantData(
      entityId: _selectedRestaurant!.entityId,
      address: _selectedRestaurant!.address,
      priceLevel: _selectedRestaurant!.priceLevel,
      genreTags: _selectedRestaurant!.tags
          .where((tag) => tag.type.contains('genre'))
          .map((tag) => tag.tagId)
          .toList(),
    );
    final success = await provider.selectRestaurant(
      _selectedRestaurant!.entityId,
      restaurantData,
    );
    if (!success) {
      _showErrorSnackBar(provider.error ?? 'Failed to select restaurant');
    }
    return success;
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

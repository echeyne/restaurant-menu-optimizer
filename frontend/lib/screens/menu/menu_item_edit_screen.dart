import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/menu_models.dart';
import '../../providers/menu_provider.dart';

class MenuItemEditScreen extends StatefulWidget {
  final String restaurantId;
  final MenuItem? item; // null for new item, existing item for editing

  const MenuItemEditScreen({
    super.key,
    required this.restaurantId,
    this.item,
  });

  @override
  State<MenuItemEditScreen> createState() => _MenuItemEditScreenState();
}

class _MenuItemEditScreenState extends State<MenuItemEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _enhancedNameController = TextEditingController();
  final _enhancedDescriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _categoryController = TextEditingController();
  final _imageUrlController = TextEditingController();

  List<String> _ingredients = [];
  List<String> _dietaryTags = [];
  List<String> _llmGeneratedTags = [];
  bool _isActive = true;
  bool _isAiGenerated = false;

  final TextEditingController _ingredientController = TextEditingController();
  final TextEditingController _dietaryTagController = TextEditingController();
  final TextEditingController _llmTagController = TextEditingController();

  final List<String> _commonCategories = [
    'Appetizers',
    'Salads',
    'Soups',
    'Main Courses',
    'Pasta',
    'Pizza',
    'Seafood',
    'Meat',
    'Vegetarian',
    'Desserts',
    'Beverages',
    'Sides',
  ];

  final List<String> _commonDietaryTags = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Nut-Free',
    'Halal',
    'Kosher',
    'Keto',
    'Low-Carb',
    'High-Protein',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.item != null) {
      _populateFields();
    }
  }

  void _populateFields() {
    final item = widget.item!;
    _nameController.text = item.name;
    _descriptionController.text = item.description;
    _enhancedNameController.text = item.enhancedName ?? '';
    _enhancedDescriptionController.text = item.enhancedDescription ?? '';
    _priceController.text = item.price.toString();
    _categoryController.text = item.category;
    _imageUrlController.text = item.imageUrl ?? '';
    _ingredients = List.from(item.ingredients);
    _dietaryTags = List.from(item.dietaryTags);
    _llmGeneratedTags = List.from(item.llmGeneratedTags ?? []);
    _isActive = item.isActive;
    _isAiGenerated = item.isAiGenerated;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _enhancedNameController.dispose();
    _enhancedDescriptionController.dispose();
    _priceController.dispose();
    _categoryController.dispose();
    _imageUrlController.dispose();
    _ingredientController.dispose();
    _dietaryTagController.dispose();
    _llmTagController.dispose();
    super.dispose();
  }

  void _addIngredient() {
    if (_ingredientController.text.trim().isNotEmpty) {
      setState(() {
        _ingredients.add(_ingredientController.text.trim());
        _ingredientController.clear();
      });
    }
  }

  void _removeIngredient(int index) {
    setState(() {
      _ingredients.removeAt(index);
    });
  }

  void _addDietaryTag() {
    if (_dietaryTagController.text.trim().isNotEmpty) {
      setState(() {
        _dietaryTags.add(_dietaryTagController.text.trim());
        _dietaryTagController.clear();
      });
    }
  }

  void _removeDietaryTag(int index) {
    setState(() {
      _dietaryTags.removeAt(index);
    });
  }

  void _addLlmTag() {
    if (_llmTagController.text.trim().isNotEmpty) {
      setState(() {
        _llmGeneratedTags.add(_llmTagController.text.trim());
        _llmTagController.clear();
      });
    }
  }

  void _removeLlmTag(int index) {
    setState(() {
      _llmGeneratedTags.removeAt(index);
    });
  }

  void _showCategoryPicker() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Category'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: _commonCategories.length,
            itemBuilder: (context, index) {
              final category = _commonCategories[index];
              return ListTile(
                title: Text(category),
                onTap: () {
                  _categoryController.text = category;
                  Navigator.pop(context);
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  void _showDietaryTagPicker() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Dietary Tag'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: _commonDietaryTags.length,
            itemBuilder: (context, index) {
              final tag = _commonDietaryTags[index];
              final isSelected = _dietaryTags.contains(tag);
              return CheckboxListTile(
                title: Text(tag),
                value: isSelected,
                onChanged: (bool? value) {
                  setState(() {
                    if (value == true && !_dietaryTags.contains(tag)) {
                      _dietaryTags.add(tag);
                    } else if (value == false) {
                      _dietaryTags.remove(tag);
                    }
                  });
                  Navigator.pop(context);
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveMenuItem() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final menuProvider = Provider.of<MenuProvider>(context, listen: false);

    final menuItem = MenuItem(
      itemId: widget.item?.itemId ??
          '', // Empty for new items, will be generated by backend
      restaurantId: widget.restaurantId,
      name: _nameController.text.trim(),
      description: _descriptionController.text.trim(),
      enhancedName: _enhancedNameController.text.trim().isEmpty
          ? null
          : _enhancedNameController.text.trim(),
      enhancedDescription: _enhancedDescriptionController.text.trim().isEmpty
          ? null
          : _enhancedDescriptionController.text.trim(),
      price: double.parse(_priceController.text),
      category: _categoryController.text.trim(),
      ingredients: _ingredients,
      dietaryTags: _dietaryTags,
      imageUrl: _imageUrlController.text.trim().isEmpty
          ? null
          : _imageUrlController.text.trim(),
      qlooTasteProfile: widget.item?.qlooTasteProfile,
      llmGeneratedTags: _llmGeneratedTags.isEmpty ? null : _llmGeneratedTags,
      isActive: _isActive,
      isAiGenerated: _isAiGenerated,
    );

    bool success;
    if (widget.item != null) {
      // Update existing item
      success =
          await menuProvider.updateMenuItem(widget.item!.itemId, menuItem);
    } else {
      // Create new item
      success = await menuProvider.createMenuItem(menuItem);
    }

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.item != null
              ? 'Menu item updated successfully'
              : 'Menu item created successfully'),
        ),
      );
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${menuProvider.error}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.item != null ? 'Edit Menu Item' : 'Add Menu Item'),
        actions: [
          TextButton(
            onPressed: _saveMenuItem,
            child: const Text(
              'Save',
              style:
                  TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: Consumer<MenuProvider>(
        builder: (context, menuProvider, child) {
          return Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Basic Information Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Basic Information',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _nameController,
                            decoration: const InputDecoration(
                              labelText: 'Item Name *',
                              hintText: 'Enter the menu item name',
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter an item name';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _descriptionController,
                            decoration: const InputDecoration(
                              labelText: 'Description *',
                              hintText: 'Describe the menu item',
                            ),
                            maxLines: 3,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter a description';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _enhancedNameController,
                            decoration: InputDecoration(
                              labelText: 'Enhanced Name',
                              hintText: 'AI-enhanced name (optional)',
                              prefixIcon: const Icon(Icons.auto_awesome),
                              border: OutlineInputBorder(
                                borderSide:
                                    BorderSide(color: Colors.blue[300]!),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _enhancedDescriptionController,
                            decoration: InputDecoration(
                              labelText: 'Enhanced Description',
                              hintText: 'AI-enhanced description (optional)',
                              prefixIcon: const Icon(Icons.auto_awesome),
                              border: OutlineInputBorder(
                                borderSide:
                                    BorderSide(color: Colors.blue[300]!),
                              ),
                            ),
                            maxLines: 3,
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _priceController,
                                  decoration: const InputDecoration(
                                    labelText: 'Price *',
                                    hintText: '0.00',
                                    prefixText: '\$',
                                  ),
                                  keyboardType:
                                      const TextInputType.numberWithOptions(
                                          decimal: true),
                                  inputFormatters: [
                                    FilteringTextInputFormatter.allow(
                                        RegExp(r'^\d+\.?\d{0,2}')),
                                  ],
                                  validator: (value) {
                                    if (value == null || value.trim().isEmpty) {
                                      return 'Please enter a price';
                                    }
                                    final price = double.tryParse(value);
                                    if (price == null || price <= 0) {
                                      return 'Please enter a valid price';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _categoryController,
                                  decoration: InputDecoration(
                                    labelText: 'Category *',
                                    hintText: 'Select category',
                                    suffixIcon: IconButton(
                                      icon: const Icon(Icons.arrow_drop_down),
                                      onPressed: _showCategoryPicker,
                                    ),
                                  ),
                                  readOnly: true,
                                  onTap: _showCategoryPicker,
                                  validator: (value) {
                                    if (value == null || value.trim().isEmpty) {
                                      return 'Please select a category';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Ingredients Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Ingredients',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _ingredientController,
                                  decoration: const InputDecoration(
                                    hintText: 'Add ingredient',
                                    border: OutlineInputBorder(),
                                  ),
                                  onSubmitted: (_) => _addIngredient(),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: _addIngredient,
                                child: const Text('Add'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _ingredients.asMap().entries.map((entry) {
                              final index = entry.key;
                              final ingredient = entry.value;
                              return Chip(
                                label: Text(ingredient),
                                deleteIcon: const Icon(Icons.close, size: 18),
                                onDeleted: () => _removeIngredient(index),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Dietary Tags Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text(
                                'Dietary Tags',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const Spacer(),
                              TextButton.icon(
                                onPressed: _showDietaryTagPicker,
                                icon: const Icon(Icons.add),
                                label: const Text('Quick Add'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _dietaryTagController,
                                  decoration: const InputDecoration(
                                    hintText: 'Add dietary tag',
                                    border: OutlineInputBorder(),
                                  ),
                                  onSubmitted: (_) => _addDietaryTag(),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: _addDietaryTag,
                                child: const Text('Add'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _dietaryTags.asMap().entries.map((entry) {
                              final index = entry.key;
                              final tag = entry.value;
                              return Chip(
                                label: Text(tag),
                                backgroundColor: Colors.green[100],
                                deleteIcon: const Icon(Icons.close, size: 18),
                                onDeleted: () => _removeDietaryTag(index),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // LLM Generated Tags Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.auto_awesome,
                                  color: Colors.purple[600]),
                              const SizedBox(width: 8),
                              Text(
                                'AI Generated Tags',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.purple[600],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _llmTagController,
                                  decoration: const InputDecoration(
                                    hintText: 'Add AI tag',
                                    border: OutlineInputBorder(),
                                  ),
                                  onSubmitted: (_) => _addLlmTag(),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: _addLlmTag,
                                child: const Text('Add'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children:
                                _llmGeneratedTags.asMap().entries.map((entry) {
                              final index = entry.key;
                              final tag = entry.value;
                              return Chip(
                                label: Text(tag),
                                backgroundColor: Colors.purple[100],
                                deleteIcon: const Icon(Icons.close, size: 18),
                                onDeleted: () => _removeLlmTag(index),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Status Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Status',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          SwitchListTile(
                            title: const Text('Active'),
                            subtitle:
                                const Text('Item is available for customers'),
                            value: _isActive,
                            onChanged: (value) {
                              setState(() {
                                _isActive = value;
                              });
                            },
                          ),
                          SwitchListTile(
                            title: const Text('AI Generated'),
                            subtitle:
                                const Text('Mark as AI-generated content'),
                            value: _isAiGenerated,
                            onChanged: (value) {
                              setState(() {
                                _isAiGenerated = value;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        child: Consumer<MenuProvider>(
          builder: (context, menuProvider, child) {
            return ElevatedButton(
              onPressed: menuProvider.isLoading ? null : _saveMenuItem,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: menuProvider.isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(widget.item != null ? 'Update Item' : 'Create Item'),
            );
          },
        ),
      ),
    );
  }
}

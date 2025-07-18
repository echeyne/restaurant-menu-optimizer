/**
 * Base repository interface for data access layer
 * Provides common CRUD operations for DynamoDB tables
 */

export interface BaseRepository<T> {
  /**
   * Create a new item in the database
   * @param item The item to create
   * @returns The created item
   */
  create(item: T): Promise<T>;

  /**
   * Get an item by its primary key
   * @param id The primary key of the item
   * @returns The item if found, null otherwise
   */
  getById(id: string): Promise<T | null>;

  /**
   * Update an existing item
   * @param id The primary key of the item
   * @param updates Partial updates to apply to the item
   * @returns The updated item
   */
  update(id: string, updates: Partial<T>): Promise<T>;

  /**
   * Delete an item by its primary key
   * @param id The primary key of the item
   * @returns True if the item was deleted, false otherwise
   */
  delete(id: string): Promise<boolean>;

  /**
   * List items with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of items matching the filters
   */
  list(filters?: Record<string, any>): Promise<T[]>;
}

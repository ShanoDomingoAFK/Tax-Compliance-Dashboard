import { dbConfig } from './config';

/**
 * Database Service Interface
 * 
 * Abstracting the database interactions so that it can be easily replaced 
 * with another database in the future (Supabase, Postgres, Firebase, etc.)
 * without modifying the UI components or business logic.
 */
export interface IDatabaseService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Generic CRUD operations
  get<T>(collection: string, query?: any): Promise<T[]>;
  getById<T>(collection: string, id: string): Promise<T | null>;
  create<T>(collection: string, data: T): Promise<T>;
  update<T>(collection: string, id: string, data: Partial<T>): Promise<T>;
  delete(collection: string, id: string): Promise<boolean>;
  
  // Custom queries or batch operations
  sync(collections: string[], localData: any): Promise<any>;
}

/**
 * Mock implementation of Supabase/Production database service.
 * In a real scenario, this would import the Supabase JS client and interact with it.
 */
class SupabaseDatabaseService implements IDatabaseService {
  async connect() {
    if (!dbConfig.url || !dbConfig.anonKey) {
      console.warn('Database connection details missing. Check environment variables.');
      return;
    }
    console.log(`Connected to database at ${dbConfig.url}`);
  }
  
  async disconnect() {
    console.log('Disconnected from database');
  }

  async get<T>(collection: string, query?: any): Promise<T[]> {
    console.log(`GET ${collection}`);
    return [];
  }
  
  async getById<T>(collection: string, id: string): Promise<T | null> {
    return null;
  }
  
  async create<T>(collection: string, data: T): Promise<T> {
    return data;
  }
  
  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    return data as T;
  }
  
  async delete(collection: string, id: string): Promise<boolean> {
    return true;
  }
  
  async sync(collections: string[], localData: any): Promise<any> {
    console.log('Syncing data with remote database...');
    return localData;
  }
}

/**
 * Fallback local implementation using localStorage
 */
class LocalDatabaseService implements IDatabaseService {
  async connect() {
    console.log('Connected to local cache');
  }
  
  async disconnect() {}

  async get<T>(collection: string, query?: any): Promise<T[]> {
    const data = localStorage.getItem(`cache_${collection}`);
    return data ? JSON.parse(data) : [];
  }
  
  async getById<T>(collection: string, id: string): Promise<T | null> {
    return null;
  }
  
  async create<T>(collection: string, data: T): Promise<T> {
    return data;
  }
  
  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    return data as T;
  }
  
  async delete(collection: string, id: string): Promise<boolean> {
    return true;
  }
  
  async sync(collections: string[], localData: any): Promise<any> {
    return localData;
  }
}

// Export a singleton instance based on the configuration provider
export const getDatabaseService = (): IDatabaseService => {
  switch (dbConfig.provider) {
    case 'supabase':
    case 'production':
      return new SupabaseDatabaseService();
    case 'local':
    default:
      return new LocalDatabaseService();
  }
};

export const dbService = getDatabaseService();

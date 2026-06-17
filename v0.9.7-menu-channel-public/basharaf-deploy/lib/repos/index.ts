import { createApiRepos } from './api';
import type { LocalDataStore, Repos } from './types';

export function createRepos(_dataStore: LocalDataStore): Repos {
  void _dataStore;
  return createApiRepos();
}

export type { LocalDataStore } from './types';
export type { BranchesRepo, CategoriesRepo, NotificationsRepo, Repos, TransactionsRepo, UsersRepo } from './types';

import { db } from '@/lib/firebase';
import { FirestoreDemoRepository } from './demo/demoRepository';
import * as CoreService from './demo/demoService';

const repository = new FirestoreDemoRepository(db);

/**
 * Checks if the master demo-workspace has already been seeded in Firestore
 */
export async function isMasterDemoWorkspaceSeeded(): Promise<boolean> {
  return CoreService.isMasterDemoWorkspaceSeeded(repository);
}

/**
 * Seeds the master read-only demo workspace in /organizations/demo-workspace/
 */
export async function seedMasterDemoWorkspace(): Promise<void> {
  await CoreService.seedMasterDemoWorkspace(db, repository);
}

/**
 * Copies the entire Master Demo Workspace from `organizations/demo-workspace`
 * into a user's active workspace `organizations/[userOrgId]`, fully isolated.
 */
export async function copyDemoWorkspaceToUser(userOrgId: string): Promise<void> {
  await CoreService.copyDemoWorkspaceToUser(db, repository, userOrgId, () => {});
}

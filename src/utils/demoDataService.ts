import { db } from '@/lib/firebase';
import { FirestoreDemoRepository } from './demo/demoRepository';
import * as CoreService from './demo/demoService';

const repository = new FirestoreDemoRepository(db);

/**
 * Resets demo data for the specified active organization.
 */
export async function resetDemoData(activeOrgId: string): Promise<void> {
  await CoreService.resetDemoDataWithProgress(db, repository, activeOrgId, () => {});
}

/**
 * Resets demo data with real-time progressive status updates.
 */
export async function resetDemoDataWithProgress(
  activeOrgId: string, 
  onProgress: (msg: string) => void
): Promise<void> {
  await CoreService.resetDemoDataWithProgress(db, repository, activeOrgId, onProgress);
}

/**
 * Performs a purge of existing demo data and fully seeds new demo data.
 */
export async function resetAndReloadDemoDataWithProgress(
  activeOrgId: string,
  onProgress: (msg: string) => void
): Promise<void> {
  // 1. Purge
  await CoreService.resetDemoDataWithProgress(db, repository, activeOrgId, onProgress);
  // 2. Reload
  await CoreService.generateDemoDataWithProgress(db, repository, activeOrgId, onProgress);
}

/**
 * Generates initial demo data.
 */
export async function generateDemoData(activeOrgId: string): Promise<void> {
  await CoreService.generateDemoDataWithProgress(db, repository, activeOrgId, () => {});
}

/**
 * Generates initial demo data with progress reporting.
 */
export async function generateDemoDataWithProgress(
  activeOrgId: string, 
  onProgress: (msg: string) => void
): Promise<void> {
  await CoreService.generateDemoDataWithProgress(db, repository, activeOrgId, onProgress);
}

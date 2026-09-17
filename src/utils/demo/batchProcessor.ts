import { writeBatch, type Firestore, type DocumentReference } from 'firebase/firestore';

/**
 * A highly scalable Firestore batch writer that handles the 500-operation limit
 * automatically by splitting operations across multiple batched writes.
 */
export class BatchProcessor {
  private db: Firestore;
  private currentBatch: ReturnType<typeof writeBatch>;
  private operationCount = 0;
  private totalOperations = 0;
  private maxOperationsPerBatch: number;

  constructor(db: Firestore, maxOperationsPerBatch = 400) {
    this.db = db;
    this.currentBatch = writeBatch(db);
    this.maxOperationsPerBatch = maxOperationsPerBatch;
  }

  /**
   * Adds a set operation to the current batch.
   */
  public async set(docRef: DocumentReference, data: any, options?: { merge?: boolean }): Promise<void> {
    if (options?.merge) {
      this.currentBatch.set(docRef, data, { merge: true });
    } else {
      this.currentBatch.set(docRef, data);
    }
    await this.incrementOperations();
  }

  /**
   * Adds an update operation to the current batch.
   */
  public async update(docRef: DocumentReference, data: any): Promise<void> {
    this.currentBatch.update(docRef, data);
    await this.incrementOperations();
  }

  /**
   * Adds a delete operation to the current batch.
   */
  public async delete(docRef: DocumentReference): Promise<void> {
    this.currentBatch.delete(docRef);
    await this.incrementOperations();
  }

  /**
   * Commits any pending operations in the current batch.
   */
  public async commit(): Promise<void> {
    if (this.operationCount > 0) {
      console.log(`[BatchProcessor] Committing final batch with ${this.operationCount} operations.`);
      await this.currentBatch.commit();
      this.operationCount = 0;
      this.currentBatch = writeBatch(this.db);
    }
  }

  /**
   * Returns the total number of operations performed across all batches.
   */
  public getTotalOperations(): number {
    return this.totalOperations;
  }

  /**
   * Increments the operation count and auto-commits if threshold is met.
   */
  private async incrementOperations(): Promise<void> {
    this.operationCount++;
    this.totalOperations++;
    if (this.operationCount >= this.maxOperationsPerBatch) {
      console.log(`[BatchProcessor] Reached limit of ${this.operationCount} operations. Auto-committing batch...`);
      await this.currentBatch.commit();
      this.currentBatch = writeBatch(this.db);
      this.operationCount = 0;
    }
  }
}

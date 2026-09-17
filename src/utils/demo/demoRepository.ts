import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  type Firestore, 
  type DocumentData
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/utils/firestoreErrorHandler';
import { BatchProcessor } from './batchProcessor';

export interface IDemoRepository {
  getBusinessProfile(orgId: string): Promise<DocumentData | null>;
  updateBusinessProfile(orgId: string, data: any, batch?: BatchProcessor): Promise<void>;
  
  getSubcollectionDocs(orgId: string, subcollection: string): Promise<DocumentData[]>;
  getSubcollectionDocsForDemo(orgId: string, subcollection: string): Promise<DocumentData[]>;
  getInvoiceItems(orgId: string, invoiceId: string): Promise<DocumentData[]>;
  
  createDocument(orgId: string, subcollection: string, docId: string, data: any, batch?: BatchProcessor): Promise<void>;
  deleteDocument(orgId: string, subcollection: string, docId: string, batch?: BatchProcessor): Promise<void>;
  deleteInvoiceItem(orgId: string, invoiceId: string, itemId: string, batch?: BatchProcessor): Promise<void>;

  getDemoBackup(orgId: string): Promise<DocumentData | null>;
  createDemoBackup(orgId: string, data: any, batch?: BatchProcessor): Promise<void>;
  deleteDemoBackup(orgId: string, batch?: BatchProcessor): Promise<void>;
  
  getSubscription(orgId: string): Promise<DocumentData | null>;
  deleteSubscription(orgId: string, batch?: BatchProcessor): Promise<void>;
}

export class FirestoreDemoRepository implements IDemoRepository {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  public async getBusinessProfile(orgId: string): Promise<DocumentData | null> {
    const path = `organizations/${orgId}`;
    try {
      const orgRef = doc(this.db, 'organizations', orgId);
      const snap = await getDoc(orgRef);
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  public async updateBusinessProfile(orgId: string, data: any, batch?: BatchProcessor): Promise<void> {
    const path = `organizations/${orgId}`;
    try {
      const orgRef = doc(this.db, 'organizations', orgId);
      if (batch) {
        await batch.set(orgRef, data, { merge: true });
      } else {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(orgRef, data, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  public async getSubcollectionDocs(orgId: string, subcol: string): Promise<DocumentData[]> {
    const path = `organizations/${orgId}/${subcol}`;
    try {
      const colRef = collection(this.db, 'organizations', orgId, subcol);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  public async getSubcollectionDocsForDemo(orgId: string, subcol: string): Promise<DocumentData[]> {
    const path = `organizations/${orgId}/${subcol} (isDemo == true)`;
    try {
      const colRef = collection(this.db, 'organizations', orgId, subcol);
      // Query demo documents directly to avoid downloading non-demo client documents
      const q = query(colRef, where('isDemo', '==', true));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  public async getInvoiceItems(orgId: string, invoiceId: string): Promise<DocumentData[]> {
    const path = `organizations/${orgId}/invoices/${invoiceId}/items`;
    try {
      const colRef = collection(this.db, 'organizations', orgId, 'invoices', invoiceId, 'items');
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  public async createDocument(
    orgId: string, 
    subcol: string, 
    docId: string, 
    data: any, 
    batch?: BatchProcessor
  ): Promise<void> {
    const path = `organizations/${orgId}/${subcol}/${docId}`;
    try {
      const docRef = doc(this.db, 'organizations', orgId, subcol, docId);
      if (batch) {
        await batch.set(docRef, data);
      } else {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(docRef, data);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  public async deleteDocument(
    orgId: string, 
    subcol: string, 
    docId: string, 
    batch?: BatchProcessor
  ): Promise<void> {
    const path = `organizations/${orgId}/${subcol}/${docId}`;
    try {
      const docRef = doc(this.db, 'organizations', orgId, subcol, docId);
      if (batch) {
        await batch.delete(docRef);
      } else {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  public async deleteInvoiceItem(
    orgId: string, 
    invoiceId: string, 
    itemId: string, 
    batch?: BatchProcessor
  ): Promise<void> {
    const path = `organizations/${orgId}/invoices/${invoiceId}/items/${itemId}`;
    try {
      const docRef = doc(this.db, 'organizations', orgId, 'invoices', invoiceId, 'items', itemId);
      if (batch) {
        await batch.delete(docRef);
      } else {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  public async getDemoBackup(orgId: string): Promise<DocumentData | null> {
    const path = `organizations/${orgId}/demo_backup/original`;
    try {
      const docRef = doc(this.db, 'organizations', orgId, 'demo_backup', 'original');
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  public async createDemoBackup(orgId: string, data: any, batch?: BatchProcessor): Promise<void> {
    const path = `organizations/${orgId}/demo_backup/original`;
    try {
      const docRef = doc(this.db, 'organizations', orgId, 'demo_backup', 'original');
      if (batch) {
        await batch.set(docRef, data);
      } else {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(docRef, data);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  public async deleteDemoBackup(orgId: string, batch?: BatchProcessor): Promise<void> {
    const path = `organizations/${orgId}/demo_backup/original`;
    try {
      const docRef = doc(this.db, 'organizations', orgId, 'demo_backup', 'original');
      if (batch) {
        await batch.delete(docRef);
      } else {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  public async getSubscription(orgId: string): Promise<DocumentData | null> {
    const path = `organizations/${orgId}/subscriptions/current`;
    try {
      const docRef = doc(this.db, 'organizations', orgId, 'subscriptions', 'current');
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  public async deleteSubscription(orgId: string, batch?: BatchProcessor): Promise<void> {
    const path = `organizations/${orgId}/subscriptions/current`;
    try {
      const docRef = doc(this.db, 'organizations', orgId, 'subscriptions', 'current');
      if (batch) {
        await batch.delete(docRef);
      } else {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
}

import { type Firestore, doc, collection, writeBatch, runTransaction } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { BatchProcessor } from './batchProcessor';
import { FirestoreDemoRepository, type IDemoRepository } from './demoRepository';
import { useStore } from '@/store/useStore';

// Seeded PRNG for deterministic stable data generation
export class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  choose<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export interface DemoMetadata {
  isDemo: boolean;
  createdBy: string;
  demoVersion: string;
  editable: boolean;
}

export const DEMO_METADATA: DemoMetadata = {
  isDemo: true,
  createdBy: "system",
  demoVersion: "1.0",
  editable: true
};

/**
 * Lazy loads the JSON seed data on-demand to reduce initial bundle size.
 */
export async function loadDemoSeedData(): Promise<any> {
  console.log('[DemoService] Lazy-loading JSON seed data...');
  const module = await import('@/data/demoSeedData.json');
  return module.default;
}

/**
 * Checks if the master demo-workspace has already been seeded in Firestore
 */
export async function isMasterDemoWorkspaceSeeded(repository: IDemoRepository): Promise<boolean> {
  try {
    const data = await repository.getBusinessProfile('demo-workspace');
    if (!data) return false;
    if (data.name !== "Finora Technologies") {
      console.log(`[DemoService] Outdated master workspace detected ("${data.name}"). Re-seeding required...`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[DemoService] Error checking master seed status:', err);
    return false;
  }
}

/**
 * Clears subcollection in bulk using BatchProcessor
 */
async function clearSubcollectionWithBatch(
  repository: IDemoRepository,
  batch: BatchProcessor,
  parentPath: string,
  subcol: string
): Promise<void> {
  try {
    const docs = await repository.getSubcollectionDocs(parentPath, subcol);
    for (const docData of docs) {
      if (subcol === 'invoices') {
        const items = await repository.getInvoiceItems(parentPath, docData.id);
        for (const item of items) {
          await repository.deleteInvoiceItem(parentPath, docData.id, item.id, batch);
        }
      }
      await repository.deleteDocument(parentPath, subcol, docData.id, batch);
    }
  } catch (err) {
    console.warn(`[DemoService] Warning clearing subcollection ${subcol} under ${parentPath}:`, err);
  }
}

/**
 * Seeds the master read-only demo workspace in /organizations/demo-workspace/
 */
export async function seedMasterDemoWorkspace(firestoreDb: Firestore, repository: IDemoRepository): Promise<void> {
  console.log('[DemoService] Starting master demo-workspace seeding...');
  const startTime = Date.now();
  
  const rng = new SeededRandom(2026);
  const now = new Date("2026-07-09T03:14:34-07:00");
  
  const batch = new BatchProcessor(firestoreDb, 450);

  // 1. Clear existing collections to ensure fresh seed
  const subcollections = [
    'clients',
    'products',
    'invoices',
    'expenses',
    'payments',
    'recurringInvoices',
    'reports',
    'analytics'
  ];
  for (const sub of subcollections) {
    await clearSubcollectionWithBatch(repository, batch, 'demo-workspace', sub);
  }
  await batch.commit();

  // 2. Load Seed Data
  const demoData = await loadDemoSeedData();

  // 3. Seed Business Profile
  console.log('[DemoService] Seeding master business profile...');
  const businessData = {
    id: "primary",
    name: demoData.business.name,
    email: demoData.business.email,
    phone: demoData.business.phone,
    address: demoData.business.address,
    city: demoData.business.city,
    country: demoData.business.country,
    taxId: demoData.business.taxId,
    accentColor: demoData.business.accentColor,
    font: demoData.business.font,
    footerText: demoData.business.footerText,
    logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=150&h=150&q=80",
    updatedAt: now.toISOString(),
    ...DEMO_METADATA
  };
  await repository.updateBusinessProfile('demo-workspace', businessData, batch);

  // 4. Seed Clients
  console.log('[DemoService] Seeding master clients...');
  const clientsList: any[] = [];
  for (const client of demoData.clients) {
    const clientDoc = {
      ...client,
      status: "active",
      profilePhoto: `https://images.unsplash.com/photo-15${rng.nextInt(100, 999)}?auto=format&fit=crop&w=100&h=100&q=80`,
      createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      ...DEMO_METADATA
    };
    await repository.createDocument('demo-workspace', 'clients', client.id, clientDoc, batch);
    clientsList.push(clientDoc);
  }

  // 5. Seed Products
  console.log('[DemoService] Seeding master products...');
  const productsList: any[] = [];
  for (const product of demoData.products) {
    const productDoc = {
      ...product,
      isFavorite: rng.nextInt(0, 10) > 7,
      status: "active",
      createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      ...DEMO_METADATA
    };
    await repository.createDocument('demo-workspace', 'products', product.id, productDoc, batch);
    productsList.push(productDoc);
  }

  // 6. Seed Invoices and Payments
  console.log('[DemoService] Seeding master invoices and payments...');
  const generatedInvoices: any[] = [];
  const generatedExpenses: any[] = [];
  const generatedPayments: any[] = [];

  for (let i = 0; i < demoData.invoiceBlueprint.length; i++) {
    const blueprint = demoData.invoiceBlueprint[i];
    const invoiceIndex = i + 1;
    const id = `invoice_demo_${invoiceIndex}`;
    const invoiceNumber = `INV-2026-${String(invoiceIndex).padStart(4, '0')}`;
    
    const client = clientsList[blueprint.clientIndex] || { id: "client_demo_1" };
    const invoiceDate = new Date(now.getTime() - blueprint.offsetDays * 24 * 60 * 60 * 1000);
    const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const items: any[] = [];
    let subtotal = 0;
    let taxTotal = 0;

    for (let j = 0; j < blueprint.products.length; j++) {
      const prodBlueprint = blueprint.products[j];
      const product = productsList[prodBlueprint.index] || { price: 100, gstRate: 18, name: "Consulting", unit: "hrs" };
      const quantity = prodBlueprint.qty;
      const price = product.price;
      const taxRate = product.gstRate;
      
      const itemSubtotal = price * quantity;
      const itemTax = Number((itemSubtotal * (taxRate / 100)).toFixed(2));

      const lineItem = {
        id: `item_invoice_demo_${invoiceIndex}_${j + 1}`,
        productName: product.name,
        description: product.description || '',
        quantity,
        unit: product.unit,
        price: price,
        rate: price,
        taxRate: taxRate,
        discount: 0,
        discountType: 'percentage' as const,
        amount: itemSubtotal,
        hsn: product.hsn,
        ...DEMO_METADATA
      };
      
      items.push(lineItem);
      subtotal += itemSubtotal;
      taxTotal += itemTax;
    }

    const discountTotal = blueprint.discount;
    const finalTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));
    const isPaid = blueprint.status === 'paid';

    const statusHistory = [
      { status: 'draft' as const, timestamp: invoiceDate.toISOString() }
    ];
    if (blueprint.status !== 'draft') {
      statusHistory.push({ status: 'sent' as const, timestamp: new Date(invoiceDate.getTime() + 2 * 60 * 60 * 1000).toISOString() });
    }
    if (isPaid) {
      const payDate = new Date(invoiceDate.getTime() + rng.nextInt(2, 14) * 24 * 60 * 60 * 1000);
      statusHistory.push({ status: 'paid' as const, timestamp: payDate.toISOString() });
    }

    const invoiceDoc = {
      id,
      clientId: client.id,
      invoiceNumber,
      template: rng.choose(['teal', 'clean', 'modern', 'corporate', 'minimal', 'luxury']) as any,
      subtotal: Number(subtotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      total: finalTotal,
      status: blueprint.status as any,
      statusHistory,
      notes: demoData.business.footerText,
      dueDate: dueDate.toISOString(),
      createdAt: invoiceDate.toISOString(),
      updatedAt: invoiceDate.toISOString(),
      isPaid,
      currency: "USD",
      currencySymbol: "$",
      ...DEMO_METADATA
    };

    await repository.createDocument('demo-workspace', 'invoices', id, invoiceDoc, batch);
    generatedInvoices.push({ ...invoiceDoc, items });

    for (const item of items) {
      const itemRef = doc(firestoreDb, 'organizations', 'demo-workspace', 'invoices', id, 'items', item.id);
      await batch.set(itemRef, item);
    }

    if (isPaid || blueprint.partial) {
      const payAmount = blueprint.partial && blueprint.paidAmount ? blueprint.paidAmount : finalTotal;
      const payDate = new Date(invoiceDate.getTime() + rng.nextInt(2, 14) * 24 * 60 * 60 * 1000);
      
      const paymentDoc = {
        id: `pay_demo_${invoiceIndex}`,
        invoiceId: id,
        clientId: client.id,
        businessId: "demo-workspace",
        amount: payAmount,
        currency: "USD",
        status: "Paid" as const,
        method: rng.choose(["bank_transfer", "card", "stripe"]),
        referenceNumber: `REF-2026-${String(invoiceIndex).padStart(4, '0')}`,
        transactionId: `TXN-DEMO-${String(10000 + invoiceIndex)}`,
        paymentDate: payDate.toISOString(),
        notes: blueprint.partial ? "Partial milestone payment received" : "Full payment received",
        createdAt: payDate.toISOString(),
        ...DEMO_METADATA
      };

      await repository.createDocument('demo-workspace', 'payments', paymentDoc.id, paymentDoc, batch);
      generatedPayments.push(paymentDoc);
    }
  }

  // 7. Seed Expenses
  console.log('[DemoService] Seeding master expenses...');
  for (let i = 0; i < demoData.expenseTemplates.length; i++) {
    const template = demoData.expenseTemplates[i];
    const expenseIndex = i + 1;
    const id = `expense_demo_${expenseIndex}`;
    
    const expenseDate = new Date(now.getTime() - template.offsetDays * 24 * 60 * 60 * 1000);
    const gst = Number((template.amount * (template.gstRate / 100)).toFixed(2));

    const expenseDoc = {
      id,
      vendor: template.vendor,
      category: template.category,
      amount: template.amount,
      gst: gst,
      date: expenseDate.toISOString().slice(0, 10),
      paymentMethod: rng.choose(["corporate_credit_card", "bank_transfer", "reimbursement"]),
      notes: `Operational expense for ${template.vendor}.`,
      isRecurring: template.isRecurring,
      recurringInterval: (template.recurringInterval || null) as any,
      tags: [template.category.toLowerCase().replace(/\s+/g, '_')],
      attachmentUrl: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=300&h=200&q=80",
      isArchived: false,
      createdAt: expenseDate.toISOString(),
      ...DEMO_METADATA
    };

    await repository.createDocument('demo-workspace', 'expenses', id, expenseDoc, batch);
    generatedExpenses.push(expenseDoc);
  }

  // 8. Seed Recurring Invoices
  console.log('[DemoService] Seeding master recurring schedules...');
  for (let i = 0; i < 4; i++) {
    const id = `schedule_demo_${i + 1}`;
    const client = clientsList[i % clientsList.length] || { id: "client_demo_1" };
    const product = productsList[(i * 3) % productsList.length] || { price: 100, gstRate: 18, name: "Consulting", unit: "hrs" };
    
    const scheduleDoc = {
      id,
      clientId: client.id,
      businessId: "demo-workspace",
      frequency: rng.choose(['weekly', 'monthly', 'yearly']) as any,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextGenerationDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      autoSend: true,
      invoiceTemplate: {
        items: [
          {
            id: `item_demo_${id}_1`,
            productName: product.name,
            description: product.description || '',
            quantity: 1,
            unit: product.unit,
            price: product.price,
            rate: product.price,
            taxRate: product.gstRate,
            discount: 0,
            amount: product.price,
            ...DEMO_METADATA
          }
        ],
        notes: "This recurring service invoice is automatically generated.",
        template: "teal" as const
      },
      createdAt: now.toISOString(),
      ...DEMO_METADATA
    };

    await repository.createDocument('demo-workspace', 'recurringInvoices', id, scheduleDoc, batch);
  }

  // 9. Seed Reports
  console.log('[DemoService] Seeding master reports...');
  const reportTypes = ['annual_summary', 'gst_gstr1', 'expense_breakdown'];
  const reportNames = ['Annual Financial Performance Summary', 'Q2 GST GSTR-1 Consolidated filing', 'Operating Expenses Category Breakdown'];
  for (let i = 0; i < reportTypes.length; i++) {
    const id = `report_demo_${i + 1}`;
    const reportDoc = {
      id,
      name: reportNames[i],
      type: reportTypes[i],
      generatedAt: now.toISOString(),
      timePeriod: 'FY 2026',
      totalRevenue: 198250.0 + i * 12500,
      totalTax: 21450.0 + i * 1800,
      totalExpenses: 42180.0 + i * 3200,
      status: 'finalized',
      summaryNotes: `Certified audit compliance report prepared automatically by Finora systems for the demo workspace workspace.`,
      ...DEMO_METADATA
    };

    await repository.createDocument('demo-workspace', 'reports', id, reportDoc, batch);
  }

  // 10. Seed Analytics
  console.log('[DemoService] Seeding master analytics stats...');
  const activeInvoices = generatedInvoices.filter(inv => inv.status !== 'draft');
  const totalInvoiced = Number(activeInvoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2));
  const totalPaid = Number(generatedPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2));
  const outstandingAmount = Number(Math.max(0, totalInvoiced - totalPaid).toFixed(2));
  const overdueAmount = Number(generatedInvoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0)
    .toFixed(2));
  const activeClientsCount = clientsList.length;
  const averageInvoiceValue = Number((totalInvoiced / (activeInvoices.length || 1)).toFixed(2));
  const totalExpensesValue = Number(generatedExpenses.reduce((sum, exp) => sum + exp.amount + exp.gst, 0).toFixed(2));
  const netProfitMargin = Number((((totalInvoiced - totalExpensesValue) / (totalInvoiced || 1)) * 100).toFixed(1));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const monthlyDataMap: { [key: string]: { billed: number; collected: number; expenses: number } } = {};
  for (const m of months) {
    monthlyDataMap[m] = { billed: 0, collected: 0, expenses: 0 };
  }

  for (const inv of activeInvoices) {
    const invDate = new Date(inv.createdAt);
    const monthName = invDate.toLocaleString('default', { month: 'short' });
    if (monthlyDataMap[monthName]) {
      monthlyDataMap[monthName].billed += inv.total;
    }
  }

  for (const pay of generatedPayments) {
    const payDate = new Date(pay.paymentDate);
    const monthName = payDate.toLocaleString('default', { month: 'short' });
    if (monthlyDataMap[monthName]) {
      monthlyDataMap[monthName].collected += pay.amount;
    }
  }

  for (const exp of generatedExpenses) {
    const expDate = new Date(exp.date);
    const monthName = expDate.toLocaleString('default', { month: 'short' });
    if (monthlyDataMap[monthName]) {
      monthlyDataMap[monthName].expenses += (exp.amount + exp.gst);
    }
  }

  const monthlyBreakdown = months.map(m => ({
    month: m,
    billed: Number(monthlyDataMap[m].billed.toFixed(2)),
    collected: Number(monthlyDataMap[m].collected.toFixed(2)),
    expenses: Number(monthlyDataMap[m].expenses.toFixed(2))
  }));

  const analyticsData = {
    id: "summary",
    lastUpdated: now.toISOString(),
    stats: {
      totalInvoiced,
      totalPaid,
      outstandingAmount,
      overdueAmount,
      activeClientsCount,
      averageInvoiceValue,
      netProfitMargin,
      growthRateYoY: 18.2
    },
    monthlyBreakdown,
    ...DEMO_METADATA
  };
  await repository.createDocument('demo-workspace', 'analytics', 'summary', analyticsData, batch);

  // Commit all master records
  await batch.commit();
  console.log(`[DemoService] Master demo-workspace seeding completed in ${Date.now() - startTime}ms. Total operations: ${batch.getTotalOperations()}`);
}

/**
 * Copies the entire Master Demo Workspace from `organizations/demo-workspace`
 * into a user's active workspace `organizations/[userOrgId]`, fully isolated.
 */
export async function copyDemoWorkspaceToUser(
  firestoreDb: Firestore,
  repository: IDemoRepository,
  userOrgId: string,
  onProgress: (msg: string) => void
): Promise<void> {
  if (!userOrgId) throw new Error('[DemoService] Missing target user organization ID');
  console.log(`[DemoService] Copying master demo data to user workspace: ${userOrgId}`);
  const startTime = Date.now();

  const batch = new BatchProcessor(firestoreDb, 450);

  // 1. Copy Business Profile fields from master businesses/primary
  onProgress("Synchronizing company profile...");
  const masterBusiness = await repository.getBusinessProfile('demo-workspace');
  if (masterBusiness) {
    await repository.updateBusinessProfile(userOrgId, {
      name: masterBusiness.name,
      email: masterBusiness.email,
      phone: masterBusiness.phone,
      address: masterBusiness.address,
      city: masterBusiness.city,
      country: masterBusiness.country,
      taxId: masterBusiness.taxId,
      accentColor: masterBusiness.accentColor,
      font: masterBusiness.font,
      footerText: masterBusiness.footerText,
      logoUrl: masterBusiness.logoUrl,
      isDemoWorkspace: true,
      updatedAt: new Date().toISOString()
    }, batch);
  }

  const subcolMappings = [
    { source: 'clients', dest: 'clients', label: 'Clients' },
    { source: 'products', dest: 'products', label: 'Products' },
    { source: 'invoices', dest: 'invoices', label: 'Invoices' },
    { source: 'expenses', dest: 'expenses', label: 'Expenses' },
    { source: 'payments', dest: 'payments', label: 'Payments' },
    { source: 'recurringInvoices', dest: 'recurring_schedules', label: 'Schedules' },
    { source: 'reports', dest: 'reports', label: 'Reports' },
    { source: 'analytics', dest: 'analytics', label: 'Analytics' }
  ];

  // 2. Fetch all collections in parallel to optimize reads
  onProgress("Fetching demo blueprints...");
  const fetchPromises = subcolMappings.map(m => repository.getSubcollectionDocs('demo-workspace', m.source));
  const fetchedDocs = await Promise.all(fetchPromises);

  const sourceDocsMap = new Map<string, any[]>();
  subcolMappings.forEach((m, idx) => {
    sourceDocsMap.set(m.source, fetchedDocs[idx]);
  });

  // 3. Write items in batch
  for (const m of subcolMappings) {
    onProgress(`Seeding ${m.label}...`);
    const docs = sourceDocsMap.get(m.source) || [];
    
    for (const docData of docs) {
      const { id, ...cleanData } = docData;
      const finalData = { ...cleanData };

      if (m.source === 'clients') {
        finalData.createdAt = new Date().toISOString();
      } else if (m.source === 'recurringInvoices') {
        finalData.businessId = userOrgId;
      }

      await repository.createDocument(userOrgId, m.dest, id, finalData, batch);

      // Handle invoice subcollections efficiently
      if (m.source === 'invoices') {
        const items = await repository.getInvoiceItems('demo-workspace', id);
        for (const item of items) {
          const { id: itemId, ...itemCleanData } = item;
          const itemRef = doc(firestoreDb, 'organizations', userOrgId, 'invoices', id, 'items', itemId);
          await batch.set(itemRef, itemCleanData);
        }
      }
    }
  }

  // 4. Commit all operations
  onProgress("Finalizing data transaction...");
  await batch.commit();
  console.log(`[DemoService] Copy completed in ${Date.now() - startTime}ms. Total operations: ${batch.getTotalOperations()}`);
}

/**
 * Reset/Purge demo data with progress updates
 */
export async function resetDemoDataWithProgress(
  firestoreDb: Firestore,
  repository: IDemoRepository,
  activeOrgId: string,
  onProgress: (msg: string) => void
): Promise<void> {
  if (!activeOrgId) throw new Error('[DemoService] No active organization selected');
  console.log(`[DemoService] Resetting demo data for workspace: ${activeOrgId}`);
  const startTime = Date.now();

  const subcollections = [
    'clients',
    'products',
    'invoices',
    'payments',
    'expenses',
    'recurring_schedules',
    'document_folders',
    'documents',
    'activity_logs',
    'reports',
    'analytics'
  ];

  const batch = new BatchProcessor(firestoreDb, 450);

  // 1. Fetch and purge all demo documents in parallel
  onProgress("Identifying seeded demo documents...");
  const fetchPromises = subcollections.map(subcol => repository.getSubcollectionDocsForDemo(activeOrgId, subcol));
  const fetchedDocsList = await Promise.all(fetchPromises);

  for (let idx = 0; idx < subcollections.length; idx++) {
    const subcol = subcollections[idx];
    const docs = fetchedDocsList[idx];
    const formattedName = subcol.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    if (docs.length > 0) {
      onProgress(`Purging demo ${formattedName}...`);
      for (const docData of docs) {
        if (subcol === 'invoices') {
          // Clean nested items
          const items = await repository.getInvoiceItems(activeOrgId, docData.id);
          for (const item of items) {
            await repository.deleteInvoiceItem(activeOrgId, docData.id, item.id, batch);
          }
        }
        await repository.deleteDocument(activeOrgId, subcol, docData.id, batch);
      }
    }
  }

  // 2. Transactionally restore business profile from backup and delete backup in same batch
  onProgress("Checking profile backups...");
  const backupData = await repository.getDemoBackup(activeOrgId);
  if (backupData) {
    onProgress("Restoring original business profile...");
    await repository.updateBusinessProfile(activeOrgId, {
      name: backupData.name || '',
      email: backupData.email || '',
      phone: backupData.phone || '',
      address: backupData.address || '',
      city: backupData.city || '',
      country: backupData.country || '',
      taxId: backupData.taxId || '',
      accentColor: backupData.accentColor || '#3b82f6',
      font: backupData.font || 'inter',
      footerText: backupData.footerText || '',
      logoUrl: backupData.logoUrl || '',
      signatureUrl: backupData.signatureUrl || '',
      isDemoWorkspace: false, // Explicitly false now
      createdAt: backupData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, batch);

    await repository.deleteDemoBackup(activeOrgId, batch);
  } else {
    // If no backup existed, just make sure isDemoWorkspace flag is turned off
    await repository.updateBusinessProfile(activeOrgId, {
      isDemoWorkspace: false,
      updatedAt: new Date().toISOString()
    }, batch);
  }

  // 3. Reset the subscription if it was seeded demo subscription
  const subSnap = await repository.getSubscription(activeOrgId);
  if (subSnap && subSnap.isDemo === true) {
    await repository.deleteSubscription(activeOrgId, batch);
  }

  // 4. Commit remaining deletions in the batch
  onProgress("Saving clean workspace state...");
  await batch.commit();
  console.log(`[DemoService] Reset completed in ${Date.now() - startTime}ms. Total operations: ${batch.getTotalOperations()}`);
}

/**
 * Direct Fallback Browser Seeding if master workspace clone is not allowed
 */
export async function fallbackDirectBrowserSeed(
  firestoreDb: Firestore,
  repository: IDemoRepository,
  activeOrgId: string,
  onProgress: (msg: string) => void
): Promise<void> {
  console.log('[DemoService] Falling back to direct browser-side data seeding...');
  const startTime = Date.now();
  
  const rng = new SeededRandom(2026);
  const now = new Date("2026-07-09T03:14:34-07:00");
  
  const batch = new BatchProcessor(firestoreDb, 450);
  const demoData = await loadDemoSeedData();

  // 1. Save company profile
  onProgress("Seeding company profile...");
  await repository.updateBusinessProfile(activeOrgId, {
    name: demoData.business.name,
    email: demoData.business.email,
    phone: demoData.business.phone,
    address: demoData.business.address,
    city: demoData.business.city,
    country: demoData.business.country,
    taxId: demoData.business.taxId,
    accentColor: demoData.business.accentColor,
    font: demoData.business.font,
    footerText: demoData.business.footerText,
    logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=150&h=150&q=80",
    isDemoWorkspace: true,
    updatedAt: now.toISOString()
  }, batch);

  // Cache sets to avoid duplicate checks
  const existingClients = new Set<string>();
  const existingProducts = new Set<string>();

  // 2. Clients
  onProgress("Seeding Clients...");
  const clientsList: any[] = [];
  for (const client of demoData.clients) {
    if (!existingClients.has(client.id)) {
      const clientDoc = {
        ...client,
        status: "active",
        profilePhoto: `https://images.unsplash.com/photo-15${rng.nextInt(100, 999)}?auto=format&fit=crop&w=100&h=100&q=80`,
        createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        ...DEMO_METADATA
      };
      await repository.createDocument(activeOrgId, 'clients', client.id, clientDoc, batch);
      clientsList.push(clientDoc);
    }
  }

  // 3. Products
  onProgress("Seeding Products...");
  const productsList: any[] = [];
  for (const product of demoData.products) {
    if (!existingProducts.has(product.id)) {
      const productDoc = {
        ...product,
        isFavorite: rng.nextInt(0, 10) > 7,
        status: "active",
        createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        ...DEMO_METADATA
      };
      await repository.createDocument(activeOrgId, 'products', product.id, productDoc, batch);
      productsList.push(productDoc);
    }
  }

  // 4. Invoices and Payments
  onProgress("Seeding Invoices...");
  const generatedInvoices: any[] = [];
  const generatedExpenses: any[] = [];
  const generatedPayments: any[] = [];

  for (let i = 0; i < demoData.invoiceBlueprint.length; i++) {
    const blueprint = demoData.invoiceBlueprint[i];
    const invoiceIndex = i + 1;
    const id = `invoice_demo_${invoiceIndex}`;
    const invoiceNumber = `INV-2026-${String(invoiceIndex).padStart(4, '0')}`;
    
    const client = clientsList[blueprint.clientIndex % clientsList.length] || { id: "client_demo_1" };
    const invoiceDate = new Date(now.getTime() - blueprint.offsetDays * 24 * 60 * 60 * 1000);
    const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const items: any[] = [];
    let subtotal = 0;
    let taxTotal = 0;

    for (let j = 0; j < blueprint.products.length; j++) {
      const prodBlueprint = blueprint.products[j];
      const product = productsList[prodBlueprint.index % productsList.length] || { price: 100, gstRate: 18, name: "Consulting", unit: "hrs" };
      const quantity = prodBlueprint.qty;
      const price = product.price;
      const taxRate = product.gstRate;
      
      const itemSubtotal = price * quantity;
      const itemTax = Number((itemSubtotal * (taxRate / 100)).toFixed(2));

      const lineItem = {
        id: `item_invoice_demo_${invoiceIndex}_${j + 1}`,
        productName: product.name,
        description: product.description || '',
        quantity,
        unit: product.unit,
        price: price,
        rate: price,
        taxRate: taxRate,
        discount: 0,
        discountType: 'percentage' as const,
        amount: itemSubtotal,
        hsn: product.hsn,
        ...DEMO_METADATA
      };
      
      items.push(lineItem);
      subtotal += itemSubtotal;
      taxTotal += itemTax;
    }

    const discountTotal = blueprint.discount;
    const finalTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));
    const isPaid = blueprint.status === 'paid';

    const statusHistory = [
      { status: 'draft' as const, timestamp: invoiceDate.toISOString() }
    ];
    if (blueprint.status !== 'draft') {
      statusHistory.push({ status: 'sent' as const, timestamp: new Date(invoiceDate.getTime() + 2 * 60 * 60 * 1000).toISOString() });
    }
    if (isPaid) {
      const payDate = new Date(invoiceDate.getTime() + rng.nextInt(2, 14) * 24 * 60 * 60 * 1000);
      statusHistory.push({ status: 'paid' as const, timestamp: payDate.toISOString() });
    }

    const invoiceDoc = {
      id,
      clientId: client.id,
      invoiceNumber,
      template: rng.choose(['teal', 'clean', 'modern', 'corporate', 'minimal', 'luxury']) as any,
      subtotal: Number(subtotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      total: finalTotal,
      status: blueprint.status as any,
      statusHistory,
      notes: demoData.business.footerText,
      dueDate: dueDate.toISOString(),
      createdAt: invoiceDate.toISOString(),
      updatedAt: invoiceDate.toISOString(),
      isPaid,
      currency: "USD",
      currencySymbol: "$",
      ...DEMO_METADATA
    };

    await repository.createDocument(activeOrgId, 'invoices', id, invoiceDoc, batch);
    generatedInvoices.push({ ...invoiceDoc, items });

    for (const item of items) {
      const itemRef = doc(firestoreDb, 'organizations', activeOrgId, 'invoices', id, 'items', item.id);
      await batch.set(itemRef, item);
    }

    const paymentId = `pay_demo_${invoiceIndex}`;
    if (isPaid || blueprint.partial) {
      const payAmount = blueprint.partial && blueprint.paidAmount ? blueprint.paidAmount : finalTotal;
      const payDate = new Date(invoiceDate.getTime() + rng.nextInt(2, 14) * 24 * 60 * 60 * 1000);
      
      const paymentDoc = {
        id: paymentId,
        invoiceId: id,
        clientId: client.id,
        businessId: activeOrgId,
        amount: payAmount,
        currency: "USD",
        status: "Paid" as const,
        method: rng.choose(["bank_transfer", "card", "stripe"]),
        referenceNumber: `REF-2026-${String(invoiceIndex).padStart(4, '0')}`,
        transactionId: `TXN-DEMO-${String(10000 + invoiceIndex)}`,
        paymentDate: payDate.toISOString(),
        notes: blueprint.partial ? "Partial milestone payment received" : "Full payment received",
        createdAt: payDate.toISOString(),
        ...DEMO_METADATA
      };

      await repository.createDocument(activeOrgId, 'payments', paymentId, paymentDoc, batch);
      generatedPayments.push(paymentDoc);
    }
  }

  // 5. Expenses
  onProgress("Seeding Expenses...");
  for (let i = 0; i < demoData.expenseTemplates.length; i++) {
    const template = demoData.expenseTemplates[i];
    const expenseIndex = i + 1;
    const id = `expense_demo_${expenseIndex}`;
    
    const expenseDate = new Date(now.getTime() - template.offsetDays * 24 * 60 * 60 * 1000);
    const gst = Number((template.amount * (template.gstRate / 100)).toFixed(2));

    const expenseDoc = {
      id,
      vendor: template.vendor,
      category: template.category,
      amount: template.amount,
      gst: gst,
      date: expenseDate.toISOString().slice(0, 10),
      paymentMethod: rng.choose(["corporate_credit_card", "bank_transfer", "reimbursement"]),
      notes: `Operational expense for ${template.vendor}.`,
      isRecurring: template.isRecurring,
      recurringInterval: (template.recurringInterval || null) as any,
      tags: [template.category.toLowerCase().replace(/\s+/g, '_')],
      attachmentUrl: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=300&h=200&q=80",
      isArchived: false,
      createdAt: expenseDate.toISOString(),
      ...DEMO_METADATA
    };

    await repository.createDocument(activeOrgId, 'expenses', id, expenseDoc, batch);
    generatedExpenses.push(expenseDoc);
  }

  // 6. Schedules
  onProgress("Seeding Schedules...");
  for (let i = 0; i < 4; i++) {
    const id = `schedule_demo_${i + 1}`;
    const client = clientsList[i % clientsList.length] || { id: "client_demo_1" };
    const product = productsList[(i * 3) % productsList.length] || { price: 100, gstRate: 18, name: "Consulting", unit: "hrs" };
    
    const scheduleDoc = {
      id,
      clientId: client.id,
      businessId: activeOrgId,
      frequency: rng.choose(['weekly', 'monthly', 'yearly']) as any,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextGenerationDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      autoSend: true,
      invoiceTemplate: {
        items: [
          {
            id: `item_demo_${id}_1`,
            productName: product.name,
            description: product.description || '',
            quantity: 1,
            unit: product.unit,
            price: product.price,
            rate: product.price,
            taxRate: product.gstRate,
            discount: 0,
            amount: product.price,
            ...DEMO_METADATA
          }
        ],
        notes: "This recurring service invoice is automatically generated.",
        template: "teal" as const
      },
      createdAt: now.toISOString(),
      ...DEMO_METADATA
    };

    await repository.createDocument(activeOrgId, 'recurring_schedules', id, scheduleDoc, batch);
  }

  // 7. Reports
  onProgress("Seeding Reports...");
  const reportTypes = ['annual_summary', 'gst_gstr1', 'expense_breakdown'];
  const reportNames = ['Annual Financial Performance Summary', 'Q2 GST GSTR-1 Consolidated filing', 'Operating Expenses Category Breakdown'];
  for (let i = 0; i < reportTypes.length; i++) {
    const id = `report_demo_${i + 1}`;
    const reportDoc = {
      id,
      name: reportNames[i],
      type: reportTypes[i],
      generatedAt: now.toISOString(),
      timePeriod: 'FY 2026',
      totalRevenue: 198250.0 + i * 12500,
      totalTax: 21450.0 + i * 1800,
      totalExpenses: 42180.0 + i * 3200,
      status: 'finalized',
      summaryNotes: `Certified audit compliance report prepared automatically by Finora systems for the demo workspace workspace.`,
      ...DEMO_METADATA
    };
    await repository.createDocument(activeOrgId, 'reports', id, reportDoc, batch);
  }

  // 8. Analytics
  onProgress("Computing Analytics...");
  const activeInvoices = generatedInvoices.filter(inv => inv.status !== 'draft');
  const totalInvoiced = Number(activeInvoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2));
  const totalPaid = Number(generatedPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2));
  const outstandingAmount = Number(Math.max(0, totalInvoiced - totalPaid).toFixed(2));
  const overdueAmount = Number(generatedInvoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0)
    .toFixed(2));
  const activeClientsCount = clientsList.length;
  const averageInvoiceValue = Number((totalInvoiced / (activeInvoices.length || 1)).toFixed(2));
  const totalExpensesValue = Number(generatedExpenses.reduce((sum, exp) => sum + exp.amount + exp.gst, 0).toFixed(2));
  const netProfitMargin = Number((((totalInvoiced - totalExpensesValue) / (totalInvoiced || 1)) * 100).toFixed(1));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const monthlyDataMap: { [key: string]: { billed: number; collected: number; expenses: number } } = {};
  for (const m of months) {
    monthlyDataMap[m] = { billed: 0, collected: 0, expenses: 0 };
  }

  for (const inv of activeInvoices) {
    const invDate = new Date(inv.createdAt);
    const monthName = invDate.toLocaleString('default', { month: 'short' });
    if (monthlyDataMap[monthName]) {
      monthlyDataMap[monthName].billed += inv.total;
    }
  }

  for (const pay of generatedPayments) {
    const payDate = new Date(pay.paymentDate);
    const monthName = payDate.toLocaleString('default', { month: 'short' });
    if (monthlyDataMap[monthName]) {
      monthlyDataMap[monthName].collected += pay.amount;
    }
  }

  for (const exp of generatedExpenses) {
    const expDate = new Date(exp.date);
    const monthName = expDate.toLocaleString('default', { month: 'short' });
    if (monthlyDataMap[monthName]) {
      monthlyDataMap[monthName].expenses += (exp.amount + exp.gst);
    }
  }

  const monthlyBreakdown = months.map(m => ({
    month: m,
    billed: Number(monthlyDataMap[m].billed.toFixed(2)),
    collected: Number(monthlyDataMap[m].collected.toFixed(2)),
    expenses: Number(monthlyDataMap[m].expenses.toFixed(2))
  }));

  const analyticsData = {
    id: "summary",
    lastUpdated: now.toISOString(),
    stats: {
      totalInvoiced,
      totalPaid,
      outstandingAmount,
      overdueAmount,
      activeClientsCount,
      averageInvoiceValue,
      netProfitMargin,
      growthRateYoY: 18.2
    },
    monthlyBreakdown,
    ...DEMO_METADATA
  };
  await repository.createDocument(activeOrgId, 'analytics', 'summary', analyticsData, batch);

  // 9. Commit
  onProgress("Finalizing data transaction...");
  await batch.commit();
  console.log(`[DemoService] Direct seed completed in ${Date.now() - startTime}ms. Total operations: ${batch.getTotalOperations()}`);
}

/**
 * High-level orchestration to safely backup profile and seed demo workspace data
 */
export async function generateDemoDataWithProgress(
  firestoreDb: Firestore,
  repository: IDemoRepository,
  activeOrgId: string,
  onProgress: (msg: string) => void
): Promise<void> {
  // 1. Verify authentication
  if (!auth.currentUser) {
    throw new Error("[DemoService] Authentication failed. Please log in first.");
  }

  const startTime = Date.now();
  onProgress("Checking workspace profiles...");

  // 2. Perform transactional backup check
  // Read first, then backup inside a simple read-and-set sequence or runTransaction
  const orgSnap = await repository.getBusinessProfile(activeOrgId);
  const backupSnap = await repository.getDemoBackup(activeOrgId);

  if (orgSnap && !backupSnap && !orgSnap.isDemoWorkspace) {
    onProgress("Backing up business profile...");
    const originalData = orgSnap;
    await repository.createDemoBackup(activeOrgId, {
      name: originalData.name || '',
      email: originalData.email || '',
      phone: originalData.phone || '',
      address: originalData.address || '',
      city: originalData.city || '',
      country: originalData.country || '',
      taxId: originalData.taxId || '',
      accentColor: originalData.accentColor || '#3b82f6',
      font: originalData.font || 'inter',
      footerText: originalData.footerText || '',
      logoUrl: originalData.logoUrl || '',
      signatureUrl: originalData.signatureUrl || '',
      createdAt: originalData.createdAt || new Date().toISOString()
    });
  }

  // 3. Attempt master clone
  onProgress("Checking cloud templates...");
  let clonedSuccessfully = false;
  try {
    const masterExists = await isMasterDemoWorkspaceSeeded(repository);
    if (masterExists) {
      onProgress("Cloning demo template...");
      await copyDemoWorkspaceToUser(firestoreDb, repository, activeOrgId, onProgress);
      clonedSuccessfully = true;
    }
  } catch (err) {
    console.warn('[DemoService] Master clone failed. Falling back to direct browser seed...', err);
  }

  // 4. Fallback if master clone was skipped or failed
  if (!clonedSuccessfully) {
    await fallbackDirectBrowserSeed(firestoreDb, repository, activeOrgId, onProgress);
  }

  console.log(`[DemoService] Complete workspace seeding finished in ${Date.now() - startTime}ms.`);
}

/**
 * Starts the Interactive Demo Mode in-memory using local store.
 */
export async function startInteractiveDemo() {
  console.log('[DemoService] Initializing Interactive Demo Mode...');
  
  const store = useStore;
  
  // 1. Set isDemoMode to true
  store.getState().setDemoMode(true);
  
  // 2. Lazy-load all the JSON seeds
  const businessData = await import('@/demo/business.json').then(m => m.default);
  const clientsData = await import('@/demo/clients.json').then(m => m.default);
  const productsData = await import('@/demo/products.json').then(m => m.default);
  const servicesData = await import('@/demo/services.json').then(m => m.default);
  const expensesData = await import('@/demo/expenses.json').then(m => m.default);
  const invoicesData = await import('@/demo/invoices.json').then(m => m.default);
  const notificationsData = await import('@/demo/notifications.json').then(m => m.default);
  const activityData = await import('@/demo/activity.json').then(m => m.default);

  // Merge products and services
  const allProducts = [...productsData, ...servicesData];

  // 3. Set the Zustand store state in-memory
  store.setState({
    isDemoMode: true,
    businesses: [businessData],
    currentBusinessId: businessData.id,
    clients: clientsData,
    products: allProducts,
    expenses: expensesData,
    invoices: invoicesData,
    notifications: notificationsData,
    activityLogs: activityData,
    payments: [],
    recurringSchedules: [],
    documents: [],
    documentFolders: [],
    currentInvoice: null,
  });
  
  console.log('[DemoService] Interactive Demo Mode successfully initialized in-memory!');
}

/**
 * Exits the Interactive Demo Mode and restores local production state from localStorage.
 */
export async function exitInteractiveDemo() {
  console.log('[DemoService] Exiting Interactive Demo Mode...');
  
  const store = useStore;
  
  store.setState({
    isDemoMode: false,
    businesses: [],
    currentBusinessId: null,
    clients: [],
    products: [],
    expenses: [],
    invoices: [],
    notifications: [],
    activityLogs: [],
    payments: [],
    recurringSchedules: [],
    documents: [],
    documentFolders: [],
    currentInvoice: null,
  });
  
  // 4. Rehydrate previous production state from localStorage
  await store.persist.rehydrate();
  console.log('[DemoService] Interactive Demo Mode exited and production state restored!');
}

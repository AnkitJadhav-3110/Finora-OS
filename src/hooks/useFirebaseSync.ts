import { useEffect, useCallback, useState } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/store/useStore';
import type { Business, Client, Invoice, RecurringSchedule, AppSettings, InvoiceItem, Product, Payment, SaasSubscription, InAppNotification, Expense, ExpenseRule, ReminderHistory, DescriptionTemplate, DocumentItem, DocumentFolder, ActivityLog, CustomTemplate } from '@/store/useStore';

export function useFirebaseSync() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user || useStore.getState().isDemoMode) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 1. Fetch Organization memberships
      const membersRef = collection(db, 'organization_members');
      const q = query(membersRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      let activeOrgId: string | null = null;

      if (querySnapshot.empty) {
        // Automatically Onboard New User with a default Organization (Multi-Tenant foundation)
        const newOrgId = crypto.randomUUID();
        activeOrgId = newOrgId;

        // Create membership FIRST so security rules allows modifying organizations & settings subcollections
        const memberDocId = `${user.uid}_${newOrgId}`;
        const membershipRef = doc(db, 'organization_members', memberDocId);
        await setDoc(membershipRef, {
          orgId: newOrgId,
          userId: user.uid,
          role: 'owner',
          email: user.email || '',
          joinedAt: new Date().toISOString()
        });

        // Create organization document
        const orgRef = doc(db, 'organizations', newOrgId);
        await setDoc(orgRef, {
          name: 'Your Company',
          email: user.email || 'hello@yourcompany.com',
          phone: '+1 (555) 000-0000',
          address: '123 Business Street',
          city: 'New York, NY 10001',
          country: 'United States',
          taxId: 'XX-XXXXXXX',
          accentColor: '#3b82f6',
          font: 'inter',
          footerText: 'Thank you for your business!',
          logoUrl: '',
          signatureUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Create default settings
        const settingsRef = doc(db, 'organizations', newOrgId, 'settings', 'current');
        await setDoc(settingsRef, {
          theme: 'light',
          currency: 'USD',
          currencySymbol: '$',
          invoicePrefix: 'INV-',
          invoiceSuffix: '',
          defaultTaxRate: 10,
          defaultPaymentTerms: 'net30',
          emailSettings: {
            autoSendOnCreate: false,
            autoSendRecurring: true,
            includePaymentLink: false,
            emailFooter: 'Thank you for your business!'
          },
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Select the first organization as active
        activeOrgId = querySnapshot.docs[0].data().orgId;
      }

      if (!activeOrgId) return;

      // 2. Load Active Organization (Business profile)
      const orgDocRef = doc(db, 'organizations', activeOrgId);
      const orgDoc = await getDoc(orgDocRef);

      if (orgDoc.exists()) {
        const orgData = orgDoc.data();
        const business: Business = {
          id: orgDoc.id,
          name: orgData.name || 'Your Company',
          email: orgData.email || '',
          phone: orgData.phone || '',
          address: orgData.address || '',
          city: orgData.city || '',
          country: orgData.country || '',
          taxId: orgData.taxId || '',
          accentColor: orgData.accentColor || '#3b82f6',
          font: (orgData.font || 'inter') as Business['font'],
          footerText: orgData.footerText || 'Thank you for your business!',
          logo: orgData.logoUrl || undefined,
          signature: orgData.signatureUrl || undefined,
          isDemoWorkspace: !!orgData.isDemoWorkspace,
        };

        // Sync to Store
        useStore.setState({ businesses: [business], currentBusinessId: orgDoc.id });
      }

      // 3. Load App Settings
      const settingsDocRef = doc(db, 'organizations', activeOrgId, 'settings', 'current');
      const settingsDoc = await getDoc(settingsDocRef);
      if (settingsDoc.exists()) {
        const sData = settingsDoc.data();
        const appSettings: AppSettings = {
          theme: sData.theme as AppSettings['theme'],
          currency: sData.currency || 'USD',
          currencySymbol: sData.currencySymbol || '$',
          invoicePrefix: sData.invoicePrefix || 'INV-',
          invoiceSuffix: sData.invoiceSuffix || '',
          defaultTaxRate: Number(sData.defaultTaxRate ?? 10),
          defaultPaymentTerms: sData.defaultPaymentTerms as AppSettings['defaultPaymentTerms'],
          email: sData.emailSettings as AppSettings['email'],
        };
        useStore.setState({ settings: appSettings });
      }

      // 4. Load Clients
      const clientsColRef = collection(db, 'organizations', activeOrgId, 'clients');
      const clientsSnapshot = await getDocs(clientsColRef);
      const mappedClients: Client[] = clientsSnapshot.docs.map(docSnap => {
        const c = docSnap.data();
        return {
          id: docSnap.id,
          name: c.name,
          businessName: c.businessName || undefined,
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          city: c.city || '',
          state: c.state || undefined,
          country: c.country || '',
          taxId: c.taxId || undefined,
          pan: c.pan || undefined,
          billingAddress: c.billingAddress || undefined,
          shippingAddress: c.shippingAddress || undefined,
          notes: c.notes || undefined,
          currency: c.currency || 'USD',
          currencySymbol: c.currencySymbol || '$',
          paymentTerms: c.paymentTerms || undefined,
          status: (c.status || 'active') as Client['status'],
          tags: c.tags || [],
          profilePhoto: c.profilePhoto || undefined,
          attachments: c.attachments || [],
          isFavorite: !!c.isFavorite,
          createdAt: c.createdAt || new Date().toISOString(),
          deletedAt: c.deletedAt || undefined,
        };
      });
      useStore.setState({ clients: mappedClients });

      // 5. Load Invoices with Normalized Items
      const invoicesColRef = collection(db, 'organizations', activeOrgId, 'invoices');
      const invoicesSnapshot = await getDocs(invoicesColRef);
      
      const mappedInvoices: Invoice[] = [];

      for (const invoiceDocSnap of invoicesSnapshot.docs) {
        const i = invoiceDocSnap.data();
        const invoiceId = invoiceDocSnap.id;

        // Fetch Normalized Line Items from subcollection `/organizations/{orgId}/invoices/{invoiceId}/items`
        const itemsColRef = collection(db, 'organizations', activeOrgId, 'invoices', invoiceId, 'items');
        const itemsSnapshot = await getDocs(itemsColRef);
        const mappedItems = itemsSnapshot.docs.map(itemDocSnap => {
          const item = itemDocSnap.data();
          return {
            id: itemDocSnap.id,
            productName: item.productName || undefined,
            description: item.description,
            quantity: Number(item.quantity ?? 1),
            unit: item.unit || undefined,
            price: Number(item.rate ?? 0), // Maps 'rate' on server to 'price' on frontend
            taxRate: Number(item.taxRate ?? 0),
            discount: Number(item.discount ?? 0),
            discountType: (item.discountType || 'percentage') as 'percentage' | 'flat',
            hsn: item.hsn || undefined,
            amount: Number(item.amount ?? 0),
            order: Number(item.order ?? 0),
          };
        });

        // Ensure order is correct
        mappedItems.sort((a, b) => a.order - b.order);

        const items: InvoiceItem[] = mappedItems.map(item => ({
          id: item.id,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          taxRate: item.taxRate,
          discount: item.discount,
          discountType: item.discountType,
          hsn: item.hsn,
          amount: item.amount,
        }));

        mappedInvoices.push({
          id: invoiceId,
          invoiceNumber: i.invoiceNumber,
          businessId: activeOrgId,
          clientId: i.clientId,
          items,
          subtotal: Number(i.subtotal ?? 0),
          taxTotal: Number(i.taxTotal ?? 0),
          discountTotal: Number(i.discountTotal ?? 0),
          total: Number(i.total ?? 0),
          status: i.status as Invoice['status'],
          statusHistory: i.statusHistory || [],
          template: i.template as Invoice['template'],
          createdAt: i.createdAt || new Date().toISOString(),
          dueDate: i.dueDate || new Date().toISOString(),
          issueDate: i.issueDate || undefined,
          paymentTerms: i.paymentTerms || undefined,
          currency: i.currency || undefined,
          currencySymbol: i.currencySymbol || undefined,
          discountType: (i.discountType || 'percentage') as 'percentage' | 'flat',
          discountValue: i.discountValue !== undefined ? Number(i.discountValue) : undefined,
          shippingCharges: i.shippingCharges !== undefined ? Number(i.shippingCharges) : undefined,
          roundOff: i.roundOff !== undefined ? Number(i.roundOff) : undefined,
          notes: i.notes || '',
          termsAndConditions: i.termsAndConditions || undefined,
          attachments: i.attachments || [],
          internalNotes: i.internalNotes || undefined,
          customerNotes: i.customerNotes || undefined,
          multipleTaxes: i.multipleTaxes || [],
          paymentQR: i.paymentQr || undefined,
          isPaid: !!i.isPaid,
        });
      }
      useStore.setState({ invoices: mappedInvoices });

      // 6. Load Products
      const productsColRef = collection(db, 'organizations', activeOrgId, 'products');
      const productsSnapshot = await getDocs(productsColRef);
      const mappedProducts: Product[] = productsSnapshot.docs.map(docSnap => {
        const p = docSnap.data();
        return {
          id: docSnap.id,
          name: p.name,
          description: p.description || '',
          sku: p.sku || '',
          category: p.category || '',
          price: Number(p.price ?? 0),
          gstRate: Number(p.gstRate ?? 18),
          hsn: p.hsn || '',
          unit: p.unit || 'pcs',
          isFavorite: !!p.isFavorite,
          status: (p.status || 'active') as Product['status'],
          createdAt: p.createdAt || new Date().toISOString(),
        };
      });
      useStore.setState({ products: mappedProducts });

      // 7. Load Recurring Schedules
      const schedulesColRef = collection(db, 'organizations', activeOrgId, 'recurring_schedules');
      const schedulesSnapshot = await getDocs(schedulesColRef);
      const mappedSchedules: RecurringSchedule[] = schedulesSnapshot.docs.map(docSnap => {
        const s = docSnap.data();
        return {
          id: docSnap.id,
          clientId: s.clientId,
          businessId: activeOrgId || '',
          frequency: s.frequency as RecurringSchedule['frequency'],
          startDate: s.startDate,
          endDate: s.endDate || undefined,
          nextGenerationDate: s.nextGenerationDate,
          isActive: !!s.isActive,
          autoSend: !!s.autoSend,
          invoiceTemplate: s.invoiceTemplate as RecurringSchedule['invoiceTemplate'],
          createdAt: s.createdAt || new Date().toISOString(),
        };
      });
      useStore.setState({ recurringSchedules: mappedSchedules });

      // 8. Load Payments
      const paymentsColRef = collection(db, 'organizations', activeOrgId, 'payments');
      const paymentsSnapshot = await getDocs(paymentsColRef);
      const mappedPayments: Payment[] = paymentsSnapshot.docs.map(docSnap => {
        const p = docSnap.data();
        return {
          id: docSnap.id,
          invoiceId: p.invoiceId,
          clientId: p.clientId,
          businessId: activeOrgId || '',
          amount: Number(p.amount ?? 0),
          currency: p.currency || 'USD',
          status: p.status as Payment['status'],
          method: p.method || 'cash',
          referenceNumber: p.referenceNumber || '',
          transactionId: p.transactionId || '',
          paymentDate: p.paymentDate || new Date().toISOString(),
          notes: p.notes || '',
          attachments: p.attachments || [],
          createdAt: p.createdAt || new Date().toISOString(),
        };
      });
      useStore.setState({ payments: mappedPayments });

      // 9. Load SaaS Subscription
      const subDocRef = doc(db, 'organizations', activeOrgId, 'subscriptions', 'current');
      const subDoc = await getDoc(subDocRef);
      if (subDoc.exists()) {
        const s = subDoc.data();
        const appSub: SaasSubscription = {
          id: subDoc.id,
          businessId: activeOrgId || '',
          plan: s.plan as SaasSubscription['plan'],
          status: s.status as SaasSubscription['status'],
          billingCycle: s.billingCycle as SaasSubscription['billingCycle'],
          startDate: s.startDate,
          renewalDate: s.renewalDate,
          cancellationDate: s.cancellationDate || undefined,
          trialEndDate: s.trialEndDate || undefined,
          createdAt: s.createdAt || new Date().toISOString(),
        };
        useStore.setState({ subscription: appSub });
      } else {
        // Create default Free plan
        const defaultSub: SaasSubscription = {
          id: 'sub_default',
          businessId: activeOrgId || '',
          plan: 'free',
          status: 'active',
          billingCycle: 'monthly',
          startDate: new Date().toISOString(),
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        };
        useStore.setState({ subscription: defaultSub });
      }

      // 10. Load Notifications
      const notifsColRef = collection(db, 'organizations', activeOrgId, 'notifications');
      const notifsSnapshot = await getDocs(notifsColRef);
      const mappedNotifs: InAppNotification[] = notifsSnapshot.docs.map(docSnap => {
        const n = docSnap.data();
        return {
          id: docSnap.id,
          businessId: activeOrgId || '',
          type: n.type as InAppNotification['type'],
          title: n.title,
          message: n.message,
          isRead: !!n.isRead,
          createdAt: n.createdAt || new Date().toISOString(),
        };
      });
      mappedNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      useStore.setState({ notifications: mappedNotifs });

      // 11. Load Expenses
      const expensesColRef = collection(db, 'organizations', activeOrgId, 'expenses');
      const expensesSnapshot = await getDocs(expensesColRef);
      const mappedExpenses: Expense[] = expensesSnapshot.docs.map(docSnap => {
        const e = docSnap.data();
        return {
          id: docSnap.id,
          businessId: activeOrgId || '',
          vendor: e.vendor,
          category: e.category,
          amount: Number(e.amount ?? 0),
          gst: Number(e.gst ?? 0),
          date: e.date,
          paymentMethod: e.paymentMethod,
          notes: e.notes || undefined,
          isRecurring: !!e.isRecurring,
          recurringInterval: e.recurringInterval || undefined,
          tags: e.tags || [],
          attachmentUrl: e.attachmentUrl || undefined,
          isArchived: !!e.isArchived,
          createdAt: e.createdAt || new Date().toISOString(),
        };
      });
      useStore.setState({ expenses: mappedExpenses });

      // 12. Load Expense Rules
      const rulesColRef = collection(db, 'organizations', activeOrgId, 'expense_rules');
      const rulesSnapshot = await getDocs(rulesColRef);
      if (!rulesSnapshot.empty) {
        const mappedRules: ExpenseRule[] = rulesSnapshot.docs.map(docSnap => {
          const r = docSnap.data();
          return {
            id: docSnap.id,
            businessId: activeOrgId || '',
            keyword: r.keyword,
            category: r.category,
            createdAt: r.createdAt || new Date().toISOString(),
          };
        });
        useStore.setState({ expenseRules: mappedRules });
      }

      // 13. Load Reminder History
      const remindersColRef = collection(db, 'organizations', activeOrgId, 'reminders');
      const remindersSnapshot = await getDocs(remindersColRef);
      const mappedReminders: ReminderHistory[] = remindersSnapshot.docs.map(docSnap => {
        const r = docSnap.data();
        return {
          id: docSnap.id,
          businessId: activeOrgId || '',
          invoiceId: r.invoiceId,
          clientId: r.clientId,
          type: r.type as ReminderHistory['type'],
          channel: r.channel as ReminderHistory['channel'],
          content: r.content,
          sentAt: r.sentAt || new Date().toISOString(),
          status: r.status as ReminderHistory['status'],
        };
      });
      useStore.setState({ reminders: mappedReminders });

      // 14. Load Description Templates
      const descTemplatesColRef = collection(db, 'organizations', activeOrgId, 'description_templates');
      const descTemplatesSnapshot = await getDocs(descTemplatesColRef);
      if (!descTemplatesSnapshot.empty) {
        const mappedDescTemplates: DescriptionTemplate[] = descTemplatesSnapshot.docs.map(docSnap => {
          const t = docSnap.data();
          return {
            id: docSnap.id,
            businessId: activeOrgId || '',
            name: t.name,
            category: t.category,
            templateText: t.templateText,
            isCustom: !!t.isCustom,
            createdAt: t.createdAt || new Date().toISOString(),
          };
        });
        useStore.setState({ descriptionTemplates: mappedDescTemplates });
      }

      // 15. Load Document Folders
      const docFoldersColRef = collection(db, 'organizations', activeOrgId, 'document_folders');
      const docFoldersSnapshot = await getDocs(docFoldersColRef);
      const mappedDocFolders: DocumentFolder[] = docFoldersSnapshot.docs.map(docSnap => {
        const f = docSnap.data();
        return {
          id: docSnap.id,
          businessId: activeOrgId || '',
          name: f.name,
          createdAt: f.createdAt || new Date().toISOString(),
        };
      });
      useStore.setState({ documentFolders: mappedDocFolders });

      // 16. Load Stored Documents
      const docsColRef = collection(db, 'organizations', activeOrgId, 'documents');
      const docsSnapshot = await getDocs(docsColRef);
      const mappedDocs: DocumentItem[] = docsSnapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          businessId: activeOrgId || '',
          name: d.name,
          type: d.type as DocumentItem['type'],
          fileUrl: d.fileUrl,
          fileSize: Number(d.fileSize ?? 0),
          folderId: d.folderId || undefined,
          isDeleted: !!d.isDeleted,
          deletedAt: d.deletedAt || undefined,
          createdAt: d.createdAt || new Date().toISOString(),
        };
      });
      useStore.setState({ documents: mappedDocs });

      // 17. Load Activity Logs
      const activityColRef = collection(db, 'organizations', activeOrgId, 'activity_logs');
      const activitySnapshot = await getDocs(activityColRef);
      const mappedActivities: ActivityLog[] = activitySnapshot.docs.map(docSnap => {
        const a = docSnap.data();
        return {
          id: docSnap.id,
          businessId: activeOrgId || '',
          type: a.type as ActivityLog['type'],
          label: a.label,
          detail: a.detail,
          createdAt: a.createdAt || new Date().toISOString(),
        };
      });
      mappedActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      useStore.setState({ activityLogs: mappedActivities });

      // 18. Load Custom Invoice Templates
      const templatesColRef = collection(db, 'organizations', activeOrgId, 'templates');
      const templatesSnapshot = await getDocs(templatesColRef);
      const loadedTemplates: CustomTemplate[] = templatesSnapshot.docs.map(docSnap => {
        const t = docSnap.data();
        return {
          id: docSnap.id,
          name: t.templateName || t.name || 'Untitled Template',
          backgroundImage: t.assetUrl || t.backgroundImage || '',
          fieldMappings: t.fieldMappings || [],
          createdAt: t.createdAt || new Date().toISOString(),
          templateId: t.templateId || docSnap.id,
          organizationId: t.organizationId || activeOrgId,
          userId: t.userId || user.uid,
          templateName: t.templateName || t.name || 'Untitled Template',
          assetUrl: t.assetUrl || t.backgroundImage || '',
          type: t.type || 'custom',
          status: t.status || 'active',
          updatedAt: t.updatedAt,
        };
      });
      if (loadedTemplates.length > 0) {
        useStore.setState({ customTemplates: loadedTemplates });
      }

    } catch (err: any) {
      if (err instanceof Error && (err.message.includes('offline') || err.message.includes('failed to get document') || err.message.includes('network'))) {
        console.warn('Firestore is running in offline mode. Local cached data will be used:', err.message);
      } else if (err?.code === 'permission-denied' || (err instanceof Error && err.message.toLowerCase().includes('permission'))) {
        console.warn('Firestore authorization in progress; local cached data will be used:', err.message);
      } else {
        console.error('Error loading data from Firestore:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();

    if (!user || useStore.getState().isDemoMode) return;

    let unsubInvoices: (() => void) | null = null;
    let unsubPayments: (() => void) | null = null;
    let unsubTemplates: (() => void) | null = null;
    let activeId = useStore.getState().currentBusinessId;

    const startListeners = async (orgId: string) => {
      if (unsubInvoices) unsubInvoices();
      if (unsubPayments) unsubPayments();
      if (unsubTemplates) unsubTemplates();
      if (!orgId) return;

      // Guard: Ensure the user is authenticated and verified as a member of this organization
      try {
        const membershipRef = doc(db, 'organization_members', `${user.uid}_${orgId}`);
        const membershipDoc = await getDoc(membershipRef);
        if (!membershipDoc.exists()) {
          console.warn(`[Firebase Sync] Skipping real-time listeners for unverified organization ID: ${orgId}`);
          return;
        }
      } catch (err) {
        console.warn(`[Firebase Sync] Failed to verify membership for organization: ${orgId}`, err);
        return;
      }

      // 1. Live Invoices Listener
      unsubInvoices = onSnapshot(collection(db, 'organizations', orgId, 'invoices'), async (snapshot) => {
        const currentInvoices = useStore.getState().invoices;
        const updatedInvoices = [...currentInvoices];

        for (const change of snapshot.docChanges()) {
          const docData = change.doc.data();
          const docId = change.doc.id;

          if (change.type === 'added' || change.type === 'modified') {
            const existingIdx = updatedInvoices.findIndex(i => i.id === docId);
            
            if (existingIdx > -1) {
              const existingItems = updatedInvoices[existingIdx].items;
              const newItems = Array.isArray(docData.items) && docData.items.length > 0 ? docData.items : existingItems;
              updatedInvoices[existingIdx] = {
                ...updatedInvoices[existingIdx],
                items: newItems,
                status: docData.status as Invoice['status'],
                statusHistory: docData.statusHistory || [],
                subtotal: Number(docData.subtotal ?? 0),
                taxTotal: Number(docData.taxTotal ?? 0),
                discountTotal: Number(docData.discountTotal ?? 0),
                total: Number(docData.total ?? 0),
                isPaid: !!docData.isPaid,
                dueDate: docData.dueDate || new Date().toISOString(),
                createdAt: docData.createdAt || new Date().toISOString(),
                paymentQR: docData.paymentQr || undefined,
                paymentTerms: docData.paymentTerms || updatedInvoices[existingIdx].paymentTerms,
                customTemplateSnapshot: docData.customTemplateSnapshot || updatedInvoices[existingIdx].customTemplateSnapshot,
              };
            } else {
              // Fetch newly added invoice's items: from master doc or existing cache or subcollection
              let mappedItems: InvoiceItem[] = Array.isArray(docData.items) && docData.items.length > 0
                ? docData.items
                : (useStore.getState().invoices.find(i => i.id === docId)?.items || []);

              if (mappedItems.length === 0) {
                const itemsColRef = collection(db, 'organizations', orgId, 'invoices', docId, 'items');
                const itemsSnapshot = await getDocs(itemsColRef);
                mappedItems = itemsSnapshot.docs.map(itemDocSnap => {
                  const item = itemDocSnap.data();
                  return {
                    id: itemDocSnap.id,
                    productName: item.productName || undefined,
                    description: item.description || '',
                    quantity: Number(item.quantity ?? 1),
                    unit: item.unit || undefined,
                    price: Number(item.rate ?? item.price ?? 0),
                    taxRate: Number(item.taxRate ?? 0),
                    discount: Number(item.discount ?? 0),
                    discountType: (item.discountType || 'percentage') as 'percentage' | 'flat',
                    hsn: item.hsn || undefined,
                    amount: Number(item.amount ?? 0),
                    order: Number(item.order ?? 0),
                  };
                });
                mappedItems.sort((a, b) => a.order - b.order);
              }

              updatedInvoices.push({
                id: docId,
                invoiceNumber: docData.invoiceNumber,
                businessId: orgId,
                clientId: docData.clientId,
                items: mappedItems,
                subtotal: Number(docData.subtotal ?? 0),
                taxTotal: Number(docData.taxTotal ?? 0),
                discountTotal: Number(docData.discountTotal ?? 0),
                total: Number(docData.total ?? 0),
                status: docData.status as Invoice['status'],
                statusHistory: docData.statusHistory || [],
                template: docData.template as Invoice['template'],
                customTemplateSnapshot: docData.customTemplateSnapshot || undefined,
                paymentTerms: docData.paymentTerms || undefined,
                createdAt: docData.createdAt || new Date().toISOString(),
                dueDate: docData.dueDate || new Date().toISOString(),
                notes: docData.notes || '',
                isPaid: !!docData.isPaid,
              });
            }
          } else if (change.type === 'removed') {
            const idx = updatedInvoices.findIndex(i => i.id === docId);
            if (idx > -1) {
              updatedInvoices.splice(idx, 1);
            }
          }
        }

        const dedupedInvoices = Array.from(new Map(updatedInvoices.map(i => [i.id, i])).values());
        useStore.setState({ invoices: dedupedInvoices });
      }, (err) => {
        console.error('Invoices real-time sync error:', err);
      });

      // 2. Live Payments Listener
      unsubPayments = onSnapshot(collection(db, 'organizations', orgId, 'payments'), (snapshot) => {
        const currentPayments = useStore.getState().payments;
        const updatedPayments = [...currentPayments];

        snapshot.docChanges().forEach(change => {
          const docData = change.doc.data();
          const docId = change.doc.id;

          if (change.type === 'added' || change.type === 'modified') {
            const payment: Payment = {
              id: docId,
              invoiceId: docData.invoiceId,
              clientId: docData.clientId,
              businessId: orgId || '',
              amount: Number(docData.amount ?? 0),
              currency: docData.currency || 'USD',
              status: docData.status as Payment['status'],
              method: docData.method || 'cash',
              referenceNumber: docData.referenceNumber || '',
              transactionId: docData.transactionId || '',
              paymentDate: docData.paymentDate || new Date().toISOString(),
              notes: docData.notes || '',
              attachments: docData.attachments || [],
              createdAt: docData.createdAt || new Date().toISOString(),
            };

            const idx = updatedPayments.findIndex(p => p.id === docId);
            if (idx > -1) {
              updatedPayments[idx] = payment;
            } else {
              updatedPayments.push(payment);
            }
          } else if (change.type === 'removed') {
            const idx = updatedPayments.findIndex(p => p.id === docId);
            if (idx > -1) {
              updatedPayments.splice(idx, 1);
            }
          }
        });

        const dedupedPayments = Array.from(new Map(updatedPayments.map(p => [p.id, p])).values());
        useStore.setState({ payments: dedupedPayments });
      }, (err) => {
        console.error('Payments real-time sync error:', err);
      });

      // 3. Live Templates Listener
      unsubTemplates = onSnapshot(collection(db, 'organizations', orgId, 'templates'), (snapshot) => {
        const templates: CustomTemplate[] = snapshot.docs.map(docSnap => {
          const t = docSnap.data();
          return {
            id: docSnap.id,
            name: t.templateName || t.name || 'Untitled Template',
            backgroundImage: t.assetUrl || t.backgroundImage || '',
            fieldMappings: t.fieldMappings || [],
            createdAt: t.createdAt || new Date().toISOString(),
            templateId: t.templateId || docSnap.id,
            organizationId: t.organizationId || orgId,
            userId: t.userId || user.uid,
            templateName: t.templateName || t.name || 'Untitled Template',
            assetUrl: t.assetUrl || t.backgroundImage || '',
            type: t.type || 'custom',
            status: t.status || 'active',
            updatedAt: t.updatedAt,
          };
        });
        if (templates.length > 0) {
          useStore.setState({ customTemplates: templates });
        }
      }, (err) => {
        console.warn('Templates real-time sync error (non-fatal):', err);
      });
    };

    if (activeId) {
      startListeners(activeId);
    }

    const unsubStore = useStore.subscribe((state) => {
      const nextId = state.currentBusinessId;
      if (nextId && nextId !== activeId) {
        activeId = nextId;
        startListeners(nextId);
      }
    });

    return () => {
      unsubStore();
      if (unsubInvoices) unsubInvoices();
      if (unsubPayments) unsubPayments();
      if (unsubTemplates) unsubTemplates();
    };
  }, [user, loadData]);

  // Cross-tab demo mode payment synchronization (multi-layered: mount, focus, storage events, interval, BroadcastChannel)
  useEffect(() => {
    const syncDemoPaymentsFromLocalStorage = () => {
      if (!useStore.getState().isDemoMode) return;
      
      try {
        const data = localStorage.getItem('finora_demo_portal_links');
        if (!data) return;
        const demoLinks = JSON.parse(data);
        
        const invoices = useStore.getState().invoices;
        const payments = useStore.getState().payments;
        
        for (const token in demoLinks) {
          const link = demoLinks[token];
          if (link && link.paid) {
            const invoiceId = link.invoice_id;
            const matchingInvoice = invoices.find(i => i.id === invoiceId);
            
            if (matchingInvoice && (!matchingInvoice.isPaid || matchingInvoice.status !== 'paid')) {
              useStore.getState().updateInvoice(invoiceId, {
                isPaid: true,
                status: 'paid',
                updatedAt: link.paid_at || new Date().toISOString(),
              });
            }
            
            const matchingPayment = payments.find(p => p.invoiceId === invoiceId);
            if (!matchingPayment) {
              const payment = {
                invoiceId: invoiceId,
                clientId: link.client_snapshot.id,
                businessId: link.business_snapshot.id,
                amount: link.invoice_snapshot.total,
                currency: link.settings_snapshot.currency,
                status: 'Paid' as const,
                method: 'Razorpay',
                referenceNumber: link.invoice_snapshot.invoiceNumber,
                transactionId: 'tx_' + Math.random().toString(36).substring(2, 15),
                paymentDate: link.paid_at || new Date().toISOString(),
                notes: 'Paid via public Customer Portal',
                attachments: [],
              };
              useStore.getState().addPayment(payment);
            }
          }
        }
      } catch (e) {
        console.warn('[DemoSync] Failed to sync demo payments from localStorage:', e);
      }
    };

    // 1. Run on mount
    syncDemoPaymentsFromLocalStorage();
    
    // 2. Run on window focus
    const handleFocus = () => {
      syncDemoPaymentsFromLocalStorage();
    };
    window.addEventListener('focus', handleFocus);
    
    // 3. Run on storage change (from other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'finora_demo_portal_links') {
        syncDemoPaymentsFromLocalStorage();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    // 4. Active polling check (every 1 second)
    const interval = setInterval(syncDemoPaymentsFromLocalStorage, 1000);
    
    // 5. BroadcastChannel fallback
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('finora_demo_sync');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DEMO_INVOICE_PAID') {
          syncDemoPaymentsFromLocalStorage();
        }
      };
    } catch (e) {
      console.warn('[DemoSync] BroadcastChannel not supported or failed to initialize:', e);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  return { reload: loadData, loading };
}

// ─── FIRESTORE CRUD ACTIONS ──────────────────────────────

// Helper to save profile (organization) changes to Firestore
export async function saveProfileToSupabase(userId: string, business: Partial<Business>) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const updateData: Record<string, unknown> = {};
    if (business.name !== undefined) updateData.name = business.name;
    if (business.email !== undefined) updateData.email = business.email;
    if (business.phone !== undefined) updateData.phone = business.phone;
    if (business.address !== undefined) updateData.address = business.address;
    if (business.city !== undefined) updateData.city = business.city;
    if (business.country !== undefined) updateData.country = business.country;
    if (business.taxId !== undefined) updateData.taxId = business.taxId;
    if (business.accentColor !== undefined) updateData.accentColor = business.accentColor;
    if (business.font !== undefined) updateData.font = business.font;
    if (business.footerText !== undefined) updateData.footerText = business.footerText;
    if (business.logo !== undefined) updateData.logoUrl = business.logo;
    if (business.signature !== undefined) updateData.signatureUrl = business.signature;

    updateData.updatedAt = new Date().toISOString();

    const orgRef = doc(db, 'organizations', activeOrgId);
    await updateDoc(orgRef, updateData);
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

// Helper to save client to Firestore
export async function saveClientToSupabase(userId: string, client: Omit<Client, 'id' | 'createdAt'>) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const clientId = crypto.randomUUID();
    const clientRef = doc(db, 'organizations', activeOrgId, 'clients', clientId);

    const clientDoc = {
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      country: client.country || '',
      taxId: client.taxId || null,
      notes: client.notes || null,
      currency: client.currency || 'USD',
      currencySymbol: client.currencySymbol || '$',
      createdAt: new Date().toISOString(),
    };

    await setDoc(clientRef, clientDoc);
    return { data: { id: clientId, ...clientDoc }, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function updateClientInSupabase(clientId: string, client: Partial<Client>) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const clientRef = doc(db, 'organizations', activeOrgId, 'clients', clientId);

    const updateData: Record<string, unknown> = {};
    if (client.name !== undefined) updateData.name = client.name;
    if (client.email !== undefined) updateData.email = client.email;
    if (client.phone !== undefined) updateData.phone = client.phone;
    if (client.address !== undefined) updateData.address = client.address;
    if (client.city !== undefined) updateData.city = client.city;
    if (client.country !== undefined) updateData.country = client.country;
    if (client.taxId !== undefined) updateData.taxId = client.taxId;
    if (client.notes !== undefined) updateData.notes = client.notes;
    if (client.currency !== undefined) updateData.currency = client.currency;
    if (client.currencySymbol !== undefined) updateData.currencySymbol = client.currencySymbol;

    await updateDoc(clientRef, updateData);
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

export async function deleteClientFromSupabase(clientId: string) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const clientRef = doc(db, 'organizations', activeOrgId, 'clients', clientId);
    await deleteDoc(clientRef);
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

// Helper to save invoice with Normalized Items to subcollection
export async function saveInvoiceToSupabase(userId: string, invoice: Omit<Invoice, 'id'>) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const invoiceId = crypto.randomUUID();
    const invoiceRef = doc(db, 'organizations', activeOrgId, 'invoices', invoiceId);

    // Write Invoice Master document (excluding line items to normalize)
    const invoiceDoc = {
      clientId: invoice.clientId,
      invoiceNumber: invoice.invoiceNumber,
      template: invoice.template,
      subtotal: invoice.subtotal,
      taxTotal: invoice.taxTotal,
      discountTotal: invoice.discountTotal,
      total: invoice.total,
      status: invoice.status,
      statusHistory: invoice.statusHistory || [{ status: invoice.status, timestamp: new Date().toISOString() }],
      notes: invoice.notes,
      dueDate: invoice.dueDate,
      isPaid: invoice.isPaid,
      paymentQr: invoice.paymentQR || null,
      createdAt: invoice.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(invoiceRef, invoiceDoc);

    // Normalize and Write Invoice Items to subcollection `/organizations/{orgId}/invoices/{invoiceId}/items`
    for (let index = 0; index < invoice.items.length; index++) {
      const item = invoice.items[index];
      const itemId = item.id || crypto.randomUUID();
      const itemRef = doc(db, 'organizations', activeOrgId, 'invoices', invoiceId, 'items', itemId);
      await setDoc(itemRef, {
        description: item.description || '',
        quantity: item.quantity,
        rate: item.price, // Price becomes rate on firestore for clean normalized standard schema
        taxRate: item.taxRate || 0,
        discount: item.discount || 0,
        amount: item.quantity * item.price,
        order: index,
      });
    }

    return { data: { id: invoiceId, ...invoiceDoc, items: invoice.items }, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function updateInvoiceInSupabase(invoiceId: string, invoice: Partial<Invoice>) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const invoiceRef = doc(db, 'organizations', activeOrgId, 'invoices', invoiceId);

    const updateData: Record<string, unknown> = {};
    if (invoice.status !== undefined) updateData.status = invoice.status;
    if (invoice.statusHistory !== undefined) updateData.statusHistory = invoice.statusHistory;
    if (invoice.isPaid !== undefined) updateData.isPaid = invoice.isPaid;
    if (invoice.notes !== undefined) updateData.notes = invoice.notes;
    if (invoice.subtotal !== undefined) updateData.subtotal = invoice.subtotal;
    if (invoice.taxTotal !== undefined) updateData.taxTotal = invoice.taxTotal;
    if (invoice.discountTotal !== undefined) updateData.discountTotal = invoice.discountTotal;
    if (invoice.total !== undefined) updateData.total = invoice.total;

    updateData.updatedAt = new Date().toISOString();

    await updateDoc(invoiceRef, updateData);

    // If items are modified, rewrite them in normalized items subcollection
    if (invoice.items !== undefined) {
      // 1. Delete existing items
      const itemsColRef = collection(db, 'organizations', activeOrgId, 'invoices', invoiceId, 'items');
      const itemsSnapshot = await getDocs(itemsColRef);
      for (const itemDocSnap of itemsSnapshot.docs) {
        await deleteDoc(itemDocSnap.ref);
      }

      // 2. Insert new normalized items
      for (let index = 0; index < invoice.items.length; index++) {
        const item = invoice.items[index];
        const itemId = item.id || crypto.randomUUID();
        const itemRef = doc(db, 'organizations', activeOrgId, 'invoices', invoiceId, 'items', itemId);
        await setDoc(itemRef, {
          description: item.description || '',
          quantity: item.quantity,
          rate: item.price,
          taxRate: item.taxRate || 0,
          discount: item.discount || 0,
          amount: item.quantity * item.price,
          order: index,
        });
      }
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

export async function deleteInvoiceFromSupabase(invoiceId: string) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    // Delete normalized items first
    const itemsColRef = collection(db, 'organizations', activeOrgId, 'invoices', invoiceId, 'items');
    const itemsSnapshot = await getDocs(itemsColRef);
    for (const itemDocSnap of itemsSnapshot.docs) {
      await deleteDoc(itemDocSnap.ref);
    }

    // Delete invoice master
    const invoiceRef = doc(db, 'organizations', activeOrgId, 'invoices', invoiceId);
    await deleteDoc(invoiceRef);
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

export async function saveRecurringScheduleToSupabase(userId: string, schedule: Omit<RecurringSchedule, 'id' | 'createdAt'>) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const scheduleId = crypto.randomUUID();
    const scheduleRef = doc(db, 'organizations', activeOrgId, 'recurring_schedules', scheduleId);

    const scheduleDoc = {
      clientId: schedule.clientId,
      frequency: schedule.frequency,
      startDate: schedule.startDate,
      endDate: schedule.endDate || null,
      nextGenerationDate: schedule.nextGenerationDate,
      isActive: schedule.isActive,
      autoSend: schedule.autoSend,
      invoiceTemplate: schedule.invoiceTemplate,
      createdAt: new Date().toISOString(),
    };

    await setDoc(scheduleRef, scheduleDoc);
    return { data: { id: scheduleId, ...scheduleDoc }, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function updateRecurringScheduleInSupabase(scheduleId: string, schedule: Partial<RecurringSchedule>) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const scheduleRef = doc(db, 'organizations', activeOrgId, 'recurring_schedules', scheduleId);

    const updateData: Record<string, unknown> = {};
    if (schedule.frequency !== undefined) updateData.frequency = schedule.frequency;
    if (schedule.endDate !== undefined) updateData.endDate = schedule.endDate;
    if (schedule.nextGenerationDate !== undefined) updateData.nextGenerationDate = schedule.nextGenerationDate;
    if (schedule.isActive !== undefined) updateData.isActive = schedule.isActive;
    if (schedule.autoSend !== undefined) updateData.autoSend = schedule.autoSend;
    if (schedule.invoiceTemplate !== undefined) updateData.invoiceTemplate = schedule.invoiceTemplate;

    await updateDoc(scheduleRef, updateData);
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

export async function deleteRecurringScheduleFromSupabase(scheduleId: string) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const scheduleRef = doc(db, 'organizations', activeOrgId, 'recurring_schedules', scheduleId);
    await deleteDoc(scheduleRef);
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

export async function saveSettingsToSupabase(userId: string, settings: Partial<AppSettings>) {
  try {
    const activeOrgId = useStore.getState().currentBusinessId;
    if (!activeOrgId) throw new Error('No active organization');

    const settingsRef = doc(db, 'organizations', activeOrgId, 'settings', 'current');

    const updateData: Record<string, unknown> = {};
    if (settings.theme !== undefined) updateData.theme = settings.theme;
    if (settings.currency !== undefined) updateData.currency = settings.currency;
    if (settings.currencySymbol !== undefined) updateData.currencySymbol = settings.currencySymbol;
    if (settings.invoicePrefix !== undefined) updateData.invoicePrefix = settings.invoicePrefix;
    if (settings.invoiceSuffix !== undefined) updateData.invoiceSuffix = settings.invoiceSuffix;
    if (settings.defaultTaxRate !== undefined) updateData.defaultTaxRate = settings.defaultTaxRate;
    if (settings.defaultPaymentTerms !== undefined) updateData.defaultPaymentTerms = settings.defaultPaymentTerms;
    if (settings.email !== undefined) updateData.emailSettings = settings.email;

    updateData.updatedAt = new Date().toISOString();

    await updateDoc(settingsRef, updateData);
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

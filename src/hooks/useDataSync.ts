import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/store/useStore';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { Client, Invoice, Business, RecurringSchedule, AppSettings, InvoiceItem, Product, Expense, ExpenseRule, ReminderHistory, DescriptionTemplate, DocumentItem, DocumentFolder, ActivityLog, CustomTemplate } from '@/store/useStore';

export function useDataSync() {
  const { user: originalUser } = useAuth();
  const isDemoMode = useStore((state) => state.isDemoMode);
  const user = isDemoMode ? null : originalUser;

  // Helper to obtain current active organization ID
  const getActiveOrgId = () => {
    const activeOrgId = useStore.getState().currentBusinessId || useStore.getState().businesses[0]?.id;
    if (!activeOrgId) throw new Error('No active organization selected');
    return activeOrgId;
  };

  // ─── CLIENTS ───────────────────────────────────────────────

  const addClient = useCallback(async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    if (!user) {
      return useStore.getState().addClient(clientData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const clientId = crypto.randomUUID();
      const clientRef = doc(db, 'organizations', activeOrgId, 'clients', clientId);

      const clientDoc = {
        name: clientData.name,
        businessName: clientData.businessName || '',
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        city: clientData.city || '',
        state: clientData.state || '',
        country: clientData.country || '',
        taxId: clientData.taxId || '',
        pan: clientData.pan || '',
        billingAddress: clientData.billingAddress || '',
        shippingAddress: clientData.shippingAddress || '',
        notes: clientData.notes || '',
        currency: clientData.currency || 'USD',
        currencySymbol: clientData.currencySymbol || '$',
        paymentTerms: clientData.paymentTerms || 'net30',
        status: clientData.status || 'active',
        tags: clientData.tags || [],
        profilePhoto: clientData.profilePhoto || '',
        attachments: clientData.attachments || [],
        isFavorite: !!clientData.isFavorite,
        createdAt: new Date().toISOString(),
      };

      await setDoc(clientRef, clientDoc);

      const client: Client = {
        id: clientId,
        ...clientDoc,
      };

      useStore.setState(state => ({ clients: [client, ...state.clients.filter(c => c.id !== clientId)] }));
      return clientId;
    } catch (err) {
      console.error('Error adding client:', err);
      return useStore.getState().addClient(clientData);
    }
  }, [user]);

  const updateClient = useCallback(async (id: string, clientData: Partial<Client>) => {
    useStore.getState().updateClient(id, clientData);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const clientRef = doc(db, 'organizations', activeOrgId, 'clients', id);

      const updateData: Record<string, unknown> = {};
      if (clientData.name !== undefined) updateData.name = clientData.name;
      if (clientData.businessName !== undefined) updateData.businessName = clientData.businessName;
      if (clientData.email !== undefined) updateData.email = clientData.email;
      if (clientData.phone !== undefined) updateData.phone = clientData.phone;
      if (clientData.address !== undefined) updateData.address = clientData.address;
      if (clientData.city !== undefined) updateData.city = clientData.city;
      if (clientData.state !== undefined) updateData.state = clientData.state;
      if (clientData.country !== undefined) updateData.country = clientData.country;
      if (clientData.taxId !== undefined) updateData.taxId = clientData.taxId;
      if (clientData.pan !== undefined) updateData.pan = clientData.pan;
      if (clientData.billingAddress !== undefined) updateData.billingAddress = clientData.billingAddress;
      if (clientData.shippingAddress !== undefined) updateData.shippingAddress = clientData.shippingAddress;
      if (clientData.notes !== undefined) updateData.notes = clientData.notes;
      if (clientData.currency !== undefined) updateData.currency = clientData.currency;
      if (clientData.currencySymbol !== undefined) updateData.currencySymbol = clientData.currencySymbol;
      if (clientData.paymentTerms !== undefined) updateData.paymentTerms = clientData.paymentTerms;
      if (clientData.status !== undefined) updateData.status = clientData.status;
      if (clientData.tags !== undefined) updateData.tags = clientData.tags;
      if (clientData.profilePhoto !== undefined) updateData.profilePhoto = clientData.profilePhoto;
      if (clientData.attachments !== undefined) updateData.attachments = clientData.attachments;
      if (clientData.isFavorite !== undefined) updateData.isFavorite = clientData.isFavorite;

      await updateDoc(clientRef, updateData);
    } catch (err) {
      console.error('Error updating client:', err);
    }
  }, [user]);

  const deleteClient = useCallback(async (id: string) => {
    useStore.getState().deleteClient(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const clientRef = doc(db, 'organizations', activeOrgId, 'clients', id);
      await deleteDoc(clientRef);
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  }, [user]);

  // ─── INVOICES (With Normalized Items) ───────────────────────

  const addInvoice = useCallback(async (invoiceData: Omit<Invoice, 'id'>) => {
    if (!user) {
      return useStore.getState().addInvoice(invoiceData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const invoiceId = crypto.randomUUID();
      const invoiceRef = doc(db, 'organizations', activeOrgId, 'invoices', invoiceId);

      const statusHistory = invoiceData.statusHistory || [{ status: invoiceData.status, timestamp: new Date().toISOString() }];

      // Write Invoice Master
      const invoiceDoc = {
        clientId: invoiceData.clientId,
        invoiceNumber: invoiceData.invoiceNumber,
        template: invoiceData.template,
        subtotal: invoiceData.subtotal,
        taxTotal: invoiceData.taxTotal,
        discountTotal: invoiceData.discountTotal,
        total: invoiceData.total,
        status: invoiceData.status,
        statusHistory,
        notes: invoiceData.notes || '',
        dueDate: invoiceData.dueDate,
        isPaid: invoiceData.isPaid,
        paymentQr: invoiceData.paymentQR || null,
        createdAt: invoiceData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(invoiceRef, invoiceDoc);

      // Normalize line items inside subcollection `/organizations/{orgId}/invoices/{invoiceId}/items`
      for (let index = 0; index < invoiceData.items.length; index++) {
        const item = invoiceData.items[index];
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

      const invoice: Invoice = {
        id: invoiceId,
        invoiceNumber: invoiceData.invoiceNumber,
        businessId: activeOrgId,
        clientId: invoiceData.clientId,
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        taxTotal: invoiceData.taxTotal,
        discountTotal: invoiceData.discountTotal,
        total: invoiceData.total,
        status: invoiceData.status,
        statusHistory,
        template: invoiceData.template,
        createdAt: invoiceDoc.createdAt,
        dueDate: invoiceData.dueDate,
        notes: invoiceData.notes || '',
        paymentQR: invoiceData.paymentQR || undefined,
        isPaid: invoiceData.isPaid,
      };

      useStore.setState(state => ({ invoices: [invoice, ...state.invoices.filter(i => i.id !== invoiceId)] }));
      return invoiceId;
    } catch (err) {
      console.error('Error adding invoice:', err);
      return useStore.getState().addInvoice(invoiceData);
    }
  }, [user]);

  const updateInvoice = useCallback(async (id: string, invoiceData: Partial<Invoice>) => {
    useStore.getState().updateInvoice(id, invoiceData);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const invoiceRef = doc(db, 'organizations', activeOrgId, 'invoices', id);

      const updateData: Record<string, unknown> = {};
      if (invoiceData.status !== undefined) updateData.status = invoiceData.status;
      if (invoiceData.isPaid !== undefined) updateData.isPaid = invoiceData.isPaid;
      if (invoiceData.notes !== undefined) updateData.notes = invoiceData.notes;
      if (invoiceData.subtotal !== undefined) updateData.subtotal = invoiceData.subtotal;
      if (invoiceData.taxTotal !== undefined) updateData.taxTotal = invoiceData.taxTotal;
      if (invoiceData.discountTotal !== undefined) updateData.discountTotal = invoiceData.discountTotal;
      if (invoiceData.total !== undefined) updateData.total = invoiceData.total;
      if (invoiceData.template !== undefined) updateData.template = invoiceData.template;
      if (invoiceData.paymentQR !== undefined) updateData.paymentQr = invoiceData.paymentQR;

      const updatedInvoice = useStore.getState().invoices.find(i => i.id === id);
      if (updatedInvoice?.statusHistory) {
        updateData.statusHistory = updatedInvoice.statusHistory;
      }

      updateData.updatedAt = new Date().toISOString();

      await updateDoc(invoiceRef, updateData);

      // Overwrite items in subcollection if items are modified
      if (invoiceData.items !== undefined) {
        // 1. Delete all existing items
        const itemsColRef = collection(db, 'organizations', activeOrgId, 'invoices', id, 'items');
        const itemsSnapshot = await getDocs(itemsColRef);
        for (const itemDocSnap of itemsSnapshot.docs) {
          await deleteDoc(itemDocSnap.ref);
        }

        // 2. Add new items
        for (let index = 0; index < invoiceData.items.length; index++) {
          const item = invoiceData.items[index];
          const itemId = item.id || crypto.randomUUID();
          const itemRef = doc(db, 'organizations', activeOrgId, 'invoices', id, 'items', itemId);
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
    } catch (err) {
      console.error('Error updating invoice:', err);
    }
  }, [user]);

  const deleteInvoice = useCallback(async (id: string) => {
    useStore.getState().deleteInvoice(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      
      // Delete invoice items first
      const itemsColRef = collection(db, 'organizations', activeOrgId, 'invoices', id, 'items');
      const itemsSnapshot = await getDocs(itemsColRef);
      for (const itemDocSnap of itemsSnapshot.docs) {
        await deleteDoc(itemDocSnap.ref);
      }

      // Delete invoice master
      const invoiceRef = doc(db, 'organizations', activeOrgId, 'invoices', id);
      await deleteDoc(invoiceRef);
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  }, [user]);

  const duplicateInvoice = useCallback(async (id: string) => {
    const invoice = useStore.getState().invoices.find(i => i.id === id);
    if (!invoice) return '';

    const newInvoiceNumber = useStore.getState().getNextInvoiceNumber();
    const newInvoice: Omit<Invoice, 'id'> = {
      ...invoice,
      invoiceNumber: newInvoiceNumber,
      status: 'draft',
      isPaid: false,
      createdAt: new Date().toISOString(),
      statusHistory: [{ status: 'draft' as const, timestamp: new Date().toISOString() }],
    };

    return addInvoice(newInvoice);
  }, [addInvoice]);

  // ─── BUSINESS / PROFILE ───────────────────────────────────

  const addBusiness = useCallback(async (businessData: Omit<Business, 'id'>) => {
    const id = useStore.getState().addBusiness(businessData);
    if (!user) return id;

    try {
      const activeOrgId = getActiveOrgId();
      const orgRef = doc(db, 'organizations', activeOrgId);

      const updateData = {
        name: businessData.name,
        email: businessData.email,
        phone: businessData.phone,
        address: businessData.address,
        city: businessData.city,
        country: businessData.country,
        taxId: businessData.taxId,
        accentColor: businessData.accentColor,
        font: businessData.font,
        footerText: businessData.footerText,
        logoUrl: businessData.logo || null,
        signatureUrl: businessData.signature || null,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(orgRef, updateData);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
    return id;
  }, [user]);

  const updateBusiness = useCallback(async (id: string, businessData: Partial<Business>) => {
    useStore.getState().updateBusiness(id, businessData);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const orgRef = doc(db, 'organizations', activeOrgId);

      const updateData: Record<string, unknown> = {};
      if (businessData.name !== undefined) updateData.name = businessData.name;
      if (businessData.email !== undefined) updateData.email = businessData.email;
      if (businessData.phone !== undefined) updateData.phone = businessData.phone;
      if (businessData.address !== undefined) updateData.address = businessData.address;
      if (businessData.city !== undefined) updateData.city = businessData.city;
      if (businessData.country !== undefined) updateData.country = businessData.country;
      if (businessData.taxId !== undefined) updateData.taxId = businessData.taxId;
      if (businessData.accentColor !== undefined) updateData.accentColor = businessData.accentColor;
      if (businessData.font !== undefined) updateData.font = businessData.font;
      if (businessData.footerText !== undefined) updateData.footerText = businessData.footerText;
      if (businessData.logo !== undefined) updateData.logoUrl = businessData.logo;
      if (businessData.signature !== undefined) updateData.signatureUrl = businessData.signature;

      updateData.updatedAt = new Date().toISOString();

      await updateDoc(orgRef, updateData);
    } catch (err) {
      console.error('Error updating business profile:', err);
    }
  }, [user]);

  const deleteBusiness = useCallback(async (id: string) => {
    useStore.getState().deleteBusiness(id);
  }, []);

  // ─── RECURRING SCHEDULES ──────────────────────────────────

  const addRecurringSchedule = useCallback(async (scheduleData: Omit<RecurringSchedule, 'id' | 'createdAt'>) => {
    if (!user) {
      return useStore.getState().addRecurringSchedule(scheduleData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const scheduleId = crypto.randomUUID();
      const scheduleRef = doc(db, 'organizations', activeOrgId, 'recurring_schedules', scheduleId);

      const scheduleDoc = {
        clientId: scheduleData.clientId,
        frequency: scheduleData.frequency,
        startDate: scheduleData.startDate,
        endDate: scheduleData.endDate || null,
        nextGenerationDate: scheduleData.nextGenerationDate,
        isActive: scheduleData.isActive,
        autoSend: scheduleData.autoSend,
        invoiceTemplate: scheduleData.invoiceTemplate,
        createdAt: new Date().toISOString(),
      };

      await setDoc(scheduleRef, scheduleDoc);

      const schedule: RecurringSchedule = {
        id: scheduleId,
        businessId: activeOrgId,
        ...scheduleDoc,
        endDate: scheduleDoc.endDate || undefined,
      };

      useStore.setState(state => ({
        recurringSchedules: [...(state.recurringSchedules || []).filter(s => s.id !== scheduleId), schedule],
      }));
      return scheduleId;
    } catch (err) {
      console.error('Error adding recurring schedule:', err);
      return useStore.getState().addRecurringSchedule(scheduleData);
    }
  }, [user]);

  const updateRecurringSchedule = useCallback(async (id: string, scheduleData: Partial<RecurringSchedule>) => {
    useStore.getState().updateRecurringSchedule(id, scheduleData);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const scheduleRef = doc(db, 'organizations', activeOrgId, 'recurring_schedules', id);

      const updateData: Record<string, unknown> = {};
      if (scheduleData.frequency !== undefined) updateData.frequency = scheduleData.frequency;
      if (scheduleData.endDate !== undefined) updateData.endDate = scheduleData.endDate;
      if (scheduleData.nextGenerationDate !== undefined) updateData.nextGenerationDate = scheduleData.nextGenerationDate;
      if (scheduleData.isActive !== undefined) updateData.isActive = scheduleData.isActive;
      if (scheduleData.autoSend !== undefined) updateData.autoSend = scheduleData.autoSend;
      if (scheduleData.invoiceTemplate !== undefined) updateData.invoiceTemplate = scheduleData.invoiceTemplate;

      await updateDoc(scheduleRef, updateData);
    } catch (err) {
      console.error('Error updating recurring schedule:', err);
    }
  }, [user]);

  const deleteRecurringSchedule = useCallback(async (id: string) => {
    useStore.getState().deleteRecurringSchedule(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const scheduleRef = doc(db, 'organizations', activeOrgId, 'recurring_schedules', id);
      await deleteDoc(scheduleRef);
    } catch (err) {
      console.error('Error deleting recurring schedule:', err);
    }
  }, [user]);

  // ─── PRODUCTS ──────────────────────────────────────────────

  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt'>) => {
    if (!user) {
      return useStore.getState().addProduct(productData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const productId = crypto.randomUUID();
      const productRef = doc(db, 'organizations', activeOrgId, 'products', productId);

      const productDoc = {
        name: productData.name,
        description: productData.description || '',
        sku: productData.sku || '',
        category: productData.category || '',
        price: Number(productData.price ?? 0),
        gstRate: Number(productData.gstRate ?? 18),
        hsn: productData.hsn || '',
        unit: productData.unit || 'pcs',
        isFavorite: !!productData.isFavorite,
        status: productData.status || 'active',
        createdAt: new Date().toISOString(),
      };

      await setDoc(productRef, productDoc);

      const product: Product = {
        id: productId,
        ...productDoc,
      };

      useStore.setState(state => ({ products: [product, ...(state.products || []).filter(p => p.id !== productId)] }));
      return productId;
    } catch (err) {
      console.error('Error adding product:', err);
      return useStore.getState().addProduct(productData);
    }
  }, [user]);

  const updateProduct = useCallback(async (id: string, productData: Partial<Product>) => {
    useStore.getState().updateProduct(id, productData);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const productRef = doc(db, 'organizations', activeOrgId, 'products', id);

      const updateData: Record<string, unknown> = {};
      if (productData.name !== undefined) updateData.name = productData.name;
      if (productData.description !== undefined) updateData.description = productData.description;
      if (productData.sku !== undefined) updateData.sku = productData.sku;
      if (productData.category !== undefined) updateData.category = productData.category;
      if (productData.price !== undefined) updateData.price = Number(productData.price);
      if (productData.gstRate !== undefined) updateData.gstRate = Number(productData.gstRate);
      if (productData.hsn !== undefined) updateData.hsn = productData.hsn;
      if (productData.unit !== undefined) updateData.unit = productData.unit;
      if (productData.isFavorite !== undefined) updateData.isFavorite = !!productData.isFavorite;
      if (productData.status !== undefined) updateData.status = productData.status;

      await updateDoc(productRef, updateData);
    } catch (err) {
      console.error('Error updating product:', err);
    }
  }, [user]);

  const deleteProduct = useCallback(async (id: string) => {
    useStore.getState().deleteProduct(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const productRef = doc(db, 'organizations', activeOrgId, 'products', id);
      await deleteDoc(productRef);
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  }, [user]);

  // ─── SETTINGS ─────────────────────────────────────────────

  const updateSettings = useCallback(async (settingsData: Partial<AppSettings>) => {
    useStore.getState().updateSettings(settingsData);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const settingsRef = doc(db, 'organizations', activeOrgId, 'settings', 'current');

      const updateData: Record<string, unknown> = {};
      if (settingsData.theme !== undefined) updateData.theme = settingsData.theme;
      if (settingsData.currency !== undefined) updateData.currency = settingsData.currency;
      if (settingsData.currencySymbol !== undefined) updateData.currencySymbol = settingsData.currencySymbol;
      if (settingsData.invoicePrefix !== undefined) updateData.invoicePrefix = settingsData.invoicePrefix;
      if (settingsData.invoiceSuffix !== undefined) updateData.invoiceSuffix = settingsData.invoiceSuffix;
      if (settingsData.defaultTaxRate !== undefined) updateData.defaultTaxRate = settingsData.defaultTaxRate;
      if (settingsData.defaultPaymentTerms !== undefined) updateData.defaultPaymentTerms = settingsData.defaultPaymentTerms;
      if (settingsData.email !== undefined) updateData.emailSettings = settingsData.email;

      updateData.updatedAt = new Date().toISOString();

      await updateDoc(settingsRef, updateData);
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  }, [user]);

  // ─── EXPENSES ──────────────────────────────────────────────

  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!user) {
      return useStore.getState().addExpense(expenseData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const expenseId = crypto.randomUUID();
      const expenseRef = doc(db, 'organizations', activeOrgId, 'expenses', expenseId);

      const expenseDoc = {
        vendor: expenseData.vendor,
        category: expenseData.category,
        amount: Number(expenseData.amount),
        gst: Number(expenseData.gst || 0),
        date: expenseData.date,
        paymentMethod: expenseData.paymentMethod,
        notes: expenseData.notes || '',
        isRecurring: !!expenseData.isRecurring,
        recurringInterval: expenseData.recurringInterval || '',
        tags: expenseData.tags || [],
        attachmentUrl: expenseData.attachmentUrl || '',
        isArchived: !!expenseData.isArchived,
        createdAt: new Date().toISOString(),
      };

      await setDoc(expenseRef, expenseDoc);

      const expense: Expense = {
        id: expenseId,
        businessId: activeOrgId,
        ...expenseDoc,
      };

      useStore.setState(state => ({ expenses: [expense, ...(state.expenses || []).filter(e => e.id !== expenseId)] }));
      return expenseId;
    } catch (err) {
      console.error('Error adding expense:', err);
      return useStore.getState().addExpense(expenseData);
    }
  }, [user]);

  const updateExpense = useCallback(async (id: string, expenseData: Partial<Expense>) => {
    useStore.getState().updateExpense(id, expenseData);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const expenseRef = doc(db, 'organizations', activeOrgId, 'expenses', id);

      const updateData: Record<string, unknown> = {};
      if (expenseData.vendor !== undefined) updateData.vendor = expenseData.vendor;
      if (expenseData.category !== undefined) updateData.category = expenseData.category;
      if (expenseData.amount !== undefined) updateData.amount = Number(expenseData.amount);
      if (expenseData.gst !== undefined) updateData.gst = Number(expenseData.gst);
      if (expenseData.date !== undefined) updateData.date = expenseData.date;
      if (expenseData.paymentMethod !== undefined) updateData.paymentMethod = expenseData.paymentMethod;
      if (expenseData.notes !== undefined) updateData.notes = expenseData.notes;
      if (expenseData.isRecurring !== undefined) updateData.isRecurring = !!expenseData.isRecurring;
      if (expenseData.recurringInterval !== undefined) updateData.recurringInterval = expenseData.recurringInterval;
      if (expenseData.tags !== undefined) updateData.tags = expenseData.tags;
      if (expenseData.attachmentUrl !== undefined) updateData.attachmentUrl = expenseData.attachmentUrl;
      if (expenseData.isArchived !== undefined) updateData.isArchived = !!expenseData.isArchived;

      await updateDoc(expenseRef, updateData);
    } catch (err) {
      console.error('Error updating expense:', err);
    }
  }, [user]);

  const deleteExpense = useCallback(async (id: string) => {
    useStore.getState().deleteExpense(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const expenseRef = doc(db, 'organizations', activeOrgId, 'expenses', id);
      await deleteDoc(expenseRef);
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  }, [user]);

  const archiveExpense = useCallback(async (id: string) => {
    useStore.getState().archiveExpense(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const expenseRef = doc(db, 'organizations', activeOrgId, 'expenses', id);
      await updateDoc(expenseRef, { isArchived: true });
    } catch (err) {
      console.error('Error archiving expense:', err);
    }
  }, [user]);

  // ─── EXPENSE RULES ──────────────────────────────────────────

  const addExpenseRule = useCallback(async (ruleData: Omit<ExpenseRule, 'id' | 'createdAt'>) => {
    if (!user) {
      return useStore.getState().addExpenseRule(ruleData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const ruleId = crypto.randomUUID();
      const ruleRef = doc(db, 'organizations', activeOrgId, 'expense_rules', ruleId);

      const ruleDoc = {
        keyword: ruleData.keyword,
        category: ruleData.category,
        createdAt: new Date().toISOString(),
      };

      await setDoc(ruleRef, ruleDoc);

      const rule: ExpenseRule = {
        id: ruleId,
        businessId: activeOrgId,
        ...ruleDoc,
      };

      useStore.setState(state => ({ expenseRules: [...(state.expenseRules || []).filter(r => r.id !== ruleId), rule] }));
      return ruleId;
    } catch (err) {
      console.error('Error adding expense rule:', err);
      return useStore.getState().addExpenseRule(ruleData);
    }
  }, [user]);

  const deleteExpenseRule = useCallback(async (id: string) => {
    useStore.getState().deleteExpenseRule(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const ruleRef = doc(db, 'organizations', activeOrgId, 'expense_rules', id);
      await deleteDoc(ruleRef);
    } catch (err) {
      console.error('Error deleting expense rule:', err);
    }
  }, [user]);

  // ─── REMINDERS ──────────────────────────────────────────────

  const addReminderHistory = useCallback(async (reminderData: Omit<ReminderHistory, 'id' | 'sentAt'>) => {
    if (!user) {
      return useStore.getState().addReminderHistory(reminderData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const reminderId = crypto.randomUUID();
      const reminderRef = doc(db, 'organizations', activeOrgId, 'reminders', reminderId);

      const reminderDoc = {
        invoiceId: reminderData.invoiceId,
        clientId: reminderData.clientId,
        type: reminderData.type,
        channel: reminderData.channel,
        content: reminderData.content,
        status: reminderData.status,
        sentAt: new Date().toISOString(),
      };

      await setDoc(reminderRef, reminderDoc);

      const reminder: ReminderHistory = {
        id: reminderId,
        businessId: activeOrgId,
        ...reminderDoc,
      };

      useStore.setState(state => ({ reminders: [reminder, ...(state.reminders || []).filter(r => r.id !== reminderId)] }));
      return reminderId;
    } catch (err) {
      console.error('Error adding reminder history:', err);
      return useStore.getState().addReminderHistory(reminderData);
    }
  }, [user]);

  // ─── DESCRIPTION TEMPLATES ──────────────────────────────────

  const addDescriptionTemplate = useCallback(async (templateData: Omit<DescriptionTemplate, 'id' | 'createdAt'>) => {
    if (!user) {
      return useStore.getState().addDescriptionTemplate(templateData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const templateId = crypto.randomUUID();
      const templateRef = doc(db, 'organizations', activeOrgId, 'description_templates', templateId);

      const templateDoc = {
        name: templateData.name,
        category: templateData.category,
        templateText: templateData.templateText,
        isCustom: !!templateData.isCustom,
        createdAt: new Date().toISOString(),
      };

      await setDoc(templateRef, templateDoc);

      const template: DescriptionTemplate = {
        id: templateId,
        businessId: activeOrgId,
        ...templateDoc,
      };

      useStore.setState(state => ({ descriptionTemplates: [...(state.descriptionTemplates || []).filter(t => t.id !== templateId), template] }));
      return templateId;
    } catch (err) {
      console.error('Error adding description template:', err);
      return useStore.getState().addDescriptionTemplate(templateData);
    }
  }, [user]);

  const deleteDescriptionTemplate = useCallback(async (id: string) => {
    useStore.getState().deleteDescriptionTemplate(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const templateRef = doc(db, 'organizations', activeOrgId, 'description_templates', id);
      await deleteDoc(templateRef);
    } catch (err) {
      console.error('Error deleting description template:', err);
    }
  }, [user]);

  // ─── DOCUMENTS ──────────────────────────────────────────────

  const addDocument = useCallback(async (docData: Omit<DocumentItem, 'id' | 'createdAt'>) => {
    if (!user) {
      return useStore.getState().addDocument(docData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const docId = crypto.randomUUID();
      const docRef = doc(db, 'organizations', activeOrgId, 'documents', docId);

      const docDoc = {
        name: docData.name,
        type: docData.type,
        fileUrl: docData.fileUrl,
        fileSize: Number(docData.fileSize),
        folderId: docData.folderId || '',
        isDeleted: !!docData.isDeleted,
        createdAt: new Date().toISOString(),
      };

      await setDoc(docRef, docDoc);

      const docItem: DocumentItem = {
        id: docId,
        businessId: activeOrgId,
        ...docDoc,
      };

      useStore.setState(state => ({ documents: [docItem, ...(state.documents || []).filter(d => d.id !== docId)] }));
      return docId;
    } catch (err) {
      console.error('Error adding document:', err);
      return useStore.getState().addDocument(docData);
    }
  }, [user]);

  const updateDocument = useCallback(async (id: string, docData: Partial<DocumentItem>) => {
    useStore.getState().updateDocument(id, docData);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const docRef = doc(db, 'organizations', activeOrgId, 'documents', id);

      const updateData: Record<string, unknown> = {};
      if (docData.name !== undefined) updateData.name = docData.name;
      if (docData.type !== undefined) updateData.type = docData.type;
      if (docData.fileUrl !== undefined) updateData.fileUrl = docData.fileUrl;
      if (docData.fileSize !== undefined) updateData.fileSize = Number(docData.fileSize);
      if (docData.folderId !== undefined) updateData.folderId = docData.folderId;
      if (docData.isDeleted !== undefined) updateData.isDeleted = !!docData.isDeleted;
      if (docData.deletedAt !== undefined) updateData.deletedAt = docData.deletedAt;

      await updateDoc(docRef, updateData);
    } catch (err) {
      console.error('Error updating document:', err);
    }
  }, [user]);

  const deleteDocument = useCallback(async (id: string) => {
    useStore.getState().deleteDocument(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const docRef = doc(db, 'organizations', activeOrgId, 'documents', id);
      await updateDoc(docRef, { isDeleted: true, deletedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  }, [user]);

  const restoreDocument = useCallback(async (id: string) => {
    useStore.getState().restoreDocument(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const docRef = doc(db, 'organizations', activeOrgId, 'documents', id);
      await updateDoc(docRef, { isDeleted: false, deletedAt: null });
    } catch (err) {
      console.error('Error restoring document:', err);
    }
  }, [user]);

  // ─── DOCUMENT FOLDERS ───────────────────────────────────────

  const addDocumentFolder = useCallback(async (folderData: Omit<DocumentFolder, 'id' | 'createdAt'>) => {
    if (!user) {
      return useStore.getState().addDocumentFolder(folderData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const folderId = crypto.randomUUID();
      const folderRef = doc(db, 'organizations', activeOrgId, 'document_folders', folderId);

      const folderDoc = {
        name: folderData.name,
        createdAt: new Date().toISOString(),
      };

      await setDoc(folderRef, folderDoc);

      const folder: DocumentFolder = {
        id: folderId,
        businessId: activeOrgId,
        ...folderDoc,
      };

      useStore.setState(state => ({ documentFolders: [...(state.documentFolders || []).filter(f => f.id !== folderId), folder] }));
      return folderId;
    } catch (err) {
      console.error('Error adding document folder:', err);
      return useStore.getState().addDocumentFolder(folderData);
    }
  }, [user]);

  const deleteDocumentFolder = useCallback(async (id: string) => {
    useStore.getState().deleteDocumentFolder(id);
    if (!user) return;

    try {
      const activeOrgId = getActiveOrgId();
      const folderRef = doc(db, 'organizations', activeOrgId, 'document_folders', id);
      await deleteDoc(folderRef);
    } catch (err) {
      console.error('Error deleting document folder:', err);
    }
  }, [user]);

  // ─── ACTIVITY LOGS ──────────────────────────────────────────

  const addActivityLog = useCallback(async (logData: Omit<ActivityLog, 'id' | 'createdAt'>) => {
    if (!user) {
      return useStore.getState().addActivityLog(logData);
    }

    try {
      const activeOrgId = getActiveOrgId();
      const logId = crypto.randomUUID();
      const logRef = doc(db, 'organizations', activeOrgId, 'activity_logs', logId);

      const logDoc = {
        type: logData.type,
        label: logData.label,
        detail: logData.detail,
        createdAt: new Date().toISOString(),
      };

      await setDoc(logRef, logDoc);

      const logItem: ActivityLog = {
        id: logId,
        businessId: activeOrgId,
        ...logDoc,
      };

      useStore.setState(state => ({ activityLogs: [logItem, ...(state.activityLogs || []).filter(a => a.id !== logId)] }));
      return logId;
    } catch (err) {
      console.error('Error adding activity log:', err);
      return useStore.getState().addActivityLog(logData);
    }
  }, [user]);

  // ─── CUSTOM INVOICE TEMPLATES ───────────────────────────────

  const addCustomTemplate = useCallback(
    async (
      templateData: Omit<CustomTemplate, 'id' | 'createdAt'>,
      file?: File
    ): Promise<string> => {
      const templateId = crypto.randomUUID();
      const activeOrgId = getActiveOrgId();
      let assetUrl = templateData.backgroundImage || '';

      // Upload template asset to Firebase Storage if a file is supplied
      if (user && file && storage) {
        try {
          const fileExt = file.name.split('.').pop() || 'png';
          const filePath = `organizations/${activeOrgId}/templates/${templateId}.${fileExt}`;
          const storageRef = ref(storage, filePath);
          await uploadBytes(storageRef, file);
          assetUrl = await getDownloadURL(storageRef);
        } catch (uploadErr) {
          console.warn('Firebase Storage upload failed, keeping base64/dataUrl:', uploadErr);
        }
      }

      const newTemplate: CustomTemplate = {
        id: templateId,
        templateId,
        organizationId: activeOrgId,
        userId: user?.uid || 'anonymous',
        name: templateData.name,
        templateName: templateData.name,
        backgroundImage: assetUrl || templateData.backgroundImage,
        assetUrl: assetUrl || templateData.backgroundImage,
        fieldMappings: templateData.fieldMappings,
        type: templateData.type || 'custom',
        status: templateData.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (user) {
        try {
          const templateRef = doc(db, 'organizations', activeOrgId, 'templates', templateId);
          await setDoc(templateRef, {
            templateId,
            organizationId: activeOrgId,
            userId: user.uid,
            templateName: newTemplate.name,
            assetUrl: newTemplate.backgroundImage,
            fieldMappings: newTemplate.fieldMappings,
            type: newTemplate.type,
            status: newTemplate.status,
            createdAt: newTemplate.createdAt,
            updatedAt: newTemplate.updatedAt,
          });
        } catch (dbErr) {
          console.error('Error persisting custom template to Firestore:', dbErr);
        }
      }

      useStore.setState((state) => ({
        customTemplates: [...(state.customTemplates || []).filter((t) => t.id !== templateId), newTemplate],
      }));

      return templateId;
    },
    [user]
  );

  const updateCustomTemplate = useCallback(
    async (
      id: string,
      updates: Partial<CustomTemplate>,
      file?: File
    ): Promise<void> => {
      const activeOrgId = getActiveOrgId();
      let assetUrl = updates.backgroundImage;

      if (user && file && storage) {
        try {
          const fileExt = file.name.split('.').pop() || 'png';
          const filePath = `organizations/${activeOrgId}/templates/${id}.${fileExt}`;
          const storageRef = ref(storage, filePath);
          await uploadBytes(storageRef, file);
          assetUrl = await getDownloadURL(storageRef);
        } catch (uploadErr) {
          console.warn('Firebase Storage upload failed during update:', uploadErr);
        }
      }

      const payload: Partial<CustomTemplate> = {
        ...updates,
        ...(assetUrl ? { backgroundImage: assetUrl, assetUrl } : {}),
        ...(updates.name ? { templateName: updates.name } : {}),
        updatedAt: new Date().toISOString(),
      };

      if (user) {
        try {
          const templateRef = doc(db, 'organizations', activeOrgId, 'templates', id);
          const docUpdates: Record<string, any> = {
            updatedAt: payload.updatedAt,
          };
          if (payload.name) docUpdates.templateName = payload.name;
          if (payload.backgroundImage) docUpdates.assetUrl = payload.backgroundImage;
          if (payload.fieldMappings) docUpdates.fieldMappings = payload.fieldMappings;
          if (payload.status) docUpdates.status = payload.status;
          await updateDoc(templateRef, docUpdates);
        } catch (err) {
          console.error('Error updating template in Firestore:', err);
        }
      }

      useStore.getState().updateCustomTemplate(id, payload);
    },
    [user]
  );

  const deleteCustomTemplate = useCallback(
    async (id: string): Promise<void> => {
      if (user) {
        try {
          const activeOrgId = getActiveOrgId();
          const templateRef = doc(db, 'organizations', activeOrgId, 'templates', id);
          await deleteDoc(templateRef);
        } catch (err) {
          console.error('Error deleting template from Firestore:', err);
        }
      }
      useStore.getState().deleteCustomTemplate(id);
    },
    [user]
  );

  return {
    addClient,
    updateClient,
    deleteClient,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    duplicateInvoice,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    addRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule,
    addProduct,
    updateProduct,
    deleteProduct,
    updateSettings,

    // Custom Templates
    addCustomTemplate,
    updateCustomTemplate,
    deleteCustomTemplate,

    // Part 4 Added Sync Exports
    addExpense,
    updateExpense,
    deleteExpense,
    archiveExpense,
    addExpenseRule,
    deleteExpenseRule,
    addReminderHistory,
    addDescriptionTemplate,
    deleteDescriptionTemplate,
    addDocument,
    updateDocument,
    deleteDocument,
    restoreDocument,
    addDocumentFolder,
    deleteDocumentFolder,
    addActivityLog,
  };
}

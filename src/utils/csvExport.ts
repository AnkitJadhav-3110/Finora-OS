import { Invoice, Client, Business, AppSettings } from '@/store/useStore';

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) {
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportInvoicesToCSV(
  invoices: Invoice[], 
  clients: Client[], 
  settings: AppSettings
) {
  const data = invoices.map(invoice => {
    const client = clients.find(c => c.id === invoice.clientId);
    return {
      'Invoice Number': invoice.invoiceNumber,
      'Client Name': client?.name || 'Unknown',
      'Client Email': client?.email || '',
      'Status': invoice.status,
      'Subtotal': invoice.subtotal.toFixed(2),
      'Tax': invoice.taxTotal.toFixed(2),
      'Discount': invoice.discountTotal.toFixed(2),
      'Total': invoice.total.toFixed(2),
      'Currency': settings.currency,
      'Created Date': new Date(invoice.createdAt).toLocaleDateString(),
      'Due Date': new Date(invoice.dueDate).toLocaleDateString(),
      'Is Paid': invoice.isPaid ? 'Yes' : 'No',
      'Template': invoice.template,
      'Notes': invoice.notes || '',
      'Items Count': invoice.items.length,
    };
  });

  exportToCSV(data, `invoices-${new Date().toISOString().split('T')[0]}`);
}

export function exportClientsToCSV(clients: Client[], invoices: Invoice[]) {
  const data = clients.map(client => {
    const clientInvoices = invoices.filter(i => i.clientId === client.id);
    const totalRevenue = clientInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.total, 0);
    const outstandingAmount = clientInvoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + i.total, 0);

    return {
      'Name': client.name,
      'Email': client.email,
      'Phone': client.phone || '',
      'Address': client.address || '',
      'City': client.city || '',
      'Country': client.country || '',
      'Tax ID': client.taxId || '',
      'Total Invoices': clientInvoices.length,
      'Total Revenue': totalRevenue.toFixed(2),
      'Outstanding Amount': outstandingAmount.toFixed(2),
      'Notes': client.notes || '',
      'Created Date': new Date(client.createdAt).toLocaleDateString(),
    };
  });

  exportToCSV(data, `clients-${new Date().toISOString().split('T')[0]}`);
}

import { Helmet } from 'react-helmet-async';
import { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Tag, 
  Star, 
  FileDown, 
  FileUp, 
  ShoppingBag, 
  Sparkles, 
  LayoutGrid, 
  List, 
  Layers, 
  Coins, 
  BarChart, 
  Percent, 
  FileText,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { useStore, Product } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function Products() {
  const { products = [], settings } = useStore();
  const { addProduct, updateProduct, deleteProduct } = useDataSync();

  // Search & filter states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Dialog and edit states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    price: 0,
    gstRate: 18,
    hsn: '',
    unit: 'pcs',
    isFavorite: false,
    status: 'active' as 'active' | 'inactive',
  });

  // Unique categories list
  const categories = useMemo(() => {
    const catsSet = new Set<string>();
    products.forEach(p => {
      if (p.category) catsSet.add(p.category);
    });
    return Array.from(catsSet);
  }, [products]);

  // Catalog filtering
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesFavorite = !showFavoritesOnly || !!p.isFavorite;

      return matchesSearch && matchesCategory && matchesFavorite;
    });
  }, [products, search, categoryFilter, showFavoritesOnly]);

  // Catalog general statistics
  const catalogMetrics = useMemo(() => {
    const totalCount = products.length;
    const servicesCount = products.filter(p => p.category?.toLowerCase() === 'services' || p.category?.toLowerCase() === 'service').length;
    const itemsCount = totalCount - servicesCount;
    const avgPrice = products.length > 0 ? products.reduce((sum, p) => sum + Number(p.price || 0), 0) / totalCount : 0;

    return {
      totalCount,
      servicesCount,
      itemsCount,
      avgPrice,
    };
  }, [products]);

  const handleOpenDialog = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        name: prod.name,
        description: prod.description || '',
        sku: prod.sku || '',
        category: prod.category || 'services',
        price: Number(prod.price || 0),
        gstRate: Number(prod.gstRate ?? 18),
        hsn: prod.hsn || '',
        unit: prod.unit || 'pcs',
        isFavorite: !!prod.isFavorite,
        status: (prod.status || 'active') as 'active' | 'inactive',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        sku: '',
        category: 'services',
        price: 0,
        gstRate: 18,
        hsn: '',
        unit: 'pcs',
        isFavorite: false,
        status: 'active',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Product/Service name is required');
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
        toast.success('Product/Service updated successfully');
      } else {
        await addProduct(formData);
        toast.success('Product/Service cataloged successfully');
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast.error('Error saving item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      toast.success('Catalog item deleted successfully');
    } catch {
      toast.error('Failed to delete catalog item');
    }
  };

  const toggleFavorite = async (prod: Product, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      const current = !!prod.isFavorite;
      await updateProduct(prod.id, { isFavorite: !current });
      toast.success(current ? 'Removed from favorites' : 'Added to favorites');
    } catch {
      toast.error('Failed to toggle favorite');
    }
  };

  const formatCurrency = (amount: number) => {
    return `${settings.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.error('No items to export');
      return;
    }

    const headers = 'Name,SKU,Category,Description,Unit Price,GST Rate,HSN Code,Billing Unit,Status\n';
    const csvContent = products.map(p => {
      return `"${p.name}","${p.sku || ''}","${p.category || ''}","${p.description || ''}",${p.price || 0},${p.gstRate || 0},"${p.hsn || ''}","${p.unit || 'pcs'}","${p.status || 'active'}"`;
    }).join('\n');

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'invoicepro_products_catalog.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Catalog database exported to CSV');
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length <= 1) {
        toast.error('CSV is empty or missing data rows');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
      let importedCount = 0;
      let duplicateCount = 0;

      for (let idx = 1; idx < lines.length; idx++) {
        const rowText = lines[idx];
        const cols: string[] = [];
        let inQuotes = false;
        let currentField = '';
        
        for (let i = 0; i < rowText.length; i++) {
          const char = rowText[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        cols.push(currentField.trim());

        const nameIdx = headers.indexOf('name');
        const skuIdx = headers.indexOf('sku');
        const priceIdx = headers.indexOf('unit price') !== -1 ? headers.indexOf('unit price') : headers.indexOf('price');
        const gstIdx = headers.indexOf('gst rate') !== -1 ? headers.indexOf('gst rate') : headers.indexOf('gstrate');
        const hsnIdx = headers.indexOf('hsn code') !== -1 ? headers.indexOf('hsn code') : headers.indexOf('hsn');
        const unitIdx = headers.indexOf('billing unit') !== -1 ? headers.indexOf('billing unit') : headers.indexOf('unit');
        const catIdx = headers.indexOf('category');
        const descIdx = headers.indexOf('description');

        const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : '';
        const sku = skuIdx !== -1 && cols[skuIdx] ? cols[skuIdx] : `sku_${Date.now()}_${idx}`;

        if (!name) continue;

        // Check SKU Duplicate
        const isDuplicate = products.some(p => p.sku?.toLowerCase() === sku.toLowerCase());
        if (isDuplicate) {
          duplicateCount++;
          continue;
        }

        const newProdData = {
          name,
          sku,
          category: catIdx !== -1 ? cols[catIdx] : 'services',
          description: descIdx !== -1 ? cols[descIdx] : '',
          price: priceIdx !== -1 ? Number(cols[priceIdx]) || 0 : 0,
          gstRate: gstIdx !== -1 ? Number(cols[gstIdx]) || 18 : 18,
          hsn: hsnIdx !== -1 ? cols[hsnIdx] : '',
          unit: unitIdx !== -1 ? cols[unitIdx] : 'pcs',
          isFavorite: false,
          status: 'active' as const,
        };

        await addProduct(newProdData);
        importedCount++;
      }

      toast.success(`Catalog import complete!`, {
        description: `Successfully cataloged ${importedCount} items. Skipped ${duplicateCount} matching SKU duplicates.`
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <>
      <Helmet>
        <title>Products & Services Catalog | Finora</title>
        <meta name="description" content="Manage billing catalog items, products, services, default tax rates, HSN taxation codes, and hourly prices." />
      </Helmet>

      <div className="space-y-6 animate-slide-up pb-10">
        
        {/* Page Header */}
        <PageHeader
          title="Products & Services"
          description="Standardized price book, unit rates, tax codes, and service deliverables"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCSVImport}
                accept=".csv"
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 text-xs h-9">
                <FileUp className="w-4 h-4" />
                Import CSV
              </Button>
              <Button variant="outline" onClick={handleExportCSV} className="gap-2 text-xs h-9">
                <FileDown className="w-4 h-4" />
                Export CSV
              </Button>
              <Button onClick={() => handleOpenDialog()} className="gap-2 text-xs h-9">
                <Plus className="w-4 h-4" />
                Add Product / Service
              </Button>
            </div>
          }
        />

        {/* Catalog KPI statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border shadow-sm bg-card">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Catalog Items</span>
              <Boxes className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-black mt-2 text-foreground">{catalogMetrics.totalCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Managed products and services</p>
          </Card>

          <Card className="p-4 border shadow-sm bg-card">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Hourly Services</span>
              <Coins className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black mt-2 text-foreground">{products.filter(p => p.unit === 'hrs' || p.unit === 'hours').length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Time-based billing assets</p>
          </Card>

          <Card className="p-4 border shadow-sm bg-card">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Average Price</span>
              <BarChart className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black mt-2 text-foreground">{formatCurrency(catalogMetrics.avgPrice)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Average unit sale value</p>
          </Card>

          <Card className="p-4 border shadow-sm bg-card">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Tax-Exempt Assets</span>
              <Percent className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black mt-2 text-foreground">{products.filter(p => p.gstRate === 0).length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Assets billed at 0% tax/GST</p>
          </Card>
        </div>

        {/* Filters Toolbar */}
        <Card className="p-4 shadow-sm border">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search catalog by name, SKU, category or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>

            {/* Select Filter and Star Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] h-10 text-xs bg-muted/40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="subscriptions">Subscriptions</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  {categories.filter(c => !['services', 'hardware', 'software', 'subscriptions', 'consulting'].includes(c.toLowerCase())).map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={showFavoritesOnly ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFavoritesOnly(p => !p)}
                className="gap-1.5 h-10 text-xs bg-muted/40"
              >
                <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                Starred
              </Button>

              <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
                <Button
                  variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('card')}
                  title="Card layout"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                  title="Table layout"
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

          </div>
        </Card>

        {/* Catalog Contents render */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Catalog is empty"
            description="Onboard items or service descriptions you bill for regularly to save keystrokes during invoice creation."
            action={{
              label: 'Add First Item',
              onClick: () => handleOpenDialog(),
            }}
          />
        ) : viewMode === 'card' ? (
          
          /* Cards Grid layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(prod => (
              <Card key={prod.id} className="shadow-sm hover:shadow-md transition-all duration-200 border hover:border-primary/30 relative flex flex-col justify-between">
                
                {/* VIP Star toggle */}
                <button
                  onClick={(e) => toggleFavorite(prod, e)}
                  className="absolute top-4 right-14 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors z-10"
                >
                  <Star className={`w-4 h-4 ${prod.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                </button>

                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground bg-muted border px-1.5 py-0.5 rounded">
                        {prod.category || 'Service'}
                      </span>
                      <h3 className="font-extrabold text-foreground mt-2 leading-snug truncate pr-6 text-sm">{prod.name}</h3>
                      {prod.sku && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">SKU: {prod.sku}</p>}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(prod)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(prod.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {prod.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed italic">
                      "{prod.description}"
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-dashed text-xs text-muted-foreground">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">HSN / SAC Code</p>
                      <p className="font-semibold text-foreground mt-0.5">{prod.hsn || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Default GST / Tax</p>
                      <p className="font-semibold text-foreground mt-0.5">{prod.gstRate ?? 18}%</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-muted/30 border-t flex justify-between items-center rounded-b-xl">
                  <span className="text-xs font-semibold text-muted-foreground">Rate / Unit</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-extrabold text-foreground">{formatCurrency(Number(prod.price || 0))}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">/ {prod.unit || 'pcs'}</span>
                  </div>
                </div>

              </Card>
            ))}
          </div>
        ) : (
          
          /* Table layout */
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="table-header-gradient-border">
                    <tr className="table-header-gradient-border border-b bg-muted/50 text-muted-foreground font-semibold">
                      <th className="p-3 w-10 text-center">Fav</th>
                      <th className="p-3">Item / Service Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">HSN / SAC Code</th>
                      <th className="p-3 text-center">Billing Unit</th>
                      <th className="p-3 text-right">Default Tax</th>
                      <th className="p-3 text-right">Unit Rate</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(prod => (
                      <tr key={prod.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-center">
                          <button onClick={(e) => toggleFavorite(prod, e)} className="text-muted-foreground hover:text-amber-500">
                            <Star className={`w-3.5 h-3.5 ${prod.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                          </button>
                        </td>
                        <td className="p-3 font-extrabold text-foreground">
                          {prod.name}
                          {prod.description && (
                            <span className="text-[10px] font-medium text-muted-foreground block font-normal italic mt-0.5 truncate max-w-xs">
                              {prod.description}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{prod.sku || '—'}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-muted/40">
                            {prod.category || 'Services'}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{prod.hsn || '—'}</td>
                        <td className="p-3 text-center text-muted-foreground uppercase font-bold">{prod.unit || 'pcs'}</td>
                        <td className="p-3 text-right text-muted-foreground font-semibold">{prod.gstRate ?? 18}%</td>
                        <td className="p-3 text-right font-black text-foreground">{formatCurrency(Number(prod.price || 0))}</td>
                        <td className="p-3 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(prod)}>
                                <Pencil className="w-3.5 h-3.5 mr-2" />
                                Edit Item
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(prod.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Delete Item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* dialogs */}

      {/* Add/Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 font-bold">
              <ShoppingBag className="w-4 h-4 text-primary" />
              {editingProduct ? 'Edit Catalog Item' : 'Add Item to Catalog'}
            </DialogTitle>
            <DialogDescription>
              Create or modify standard product catalogs or service descriptions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            
            {/* Catalog item name */}
            <div className="space-y-1.5">
              <Label htmlFor="item-name">Item Name / Service Label</Label>
              <Input
                id="item-name"
                required
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Software Consulting Services"
              />
            </div>

            {/* Price and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="item-price">Unit Rate / Price</Label>
                <Input
                  id="item-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-unit">Billing Unit</Label>
                <Select value={formData.unit} onValueChange={(val) => setFormData(p => ({ ...p, unit: val }))}>
                  <SelectTrigger id="item-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">pcs (Pieces)</SelectItem>
                    <SelectItem value="hrs">hrs (Hours)</SelectItem>
                    <SelectItem value="days">days (Days)</SelectItem>
                    <SelectItem value="months">months (Months)</SelectItem>
                    <SelectItem value="lot">lot (Lot)</SelectItem>
                    <SelectItem value="kg">kg (Kilograms)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SKU and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="item-sku">SKU Code / Part ID</Label>
                <Input
                  id="item-sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(p => ({ ...p, sku: e.target.value }))}
                  placeholder="e.g. CONSULT-01"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-category">Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData(p => ({ ...p, category: val }))}>
                  <SelectTrigger id="item-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="subscriptions">Subscriptions</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Taxation: GST rates & HSN code */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="item-gst">Default GST / Tax Rate %</Label>
                <Select value={String(formData.gstRate)} onValueChange={(val) => setFormData(p => ({ ...p, gstRate: Number(val) }))}>
                  <SelectTrigger id="item-gst">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exempt)</SelectItem>
                    <SelectItem value="5">5% (CGST+SGST)</SelectItem>
                    <SelectItem value="12">12% (CGST+SGST)</SelectItem>
                    <SelectItem value="18">18% (Standard GST)</SelectItem>
                    <SelectItem value="28">28% (Luxury)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-hsn">HSN / SAC Code</Label>
                <Input
                  id="item-hsn"
                  value={formData.hsn}
                  onChange={(e) => setFormData(p => ({ ...p, hsn: e.target.value }))}
                  placeholder="e.g. 998311 (IT Services)"
                />
              </div>
            </div>

            {/* Description and optional favorite trigger */}
            <div className="space-y-1.5">
              <Label htmlFor="item-desc">Service Description / Specs</Label>
              <Textarea
                id="item-desc"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Specifications of the item or deliverables included..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-fav"
                checked={formData.isFavorite}
                onChange={(e) => setFormData(p => ({ ...p, isFavorite: e.target.checked }))}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <Label htmlFor="is-fav" className="cursor-pointer font-medium text-xs text-muted-foreground select-none">
                Star this item (Add to Quick Billing library)
              </Label>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto h-9 text-xs">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} className="w-full sm:w-auto h-9 text-xs">
              {editingProduct ? 'Save Item Specs' : 'Add to Catalog'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

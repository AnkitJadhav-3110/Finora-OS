import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Users,
  Building2,
  Settings,
  FolderOpen,
  PenTool,
  Briefcase,
  RefreshCw,
  Package,
  Sun,
  Moon,
  Plus,
  Compass,
  CornerDownLeft,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CommandPalette() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { invoices = [], clients = [], products = [], settings, toggleTheme } = useStore();

  // Listen for Ctrl+K / Cmd+K and custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, []);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Command palette item types
  interface CommandItem {
    id: string;
    title: string;
    subtitle?: string;
    category: 'Actions' | 'Invoices' | 'Clients' | 'Products';
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
  }

  // Compile items list
  const items = useMemo(() => {
    const list: CommandItem[] = [];

    // Static Navigation & Actions
    const actions: CommandItem[] = [
      {
        id: 'act-create-invoice',
        title: 'Create New Invoice',
        subtitle: 'Draft a new client invoice from scratch',
        category: 'Actions',
        icon: Plus,
        action: () => navigate('/invoices/create'),
      },
      {
        id: 'act-invoice-history',
        title: 'View Invoice History',
        subtitle: 'Browse sent, paid, and overdue drafts',
        category: 'Actions',
        icon: FolderOpen,
        action: () => navigate('/invoices/history'),
      },
      {
        id: 'act-clients',
        title: 'Manage Clients CRM',
        subtitle: 'View, import, and organize client accounts',
        category: 'Actions',
        icon: Users,
        action: () => navigate('/clients'),
      },
      {
        id: 'act-products',
        title: 'Products & Services Catalog',
        subtitle: 'Add standard rates, units, and GST parameters',
        category: 'Actions',
        icon: Package,
        action: () => navigate('/products'),
      },
      {
        id: 'act-business',
        title: 'Business Profiles Settings',
        subtitle: 'Configure company information, logo and signature',
        category: 'Actions',
        icon: Building2,
        action: () => navigate('/business'),
      },
      {
        id: 'act-recurring',
        title: 'Manage Recurring Invoices',
        subtitle: 'Automate weekly/monthly invoice distributions',
        category: 'Actions',
        icon: RefreshCw,
        action: () => navigate('/recurring'),
      },
      {
        id: 'act-templates',
        title: 'Template Customizer',
        subtitle: 'Design bespoke visual themes and styles',
        category: 'Actions',
        icon: PenTool,
        action: () => navigate('/templates'),
      },
      {
        id: 'act-tools',
        title: 'Business Tools Sandbox',
        subtitle: 'Access currency converter and tax calculators',
        category: 'Actions',
        icon: Briefcase,
        action: () => navigate('/tools'),
      },
      {
        id: 'act-theme',
        title: `Switch Theme to ${settings.theme === 'dark' ? 'Light' : 'Dark'}`,
        subtitle: 'Toggle global color palette preference',
        category: 'Actions',
        icon: settings.theme === 'dark' ? Sun : Moon,
        action: () => toggleTheme(),
      },
      {
        id: 'act-settings',
        title: 'Application Preferences',
        subtitle: 'Default parameters, payment terms, and settings',
        category: 'Actions',
        icon: Settings,
        action: () => navigate('/settings'),
      },
    ];
    list.push(...actions);

    // Invoices list
    invoices.forEach((inv) => {
      const client = clients.find((c) => c.id === inv.clientId);
      list.push({
        id: `invoice-${inv.id}`,
        title: `Invoice ${inv.invoiceNumber}`,
        subtitle: `To: ${client?.name || 'Unknown Client'} • Amount: ${settings.currencySymbol}${Number(inv.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} • Status: ${inv.status.toUpperCase()}`,
        category: 'Invoices',
        icon: FileText,
        action: () => navigate(`/invoices/create?edit=${inv.id}`),
      });
    });

    // Clients list
    clients.forEach((cli) => {
      list.push({
        id: `client-${cli.id}`,
        title: cli.name,
        subtitle: `Email: ${cli.email || 'No email'} • Phone: ${cli.phone || 'No phone'} • Category: ${cli.category || 'Client'}`,
        category: 'Clients',
        icon: Users,
        action: () => navigate(`/clients`), // Go to clients section
      });
    });

    // Products list
    products.forEach((p) => {
      list.push({
        id: `product-${p.id}`,
        title: p.name,
        subtitle: `SKU: ${p.sku || 'No SKU'} • Price: ${settings.currencySymbol}${Number(p.price || 0)}/${p.unit || 'pcs'} • GST: ${p.gstRate ?? 18}%`,
        category: 'Products',
        icon: Package,
        action: () => navigate('/products'),
      });
    });

    return list;
  }, [invoices, clients, products, settings, navigate, toggleTheme]);

  // Fuzzy filter based on search input
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8); // Return top static shortcuts by default

    const cleanedQuery = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(cleanedQuery) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(cleanedQuery)) ||
        item.category.toLowerCase().includes(cleanedQuery)
    );
  }, [items, query]);

  // Handle arrow navigation and triggers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        setIsOpen(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleItemClick = (item: CommandItem) => {
    item.action();
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Search keyboard prompt in header could listen here */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 max-w-2xl border bg-card shadow-2xl overflow-hidden rounded-xl">
          <DialogTitle className="sr-only">Command Palette</DialogTitle>
          <DialogDescription className="sr-only">
            Search for invoices, clients, actions, and navigate quickly across Finora OS.
          </DialogDescription>
          
          {/* Header Search Field */}
          <div className="flex items-center border-b px-4 py-3 bg-muted/10">
            <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search invoices, clients, catalog items or command actions..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-9 bg-transparent text-foreground placeholder:text-muted-foreground w-full text-sm"
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <Badge variant="secondary" className="text-[10px] font-mono tracking-widest px-1.5 py-0.5 shrink-0 select-none">
              ESC
            </Badge>
          </div>

          {/* Results Scroller */}
          <ScrollArea className="max-h-[380px] p-2">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Compass className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
                <p className="text-sm font-semibold">No catalog match found</p>
                <p className="text-xs mt-1">Try another search query or check spelling</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left p-3 rounded-lg flex items-start gap-3.5 transition-all text-xs ${
                        isSelected
                          ? 'bg-primary/10 text-primary border-l-2 border-primary pl-2.5'
                          : 'hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-md shrink-0 ${
                        isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-bold truncate text-sm ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}>
                            {item.title}
                          </p>
                          <Badge variant="outline" className={`text-[8px] uppercase font-mono tracking-widest shrink-0 py-0 px-1.5 ${
                            isSelected ? 'border-primary/40 bg-primary/5 text-primary' : ''
                          }`}>
                            {item.category}
                          </Badge>
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 shrink-0 text-primary/70 font-mono text-[9px] mt-1 pr-1.5">
                          <span>Select</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer controls prompt */}
          <div className="p-3 bg-muted/40 border-t flex justify-between items-center text-[10px] text-muted-foreground font-semibold px-4 select-none">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="border bg-background px-1 py-0.5 rounded font-mono">↑↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="border bg-background px-1 py-0.5 rounded font-mono">Enter</kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="border bg-background px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
                or
                <kbd className="border bg-background px-1.5 py-0.5 rounded font-mono">Ctrl+K</kbd>
                to toggle
              </span>
            </div>
            <span>Finora Omnibar</span>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}
export { CommandPalette };

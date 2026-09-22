import { useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Moon,
  Sun,
  Menu,
  Bell,
  Clock,
  AlertCircle,
  FileText,
  Sparkles,
  Receipt,
  LogOut,
  Search,
  Plus,
  ChevronDown,
  Building2,
  Check,
  ChevronRight,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/contexts/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderProps {
  onMenuToggle: () => void;
}

interface BreadcrumbItem {
  label: string;
  path?: string;
}

function getBreadcrumbs(pathname: string, search: string): BreadcrumbItem[] {
  if (pathname === '/dashboard') {
    return [{ label: 'Overview' }, { label: 'Dashboard' }];
  }
  if (pathname === '/invoices/create') {
    return [
      { label: 'Sales', path: '/invoices/history' },
      { label: 'Invoices', path: '/invoices/history' },
      { label: 'Create Invoice' },
    ];
  }
  if (pathname === '/invoices/history') {
    if (search.includes('view=payments')) {
      return [{ label: 'Finance' }, { label: 'Payments' }];
    }
    return [{ label: 'Sales' }, { label: 'Invoices' }];
  }
  if (pathname === '/clients') {
    return [{ label: 'Sales' }, { label: 'Clients' }];
  }
  if (pathname === '/products') {
    return [{ label: 'Sales' }, { label: 'Products & Services' }];
  }
  if (pathname === '/recurring') {
    return [{ label: 'Sales' }, { label: 'Recurring' }];
  }
  if (pathname === '/expenses') {
    return [{ label: 'Finance' }, { label: 'Expenses' }];
  }
  if (pathname === '/reports') {
    return [{ label: 'Finance' }, { label: 'Reports' }];
  }
  if (pathname === '/documents') {
    return [{ label: 'Workspace' }, { label: 'Documents' }];
  }
  if (pathname === '/templates') {
    return [{ label: 'Workspace' }, { label: 'Templates' }];
  }
  if (pathname === '/business') {
    return [{ label: 'Workspace' }, { label: 'Business Profile' }];
  }
  if (pathname === '/tools') {
    return [{ label: 'Automation' }, { label: 'Business Tools' }];
  }
  if (pathname === '/enterprise') {
    return [{ label: 'Platform' }, { label: 'Enterprise Hub' }];
  }
  if (pathname === '/settings') {
    if (search.includes('tab=subscription')) {
      return [{ label: 'Platform' }, { label: 'Billing & Plans' }];
    }
    if (search.includes('tab=emails')) {
      return [{ label: 'Platform' }, { label: 'Email Previews' }];
    }
    return [{ label: 'Platform' }, { label: 'Settings' }];
  }
  return [{ label: 'Finora OS' }, { label: 'Overview' }];
}

export function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    settings,
    toggleTheme,
    invoices,
    clients,
    businesses = [],
    currentBusinessId,
    setCurrentBusiness,
    notifications: dbNotifications = [],
    markNotificationRead,
    deleteNotification,
    subscription,
  } = useStore();
  const { user, signOut } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const breadcrumbs = useMemo(() => {
    return getBreadcrumbs(location.pathname, location.search);
  }, [location.pathname, location.search]);

  const activeBusiness = useMemo(() => {
    return businesses.find((b) => b.id === currentBusinessId) || businesses[0];
  }, [businesses, currentBusinessId]);

  const userInitials = useMemo(() => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'FN';
  }, [user]);

  // Combined notifications (Real-time overdue/pending + database notifications)
  const combinedNotifications = useMemo(() => {
    const items: Array<{
      id: string;
      isDb?: boolean;
      type: string;
      title: string;
      message: string;
      isRead: boolean;
      createdAt: string;
      amount?: number;
    }> = [];

    const now = new Date();
    invoices.forEach((invoice) => {
      if (invoice.isPaid || invoice.status === 'paid') return;

      const client = clients.find((c) => c.id === invoice.clientId);
      const dueDate = new Date(invoice.dueDate);
      const isOverdue = dueDate < now;

      items.push({
        id: `invoice_${invoice.id}`,
        isDb: false,
        type: isOverdue ? 'overdue' : 'pending',
        title: isOverdue ? 'Invoice Overdue' : 'Payment Pending',
        message: `${invoice.invoiceNumber} for ${settings.currencySymbol}${invoice.total.toLocaleString()} is ${
          isOverdue ? 'overdue' : 'pending'
        } (${client?.name || 'Client'})`,
        isRead: false,
        createdAt: invoice.createdAt,
        amount: invoice.total,
      });
    });

    dbNotifications.forEach((notif) => {
      items.push({
        id: notif.id,
        isDb: true,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
      });
    });

    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [invoices, clients, dbNotifications, settings.currencySymbol]);

  const unreadCount = useMemo(() => {
    return combinedNotifications.filter((n) => !n.isRead).length;
  }, [combinedNotifications]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleNotificationClick = (notif: { id: string; isDb?: boolean; isRead: boolean }) => {
    if (notif.isDb && !notif.isRead) {
      markNotificationRead(notif.id);
    }
    setNotificationsOpen(false);
    navigate('/invoices/history');
  };

  const triggerCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <header className="h-16 border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu + Context-Aware Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Context-aware Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium min-w-0"
          >
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={idx} className="flex items-center gap-1.5 min-w-0">
                  {idx > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  )}
                  {crumb.path && !isLast ? (
                    <Link
                      to={crumb.path}
                      className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-none"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={`truncate max-w-[150px] sm:max-w-none ${
                        isLast
                          ? 'font-semibold text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {crumb.label}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Center / Global Search Trigger */}
        <div className="hidden md:flex items-center flex-1 max-w-sm justify-center px-2">
          <button
            type="button"
            onClick={triggerCommandPalette}
            className="w-full flex items-center justify-between h-9 px-3 rounded-lg border border-border bg-surface/80 hover:bg-surface-hover text-muted-foreground hover:text-foreground text-xs transition-colors shadow-xs group cursor-pointer"
            aria-label="Open command palette search"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
              <span className="truncate">Search invoices, clients, actions...</span>
            </div>
            <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border/80 shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={triggerCommandPalette}
            className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* Quick Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-8 gap-1.5 px-2.5 sm:px-3 font-semibold text-xs rounded-lg shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New</span>
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border shadow-md">
              <DropdownMenuItem
                onClick={() => navigate('/invoices/create')}
                className="cursor-pointer text-xs font-medium py-2"
              >
                <FileText className="w-4 h-4 mr-2 text-primary" />
                Create Invoice
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/clients')}
                className="cursor-pointer text-xs font-medium py-2"
              >
                <Users className="w-4 h-4 mr-2 text-emerald-500" />
                New Client
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/expenses')}
                className="cursor-pointer text-xs font-medium py-2"
              >
                <Receipt className="w-4 h-4 mr-2 text-amber-500" />
                Record Expense
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Organization Switcher (if businesses exist) */}
          {businesses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden lg:flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-medium text-foreground transition-colors shadow-xs cursor-pointer max-w-[160px]"
                  aria-label="Switch Organization"
                >
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{activeBusiness?.name || 'Organization'}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border-border shadow-md">
                <div className="px-2.5 py-1.5 text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Organization
                </div>
                {businesses.map((biz) => {
                  const isCurrent = (activeBusiness?.id === biz.id);
                  return (
                    <DropdownMenuItem
                      key={biz.id}
                      onClick={() => setCurrentBusiness(biz.id)}
                      className="cursor-pointer text-xs font-medium flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => navigate('/business')}
                  className="cursor-pointer text-xs font-medium py-2 text-primary"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Manage Organizations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* System Status Indicator (Subtle pill) */}
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground bg-surface border border-border/80 cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px]">Synced</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs py-1 px-2">
              Cloud synchronization active & operational
            </TooltipContent>
          </Tooltip>

          {/* Notification Bell */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute 1.5 top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 p-0 bg-popover border-border shadow-xl" align="end">
              <div className="p-3.5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-primary hover:bg-primary/10"
                    onClick={() => {
                      combinedNotifications.forEach((n) => {
                        if (n.isDb && !n.isRead) markNotificationRead(n.id);
                      });
                    }}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-80">
                {combinedNotifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No pending notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {combinedNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`w-full p-3.5 text-left transition-colors flex items-start justify-between gap-2.5 ${
                          notification.isRead ? 'bg-transparent opacity-80' : 'bg-primary/5 font-medium'
                        }`}
                      >
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className="flex-1 text-left min-w-0 flex gap-2.5 cursor-pointer"
                        >
                          <div
                            className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                              notification.type === 'overdue' || notification.type === 'payment_failed'
                                ? 'bg-destructive/10 text-destructive'
                                : notification.type === 'invoice_paid' || notification.type === 'subscription_renewed'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {notification.type === 'overdue' || notification.type === 'payment_failed' ? (
                              <AlertCircle className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">
                              {notification.title}
                            </p>
                            <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug break-words line-clamp-2">
                              {notification.message}
                            </p>
                            <span className="text-[10px] text-muted-foreground/75 block mt-1">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                        </button>

                        {notification.isDb && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            &times;
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-2.5 border-t border-border bg-muted/30">
                <Button
                  variant="outline"
                  className="w-full text-xs h-8"
                  size="sm"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate('/invoices/history');
                  }}
                >
                  View Invoice History
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme Toggle (Dark / Light) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
            aria-label="Toggle theme"
            title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-warning" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>

          {/* User Profile / Avatar Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-hover transition-colors outline-none cursor-pointer"
                aria-label="User profile and organization menu"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                  {userInitials}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-semibold leading-tight text-foreground truncate max-w-[110px]">
                    {activeBusiness?.name || 'Workspace'}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-none capitalize mt-0.5">
                    {subscription?.plan || 'Free'} Plan
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border shadow-lg p-1.5">
              <div className="px-2.5 py-2 border-b border-border/80 mb-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.email || 'user@finora.os'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 capitalize bg-primary/10 text-primary border-primary/20"
                  >
                    {subscription?.plan || 'Free'} Tier
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">Online</span>
                </div>
              </div>

              <DropdownMenuItem
                onClick={() => navigate('/business')}
                className="cursor-pointer text-xs font-medium py-1.5"
              >
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                Business Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/settings?tab=subscription')}
                className="cursor-pointer text-xs font-medium py-1.5"
              >
                <Sparkles className="w-4 h-4 mr-2 text-warning" />
                Billing & Upgrades
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/settings')}
                className="cursor-pointer text-xs font-medium py-1.5"
              >
                <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-border/70" />

              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-xs font-medium py-1.5 text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2 text-destructive" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

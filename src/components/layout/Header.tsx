import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Menu, Bell, Clock, AlertCircle, FileText, Sparkles, Receipt, LogOut } from 'lucide-react';
import { BrandWordmark } from '@/components/BrandWordmark';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/contexts/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/invoices/create': 'Create Invoice',
  '/invoices/history': 'Invoice History',
  '/recurring': 'Recurring Invoices',
  '/clients': 'Clients',
  '/products': 'Products & Services',
  '/business': 'Business',
  '/expenses': 'Expenses',
  '/reports': 'Reports & Analytics',
  '/documents': 'Document Center',
  '/templates': 'Template Editor',
  '/tools': 'Business Tools',
  '/enterprise': 'Enterprise Hub',
  '/settings': 'Settings',
};

export function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    settings, 
    toggleTheme, 
    invoices, 
    clients,
    notifications: dbNotifications = [],
    markNotificationRead,
    deleteNotification,
    subscription
  } = useStore();
  const { signOut } = useAuth();
  const title = pageTitles[location.pathname] || 'Finora';
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
    invoices.forEach(invoice => {
      if (invoice.isPaid || invoice.status === 'paid') return;
      
      const client = clients.find(c => c.id === invoice.clientId);
      const dueDate = new Date(invoice.dueDate);
      const isOverdue = dueDate < now;
      
      items.push({
        id: `invoice_${invoice.id}`,
        isDb: false,
        type: isOverdue ? 'overdue' : 'pending',
        title: isOverdue ? 'Invoice Overdue' : 'Invoice Payment Pending',
        message: `${invoice.invoiceNumber} for ${settings.currencySymbol}${invoice.total.toLocaleString()} is ${isOverdue ? 'overdue' : 'pending'} (${client?.name || 'Unknown Client'})`,
        isRead: false,
        createdAt: invoice.createdAt,
        amount: invoice.total,
      });
    });

    // Add database-driven alerts
    dbNotifications.forEach(notif => {
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

    // Sort by newest first
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, clients, dbNotifications, settings.currencySymbol]);

  const unreadCount = useMemo(() => {
    return combinedNotifications.filter(n => !n.isRead).length;
  }, [combinedNotifications]);

  const formatCurrency = (amount: number) => {
    return `${settings.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNotificationClick = (notif: { id: string; isDb?: boolean; isRead: boolean }) => {
    if (notif.isDb) {
      if (!notif.isRead) {
        markNotificationRead(notif.id);
      }
    }
    setNotificationsOpen(false);
    navigate('/invoices/history');
  };

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          {/* Finora Branding */}
          <button
            onClick={() => navigate('/dashboard')}
            className="group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
            aria-label="Go to dashboard"
          >
            <BrandWordmark withLogo withTagline size="md" className="group-hover:opacity-90 transition-opacity" />
          </button>

          {/* Page Title - Desktop */}
          <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-border">
            <h1 className="text-base font-medium text-muted-foreground">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Subscription Tier Badge */}
          {subscription && (
            <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-xs capitalize font-medium border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="w-3.5 h-3.5 mr-0.5" />
              {subscription.plan} Plan
            </Badge>
          )}

          {/* Notifications */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 p-0" align="end">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-8 text-primary hover:bg-primary/5"
                    onClick={() => {
                      combinedNotifications.forEach(n => {
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
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {combinedNotifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`w-full p-4 text-left transition-colors flex items-start justify-between gap-2 ${
                          notification.isRead ? 'bg-transparent opacity-85' : 'bg-primary/5 font-medium'
                        }`}
                      >
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className="flex-1 text-left min-w-0 flex gap-3"
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${
                            notification.type === 'overdue' || notification.type === 'payment_failed'
                              ? 'bg-destructive/10 text-destructive' 
                              : notification.type === 'invoice_paid' || notification.type === 'subscription_renewed'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {notification.type === 'overdue' || notification.type === 'payment_failed' ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {notification.title}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 break-words">
                              {notification.message}
                            </p>
                            <span className="text-[10px] text-muted-foreground block mt-1">
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
              <div className="p-3 border-t border-border">
                <Button 
                  variant="outline" 
                  className="w-full text-xs" 
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

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-lg"
            aria-label="Toggle theme"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* Sign Out */}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="rounded-lg"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

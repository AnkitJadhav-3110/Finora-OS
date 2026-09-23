import { useState, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  RefreshCw,
  Receipt,
  CreditCard,
  BarChart3,
  Files,
  PenTool,
  Building2,
  Briefcase,
  Sparkles,
  ShieldCheck,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AppLogo } from '@/components/AppLogo';
import { BrandWordmark } from '@/components/BrandWordmark';
import { HelpSupportModal } from './HelpSupportModal';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

/**
 * Finora OS - Category-Based Information Architecture
 * Phase 1 Redesign Specification
 */
const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'sales',
    title: 'Sales',
    items: [
      { id: 'invoices', label: 'Invoices', path: '/invoices/history', icon: FileText },
      { id: 'clients', label: 'Clients', path: '/clients', icon: Users },
      { id: 'products', label: 'Products & Services', path: '/products', icon: Package },
      { id: 'recurring', label: 'Recurring', path: '/recurring', icon: RefreshCw },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    items: [
      { id: 'expenses', label: 'Expenses', path: '/expenses', icon: Receipt },
      { id: 'payments', label: 'Payments', path: '/invoices/history?view=payments', icon: CreditCard },
      { id: 'reports', label: 'Reports', path: '/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'workspace',
    title: 'Workspace',
    items: [
      { id: 'documents', label: 'Documents', path: '/documents', icon: Files },
      { id: 'templates', label: 'Templates', path: '/templates', icon: PenTool },
      { id: 'business', label: 'Business', path: '/business', icon: Building2 },
    ],
  },
  {
    id: 'automation',
    title: 'Automation',
    items: [
      { id: 'tools', label: 'Business Tools', path: '/tools', icon: Briefcase },
    ],
  },
  {
    id: 'platform',
    title: 'Platform',
    items: [
      { id: 'billing', label: 'Billing & Plans', path: '/settings?tab=subscription', icon: Sparkles },
      { id: 'enterprise', label: 'Enterprise', path: '/enterprise', icon: ShieldCheck },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  const handleLogoClick = () => {
    navigate('/dashboard');
    onMobileClose?.();
  };

  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Desktop Persistent Sidebar */}
      <aside
        id="finora-desktop-sidebar"
        className={cn(
          "fixed left-0 top-0 z-50 h-screen flex flex-col",
          "bg-surface-deep/95 backdrop-blur-xl border-r border-border/70 shadow-xs",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hidden lg:flex select-none",
          collapsed ? "lg:w-[68px]" : "lg:w-64"
        )}
      >
        <SidebarInner
          collapsed={collapsed}
          onToggle={onToggle}
          onLogoClick={handleLogoClick}
          onNavClick={handleNavClick}
          onOpenHelp={() => setHelpOpen(true)}
          showToggle
        />
      </aside>

      {/* Mobile Drawer Sidebar */}
      <aside
        id="finora-mobile-sidebar"
        aria-label="Mobile Navigation"
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-72 flex flex-col",
          "bg-surface border-r border-border shadow-2xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden select-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarInner
          collapsed={false}
          onToggle={onToggle}
          onLogoClick={handleLogoClick}
          onNavClick={handleNavClick}
          onOpenHelp={() => setHelpOpen(true)}
          showMobileClose
          onMobileClose={onMobileClose}
        />
      </aside>

      {/* Central Help & Support Dialog */}
      <HelpSupportModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

interface SidebarInnerProps {
  collapsed: boolean;
  onToggle: () => void;
  onLogoClick: () => void;
  onNavClick: () => void;
  onOpenHelp: () => void;
  showToggle?: boolean;
  showMobileClose?: boolean;
  onMobileClose?: () => void;
}

function SidebarInner({
  collapsed,
  onToggle,
  onLogoClick,
  onNavClick,
  onOpenHelp,
  showToggle,
  showMobileClose,
  onMobileClose,
}: SidebarInnerProps) {
  const location = useLocation();

  // Route matching logic
  const isItemActive = useCallback(
    (itemPath: string) => {
      const currentUrl = location.pathname + location.search;

      if (itemPath.includes('?')) {
        return currentUrl === itemPath;
      }

      if (itemPath === '/invoices/history') {
        return (
          location.pathname === '/invoices/history' &&
          !location.search.includes('view=payments')
        );
      }

      if (itemPath === '/settings') {
        return (
          location.pathname === '/settings' &&
          !location.search.includes('tab=subscription') &&
          !location.search.includes('tab=emails')
        );
      }

      return location.pathname === itemPath;
    },
    [location.pathname, location.search]
  );

  return (
    <>
      {/* Brand Header */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-border/80 px-4 flex-shrink-0",
          collapsed ? "justify-center px-2" : "justify-between"
        )}
      >
        <button
          onClick={onLogoClick}
          className="transition-all duration-150 cursor-pointer hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg text-left"
          aria-label="Finora OS Dashboard"
        >
          {collapsed ? (
            <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center shadow-xs flex-shrink-0">
              <AppLogo className="w-6 h-6" />
            </div>
          ) : (
            <BrandWordmark withLogo withTagline size="md" />
          )}
        </button>

        {showMobileClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg"
            aria-label="Close navigation drawer"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Quick Action: Create Invoice */}
      <div className={cn("px-3 pt-3 pb-1 flex-shrink-0", collapsed && "px-2 pt-2.5")}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to="/invoices/create"
              onClick={onNavClick}
              className={cn(
                "group relative flex items-center rounded-xl transition-all duration-200 select-none font-semibold",
                "gradient-primary text-white shadow-sm hover:brightness-110 hover:shadow-[0_0_20px_-3px_rgba(91,140,255,0.45)] border border-white/10 active:scale-[0.98]",
                collapsed
                  ? "w-10 h-10 mx-auto justify-center"
                  : "w-full px-3 py-2 justify-center gap-2 text-xs"
              )}
              aria-label="Create New Invoice"
            >
              <Plus
                className={cn(
                  "transition-transform duration-200 group-hover:rotate-90",
                  collapsed ? "w-4 h-4" : "w-3.5 h-3.5"
                )}
              />
              {!collapsed && (
                <span className="font-semibold text-[13px] tracking-tight">Create Invoice</span>
              )}
            </Link>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent
              side="right"
              sideOffset={12}
              className="font-semibold gradient-primary text-white border-0 shadow-md text-xs py-1 px-2.5"
            >
              Create Invoice
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Category-Based Navigation List */}
      <nav
        className="sidebar-scroll flex-1 py-2 px-3 overflow-y-auto space-y-4 focus:outline-none"
        aria-label="Main Navigation Categories"
      >
        {NAVIGATION_GROUPS.map((group) => {
          return (
            <div key={group.id} className="space-y-0.5">
              {/* Category Header */}
              {!collapsed ? (
                <div className="px-2 pt-1 pb-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                  {group.title}
                </div>
              ) : (
                <div className="h-px bg-border/40 my-2 mx-1" />
              )}

              {/* Category Items */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isItemActive(item.path);
                  const Icon = item.icon;

                  if (collapsed) {
                    return (
                      <Tooltip key={item.id} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.path}
                            onClick={onNavClick}
                            className={cn(
                              "flex items-center justify-center rounded-xl transition-all duration-200 select-none",
                              "w-10 h-10 mx-auto no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                              active
                                ? "bg-primary/15 text-primary font-semibold shadow-xs border border-primary/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                            )}
                            aria-label={`${item.label} (${group.title})`}
                          >
                            <Icon
                              className={cn(
                                "w-4 h-4 transition-transform duration-200 group-hover:scale-110",
                                active ? "text-primary filter drop-shadow-[0_0_6px_rgba(91,140,255,0.5)]" : "text-muted-foreground group-hover:text-foreground"
                              )}
                              aria-hidden="true"
                            />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          sideOffset={12}
                          className="flex items-center gap-2 bg-popover text-popover-foreground border border-border/80 shadow-md py-1.5 px-2.5 text-xs"
                        >
                          <span className="font-semibold">{item.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-mono tracking-wider">
                            {group.title}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={onNavClick}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all duration-200 group select-none relative",
                        "font-medium text-[13px] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        active
                          ? "bg-gradient-to-r from-primary/15 via-primary/[0.08] to-transparent text-foreground font-semibold border border-primary/25 shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-105",
                          active ? "text-primary filter drop-shadow-[0_0_6px_rgba(91,140,255,0.45)]" : "text-muted-foreground/80 group-hover:text-foreground"
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                      {active && (
                        <span
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(91,140,255,0.9)] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Pinned Bottom Section: Settings & Help/Support */}
      <div className="p-3 border-t border-border/70 flex-shrink-0 bg-surface-deep/90 space-y-1">
        {/* Settings */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                onClick={onNavClick}
                className={cn(
                  "flex items-center justify-center rounded-xl transition-all duration-200 w-10 h-10 mx-auto",
                  isItemActive('/settings')
                    ? "bg-primary/15 text-primary font-semibold shadow-xs border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                )}
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="text-xs">
              Settings
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/settings"
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all duration-200 font-medium text-[13px]",
              isItemActive('/settings')
                ? "bg-gradient-to-r from-primary/15 via-primary/[0.08] to-transparent text-foreground font-semibold border border-primary/25 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
            )}
          >
            <Settings className={cn("w-4 h-4 shrink-0", isItemActive('/settings') ? "text-primary filter drop-shadow-[0_0_6px_rgba(91,140,255,0.4)]" : "")} />
            <span className="truncate">Settings</span>
            {isItemActive('/settings') && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(91,140,255,0.9)] shrink-0" aria-hidden="true" />
            )}
          </Link>
        )}

        {/* Help & Support */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onOpenHelp}
                className="flex items-center justify-center rounded-lg transition-all duration-150 w-10 h-10 mx-auto text-muted-foreground hover:text-foreground hover:bg-surface-hover/80 cursor-pointer"
                aria-label="Help & Support"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="text-xs">
              Help & Support
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={onOpenHelp}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-all duration-150 font-medium text-[13px] text-muted-foreground hover:text-foreground hover:bg-surface-hover/80 cursor-pointer text-left"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">Help & Support</span>
          </button>
        )}

        {/* Collapse / Expand Toggle Button (Desktop Only) */}
        {showToggle && (
          <div className="pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className={cn(
                "w-full flex items-center transition-colors duration-150 h-8 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover",
                collapsed ? "justify-center px-0" : "justify-start px-2 gap-2"
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse Sidebar</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  RefreshCw,
  Users,
  Package,
  Building2,
  Receipt,
  BarChart3,
  Files,
  PenTool,
  Mail,
  Briefcase,
  CreditCard,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AppLogo } from '@/components/AppLogo';
import { BrandWordmark } from '@/components/BrandWordmark';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  isPrimaryAction?: boolean;
}

export interface NavGroup {
  id: string;
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

/**
 * Standard Information Architecture for Finora OS
 * Strict 2-level hierarchy: Category -> Module Link
 */
const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    collapsible: false,
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'invoicing',
    title: 'Invoicing',
    collapsible: true,
    items: [
      { id: 'create-invoice', label: 'Create Invoice', path: '/invoices/create', icon: PlusCircle, isPrimaryAction: true },
      { id: 'invoice-history', label: 'Invoice History', path: '/invoices/history', icon: FileText },
      { id: 'recurring', label: 'Recurring', path: '/recurring', icon: RefreshCw },
    ],
  },
  {
    id: 'business',
    title: 'Business',
    collapsible: true,
    items: [
      { id: 'clients', label: 'Clients', path: '/clients', icon: Users },
      { id: 'products', label: 'Products & Services', path: '/products', icon: Package },
      { id: 'business-profile', label: 'Business', path: '/business', icon: Building2 },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    collapsible: true,
    items: [
      { id: 'expenses', label: 'Expenses', path: '/expenses', icon: Receipt },
      { id: 'reports', label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'workspace',
    title: 'Workspace',
    collapsible: true,
    items: [
      { id: 'documents', label: 'Document Center', path: '/documents', icon: Files },
      { id: 'templates', label: 'Template Editor', path: '/templates', icon: PenTool },
      { id: 'email-branding', label: 'Email Branding', path: '/settings?tab=emails', icon: Mail },
      { id: 'tools', label: 'Business Tools', path: '/tools', icon: Briefcase },
    ],
  },
  {
    id: 'growth',
    title: 'Growth',
    collapsible: true,
    items: [
      { id: 'saas-billing', label: 'SaaS Billing', path: '/settings?tab=subscription', icon: CreditCard },
      { id: 'enterprise', label: 'Enterprise Hub', path: '/enterprise', icon: ShieldCheck },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    collapsible: false,
    items: [
      { id: 'settings', label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

const ALL_COLLAPSIBLE_GROUP_IDS = NAVIGATION_GROUPS.filter(g => g.collapsible).map(g => g.id);
const STORAGE_KEY = 'finora_sidebar_expanded_groups_v2';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();

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
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Desktop Persistent Sidebar */}
      <aside
        id="finora-desktop-sidebar"
        className={cn(
          "fixed left-0 top-0 z-50 h-screen flex flex-col",
          "bg-card border-r border-border shadow-xs",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "hidden lg:flex",
          collapsed ? "lg:w-[68px]" : "lg:w-64"
        )}
      >
        <SidebarContent 
          collapsed={collapsed} 
          onToggle={onToggle} 
          onLogoClick={handleLogoClick}
          onNavClick={handleNavClick}
          showToggle
        />
      </aside>

      {/* Mobile Drawer Sidebar */}
      <aside
        id="finora-mobile-sidebar"
        aria-label="Mobile Navigation"
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-72 flex flex-col",
          "bg-card border-r border-border shadow-2xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent 
          collapsed={false} 
          onToggle={onToggle} 
          onLogoClick={handleLogoClick}
          onNavClick={handleNavClick}
          showMobileClose
          onMobileClose={onMobileClose}
        />
      </aside>
    </>
  );
}

interface SidebarContentProps {
  collapsed: boolean;
  onToggle: () => void;
  onLogoClick: () => void;
  onNavClick: () => void;
  showToggle?: boolean;
  showMobileClose?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({ 
  collapsed, 
  onToggle, 
  onLogoClick, 
  onNavClick,
  showToggle,
  showMobileClose,
  onMobileClose 
}: SidebarContentProps) {
  const location = useLocation();

  // Route matching helper
  const isItemActive = useCallback((itemPath: string) => {
    if (itemPath.includes('?')) {
      return (location.pathname + location.search) === itemPath;
    }
    if (itemPath === '/settings') {
      return location.pathname === '/settings' && 
        !location.search.includes('tab=emails') && 
        !location.search.includes('tab=subscription');
    }
    return location.pathname === itemPath;
  }, [location.pathname, location.search]);

  // Find active group ID based on current route
  const activeGroupId = useMemo(() => {
    for (const group of NAVIGATION_GROUPS) {
      for (const item of group.items) {
        if (isItemActive(item.path)) {
          return group.id;
        }
      }
    }
    return null;
  }, [isItemActive]);

  // Persisted state of expanded groups
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    // Default to having all collapsible categories open for high discoverability
    return ALL_COLLAPSIBLE_GROUP_IDS;
  });

  // Auto-expand the category of the currently active route
  useEffect(() => {
    if (activeGroupId && NAVIGATION_GROUPS.find(g => g.id === activeGroupId)?.collapsible) {
      setExpandedGroups(prev => {
        if (!prev.includes(activeGroupId)) {
          const updated = [...prev, activeGroupId];
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // Ignore
          }
          return updated;
        }
        return prev;
      });
    }
  }, [activeGroupId]);

  // Toggle single category
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <>
      {/* Brand Header */}
      <div 
        className={cn(
          "h-16 flex items-center border-b border-border/80 px-3.5 flex-shrink-0",
          collapsed ? "justify-center px-2" : "justify-between"
        )}
      >
        <button 
          onClick={onLogoClick}
          className={cn(
            "transition-all duration-200 cursor-pointer",
            "hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg",
          )}
          aria-label="Finora OS Home"
        >
          {collapsed ? (
            <div className="w-10 h-10 rounded-xl bg-card border border-border/80 flex items-center justify-center shadow-xs flex-shrink-0 overflow-hidden">
              <AppLogo className="w-8 h-8" />
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
            className="text-muted-foreground hover:text-foreground hover:bg-accent/60 h-8 w-8 rounded-lg"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Primary Action Button: "Create Invoice" */}
      <div className={cn("px-3 pt-3 pb-1.5 flex-shrink-0", collapsed && "px-2 pt-2.5")}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to="/invoices/create"
              onClick={onNavClick}
              className={cn(
                "group relative flex items-center rounded-lg transition-all duration-150 ease-in-out select-none",
                "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
                "shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                collapsed
                  ? "w-10 h-10 mx-auto justify-center"
                  : "w-full px-3 py-2 justify-center gap-2 font-semibold text-xs tracking-wide"
              )}
              aria-label="Create New Invoice"
            >
              <Plus className={cn("transition-transform duration-200 group-hover:rotate-90", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && (
                <span className="font-semibold text-[13px]">Create Invoice</span>
              )}
            </Link>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent 
              side="right" 
              sideOffset={12} 
              className="font-semibold bg-primary text-primary-foreground border-0 shadow-md"
            >
              Create Invoice
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Navigation Groups Container */}
      <nav 
        className="sidebar-scroll flex-1 py-2 px-2.5 overflow-y-auto space-y-3 focus:outline-none"
        aria-label="Main Navigation"
      >
        {NAVIGATION_GROUPS.map((group, groupIdx) => {
          const isCollapsible = group.collapsible !== false;
          const isExpanded = !isCollapsible || expandedGroups.includes(group.id);
          const hasActiveChild = group.items.some(item => isItemActive(item.path));

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Collapsed Mode Separator */}
              {collapsed ? (
                groupIdx > 0 && <div className="h-px bg-border/50 my-2 mx-1.5" />
              ) : (
                /* Expanded Mode Category Header */
                <div className="pt-1 pb-0.5">
                  {isCollapsible ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`nav-group-${group.id}`}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1 rounded-md",
                        "text-[10.5px] font-semibold tracking-wider text-muted-foreground/70 uppercase select-none",
                        "hover:text-foreground hover:bg-accent/40 transition-colors duration-150 cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 group/header"
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{group.title}</span>
                        {/* Active dot indicator if section is collapsed but contains current route */}
                        {!isExpanded && hasActiveChild && (
                          <span 
                            className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" 
                            title="Active page inside"
                          />
                        )}
                      </div>
                      <ChevronRight 
                        className={cn(
                          "w-3 h-3 text-muted-foreground/50 transition-transform duration-200 group-hover/header:text-foreground",
                          isExpanded && "rotate-90"
                        )} 
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <div className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground/50 uppercase select-none">
                      {group.title}
                    </div>
                  )}
                </div>
              )}

              {/* Group Items */}
              {collapsed ? (
                <div className="space-y-1">
                  {group.items.map(item => (
                    <CollapsedNavItem
                      key={item.id}
                      item={item}
                      groupTitle={group.title}
                      isActive={isItemActive(item.path)}
                      onNavClick={onNavClick}
                    />
                  ))}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      id={`nav-group-${group.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden space-y-0.5"
                    >
                      {group.items.map(item => (
                        <ExpandedNavItem
                          key={item.id}
                          item={item}
                          isActive={isItemActive(item.path)}
                          isSubmenu={isCollapsible}
                          onNavClick={onNavClick}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse/Expand Footer Toggle (Desktop Only) */}
      {showToggle && (
        <div className="p-2.5 border-t border-border/70 flex-shrink-0 bg-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "w-full flex items-center transition-colors duration-150 h-8 text-xs font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-accent/60",
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
    </>
  );
}

/**
 * Single Nav Item for Expanded Sidebar (Level 2)
 */
function ExpandedNavItem({
  item,
  isActive,
  isSubmenu,
  onNavClick,
}: {
  item: NavItem;
  isActive: boolean;
  isSubmenu: boolean;
  onNavClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onNavClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg transition-all duration-150 group relative select-none",
        "font-medium text-[13px] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        isSubmenu ? "pl-3 pr-2.5 py-1.5" : "px-2.5 py-1.5",
        isActive
          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent"
      )}
    >
      <Icon 
        className={cn(
          "w-4 h-4 flex-shrink-0 transition-transform duration-150 ease-out group-hover:scale-105",
          isActive ? "text-primary-foreground" : "text-muted-foreground/75 group-hover:text-foreground"
        )} 
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>

      {/* Subtle indicator pip for active nested item */}
      {isActive && (
        <span 
          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/90 shrink-0" 
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

/**
 * Single Nav Item for Collapsed Sidebar (Icon-Only Mode with Tooltip)
 */
function CollapsedNavItem({
  item,
  groupTitle,
  isActive,
  onNavClick,
}: {
  item: NavItem;
  groupTitle: string;
  isActive: boolean;
  onNavClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          to={item.path}
          onClick={onNavClick}
          className={cn(
            "flex items-center justify-center rounded-lg transition-all duration-150 select-none",
            "w-10 h-10 mx-auto no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group",
            isActive
              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          )}
          aria-label={`${item.label} (${groupTitle})`}
        >
          <Icon 
            className={cn(
              "w-4 h-4 transition-transform duration-150 ease-out group-hover:scale-110",
              isActive ? "text-primary-foreground" : "text-muted-foreground/80 group-hover:text-foreground"
            )} 
            aria-hidden="true"
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent 
        side="right" 
        sideOffset={12}
        className="flex items-center gap-2 bg-popover text-popover-foreground border border-border/80 shadow-md py-1.5 px-2.5 text-xs font-medium"
      >
        <span className="font-semibold">{item.label}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono uppercase tracking-wider">
          {groupTitle}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Briefcase, 
  Target, 
  CheckSquare, 
  Users, 
  FileSpreadsheet, 
  DollarSign, 
  FileText, 
  FolderOpen,
  UserCircle,
  CreditCard,
  Archive,
  CalendarDays,
  Receipt,
  Search,
  AlertCircle,
  Shield,
  Mail,
  Menu
} from 'lucide-react';

import { usePermissions } from '../lib/AuthorizationService';

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    <img src="/logo.jpg" alt="INDO TECH" style={{ height: '32px', width: 'auto', borderRadius: '4px' }} />
  </div>
);

const navGroups = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ]
  },
  {
    title: 'PLANNING',
    items: [
      { name: 'Projects', path: '/projects', icon: Briefcase, destinationId: 'projects' },
      { name: 'Milestones', path: '/milestones', icon: Target, destinationId: 'milestones' },
      { name: 'Gantt Chart', path: '/gantt', icon: CalendarDays, destinationId: 'gantt' },
      { name: 'Tasks', path: '/tasks', icon: CheckSquare, destinationId: 'tasks' },
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Issue Tracker', path: '/issues', icon: AlertCircle, destinationId: 'issues' },
      { name: 'Team', path: '/team', icon: Users, destinationId: 'team' },
      { name: 'DPR', path: '/dpr', icon: FileSpreadsheet, destinationId: 'dpr' },
      { name: 'Documents', path: '/documents', icon: FolderOpen, destinationId: 'documents' },
    ]
  },
  {
    title: 'FINANCE',
    items: [
      { name: 'Budget', path: '/budget', icon: DollarSign, destinationId: 'projects' },
      { name: 'Billing', path: '/billing', icon: Receipt, destinationId: 'billing' },
    ]
  },
  {
    title: 'AMC MANAGEMENT',
    items: [
      { name: 'Vendor', path: '/customers', icon: UserCircle, destinationId: 'amc' },
      { name: 'Dashboard', path: '/amc', icon: LayoutDashboard, destinationId: 'amc' },
      { name: 'Contracts', path: '/amc/contracts', icon: FileText, destinationId: 'amc' },
      { name: 'Payments', path: '/amc/payments', icon: CreditCard, destinationId: 'amc' },
      { name: 'Documents', path: '/amc/documents', icon: FolderOpen, destinationId: 'amc' },
      { name: 'AMC History', path: '/amc/history', icon: Archive, destinationId: 'amc' },
    ]
  },
  {
    title: 'ACCESS HUB',
    items: [
      { name: 'Users', path: '/admin/users', icon: Users, destinationId: 'access_hub' },
      { name: 'Roles', path: '/admin/roles', icon: Shield, destinationId: 'access_hub' },
      { name: 'Audit Logs', path: '/admin/audit', icon: FileText, destinationId: 'access_hub' },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { name: 'Email Config', path: '/admin/email-config', icon: Mail, destinationId: 'access_hub' },
    ]
  }
];

interface NavItem {
  name: string;
  path: string;
  icon: any;
  destinationId?: string;
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { hasPermission, loading: rbacLoading } = usePermissions();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: any;
    
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        clearTimeout(timeoutId);
        
        if (isMounted) {
          if (error || !user) {
            navigate('/login');
          } else {
            setUser(user);
          }
          setLoading(false);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Auth check failed or network error:", err);
        if (isMounted) {
          setLoading(false);
          navigate('/login');
        }
      }
    };

    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn("Supabase auth check timed out. Forcing redirect to login.");
        setLoading(false);
        navigate('/login');
      }
    }, 5000);

    checkUser();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading || rbacLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading user data & permissions...</div>;
  }

  // Filter navigation groups based on permissions
  const filteredNavGroups = navGroups.map(group => {
    return {
      ...group,
      items: group.items.filter((item: NavItem) => !item.destinationId || hasPermission(item.destinationId, 'READ'))
    };
  }).filter(group => group.items.length > 0);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* Sidebar */}
      <aside style={{ 
        width: isSidebarCollapsed ? '72px' : 'var(--sidebar-width)', 
        transition: 'width 0.3s ease', 
        backgroundColor: 'var(--sidebar-bg)', 
        borderRight: '1px solid var(--border)', 
        display: 'flex', 
        flexDirection: 'column',
        zIndex: 100
      }}>
        {/* Sidebar Header */}
        <div style={{ 
          height: 'var(--header-height)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
          padding: isSidebarCollapsed ? '0' : '0 1.25rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}>
          {!isSidebarCollapsed && <Logo />}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{ padding: '0.5rem', color: 'var(--muted-foreground)', borderRadius: '6px' }}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
          {filteredNavGroups.map((group, groupIdx) => (
            <div key={group.title} style={{ marginBottom: '1.5rem' }}>
              {!isSidebarCollapsed && (
                <div style={{ 
                  padding: '0 1.5rem', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--muted-foreground)', 
                  letterSpacing: '0.05em' 
                }}>
                  {group.title}
                </div>
              )}
              {isSidebarCollapsed && groupIdx !== 0 && (
                <div style={{ borderTop: '1px solid var(--border)', margin: '1rem 1.25rem' }}></div>
              )}
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {group.items.map(item => {
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  
                  return (
                    <li key={item.path} style={{ margin: '0.25rem 0.75rem' }}>
                      <Link 
                        to={item.path}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                          padding: isSidebarCollapsed ? '0.75rem' : '0.625rem 0.75rem',
                          borderRadius: '6px',
                          color: isActive ? 'var(--nav-active-text)' : 'var(--nav-text)',
                          backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                          textDecoration: 'none',
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '0.875rem',
                          transition: 'all 0.2s ease',
                          gap: isSidebarCollapsed ? '0' : '0.75rem'
                        }}
                        title={isSidebarCollapsed ? item.name : undefined}
                      >
                        <item.icon size={20} style={{ color: isActive ? 'var(--nav-active-text)' : 'inherit', minWidth: '20px' }} />
                        {!isSidebarCollapsed && <span>{item.name}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <header style={{ 
          height: 'var(--header-height)', 
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--header-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          zIndex: 50,
          flexShrink: 0
        }}>
          {/* Breadcrumb / Title area */}
          <div style={{ color: 'var(--foreground)', fontWeight: 600, fontSize: '1.125rem' }}>
             {/* Dynamic title could go here */}
          </div>
          
          {/* Right: Search bar and Utilities */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            
            {/* Search Bar */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input 
                type="text" 
                placeholder="Search resources..." 
                style={{ 
                  width: '100%', 
                  padding: '0.5rem 1rem 0.5rem 2.5rem', 
                  borderRadius: '24px', 
                  backgroundColor: 'var(--search-bg)', 
                  border: '1px solid transparent',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease'
                }} 
              />
            </div>

            <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }}></div>
            
            <button 
              onClick={handleLogout}
              style={{ color: 'var(--nav-text)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }}
            >
              Logout
            </button>

            {/* Profile Trigger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem' }}>
                {user?.email ? user.email.substring(0, 2).toUpperCase() : 'UN'}
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="page-content" style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem', backgroundColor: 'var(--background)' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

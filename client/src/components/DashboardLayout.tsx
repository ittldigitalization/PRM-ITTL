import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
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
  Sun,
  Moon,
  AlertCircle,
  Shield,
  Mail
} from 'lucide-react';

import { usePermissions } from '../lib/AuthorizationService';

const Logo = () => (
  <img src="/logo.jpg" alt="INDO TECH" style={{ height: '32px', objectFit: 'contain' }} />
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
    title: 'EMAIL CONFIGURATION',
    items: [
      { name: 'Email Configuration', path: '/admin/email-config', icon: Mail, destinationId: 'access_hub' },
    ]
  }
];

const TopNavItem = ({ group, currentPath }: { group: any, currentPath: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<any>(null);
  const isActive = group.items.some((item: any) => currentPath === item.path || currentPath.startsWith(item.path + '/'));

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };
  
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  if (group.items.length === 1) {
     return (
       <Link to={group.items[0].path} style={{ whiteSpace: 'nowrap', color: isActive ? 'var(--accent)' : 'var(--nav-text)', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9375rem' }}>
         {group.title}
       </Link>
     );
  }

  return (
    <div 
      style={{ position: 'relative' }} 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      <div style={{ whiteSpace: 'nowrap', cursor: 'pointer', color: isActive ? 'var(--accent)' : 'var(--nav-text)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9375rem' }}>
        {group.title}
        <span style={{ fontSize: '10px' }}>▼</span>
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 15px)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '0.5rem',
          minWidth: '200px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          zIndex: 100
        }}>
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '12px',
            height: '12px',
            backgroundColor: 'var(--card)',
            borderLeft: '1px solid var(--border)',
            borderTop: '1px solid var(--border)',
          }}></div>
          
          {group.items.map((item: any) => {
             const isItemActive = currentPath === item.path;
             return (
               <Link
                 key={item.path}
                 to={item.path}
                 style={{
                   display: 'flex',
                   alignItems: 'center',
                   gap: '0.75rem',
                   padding: '10px 1rem',
                   borderRadius: '6px',
                   color: isItemActive ? 'var(--nav-active-text)' : 'var(--nav-text)',
                   backgroundColor: isItemActive ? 'var(--nav-active-bg)' : 'transparent',
                   textDecoration: 'none',
                   fontSize: '0.875rem',
                   fontWeight: isItemActive ? 600 : 500,
                   position: 'relative',
                   zIndex: 2
                 }}
                 onMouseEnter={e => { if(!isItemActive) e.currentTarget.style.backgroundColor = 'var(--muted)' }}
                 onMouseLeave={e => { if(!isItemActive) e.currentTarget.style.backgroundColor = 'transparent' }}
               >
                 <item.icon size={16} style={{ color: isItemActive ? 'var(--accent)' : 'inherit' }} />
                 {item.name}
               </Link>
             )
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const { hasPermission } = usePermissions();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  // Filter navigation groups based on permissions
  const filteredNavGroups = navGroups.map(group => {
    return {
      ...group,
      items: group.items.filter((item: any) => !item.destinationId || hasPermission(item.destinationId, 'READ'))
    };
  }).filter(group => group.items.length > 0);

  return (
    <div className="app-container">
      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header style={{ 
          height: 'var(--header-height)', 
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--header-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2.5rem',
          zIndex: 50,
          position: 'sticky',
          top: 0,
          transition: 'background-color 0.3s ease, border-color 0.3s ease'
        }}>
          {/* Left: Logo & Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
            <Logo />
            
            {/* Top Navigation */}
            <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
               {filteredNavGroups.map(group => (
                 <TopNavItem key={group.title} group={group} currentPath={location.pathname} />
               ))}
            </nav>
          </div>
          
          {/* Right: Search bar and Utilities */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            
            <button 
              onClick={handleLogout}
              style={{ color: 'var(--accent-foreground)', backgroundColor: 'var(--accent)', fontWeight: 'bold', fontSize: '0.875rem', padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-secondary)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
            >
              Logout
            </button>

            {/* Search Bar */}
            <div style={{ position: 'relative', width: '256px' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input 
                type="text" 
                placeholder="Search everything..." 
                style={{ 
                  width: '100%', 
                  padding: '0.6rem 1rem 0.6rem 2.5rem', 
                  borderRadius: '24px', 
                  backgroundColor: 'var(--search-bg)', 
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease'
                }} 
              />
            </div>
            
            <button 
              onClick={toggleTheme}
              style={{ color: 'var(--muted-foreground)', padding: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Profile Trigger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {user?.email ? user.email.substring(0, 2).toUpperCase() : 'UN'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

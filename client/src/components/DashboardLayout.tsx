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
  LogOut,
  FolderOpen,
  UserCircle,
  ShieldCheck,
  CalendarCheck,
  CreditCard,
  Archive,
  CalendarDays,
  Receipt,
  Mail,
  Search,
  Calendar,
  Bell,
  Sun,
  Moon,
  AlertCircle
} from 'lucide-react';

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
      { name: 'Projects', path: '/projects', icon: Briefcase },
      { name: 'Milestones', path: '/milestones', icon: Target },
      { name: 'Gantt Chart', path: '/gantt', icon: CalendarDays },
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Tasks', path: '/tasks', icon: CheckSquare },
      { name: 'Issue Tracker', path: '/issues', icon: AlertCircle },
      { name: 'Team', path: '/team', icon: Users },
      { name: 'DPR', path: '/dpr', icon: FileSpreadsheet },
      { name: 'Documents', path: '/documents', icon: FolderOpen },
    ]
  },
  {
    title: 'FINANCE',
    items: [
      { name: 'Budget', path: '/budget', icon: DollarSign },
      { name: 'Billing', path: '/billing', icon: Receipt },
    ]
  }
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAmcOpen, setIsAmcOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

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

  // Format today's date for the Calendar Trigger
  const today = new Date();
  const dayStr = today.getDate().toString().padStart(2, '0');
  const monthStr = today.toLocaleString('default', { month: 'short' }).toUpperCase();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      }}>
        <div style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', padding: '0 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <Logo />
        </div>
        <nav style={{ flex: 1, padding: '1.5rem 1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {navGroups.map((group, index) => (
            <div key={group.title} style={{ marginTop: index === 0 ? '0' : '2rem', marginBottom: '0.5rem' }}>
              <p className="small-caps" style={{ 
                color: 'var(--muted-foreground)', 
                padding: '0 1rem',
                marginBottom: '0.75rem'
              }}>
                {group.title}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '12px 1rem',
                        borderRadius: '6px',
                        color: isActive ? 'var(--nav-active-text)' : 'var(--nav-text)',
                        backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                        fontWeight: isActive ? 600 : 500,
                        transition: 'all 0.2s ease-out',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = 'var(--nav-text-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = 'var(--nav-text)';
                        }
                      }}
                    >
                      <item.icon size={18} style={{ color: isActive ? 'var(--accent)' : 'inherit', transition: 'color 0.2s ease-out' }} />
                      <span style={{ fontSize: '0.9375rem' }}>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
            
          {/* AMC Management Collapsible Menu */}
          <div style={{ marginTop: '2rem' }}>
            <button 
              onClick={() => setIsAmcOpen(!isAmcOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 1rem',
                borderRadius: '6px',
                color: location.pathname.startsWith('/amc') ? 'var(--nav-active-text)' : 'var(--nav-text)',
                backgroundColor: location.pathname.startsWith('/amc') ? 'var(--nav-active-bg)' : 'transparent',
                fontWeight: location.pathname.startsWith('/amc') ? 600 : 500,
                transition: 'all 0.2s ease-out',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldCheck size={18} style={{ color: location.pathname.startsWith('/amc') ? 'var(--accent)' : 'inherit' }} />
                <span style={{ fontSize: '0.9375rem' }}>AMC Management</span>
              </div>
              <span style={{ fontSize: '10px' }}>{isAmcOpen ? '▼' : '▶'}</span>
            </button>
            
            {isAmcOpen && (
              <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {[
                  { name: 'Vendor', path: '/customers', icon: UserCircle },
                  { name: 'Dashboard', path: '/amc', icon: LayoutDashboard },
                  { name: 'Contracts', path: '/amc/contracts', icon: FileText },
                  { name: 'Payments', path: '/amc/payments', icon: CreditCard },
                  { name: 'Documents', path: '/amc/documents', icon: FolderOpen },
                  { name: 'AMC History', path: '/amc/history', icon: Archive },
                ].map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '8px 1rem', borderRadius: '6px',
                      color: isActive ? 'var(--nav-active-text)' : 'var(--nav-text)', fontSize: '0.875rem',
                      backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                    }}>
                      <item.icon size={16} style={{ color: isActive ? 'var(--accent)' : 'inherit' }} /> {item.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 500, fontSize: '0.9375rem', transition: 'color 0.2s ease', border: 'none', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--nav-text-hover)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

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
          zIndex: 5,
          position: 'sticky',
          top: 0,
          transition: 'background-color 0.3s ease, border-color 0.3s ease'
        }}>
          {/* Left: Profile Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user?.email ? user.email.substring(0, 2).toUpperCase() : 'UN'}
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>{user?.email || 'User'}</p>
              <p className="small-caps" style={{ color: 'var(--muted-foreground)', marginTop: '2px' }}>Project Manager</p>
            </div>
          </div>
          
          {/* Right: Search bar and Utilities */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
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

            <button style={{ color: 'var(--muted-foreground)', padding: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <Bell size={18} />
            </button>
            
            {/* Calendar Trigger */}
            <button style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '180px',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 6px 6px 16px',
              transition: 'all 0.2s ease-out',
              cursor: 'pointer'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ring)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="small-caps" style={{ color: 'var(--muted-foreground)' }}>Today</span>
                <span className="serif-heading" style={{ fontSize: '1rem', color: 'var(--foreground)', fontWeight: 600 }}>{dayStr} {monthStr}</span>
              </div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--muted)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={16} />
              </div>
            </button>
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

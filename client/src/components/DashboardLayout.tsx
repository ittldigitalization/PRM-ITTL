import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Briefcase, 
  CalendarDays, 
  Flag, 
  CheckSquare, 
  Users, 
  FileText, 
  DollarSign, 
  FolderOpen, 
  Mail,
  Receipt,
  LogOut
} from 'lucide-react';

const Logo = () => (
  <img 
    src="/logo.svg" 
    alt="INDO TECH" 
    style={{ 
      height: '35px', 
      width: 'auto', 
      objectFit: 'contain' 
    }} 
    onError={() => {
      console.warn("Logo image not found in public folder. Please save logo.svg to client/public/");
    }}
  />
);

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Gantt Chart', href: '/gantt', icon: CalendarDays },
  { name: 'Milestones', href: '/milestones', icon: Flag },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'DPR', href: '/dpr', icon: FileText },
  { name: 'Budget', href: '/budget', icon: DollarSign },
  { name: 'Billing', href: '/billing', icon: Receipt },
  { name: 'Documents', href: '/documents', icon: FolderOpen },
  { name: 'Notifications', href: '/notifications', icon: Mail },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
      } else {
        setUser(user);
      }
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="glass" style={{
        width: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        borderRight: '1px solid rgba(255, 255, 255, 0.5)',
        background: 'rgba(255, 255, 255, 0.25)',
      }}>
        <div style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', padding: '0 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.4)' }}>
          <Logo />
        </div>
        <nav style={{ flex: 1, padding: '1.5rem 1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.6)' : 'transparent',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0,0,0,0.02)' : 'none',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)'
                }}
                onMouseOver={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <item.icon size={isActive ? 22 : 20} style={{ transition: 'all 0.3s ease' }} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <button 
            onClick={handleLogout}
            className="btn w-full" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', color: 'var(--muted-foreground)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="glass" style={{ 
          height: 'var(--header-height)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
          background: 'rgba(255, 255, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          zIndex: 5,
        }}>
          <h2 className={`text-xl font-bold text-slate-800 ${location.pathname.toLowerCase() === '/dpr' ? 'uppercase' : 'capitalize'}`}>
            {location.pathname === '/' ? 'Dashboard' : (location.pathname.substring(1).toLowerCase() === 'dpr' ? 'DPR' : location.pathname.substring(1).replace('-', ' '))}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <p className="text-sm font-semibold">{user?.email || 'User'}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e3282f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
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

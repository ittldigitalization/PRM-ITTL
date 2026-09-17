import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, FileText } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem', color: 'var(--foreground)' }}>Admin Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Users Card */}
        <Link to="/admin/users" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: 'var(--card-bg, var(--card))',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--foreground)',
            transition: 'transform 0.2s, boxShadow 0.2s',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <Users size={48} color="var(--accent)" />
            <h2>User Management</h2>
            <p style={{ color: 'var(--muted-foreground)', textAlign: 'center' }}>Manage user accounts, assign roles, and control access.</p>
          </div>
        </Link>

        {/* Roles & Permissions Card */}
        <Link to="/admin/roles" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: 'var(--card-bg, var(--card))',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--foreground)',
            transition: 'transform 0.2s, boxShadow 0.2s',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <Shield size={48} color="var(--accent)" />
            <h2>Roles & Permissions</h2>
            <p style={{ color: 'var(--muted-foreground)', textAlign: 'center' }}>Define RBAC roles and configure permission matrices.</p>
          </div>
        </Link>

        {/* Audit Logs Card */}
        <Link to="/admin/audit" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: 'var(--card-bg, var(--card))',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--foreground)',
            transition: 'transform 0.2s, boxShadow 0.2s',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <FileText size={48} color="var(--accent)" />
            <h2>Audit Logs</h2>
            <p style={{ color: 'var(--muted-foreground)', textAlign: 'center' }}>View system audit logs and track user actions.</p>
          </div>
        </Link>

      </div>
    </div>
  );
};

export default AdminDashboard;

import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--background)',
      color: 'var(--foreground)'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--destructive, #ef4444)' }}>
        403 - Access Denied
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: 'var(--muted-foreground)' }}>
        You do not have permission to view this page.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-foreground)',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default Unauthorized;

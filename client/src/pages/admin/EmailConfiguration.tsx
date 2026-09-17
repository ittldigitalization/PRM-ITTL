import React, { useState, useEffect } from 'react';
import { Mail, Send, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const API_BASE_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5000/api`
  : 'http://localhost:5000/api';

const EmailConfiguration: React.FC = () => {
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    description: '',
    status: 'Enabled',
  });
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, to: data[0].email }));
          }
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSend = async () => {
    if (!formData.to) {
      showToast('error', 'Please select a recipient (To).');
      return;
    }
    if (formData.status !== 'Enabled') {
      showToast('error', 'Email is currently disabled. Set Status to Enabled first.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-test-email', {
        body: {
          to: formData.to,
          subject: formData.from ? `Message from ${formData.from}` : 'PMS Notification',
          description: formData.description || 'This is a test email from the PMS system.',
        },
      });

      if (error) {
        // Unwrap the real error body from the edge function response
        let detail = error.message;
        try {
          const body = await (error as any).context?.json();
          if (body?.error) detail = body.error;
          if (body?.responseCode) detail += ` (SMTP code: ${body.responseCode})`;
        } catch {}
        showToast('error', `Failed: ${detail}`);
      } else {
        showToast('success', `Email sent successfully to ${formData.to}!`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Unexpected error sending email.');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    setFormData({ from: '', to: users[0]?.email || '', description: '', status: 'Enabled' });
    setToast(null);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Mail size={28} color="var(--accent)" />
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)' }}>
          Email Configuration
        </h1>
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          backgroundColor: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: toast.type === 'success' ? '#166534' : '#991b1b',
          fontWeight: 500,
          fontSize: '0.875rem',
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Card */}
      <div style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}>

        {/* From */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
            From
          </label>
          <input
            type="email"
            name="from"
            value={formData.from}
            onChange={handleChange}
            placeholder="e.g. sender@company.com"
            style={inputStyle}
          />
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
            Display address shown to the recipient (optional)
          </p>
        </div>

        {/* To */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
            To
          </label>
          <select
            name="to"
            value={formData.to}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">Select recipient...</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.email}>{u.email}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Description / Message
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Enter the email message body..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Status */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="Enabled">● Enabled</option>
            <option value="Disabled">○ Disabled</option>
          </select>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <button
            onClick={handleSend}
            disabled={sending || formData.status !== 'Enabled'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: (sending || formData.status !== 'Enabled') ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: (sending || formData.status !== 'Enabled') ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send'}
          </button>

          <button
            onClick={handleCancel}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--card)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <X size={16} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfiguration;

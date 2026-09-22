import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { notifyRbacChange } from '../../lib/AuthorizationService';
import { 
  Save, 
  ArrowLeft, 
  Shield, 
  Plus, 
  Check, 
  RotateCcw, 
  Grid, 
  X, 
  Trash2,
  Edit
} from 'lucide-react';

const API_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:5000/api` 
  : 'http://localhost:5000/api';

interface Role {
  id: string;
  name: string;
  description: string;
  is_system?: boolean;
}

interface Destination {
  id: string;
  name: string;
  description: string;
  category?: string;
}

interface Permission {
  destination_id: string;
  destination?: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
}

const ACTIONS: Array<'CREATE' | 'READ' | 'UPDATE' | 'DELETE'> = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CREATE: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.3)' },
  READ: { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.3)' },
  UPDATE: { bg: 'rgba(234, 179, 8, 0.1)', text: '#ca8a04', border: 'rgba(234, 179, 8, 0.3)' },
  DELETE: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' },
};

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  
  // Matrix state: a map of `${destination_id}_${action}` -> boolean
  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  
  const [activeTab, setActiveTab] = useState<'role_matrix' | 'full_overview'>('role_matrix');
  const [fullMatrixData, setFullMatrixData] = useState<{ roles: Role[]; destinations: Destination[]; permissions: any[] } | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Role Modal
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [rolesRes, destsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/roles`, { headers }),
        fetch(`${API_BASE_URL}/destinations`, { headers })
      ]);

      let rolesData: Role[] = [];
      let destsData: Destination[] = [];

      if (rolesRes.ok) rolesData = await rolesRes.json();
      if (destsRes.ok) destsData = await destsRes.json();

      setRoles(rolesData);
      setDestinations(destsData);

      // Select first role by default
      if (rolesData.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rolesData[0].id);
        fetchRolePermissions(rolesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFullMatrix = async () => {
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE_URL}/roles/matrix`, { headers });
      if (res.ok) {
        setFullMatrixData(await res.json());
      }
    } catch (err) {
      console.error('Error loading full matrix:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'full_overview') {
      fetchFullMatrix();
    }
  }, [activeTab]);

  const fetchRolePermissions = async (roleId: string) => {
    try {
      setLoadingPermissions(true);
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const perms: Permission[] = await res.json();
        const newMap: Record<string, boolean> = {};
        perms.forEach(p => {
          const dest = p.destination || p.destination_id;
          newMap[`${dest}_${p.action}`] = true;
        });
        setPermissionsMap(newMap);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
    setPermissionsMap({});
    fetchRolePermissions(roleId);
  };

  const handleTogglePermission = (destinationId: string, action: string) => {
    const key = `${destinationId}_${action}`;
    setPermissionsMap(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleToggleRow = (destId: string) => {
    // If all are checked, uncheck all. Otherwise, check all.
    const allChecked = ACTIONS.every(act => !!permissionsMap[`${destId}_${act}`]);
    setPermissionsMap(prev => {
      const next = { ...prev };
      ACTIONS.forEach(act => {
        next[`${destId}_${act}`] = !allChecked;
      });
      return next;
    });
  };

  const handleToggleColumn = (action: string) => {
    const allChecked = destinations.every(d => !!permissionsMap[`${d.id}_${action}`]);
    setPermissionsMap(prev => {
      const next = { ...prev };
      destinations.forEach(d => {
        next[`${d.id}_${action}`] = !allChecked;
      });
      return next;
    });
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    destinations.forEach(d => {
      ACTIONS.forEach(act => {
        next[`${d.id}_${act}`] = true;
      });
    });
    setPermissionsMap(next);
  };

  const handleClearAll = () => {
    setPermissionsMap({});
  };

  const handleApplyPreset = () => {
    if (!selectedRoleId) return;
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role) return;

    const next: Record<string, boolean> = {};
    const roleId = role.id.toLowerCase();

    destinations.forEach(d => {
      if (roleId === 'admin') {
        ACTIONS.forEach(a => { next[`${d.id}_${a}`] = true; });
      } else if (roleId === 'manager') {
        if (d.id !== 'access_hub') {
          next[`${d.id}_CREATE`] = true;
          next[`${d.id}_READ`] = true;
          next[`${d.id}_UPDATE`] = true;
        } else {
          next[`${d.id}_READ`] = true;
        }
      } else if (roleId === 'supervisor') {
        if (d.id !== 'access_hub' && d.id !== 'billing') {
          next[`${d.id}_READ`] = true;
          next[`${d.id}_UPDATE`] = true;
        }
      } else if (roleId === 'user') {
        if (d.id !== 'access_hub' && d.id !== 'billing' && d.id !== 'amc') {
          next[`${d.id}_CREATE`] = true;
          next[`${d.id}_READ`] = true;
        }
      } else if (roleId === 'viewer' || roleId === 'employee') {
        if (d.id !== 'access_hub') {
          next[`${d.id}_READ`] = true;
        }
      }
    });

    setPermissionsMap(next);
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    
    setSaving(true);
    setSaveSuccess(false);

    const permissionsToSave: Array<{ destination: string; action: string }> = [];
    Object.entries(permissionsMap).forEach(([key, isGranted]) => {
      if (isGranted) {
        const lastUnderscoreIndex = key.lastIndexOf('_');
        if (lastUnderscoreIndex !== -1) {
          const destination_id = key.substring(0, lastUnderscoreIndex);
          const action = key.substring(lastUnderscoreIndex + 1);
          permissionsToSave.push({ destination: destination_id, action });
        }
      }
    });

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/roles/${selectedRoleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: permissionsToSave })
      });

      if (res.ok) {
        setSaveSuccess(true);
        notifyRbacChange();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const error = await res.json();
        alert(`Failed to save permissions: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Error saving permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      const token = await getAuthToken();
      const method = editingRoleId ? 'PUT' : 'POST';
      const url = editingRoleId ? `${API_BASE_URL}/roles/${editingRoleId}` : `${API_BASE_URL}/roles`;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRoleName.trim(), description: newRoleDesc.trim() })
      });

      if (res.ok) {
        const saved = await res.json();
        notifyRbacChange();
        if (editingRoleId) {
          setRoles(prev => prev.map(r => r.id === saved.id ? saved : r));
        } else {
          setRoles(prev => [...prev, saved]);
        }
        setSelectedRoleId(saved.id);
        fetchRolePermissions(saved.id);
        setIsAddRoleOpen(false);
        setEditingRoleId(null);
        setNewRoleName('');
        setNewRoleDesc('');
      } else {
        const error = await res.json();
        alert(`Failed to save role: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error saving role:', err);
      alert('Error saving role');
    }
  };

  const openEditRole = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoleId(role.id);
    setNewRoleName(role.name);
    setNewRoleDesc(role.description);
    setIsAddRoleOpen(true);
  };

  const handleDeleteRole = async (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/roles/${role.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        notifyRbacChange();
        setRoles(prev => prev.filter(r => r.id !== role.id));
        if (selectedRoleId === role.id) {
          const remaining = roles.filter(r => r.id !== role.id);
          if (remaining.length > 0) {
            handleRoleSelect(remaining[0].id);
          } else {
            setSelectedRoleId(null);
            setPermissionsMap({});
          }
        }
      } else {
        const error = await res.json();
        alert(`Failed to delete role: ${error.error || error.message}`);
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      alert('Error deleting role');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading access matrix...</div>;

  const currentRole = roles.find(r => r.id === selectedRoleId);

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header Bar with Blue Back Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)' }}>
              Access Hub: Role & Permission Matrix
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              Granular Role-Based Access Control: <strong>Role ➔ Resource ➔ Action (Create, Read, Update, Delete)</strong>
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', backgroundColor: 'var(--muted)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('role_matrix')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeTab === 'role_matrix' ? 'var(--card-bg, var(--card))' : 'transparent',
              color: activeTab === 'role_matrix' ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontWeight: activeTab === 'role_matrix' ? 600 : 500,
              cursor: 'pointer',
              boxShadow: activeTab === 'role_matrix' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Shield size={16} /> Role Matrix Config
          </button>
          <button
            onClick={() => setActiveTab('full_overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeTab === 'full_overview' ? 'var(--card-bg, var(--card))' : 'transparent',
              color: activeTab === 'full_overview' ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontWeight: activeTab === 'full_overview' ? 600 : 500,
              cursor: 'pointer',
              boxShadow: activeTab === 'full_overview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Grid size={16} /> Full Matrix Overview
          </button>
        </div>
      </div>

      {activeTab === 'role_matrix' ? (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Roles List Panel */}
          <div style={{
            flex: '1',
            minWidth: '280px',
            maxWidth: '350px',
            backgroundColor: 'var(--card-bg, var(--card))',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--foreground)' }}>Roles</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{roles.length} available roles</div>
              </div>
              <button
                onClick={() => {
                  setEditingRoleId(null);
                  setNewRoleName('');
                  setNewRoleDesc('');
                  setIsAddRoleOpen(true);
                }}
                title="Add Custom Role"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.35rem 0.65rem',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-foreground)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <Plus size={14} /> Add Role
              </button>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {roles.map(role => {
                const isSelected = selectedRoleId === role.id;
                return (
                  <li key={role.id}>
                    <button
                      onClick={() => handleRoleSelect(role.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '1rem 1.25rem',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: isSelected ? '#2563eb' : 'var(--foreground)', fontSize: '0.95rem' }}>
                            {role.name}
                          </span>
                          {role.is_system ? (
                            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
                              SYSTEM
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#9333ea' }}>
                              CUSTOM
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem', lineHeight: 1.3 }}>
                          {role.description}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => openEditRole(role, e)}
                          title="Edit Role"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '4px' }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteRole(role, e)}
                          title="Delete Role"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Permissions Matrix Panel */}
          <div style={{
            flex: '3',
            minWidth: '600px',
            backgroundColor: 'var(--card-bg, var(--card))',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {selectedRoleId && currentRole ? (
              <>
                {/* Header with Quick Presets and Save */}
                <div style={{
                  padding: '1.25rem',
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'var(--muted)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--foreground)' }}>
                        Matrix for {currentRole.name}
                      </h2>
                      {saveSuccess && (
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#16a34a',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          <Check size={14} /> Saved!
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                      {currentRole.description}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleApplyPreset}
                      title="Reset to role's standard preset rules"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.85rem',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500
                      }}
                    >
                      <RotateCcw size={14} /> Reset Preset
                    </button>
                    <button
                      onClick={handleSelectAll}
                      style={{
                        padding: '0.45rem 0.75rem',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleClearAll}
                      style={{
                        padding: '0.45rem 0.75rem',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1.25rem',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
                      }}
                    >
                      <Save size={16} /> {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                  </div>
                </div>

                {/* Matrix Table */}
                {loadingPermissions ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    Loading permissions matrix...
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', padding: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'transparent' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted-foreground)', fontSize: '0.8rem', fontWeight: 600 }}>
                            RESOURCE / MODULE
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted-foreground)', fontSize: '0.8rem', fontWeight: 600 }}>
                            CATEGORY
                          </th>
                          {ACTIONS.map(action => (
                            <th key={action} style={{ padding: '0.75rem 0.5rem', width: '110px' }}>
                              <button
                                onClick={() => handleToggleColumn(action)}
                                title={`Toggle ${action} for all resources`}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  margin: '0 auto',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px'
                                }}
                              >
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: ACTION_COLORS[action].text,
                                  backgroundColor: ACTION_COLORS[action].bg,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: `1px solid ${ACTION_COLORS[action].border}`
                                }}>
                                  {action}
                                </span>
                              </button>
                            </th>
                          ))}
                          <th style={{ padding: '0.75rem 1rem', width: '80px', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>
                            ROW
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {destinations.map(dest => {
                          const isRowFull = ACTIONS.every(act => !!permissionsMap[`${dest.id}_${act}`]);
                          return (
                            <tr key={dest.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>
                                <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.9rem' }}>
                                  {dest.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                  {dest.description}
                                </div>
                              </td>
                              <td style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--muted)',
                                  color: 'var(--muted-foreground)'
                                }}>
                                  {dest.category || 'General'}
                                </span>
                              </td>
                              {ACTIONS.map(action => {
                                const key = `${dest.id}_${action}`;
                                const isChecked = !!permissionsMap[key];
                                return (
                                  <td key={action} style={{ padding: '0.85rem 0.5rem' }}>
                                    <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleTogglePermission(dest.id, action)}
                                        style={{
                                          width: '18px',
                                          height: '18px',
                                          cursor: 'pointer',
                                          accentColor: '#2563eb'
                                        }}
                                      />
                                    </label>
                                  </td>
                                );
                              })}
                              <td style={{ padding: '0.85rem 0.5rem' }}>
                                <button
                                  onClick={() => handleToggleRow(dest.id)}
                                  title="Toggle entire row"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: isRowFull ? '#2563eb' : 'var(--muted-foreground)',
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--muted)'
                                  }}
                                >
                                  {isRowFull ? 'Clear' : 'All'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                Select a role from the left to view and edit its access matrix.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Full System Access Overview Comparison Table */
        <div style={{
          backgroundColor: 'var(--card-bg, var(--card))',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: 'var(--foreground)' }}>
              Cross-Role Security Matrix Comparison
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
              High-level overview showing permissions granted to each role across all system resources.
            </div>
          </div>

          <div style={{ overflowX: 'auto', padding: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>Resource</th>
                  {roles.map(r => (
                    <th key={r.id} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--foreground)', fontSize: '0.85rem' }}>
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {destinations.map(dest => (
                  <tr key={dest.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {dest.name}
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 'normal' }}>
                        {dest.category}
                      </div>
                    </td>
                    {roles.map(r => {
                      // Check permissions from fullMatrixData or current map
                      const perms = (fullMatrixData?.permissions || []).filter(
                        p => p.role_id === r.id && (p.destination === dest.id || p.destination_id === dest.id)
                      );
                      const hasCreate = perms.some(p => p.action === 'CREATE');
                      const hasRead = perms.some(p => p.action === 'READ');
                      const hasUpdate = perms.some(p => p.action === 'UPDATE');
                      const hasDelete = perms.some(p => p.action === 'DELETE');

                      return (
                        <td key={r.id} style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {hasCreate && <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', backgroundColor: ACTION_COLORS.CREATE.bg, color: ACTION_COLORS.CREATE.text, fontWeight: 700 }}>C</span>}
                            {hasRead && <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', backgroundColor: ACTION_COLORS.READ.bg, color: ACTION_COLORS.READ.text, fontWeight: 700 }}>R</span>}
                            {hasUpdate && <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', backgroundColor: ACTION_COLORS.UPDATE.bg, color: ACTION_COLORS.UPDATE.text, fontWeight: 700 }}>U</span>}
                            {hasDelete && <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', backgroundColor: ACTION_COLORS.DELETE.bg, color: ACTION_COLORS.DELETE.text, fontWeight: 700 }}>D</span>}
                            {!hasCreate && !hasRead && !hasUpdate && !hasDelete && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>—</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Custom Role Modal */}
      {isAddRoleOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg, var(--card))',
            padding: '2rem',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '450px',
            border: '1px solid var(--border)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)' }}>
                {editingRoleId ? 'Edit Role' : 'Add Custom Role'}
              </h2>
              <button
                onClick={() => setIsAddRoleOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Auditor, Site Engineer"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Description
                </label>
                <textarea
                  placeholder="Responsibilities and access scope..."
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddRoleOpen(false)}
                  style={{ padding: '0.65rem 1.25rem', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.65rem 1.25rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                >
                  {editingRoleId ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;


import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AmcVisits() {
  const [visits, setVisits] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentVisit, setCurrentVisit] = useState<any>({});
  
  useEffect(() => {
    fetchData();

    const sub = supabase
      .channel('amc_visits_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amc_visits' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [visitsRes, contractsRes, usersRes] = await Promise.all([
        supabase.from('amc_visits').select('*, amc_contracts(amc_number, customers(name)), users(username)').order('visit_date', { ascending: false }),
        supabase.from('amc_contracts').select('id, amc_number, customers(name)'),
        supabase.from('users').select('id, username').eq('status', 'Active')
      ]);

      setVisits(visitsRes.data || []);
      setContracts(contractsRes.data || []);
      setEngineers(usersRes.data || []);
    } catch (error) {
      console.error('Error fetching AMC visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = visits.filter(v => 
    v.amc_contracts?.amc_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.amc_contracts?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed': return <span className="badge badge-success">{status}</span>;
      case 'Scheduled': return <span className="badge badge-primary">{status}</span>;
      case 'Cancelled': return <span className="badge badge-destructive">{status}</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dbVisit = {
      amc_id: currentVisit.amc_id,
      visit_date: currentVisit.visit_date,
      engineer_id: currentVisit.engineer_id || null,
      work_performed: currentVisit.work_performed,
      spare_parts_used: currentVisit.spare_parts_used,
      remarks: currentVisit.remarks,
      next_service_date: currentVisit.next_service_date || null,
      visit_status: currentVisit.visit_status || 'Scheduled'
    };

    try {
      if (currentVisit.id) {
        const { error } = await supabase.from('amc_visits').update(dbVisit).eq('id', currentVisit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('amc_visits').insert([dbVisit]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setCurrentVisit({});
      fetchData();
    } catch (error: any) {
      console.error('Error saving visit:', error);
      alert('Failed to save visit: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this visit record?')) {
      try {
        const { error } = await supabase.from('amc_visits').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (error: any) {
        console.error('Error deleting visit:', error);
        alert('Failed to delete visit: ' + (error.message || JSON.stringify(error)));
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search AMC visits..."
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => { setCurrentVisit({ visit_status: 'Scheduled' }); setIsModalOpen(true); }}
        >
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Log Visit
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>AMC Number</th>
              <th>Customer</th>
              <th>Engineer</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVisits.map(visit => (
              <tr key={visit.id}>
                <td className="font-medium">{visit.visit_date}</td>
                <td className="font-bold text-primary">{visit.amc_contracts?.amc_number}</td>
                <td>{visit.amc_contracts?.customers?.name || '-'}</td>
                <td>{visit.users?.username || 'Unassigned'}</td>
                <td>{getStatusBadge(visit.visit_status)}</td>
                <td>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="View"
                      onClick={() => { setCurrentVisit(visit); setIsViewModalOpen(true); }}
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="Edit"
                      onClick={() => { setCurrentVisit(visit); setIsModalOpen(true); }}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem', color: 'var(--destructive)' }} 
                      title="Delete"
                      onClick={() => handleDelete(visit.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Loading AMC visits...</td>
              </tr>
            )}
            {!loading && filteredVisits.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                  No AMC visits found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2 className="text-lg font-bold">{currentVisit.id ? 'Edit Visit' : 'Log New Visit'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 form-group">
                  <label className="form-label">AMC Contract</label>
                  <select 
                    required 
                    className="form-input"
                    value={currentVisit.amc_id || ''}
                    onChange={e => setCurrentVisit({...currentVisit, amc_id: e.target.value})}
                  >
                    <option value="">Select Contract...</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.amc_number} - {c.customers?.name}</option>)}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Visit Date</label>
                  <input 
                    required 
                    type="date" 
                    className="form-input" 
                    value={currentVisit.visit_date || ''} 
                    onChange={e => setCurrentVisit({...currentVisit, visit_date: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Engineer</label>
                  <select 
                    className="form-input"
                    value={currentVisit.engineer_id || ''}
                    onChange={e => setCurrentVisit({...currentVisit, engineer_id: e.target.value})}
                  >
                    <option value="">Select Engineer...</option>
                    {engineers.map(e => <option key={e.id} value={e.id}>{e.username}</option>)}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Next Service Date (Optional)</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={currentVisit.next_service_date || ''} 
                    onChange={e => setCurrentVisit({...currentVisit, next_service_date: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Visit Status</label>
                  <select 
                    className="form-input"
                    value={currentVisit.visit_status || 'Scheduled'}
                    onChange={e => setCurrentVisit({...currentVisit, visit_status: e.target.value})}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Work Performed</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={currentVisit.work_performed || ''} 
                  onChange={e => setCurrentVisit({...currentVisit, work_performed: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Spare Parts Used</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '60px' }}
                  placeholder="Leave empty if none"
                  value={currentVisit.spare_parts_used || ''} 
                  onChange={e => setCurrentVisit({...currentVisit, spare_parts_used: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input 
                  type="text"
                  className="form-input" 
                  value={currentVisit.remarks || ''} 
                  onChange={e => setCurrentVisit({...currentVisit, remarks: e.target.value})} 
                />
              </div>
              
              <div className="flex justify-end gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <svg width="120" height="32" viewBox="0 0 150 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="150" height="40" rx="4" fill="#e3282f" />
                  <text x="75" y="27" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="900" fill="white" textAnchor="middle" letterSpacing="1">INDO TECH</text>
                </svg>
                <div style={{ height: '24px', width: '2px', backgroundColor: '#cbd5e1' }}></div>
                <h2 className="text-lg font-bold text-slate-800">Service Visit Report</h2>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} style={{ color: '#64748b', padding: '0.5rem', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e2e8f0', cursor: 'pointer' }} className="hover:bg-slate-50 transition-colors ml-auto">
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date</p>
                  <div className="text-base font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {currentVisit.visit_date}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status</p>
                  <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 h-[38px]">
                    <div>{getStatusBadge(currentVisit.visit_status)}</div>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">AMC Details</p>
                  <div className="text-sm font-semibold text-slate-900 bg-slate-50 px-3 py-3 rounded-lg border border-slate-200">
                    {currentVisit.amc_contracts?.amc_number} <br/>
                    <span className="text-slate-500 font-normal">{currentVisit.amc_contracts?.customers?.name}</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Work Performed</p>
                  <div className="text-sm text-slate-700 bg-slate-50 px-3 py-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {currentVisit.work_performed || '-'}
                  </div>
                </div>

                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Spare Parts Used</p>
                  <div className="text-sm text-slate-700 bg-slate-50 px-3 py-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {currentVisit.spare_parts_used || 'None'}
                  </div>
                </div>

                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Remarks</p>
                  <div className="text-sm text-slate-700 bg-slate-50 px-3 py-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {currentVisit.remarks || '-'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary shadow-sm" onClick={() => setIsViewModalOpen(false)}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

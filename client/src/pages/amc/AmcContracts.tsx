import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, RefreshCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AmcContracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  
  const [currentContract, setCurrentContract] = useState<any>({});
  
  useEffect(() => {
    fetchData();

    const sub = supabase
      .channel('amc_contracts_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amc_contracts' }, () => {
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
      const [contractsRes, customersRes, usersRes] = await Promise.all([
        supabase.from('amc_contracts').select('*, customers(name), users(username)').order('created_at', { ascending: false }),
        supabase.from('customers').select('id, name'),
        supabase.from('users').select('id, username').eq('status', 'Active')
      ]);

      setContracts(contractsRes.data || []);
      setCustomers(customersRes.data || []);
      setEngineers(usersRes.data || []);
    } catch (error) {
      console.error('Error fetching AMC contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.amc_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <span className="badge badge-success">{status}</span>;
      case 'Renewal Due': return <span className="badge badge-warning">{status}</span>;
      case 'Expired': return <span className="badge badge-destructive">{status}</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto generate AMC Number if new
    let amcNumber = currentContract.amc_number;
    if (!amcNumber) {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      amcNumber = `AMC-${year}-${rand}`;
    }

    const dbContract = {
      amc_number: amcNumber,
      customer_id: currentContract.customer_id,
      contract_name: currentContract.contract_name,
      start_date: currentContract.start_date,
      end_date: currentContract.end_date,
      contract_amount: currentContract.contract_amount,
      service_frequency: currentContract.service_frequency,
      status: currentContract.status || 'Active',
      notes: currentContract.notes
    };

    try {
      if (currentContract.id) {
        const { error } = await supabase.from('amc_contracts').update(dbContract).eq('id', currentContract.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('amc_contracts').insert([dbContract]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setCurrentContract({});
      fetchData();
    } catch (error: any) {
      console.error('Error saving contract:', error);
      alert('Failed to save contract: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate new AMC number for the renewal
    const year = new Date(currentContract.start_date).getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newAmcNumber = `AMC-${year}-${rand}`;

    const newContract = {
      amc_number: newAmcNumber,
      customer_id: currentContract.customer_id,
      contract_name: currentContract.contract_name,
      start_date: currentContract.start_date,
      end_date: currentContract.end_date,
      contract_amount: currentContract.contract_amount,
      service_frequency: currentContract.service_frequency,
      status: 'Active',
      notes: 'Renewed from ' + currentContract.old_amc_number + '. ' + (currentContract.notes || '')
    };

    try {
      // 1. Update old contract to Expired or Renewed
      await supabase.from('amc_contracts').update({ status: 'Expired' }).eq('id', currentContract.old_id);
      
      // 2. Insert new contract
      const { error } = await supabase.from('amc_contracts').insert([newContract]);
      if (error) throw error;
      
      setIsRenewModalOpen(false);
      setCurrentContract({});
      fetchData();
    } catch (error: any) {
      console.error('Error renewing contract:', error);
      alert('Failed to renew contract: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contract? All related visits and payments will be deleted.')) {
      try {
        const { error } = await supabase.from('amc_contracts').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (error: any) {
        console.error('Error deleting contract:', error);
        alert('Failed to delete contract: ' + (error.message || JSON.stringify(error)));
      }
    }
  };

  const openRenewModal = (contract: any) => {
    // Prep data for renewal (typically next year)
    const oldStart = new Date(contract.start_date);
    const oldEnd = new Date(contract.end_date);
    
    const newStart = new Date(oldStart);
    newStart.setFullYear(newStart.getFullYear() + 1);
    
    const newEnd = new Date(oldEnd);
    newEnd.setFullYear(newEnd.getFullYear() + 1);

    setCurrentContract({
      ...contract,
      old_id: contract.id,
      old_amc_number: contract.amc_number,
      id: null, // Force new insert
      amc_number: '',
      start_date: newStart.toISOString().split('T')[0],
      end_date: newEnd.toISOString().split('T')[0],
      notes: ''
    });
    setIsRenewModalOpen(true);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search AMC contracts..."
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => { setCurrentContract({ status: 'Active' }); setIsModalOpen(true); }}
        >
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          New AMC Contract
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>AMC Number</th>
              <th>Vendor</th>
              <th>Contract Name</th>
              <th>Duration</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map(contract => (
              <tr key={contract.id}>
                <td className="font-bold text-primary">{contract.amc_number}</td>
                <td className="font-medium">{contract.customers?.name || '-'}</td>
                <td>{contract.contract_name}</td>
                <td>{contract.start_date} to {contract.end_date}</td>
                <td>₹{Number(contract.contract_amount).toLocaleString()}</td>
                <td>{getStatusBadge(contract.status)}</td>
                <td>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="View"
                      onClick={() => { setCurrentContract(contract); setIsViewModalOpen(true); }}
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn btn-outline text-amber-600 border-amber-200" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="Renew Contract"
                      onClick={() => openRenewModal(contract)}
                    >
                      <RefreshCcw size={16} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="Edit"
                      onClick={() => { setCurrentContract(contract); setIsModalOpen(true); }}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem', color: 'var(--destructive)' }} 
                      title="Delete"
                      onClick={() => handleDelete(contract.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Loading AMC contracts...</td>
              </tr>
            )}
            {!loading && filteredContracts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                  No AMC contracts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2 className="text-lg font-bold">{currentContract.id ? 'Edit AMC Contract' : 'New AMC Contract'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">AMC Number (Auto-generated if blank)</label>
                  <input 
                    type="text" 
                    className="form-input bg-slate-50" 
                    placeholder="e.g. AMC-2026-1234"
                    value={currentContract.amc_number || ''} 
                    onChange={e => setCurrentContract({...currentContract, amc_number: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor</label>
                  <select 
                    required 
                    className="form-input"
                    value={currentContract.customer_id || ''}
                    onChange={e => setCurrentContract({...currentContract, customer_id: e.target.value})}
                  >
                    <option value="">Select Vendor...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contract Name</label>
                  <input 
                    required 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Server Maintenance 2024"
                    value={currentContract.contract_name || ''} 
                    onChange={e => setCurrentContract({...currentContract, contract_name: e.target.value})} 
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input 
                    required 
                    type="date" 
                    className="form-input" 
                    value={currentContract.start_date || ''} 
                    onChange={e => setCurrentContract({...currentContract, start_date: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input 
                    required 
                    type="date" 
                    className="form-input" 
                    value={currentContract.end_date || ''} 
                    onChange={e => setCurrentContract({...currentContract, end_date: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contract Amount (₹)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    className="form-input" 
                    value={currentContract.contract_amount || ''} 
                    onChange={e => setCurrentContract({...currentContract, contract_amount: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-input"
                    value={currentContract.status || 'Active'}
                    onChange={e => setCurrentContract({...currentContract, status: e.target.value})}
                  >
                    <option value="Active">Active</option>
                    <option value="Renewal Due">Renewal Due</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Service Frequency</label>
                  <select 
                    className="form-input"
                    value={currentContract.service_frequency || ''}
                    onChange={e => setCurrentContract({...currentContract, service_frequency: e.target.value})}
                  >
                    <option value="">Select Frequency...</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half Yearly">Half Yearly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  value={currentContract.notes || ''} 
                  onChange={e => setCurrentContract({...currentContract, notes: e.target.value})} 
                />
              </div>
              
              <div className="flex justify-end gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENEW MODAL */}
      {isRenewModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2 className="text-lg font-bold text-amber-700">Renew AMC Contract</h2>
              <button onClick={() => setIsRenewModalOpen(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6 text-amber-800 text-sm">
              <p>You are about to renew <strong>{currentContract.old_amc_number}</strong>. This will generate a new AMC record to preserve history.</p>
            </div>

            <form onSubmit={handleRenew} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">New Start Date</label>
                  <input 
                    required 
                    type="date" 
                    className="form-input" 
                    value={currentContract.start_date || ''} 
                    onChange={e => setCurrentContract({...currentContract, start_date: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New End Date</label>
                  <input 
                    required 
                    type="date" 
                    className="form-input" 
                    value={currentContract.end_date || ''} 
                    onChange={e => setCurrentContract({...currentContract, end_date: e.target.value})} 
                  />
                </div>
                <div className="col-span-2 form-group">
                  <label className="form-label">Renewal Amount (₹)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    className="form-input" 
                    value={currentContract.contract_amount || ''} 
                    onChange={e => setCurrentContract({...currentContract, contract_amount: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsRenewModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#d97706', color: 'white' }}>
                  Create Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
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
                <h2 className="text-lg font-bold text-slate-800">AMC Details</h2>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} style={{ color: '#64748b', padding: '0.5rem', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e2e8f0', cursor: 'pointer' }} className="hover:bg-slate-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">AMC Number</p>
                  <div className="text-base font-bold text-slate-900 bg-slate-50 px-3 py-3 rounded-lg border border-slate-200">
                    {currentContract.amc_number}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status</p>
                  <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 h-[38px]">
                    <div>{getStatusBadge(currentContract.status)}</div>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Vendor & Contract Name</p>
                  <div className="text-sm font-semibold text-slate-900 bg-slate-50 px-3 py-3 rounded-lg border border-slate-200">
                    {currentContract.customers?.name} <br/>
                    <span className="text-slate-500 font-normal">{currentContract.contract_name}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Duration</p>
                  <div className="text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 inline-block">
                    {currentContract.start_date} to {currentContract.end_date}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contract Amount</p>
                  <div className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 inline-block">
                    ₹{Number(currentContract.contract_amount).toLocaleString()}
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

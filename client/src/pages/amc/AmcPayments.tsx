import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AmcPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<any>({});
  
  useEffect(() => {
    fetchData();

    const sub = supabase
      .channel('amc_payments_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amc_payments' }, () => {
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
      const [paymentsRes, contractsRes] = await Promise.all([
        supabase.from('amc_payments').select('*, amc_contracts(amc_number, customers(name))').order('created_at', { ascending: false }),
        supabase.from('amc_contracts').select('id, amc_number, customers(name)')
      ]);

      setPayments(paymentsRes.data || []);
      setContracts(contractsRes.data || []);
    } catch (error) {
      console.error('Error fetching AMC payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.amc_contracts?.amc_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.amc_contracts?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid': return <span className="badge badge-success">{status}</span>;
      case 'Partial': return <span className="badge badge-warning">{status}</span>;
      case 'Pending': return <span className="badge badge-secondary">{status}</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amt = Number(currentPayment.amount) || 0;
    const gst = Number(currentPayment.gst) || 0;
    const paid = Number(currentPayment.paid_amount) || 0;
    const total = amt + gst;
    const balance = total - paid;
    
    let status = 'Pending';
    if (paid > 0 && balance > 0) status = 'Partial';
    else if (paid >= total && total > 0) status = 'Paid';

    const dbPayment = {
      amc_id: currentPayment.amc_id,
      invoice_number: currentPayment.invoice_number,
      invoice_date: currentPayment.invoice_date,
      amount: amt,
      gst: gst,
      paid_amount: paid,
      balance: balance,
      payment_status: currentPayment.payment_status || status
    };

    try {
      if (currentPayment.id) {
        const { error } = await supabase.from('amc_payments').update(dbPayment).eq('id', currentPayment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('amc_payments').insert([dbPayment]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setCurrentPayment({});
      fetchData();
    } catch (error: any) {
      console.error('Error saving payment:', error);
      alert('Failed to save payment: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      try {
        const { error } = await supabase.from('amc_payments').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (error: any) {
        console.error('Error deleting payment:', error);
        alert('Failed to delete payment: ' + (error.message || JSON.stringify(error)));
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
            placeholder="Search payments or invoices..."
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => { setCurrentPayment({ payment_status: 'Pending', gst: 0, paid_amount: 0 }); setIsModalOpen(true); }}
        >
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Log Payment
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice No</th>
              <th>AMC Number / Customer</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map(payment => (
              <tr key={payment.id}>
                <td className="font-medium">{payment.invoice_date}</td>
                <td className="font-bold text-primary">{payment.invoice_number}</td>
                <td>
                  {payment.amc_contracts?.amc_number} <br/>
                  <span className="text-xs text-muted-foreground">{payment.amc_contracts?.customers?.name}</span>
                </td>
                <td>₹{(Number(payment.amount) + Number(payment.gst)).toLocaleString()}</td>
                <td className="text-emerald-600 font-medium">₹{Number(payment.paid_amount).toLocaleString()}</td>
                <td className={Number(payment.balance) > 0 ? "text-rose-600 font-medium" : ""}>
                  ₹{Number(payment.balance).toLocaleString()}
                </td>
                <td>{getStatusBadge(payment.payment_status)}</td>
                <td>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="View"
                      onClick={() => { setCurrentPayment(payment); setIsViewModalOpen(true); }}
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="Edit"
                      onClick={() => { setCurrentPayment(payment); setIsModalOpen(true); }}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem', color: 'var(--destructive)' }} 
                      title="Delete"
                      onClick={() => handleDelete(payment.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Loading payments...</td>
              </tr>
            )}
            {!loading && filteredPayments.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                  No payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2 className="text-lg font-bold">{currentPayment.id ? 'Edit Payment' : 'Log AMC Payment'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">AMC Contract</label>
                <select 
                  required 
                  className="form-input"
                  value={currentPayment.amc_id || ''}
                  onChange={e => setCurrentPayment({...currentPayment, amc_id: e.target.value})}
                >
                  <option value="">Select Contract...</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>{c.amc_number} - {c.customers?.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Invoice Number</label>
                  <input 
                    required 
                    type="text" 
                    className="form-input" 
                    value={currentPayment.invoice_number || ''} 
                    onChange={e => setCurrentPayment({...currentPayment, invoice_number: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Date</label>
                  <input 
                    required 
                    type="date" 
                    className="form-input" 
                    value={currentPayment.invoice_date || ''} 
                    onChange={e => setCurrentPayment({...currentPayment, invoice_date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-b py-4 my-2">
                <div className="form-group">
                  <label className="form-label">Base Amount (₹)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    className="form-input" 
                    value={currentPayment.amount || ''} 
                    onChange={e => setCurrentPayment({...currentPayment, amount: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GST Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-input" 
                    value={currentPayment.gst || ''} 
                    onChange={e => setCurrentPayment({...currentPayment, gst: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Paid Amount (₹)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    className="form-input font-bold text-emerald-700" 
                    value={currentPayment.paid_amount || ''} 
                    onChange={e => setCurrentPayment({...currentPayment, paid_amount: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status Override</label>
                  <select 
                    className="form-input"
                    value={currentPayment.payment_status || 'Pending'}
                    onChange={e => setCurrentPayment({...currentPayment, payment_status: e.target.value})}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Leave as is for auto-calculation based on balance.</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <svg width="120" height="32" viewBox="0 0 150 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="150" height="40" rx="4" fill="#e3282f" />
                  <text x="75" y="27" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="900" fill="white" textAnchor="middle" letterSpacing="1">INDO TECH</text>
                </svg>
                <div style={{ height: '24px', width: '2px', backgroundColor: '#cbd5e1' }}></div>
                <h2 className="text-lg font-bold text-slate-800">Invoice Details</h2>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} style={{ color: '#64748b', padding: '0.5rem', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e2e8f0', cursor: 'pointer' }} className="hover:bg-slate-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Invoice #</p>
                  <div className="text-base font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {currentPayment.invoice_number}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date</p>
                  <div className="text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200">
                    {currentPayment.invoice_date}
                  </div>
                </div>
                
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">AMC Details</p>
                  <div className="text-sm font-semibold text-slate-900 bg-slate-50 px-3 py-3 rounded-lg border border-slate-200">
                    {currentPayment.amc_contracts?.amc_number} <br/>
                    <span className="text-slate-500 font-normal">{currentPayment.amc_contracts?.customers?.name}</span>
                  </div>
                </div>

                <div className="col-span-2 pt-2 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-bold text-slate-500">Base Amount</p>
                    <p className="text-sm font-semibold text-slate-800">₹{Number(currentPayment.amount).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-bold text-slate-500">GST</p>
                    <p className="text-sm font-semibold text-slate-800">₹{Number(currentPayment.gst).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center mb-2 pt-2 border-t">
                    <p className="text-sm font-bold text-slate-800">Total Invoice Amount</p>
                    <p className="text-base font-bold text-slate-900">₹{(Number(currentPayment.amount) + Number(currentPayment.gst)).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="col-span-2 pt-2 pb-2">
                  <div className="flex justify-between items-center mb-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-sm font-bold text-emerald-800">Paid Amount</p>
                    <p className="text-lg font-bold text-emerald-700">₹{Number(currentPayment.paid_amount).toLocaleString()}</p>
                  </div>
                  
                  {Number(currentPayment.balance) > 0 && (
                    <div className="flex justify-between items-center p-3 bg-rose-50 rounded-lg border border-rose-100">
                      <p className="text-sm font-bold text-rose-800">Balance Due</p>
                      <p className="text-lg font-bold text-rose-700">₹{Number(currentPayment.balance).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="col-span-2 flex justify-end">
                   {getStatusBadge(currentPayment.payment_status)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AmcHistory() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchHistory();

    const sub = supabase
      .channel('amc_history_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amc_contracts' }, () => {
        fetchHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // Fetch all contracts sorted by customer name and start date
      const { data, error } = await supabase
        .from('amc_contracts')
        .select('*, customers(name)')
        .order('start_date', { ascending: false });
        
      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching AMC history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <span className="badge badge-success">{status}</span>;
      case 'Renewal Due': return <span className="badge badge-warning">{status}</span>;
      case 'Expired': return <span className="badge badge-secondary">{status}</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.amc_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div style={{ position: 'relative', width: '350px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search history by customer or AMC number..."
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>AMC Number</th>
              <th>Contract Name</th>
              <th>Duration</th>
              <th>AMC Type</th>
              <th>Value</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map(contract => {
              const year = new Date(contract.start_date).getFullYear();
              
              return (
                <tr key={contract.id}>
                  <td className="font-bold">{contract.customers?.name || '-'}</td>
                  <td>
                    <div className="font-bold text-primary">{contract.amc_number}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Year {year}</div>
                  </td>
                  <td>{contract.contract_name}</td>
                  <td className="whitespace-nowrap">{contract.start_date} <br/> to {contract.end_date}</td>
                  <td>{contract.amc_type || '-'}</td>
                  <td className="font-semibold">₹{Number(contract.contract_amount).toLocaleString()}</td>
                  <td>{getStatusBadge(contract.status)}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contract.notes}>
                    {contract.notes || '-'}
                  </td>
                </tr>
              );
            })}
            {loading && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Loading historical data...</td>
              </tr>
            )}
            {!loading && filteredContracts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                  No historical records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

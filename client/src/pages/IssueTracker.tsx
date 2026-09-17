import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, Image as ImageIcon, AlertCircle, CheckCircle, Clock, Activity, Calendar, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

type IssueStatus = 'Pending' | 'In Progress' | 'Resolved';
type SupportingType = 'Internal' | 'External (Vendor)';

interface Issue {
  id: string;
  applicationName: string;
  date: string;
  reportedDept?: string;
  concernedPerson?: string;
  status: IssueStatus;
  supportingPersonType?: SupportingType;
  supportingPersonName?: string;
  dateOfIssue?: string;
  remarks?: string;
  communicationStatus: boolean;
  evidenceUrl?: string;
  evidenceFile?: File;
}

export default function IssueTracker() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchIssues();

    const subscription = supabase
      .channel('issues_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        fetchIssues();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchIssues = async () => {
    try {

      const { data, error } = await supabase.from('issues').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const formatted = data?.map(i => ({
        id: i.id,
        applicationName: i.application_name,
        date: i.date,
        reportedDept: i.reported_dept,
        concernedPerson: i.concerned_person,
        status: i.status,
        supportingPersonType: i.supporting_person_type,
        supportingPersonName: i.supporting_person_name,
        dateOfIssue: i.date_of_issue,
        remarks: i.remarks,
        communicationStatus: i.communication_status,
        evidenceUrl: i.evidence_url,
      })) || [];
      
      setIssues(formatted);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [currentIssue, setCurrentIssue] = useState<Partial<Issue>>({ 
    status: 'Pending', 
    communicationStatus: false,
    date: new Date().toISOString().split('T')[0]
  });
  
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const getTimeFilteredIssues = (issuesList: Issue[], filter: string) => {
    if (filter === 'all') return issuesList;
    
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    return issuesList.filter(issue => {
      const issueDateStr = issue.date; // format is YYYY-MM-DD
      
      if (filter === 'today') {
        return issueDateStr === todayStr;
      } else if (filter === 'week') {
        const issueDate = new Date(issueDateStr);
        const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return issueDate >= weekAgo;
      } else if (filter === 'month') {
        const issueDate = new Date(issueDateStr);
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return issueDate >= monthAgo;
      }
      return true;
    });
  };

  const timeFilteredIssues = getTimeFilteredIssues(issues, timeFilter);

  const filteredIssues = timeFilteredIssues.filter(i => 
    i.applicationName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.concernedPerson && i.concernedPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalRegistered = timeFilteredIssues.length;
  const totalClosed = timeFilteredIssues.filter(i => i.status === 'Resolved').length;
  const totalPending = timeFilteredIssues.filter(i => i.status === 'Pending').length;
  const totalInProgress = timeFilteredIssues.filter(i => i.status === 'In Progress').length;

  const downloadCSV = () => {
    const headers = ['Application Name', 'Report Date', 'Reported Dept', 'Concerned Person', 'Status', 'Support Type', 'Support Name', 'Date of Issue Closed', 'Communication Status', 'Remarks'];
    const rows = filteredIssues.map(i => [
      i.applicationName,
      i.date,
      i.reportedDept || '',
      i.concernedPerson || '',
      i.status,
      i.supportingPersonType || '',
      i.supportingPersonName || '',
      i.dateOfIssue || '',
      i.communicationStatus ? 'Yes' : 'No',
      i.remarks || ''
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(rowArray => {
      const row = rowArray.map(cell => {
        const cellStr = (cell || '').toString();
        // Escape quotes
        return `"${cellStr.replace(/"/g, '""')}"`;
      });
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Issues_Tracker_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = async (id: string, newStatus: IssueStatus) => {
    try {
      const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      fetchIssues();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status: IssueStatus, id: string) => {
    return (
      <select 
        value={status || 'Pending'}
        onChange={(e) => handleStatusChange(id, e.target.value as IssueStatus)}
        className={`badge ${status === 'Resolved' ? 'badge-success' : status === 'In Progress' ? 'badge-primary' : 'badge-secondary'}`}
        style={{ border: 'none', outline: 'none', cursor: 'pointer', fontWeight: 600 }}
      >
        <option value="Pending" style={{ color: 'initial', background: 'white' }}>Pending</option>
        <option value="In Progress" style={{ color: 'initial', background: 'white' }}>In Progress</option>
        <option value="Resolved" style={{ color: 'initial', background: 'white' }}>Resolved</option>
      </select>
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dbIssue = {
      application_name: currentIssue.applicationName,
      date: currentIssue.date,
      reported_dept: currentIssue.reportedDept,
      concerned_person: currentIssue.concernedPerson,
      status: currentIssue.status,
      supporting_person_type: currentIssue.supportingPersonType,
      supporting_person_name: currentIssue.supportingPersonName,
      date_of_issue: currentIssue.dateOfIssue,
      remarks: currentIssue.remarks,
      communication_status: currentIssue.communicationStatus,
      evidence_url: currentIssue.evidenceUrl
    };

    try {
      if (currentIssue.evidenceFile) {
        const filePath = `public/${Date.now()}_${currentIssue.evidenceFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('PRM document files')
          .upload(filePath, currentIssue.evidenceFile);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('PRM document files')
          .getPublicUrl(filePath);
          
        dbIssue.evidence_url = publicUrlData.publicUrl;
      }

      if (currentIssue.id) {
        const { error } = await supabase.from('issues').update(dbIssue).eq('id', currentIssue.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('issues').insert([dbIssue]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setCurrentIssue({ status: 'Pending', communicationStatus: false, date: new Date().toISOString().split('T')[0] });
      fetchIssues();
    } catch (error: any) {
      console.error('Error saving issue:', error);
      alert('Failed to save issue: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this issue?')) {
      try {
        const { error } = await supabase.from('issues').delete().eq('id', id);
        if (error) throw error;
        fetchIssues();
      } catch (error: any) {
        console.error('Error deleting issue:', error);
        alert('Failed to delete issue: ' + (error.message || JSON.stringify(error)));
      }
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <span style={{ height: '1px', flex: 1, backgroundColor: 'var(--border)' }} />
        <span className="small-caps" style={{ color: 'var(--accent)' }}>
          Operations Log
        </span>
        <span style={{ height: '1px', flex: 1, backgroundColor: 'var(--border)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card glass-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-muted uppercase tracking-wider text-xs">Total Registered</p>
              <h3 className="text-3xl mt-1 text-slate-800 font-serif">{totalRegistered}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 shadow-sm">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>

        <div className="card glass-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-muted uppercase tracking-wider text-xs">Issues Closed</p>
              <h3 className="text-3xl mt-1 text-emerald-700 font-serif">{totalClosed}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shadow-sm">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        <div className="card glass-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-muted uppercase tracking-wider text-xs">Issues Pending</p>
              <h3 className="text-3xl mt-1 text-amber-700 font-serif">{totalPending}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shadow-sm">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className="card glass-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-muted uppercase tracking-wider text-xs">In Progress</p>
              <h3 className="text-3xl mt-1 text-blue-700 font-serif">{totalInProgress}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shadow-sm">
              <Activity size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="page-header" style={{ alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="serif-heading" style={{ fontSize: '2.5rem', margin: 0, lineHeight: 1.2 }}>Daily Issue Tracker</h1>
        </div>
        <div style={{ position: 'relative', width: '300px', marginLeft: '2rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search issues..."
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 items-center" style={{ marginLeft: 'auto' }}>
          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <select 
              className="form-input" 
              style={{ paddingLeft: '2.5rem', width: '160px', cursor: 'pointer', appearance: 'auto' }}
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
          <button 
            className="btn btn-outline"
            onClick={downloadCSV}
          >
            <Download size={18} style={{ marginRight: '0.5rem' }} />
            Export Excel
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => { 
              setCurrentIssue({ status: 'Pending', communicationStatus: false, date: new Date().toISOString().split('T')[0] }); 
              setIsModalOpen(true); 
            }}
          >
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Report Issue
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button 
          className="btn btn-primary"
          onClick={() => window.history.back()}
          style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--primary)', color: 'white' }}
        >
          Back
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>App Name</th>
              <th>Date</th>
              <th>Reported Dept</th>
              <th>Concerned Person</th>
              <th>Status</th>
              <th>Support Type</th>
              <th>Support Name</th>
              <th>Date of Issue Closed</th>
              <th>Comms Status</th>
              <th>Evidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map(issue => (
              <tr key={issue.id}>
                <td className="font-medium">{issue.applicationName}</td>
                <td>{issue.date}</td>
                <td>{issue.reportedDept || '-'}</td>
                <td>{issue.concernedPerson || '-'}</td>
                <td>{getStatusBadge(issue.status, issue.id)}</td>
                <td>{issue.supportingPersonType || '-'}</td>
                <td>{issue.supportingPersonName || '-'}</td>
                <td>{issue.dateOfIssue || '-'}</td>
                <td>
                  <span className={`badge ${issue.communicationStatus ? 'badge-success' : 'badge-secondary'}`}>
                    {issue.communicationStatus ? 'Y' : 'N'}
                  </span>
                </td>
                <td>
                  {issue.evidenceUrl ? (
                    <div 
                      className="flex items-center gap-2 text-primary" 
                      style={{ cursor: 'pointer', maxWidth: '100px' }} 
                      onClick={() => { window.open(issue.evidenceUrl, '_blank'); }}
                    >
                      <ImageIcon size={16} style={{ flexShrink: 0 }} />
                      <span className="truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        View
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="View"
                      onClick={() => { setCurrentIssue(issue); setIsViewModalOpen(true); }}
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="Edit"
                      onClick={() => { setCurrentIssue(issue); setIsModalOpen(true); }}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem', color: 'var(--destructive)' }} 
                      title="Delete"
                      onClick={() => handleDelete(issue.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Loading issues...</td>
              </tr>
            )}
            {!loading && filteredIssues.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                  No issues found.
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
              <h2 className="text-lg font-bold">{currentIssue.id ? 'Edit Issue' : 'Report New Issue'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="form-group flex-1">
                  <label className="form-label">Application Name</label>
                  <input 
                    required 
                    type="text" 
                    className="form-input" 
                    value={currentIssue.applicationName || ''} 
                    onChange={e => setCurrentIssue({...currentIssue, applicationName: e.target.value})} 
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Report Date</label>
                  <input 
                    required 
                    type="date" 
                    className="form-input" 
                    value={currentIssue.date || ''} 
                    onChange={e => setCurrentIssue({...currentIssue, date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-group flex-1">
                  <label className="form-label">Reported Dept</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={currentIssue.reportedDept || ''} 
                    onChange={e => setCurrentIssue({...currentIssue, reportedDept: e.target.value})} 
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Concerned Person</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={currentIssue.concernedPerson || ''} 
                    onChange={e => setCurrentIssue({...currentIssue, concernedPerson: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-group flex-1">
                  <label className="form-label">Issue Status</label>
                  <select 
                    className="form-input"
                    value={currentIssue.status}
                    onChange={e => setCurrentIssue({...currentIssue, status: e.target.value as IssueStatus})}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Comms Status (Y/N)</label>
                  <div className="flex items-center mt-2 gap-2">
                    <input 
                      type="checkbox" 
                      checked={currentIssue.communicationStatus}
                      onChange={e => setCurrentIssue({...currentIssue, communicationStatus: e.target.checked})}
                      style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }}
                    />
                    <span className="text-sm font-medium">{currentIssue.communicationStatus ? 'Yes (Communicated)' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-group flex-1">
                  <label className="form-label">Supporting Person Type</label>
                  <select 
                    className="form-input"
                    value={currentIssue.supportingPersonType || ''}
                    onChange={e => setCurrentIssue({...currentIssue, supportingPersonType: e.target.value as SupportingType})}
                  >
                    <option value="">Select Type</option>
                    <option value="Internal">Internal</option>
                    <option value="External (Vendor)">External (Vendor)</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Supporting Person Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={currentIssue.supportingPersonName || ''} 
                    onChange={e => setCurrentIssue({...currentIssue, supportingPersonName: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="form-group flex-1">
                  <label className="form-label">Date of Issue Closed</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={currentIssue.dateOfIssue || ''} 
                    onChange={e => setCurrentIssue({...currentIssue, dateOfIssue: e.target.value})} 
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Evidence Image Attachment</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="form-input" 
                    style={{ padding: '0.375rem 0.5rem', height: 'auto' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCurrentIssue({...currentIssue, evidenceFile: file}); 
                      }
                    }} 
                  />
                  {currentIssue.evidenceUrl && <div className="text-sm text-primary mt-1"><a href={currentIssue.evidenceUrl} target="_blank" rel="noreferrer">View Current Attachment</a></div>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Remarks / Description of Issue</label>
                <textarea 
                  className="form-input" 
                  rows={3}
                  placeholder="Describe the issue..."
                  value={currentIssue.remarks || ''} 
                  onChange={e => setCurrentIssue({...currentIssue, remarks: e.target.value})} 
                />
              </div>

              <div className="flex justify-end gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'var(--muted)', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="/logo.jpg" alt="INDO TECH" style={{ height: '32px', objectFit: 'contain' }} />
                <div style={{ height: '24px', width: '2px', backgroundColor: 'var(--border)' }}></div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Issue Details</h2>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} style={{ color: 'var(--muted-foreground)', padding: '0.5rem', borderRadius: '50%', backgroundColor: 'transparent', border: '1px solid var(--border)', cursor: 'pointer' }} className="hover:bg-slate-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Application Name</p>
                  <div className="text-base font-bold text-slate-900 bg-slate-50 px-3 py-3 rounded-lg border border-slate-200">
                    {currentIssue.applicationName}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Report Date</p>
                  <div className="text-sm font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {currentIssue.date}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date of Issue Closed</p>
                  <div className="text-sm font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {currentIssue.dateOfIssue || '-'}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Concerned Person</p>
                  <div className="text-sm font-medium text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {currentIssue.concernedPerson || '-'}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reported Dept</p>
                  <div className="text-sm font-medium text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {currentIssue.reportedDept || '-'}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Support ({currentIssue.supportingPersonType})</p>
                  <div className="text-sm font-medium text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {currentIssue.supportingPersonName || '-'}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status & Comms</p>
                  <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 h-[38px]">
                    <div>{getStatusBadge(currentIssue.status as IssueStatus, currentIssue.id || '')}</div>
                    <div style={{ height: '20px', width: '1px', backgroundColor: '#cbd5e1' }}></div>
                    <span className="font-bold text-slate-700">Comms: {currentIssue.communicationStatus ? 'Y' : 'N'}</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Remarks</p>
                  <div className="text-sm text-slate-800 bg-slate-50 px-3 py-3 rounded-lg border border-slate-200">
                    {currentIssue.remarks || 'No remarks provided.'}
                  </div>
                </div>
                {currentIssue.evidenceUrl && (
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Evidence Attachment</p>
                    <a href={currentIssue.evidenceUrl} target="_blank" rel="noreferrer">
                      <img src={currentIssue.evidenceUrl} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '0.5rem', border: '1px solid var(--border)' }} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--muted)', padding: '1rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={() => setIsViewModalOpen(false)}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

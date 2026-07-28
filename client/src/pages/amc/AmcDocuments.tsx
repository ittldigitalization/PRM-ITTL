import { useState, useRef, useEffect } from 'react';
import { Search, Upload, Download, Trash2, X, File } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Document {
  id: string;
  amcId: string;
  amcNumber: string;
  customerName: string;
  fileName: string;
  file_url: string;
  uploadDate: string;
  size: string;
}

export default function AmcDocuments() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAmcId, setSelectedAmcId] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    fetchContracts();
    fetchDocuments();

    const sub = supabase
      .channel('amc_documents_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amc_documents' }, () => {
        fetchDocuments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const fetchContracts = async () => {
    const { data } = await supabase.from('amc_contracts').select('id, amc_number, customers(name)');
    if (data) setContracts(data);
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('amc_documents').select('*, amc_contracts(amc_number, customers(name))').order('upload_date', { ascending: false });
      if (error) throw error;

      const formatted = data?.map(d => ({
        id: d.id,
        amcId: d.amc_id,
        amcNumber: d.amc_contracts?.amc_number || 'Unknown AMC',
        customerName: d.amc_contracts?.customers?.name || 'Unknown Customer',
        fileName: d.file_name,
        file_url: d.file_url,
        uploadDate: new Date(d.upload_date).toLocaleString(),
        size: d.size_str
      })) || [];
      
      setDocuments(formatted);
    } catch (error) {
      console.error('Error fetching AMC documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(d => 
    d.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.amcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUploadClick = () => {
    if (!selectedAmcId) {
      alert('Please select an AMC Contract first before uploading.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (selectedAmcId) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!selectedAmcId) {
      alert('Please select an AMC Contract first before uploading.');
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedAmcId) await processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (file: File) => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    
    try {
      // 1. Upload to Supabase Storage
      const filePath = `amc_files/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('PRM document files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('PRM document files')
        .getPublicUrl(filePath);

      // 3. Save to database
      const dbDoc = {
        amc_id: selectedAmcId,
        file_name: file.name,
        file_url: publicUrlData.publicUrl,
        size_str: sizeMB
      };

      const { error } = await supabase.from('amc_documents').insert([dbDoc]);
      if (error) throw error;
      
      setIsModalOpen(false);
      setSelectedAmcId('');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error saving document:', error);
      alert('Failed to save document: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        const { error } = await supabase.from('amc_documents').delete().eq('id', id);
        if (error) throw error;
        fetchDocuments();
      } catch (error: any) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document: ' + (error.message || JSON.stringify(error)));
      }
    }
  };

  const openDocument = (doc: Document) => {
    let urlToOpen = doc.file_url;
    if (!urlToOpen || urlToOpen === 'mock_url' || !urlToOpen.startsWith('http')) {
      // Try to construct URL if missing or mock
      const { data } = supabase.storage.from('PRM document files').getPublicUrl(`amc_files/${doc.fileName}`);
      urlToOpen = data.publicUrl;
    }
    window.open(urlToOpen, '_blank');
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search documents, AMC..."
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => { setIsModalOpen(true); setSelectedAmcId(''); }}
        >
          <Upload size={18} style={{ marginRight: '0.5rem' }} />
          Upload Document
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>AMC Number</th>
              <th>Customer</th>
              <th>Size</th>
              <th>Upload Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map(doc => (
              <tr key={doc.id}>
                <td className="font-medium text-primary">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:underline"
                    onClick={() => openDocument(doc)}
                  >
                    <File size={16} />
                    {doc.fileName}
                  </div>
                </td>
                <td className="font-bold">{doc.amcNumber}</td>
                <td>{doc.customerName}</td>
                <td>{doc.size}</td>
                <td className="text-muted-foreground">{doc.uploadDate}</td>
                <td>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem' }} 
                      title="Download"
                      onClick={() => openDocument(doc)}
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem', color: 'var(--destructive)' }} 
                      title="Delete"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Loading documents...</td>
              </tr>
            )}
            {!loading && filteredDocuments.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                  No documents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2 className="text-lg font-bold">Upload AMC Document</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Select AMC Contract</label>
                <select 
                  className="form-input"
                  value={selectedAmcId}
                  onChange={e => setSelectedAmcId(e.target.value)}
                >
                  <option value="">Select Contract...</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>{c.amc_number} - {c.customers?.name}</option>
                  ))}
                </select>
              </div>

              <div 
                style={{ 
                  border: '2px dashed var(--border)', 
                  borderRadius: '0.5rem', 
                  padding: '3rem', 
                  textAlign: 'center',
                  cursor: selectedAmcId ? 'pointer' : 'not-allowed',
                  opacity: selectedAmcId ? 1 : 0.5,
                  backgroundColor: isDragging ? 'var(--secondary)' : 'transparent',
                  transition: 'all 0.2s'
                }}
                onClick={handleUploadClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload size={48} style={{ margin: '0 auto', color: 'var(--muted-foreground)', marginBottom: '1rem' }} />
                <p className="font-medium">
                  {isDragging ? 'Drop file here!' : 'Click to browse or drag and drop'}
                </p>
                <p className="text-sm text-muted mt-1">PDF, DOCX, PNG, JPG (Max 10MB)</p>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const fs = require('fs');
const files = [
  'client/src/pages/MilestoneManagement.tsx',
  'client/src/pages/TaskManagement.tsx',
  'client/src/pages/DPR.tsx',
  'client/src/pages/IssueTracker.tsx',
  'client/src/pages/BillingManagement.tsx',
  'client/src/pages/amc/AmcContracts.tsx',
  'client/src/pages/amc/AmcPayments.tsx',
  'client/src/pages/amc/AmcVisits.tsx',
  'client/src/pages/amc/AmcDocuments.tsx',
  'client/src/pages/amc/AmcHistory.tsx'
];

const replacement = `      <div style={{ marginBottom: '1rem' }}>
        <button 
          className="btn btn-primary"
          onClick={() => window.history.back()}
          style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--primary)', color: 'white' }}
        >
          Back
        </button>
      </div>

      <div className="table-container">`;

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('onClick={() => window.history.back()}')) {
      content = content.replace(/^[ \t]*<div className="table-container">/m, replacement);
      fs.writeFileSync(file, content);
      console.log('Updated ' + file);
    }
  }
});

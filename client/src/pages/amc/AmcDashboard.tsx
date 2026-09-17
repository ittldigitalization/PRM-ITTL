import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileText, 
  AlertCircle, 
  CalendarClock, 
  IndianRupee, 
  CreditCard 
} from 'lucide-react';

export default function AmcDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeContracts: 0,
    expiredContracts: 0,
    upcomingRenewals: 0,
    overallBudget: 0,
    actualBudget: 0,
    totalCollected: 0,
    remainingBudget: 0,
    scheduledVisits: 0,
    completedVisits: 0
  });

  useEffect(() => {
    fetchDashboardData();

    // Setup realtime subscriptions
    const subContracts = supabase.channel('amc_dash_contracts').on('postgres_changes', { event: '*', schema: 'public', table: 'amc_contracts' }, fetchDashboardData).subscribe();
    const subVisits = supabase.channel('amc_dash_visits').on('postgres_changes', { event: '*', schema: 'public', table: 'amc_visits' }, fetchDashboardData).subscribe();
    const subPayments = supabase.channel('amc_dash_payments').on('postgres_changes', { event: '*', schema: 'public', table: 'amc_payments' }, fetchDashboardData).subscribe();

    return () => {
      supabase.removeChannel(subContracts);
      supabase.removeChannel(subVisits);
      supabase.removeChannel(subPayments);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {

      
      const [contractsRes, visitsRes, paymentsRes] = await Promise.all([
        supabase.from('amc_contracts').select('*'),
        supabase.from('amc_visits').select('*'),
        supabase.from('amc_payments').select('*')
      ]);

      const contracts = contractsRes.data || [];
      const visits = visitsRes.data || [];
      const payments = paymentsRes.data || [];

      // Calculate stats
      const activeContracts = contracts.filter(c => c.status === 'Active').length;
      const expiredContracts = contracts.filter(c => c.status === 'Expired').length;
      const upcomingRenewals = contracts.filter(c => c.status === 'Renewal Due').length;
      
      // Calculate Overall Budget (sum of all contract amounts)
      const overallBudget = contracts.reduce((sum, c) => sum + (Number(c.contract_amount) || 0), 0);
      
      // Calculate Actual Budget (sum of Total Invoiced: Base + GST)
      const actualBudget = payments.reduce((sum, p) => sum + ((Number(p.amount) || 0) + (Number(p.gst) || 0)), 0);
      
      // Calculate Total Collected (sum of Paid amounts)
      const totalCollected = payments.reduce((sum, p) => sum + (Number(p.paid_amount) || 0), 0);
      
      // Calculate Remaining Budget (Overall Contract - Actual Billed)
      const remainingBudget = overallBudget - actualBudget;

      const scheduledVisits = visits.filter(v => v.visit_status === 'Scheduled').length;
      const completedVisits = visits.filter(v => v.visit_status === 'Completed').length;

      setStats({
        activeContracts,
        expiredContracts,
        upcomingRenewals,
        overallBudget,
        actualBudget,
        totalCollected,
        remainingBudget,
        scheduledVisits,
        completedVisits
      });

    } catch (error) {
      console.error('Error fetching AMC dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, delay, subtext }: any) => (
    <div className="card glass-card animate-fade-in" style={{ animationDelay: delay }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <h3 className="text-3xl mt-1 text-slate-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl shadow-sm ${colorClass}`}>
          <Icon size={24} />
        </div>
      </div>
      {subtext && (
        <div className="text-sm">
          <span className="font-medium text-muted">{subtext}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-2">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800">AMC Analytics</h1>
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

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading AMC Analytics...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <StatCard 
            title="Active Contracts" 
            value={stats.activeContracts} 
            icon={FileText} 
            colorClass="bg-blue-50 text-blue-700"
            delay="0s" 
            subtext="Currently active maintenance"
          />
          <StatCard 
            title="Expired Contracts" 
            value={stats.expiredContracts} 
            icon={AlertCircle} 
            colorClass="bg-red-50 text-red-700"
            delay="0.1s" 
            subtext="Needs immediate renewal"
          />
          <StatCard 
            title="Upcoming Renewals" 
            value={stats.upcomingRenewals} 
            icon={CalendarClock} 
            colorClass="bg-amber-50 text-amber-700"
            delay="0.2s" 
            subtext="Due for renewal soon"
          />
          <StatCard 
            title="Overall Budget" 
            value={`₹${stats.overallBudget.toLocaleString()}`} 
            icon={FileText} 
            colorClass="bg-blue-50 text-blue-700"
            delay="0.3s" 
            subtext="Total AMC contract value"
          />
          <StatCard 
            title="Actual Budget (Billed)" 
            value={`₹${stats.actualBudget.toLocaleString()}`} 
            icon={FileText} 
            colorClass="bg-purple-50 text-purple-700"
            delay="0.4s" 
            subtext="Total invoiced (Base + GST)"
          />
          <StatCard 
            title="Total Collected" 
            value={`₹${stats.totalCollected.toLocaleString()}`} 
            icon={IndianRupee} 
            colorClass="bg-emerald-50 text-emerald-700"
            delay="0.5s" 
            subtext="Total payments received"
          />
          <StatCard 
            title="Remaining Budget" 
            value={`₹${stats.remainingBudget.toLocaleString()}`} 
            icon={CreditCard} 
            colorClass="bg-orange-50 text-orange-700"
            delay="0.6s" 
            subtext="Balance left to bill"
          />
        </div>
      )}
    </div>
  );
}

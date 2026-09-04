import { useState } from 'react';
import { Sidebar, type PageId } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Payments } from '@/pages/Payments';
import { Customers } from '@/pages/Customers';
import { Analytics } from '@/pages/Analytics';
import { AuditLogs } from '@/pages/AuditLogs';

function App() {
  const [page, setPage] = useState<PageId>('dashboard');

  return (
    <div className="min-h-screen bg-navy-950">
      <Sidebar activePage={page} onNavigate={setPage} />

      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-navy-900/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple to-cyan flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="white">
              <path d="M13 2L4.09 12.97a1 1 0 00.77 1.63h6.14L10 22l8.91-10.97a1 1 0 00-.77-1.63H12L13 2z" />
            </svg>
          </div>
          <span className="font-display font-bold text-white">PayPop</span>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'payments' && <Payments />}
          {page === 'customers' && <Customers />}
          {page === 'analytics' && <Analytics />}
          {page === 'audit' && <AuditLogs />}
        </div>
      </main>
    </div>
  );
}

export default App;

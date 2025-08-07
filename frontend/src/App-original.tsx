import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import OpportunityDetail from './pages/OpportunityDetail';
import Contracts from './pages/Contracts';
import Intelligence from './pages/Intelligence';
import Watchlists from './pages/Watchlists';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout><Navigate to="/dashboard" replace /></Layout>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Layout><Dashboard /></Layout>} />
              <Route path="opportunities" element={<Layout><Opportunities /></Layout>} />
              <Route path="opportunities/:id" element={<Layout><OpportunityDetail /></Layout>} />
              <Route path="contracts" element={<Layout><Contracts /></Layout>} />
              <Route path="intelligence" element={<Layout><Intelligence /></Layout>} />
              <Route path="watchlists" element={<Layout><Watchlists /></Layout>} />
              <Route path="analytics" element={<Layout><Analytics /></Layout>} />
              <Route path="settings" element={<Layout><Settings /></Layout>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

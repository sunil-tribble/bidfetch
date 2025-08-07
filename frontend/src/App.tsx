import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import OpportunityDetail from './pages/OpportunityDetail';
import Analytics from './pages/Analytics';
import Intelligence from './pages/Intelligence';
import Settings from './pages/Settings';
import DocumentViewer from './pages/DocumentViewer';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { WebSocketProvider } from './context/WebSocketContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 404) return false;
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <WebSocketProvider>
              <Router>
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/search" element={<Search />} />
                      <Route path="/opportunity/:id" element={<OpportunityDetail />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/intelligence" element={<Intelligence />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/document/:id" element={<DocumentViewer />} />
                    </Routes>
                  </Layout>
                </div>
              </Router>
            </WebSocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
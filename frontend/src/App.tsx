import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import OpportunityDetail from './pages/OpportunityDetail';
import Analytics from './pages/Analytics';
import Intelligence from './pages/Intelligence';
import Settings from './pages/Settings';
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
                <Routes>
                  <Route path="/" element={<Layout><Home /></Layout>} />
                  <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                  <Route path="/search" element={<Layout><Search /></Layout>} />
                  <Route path="/opportunity/:id" element={<Layout><OpportunityDetail /></Layout>} />
                  <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
                  <Route path="/intelligence" element={<Layout><Intelligence /></Layout>} />
                  <Route path="/settings" element={<Layout><Settings /></Layout>} />
                </Routes>
              </Router>
            </WebSocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
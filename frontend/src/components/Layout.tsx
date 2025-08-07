import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  BarChart3, 
  Brain, 
  Settings, 
  Bell, 
  User, 
  Menu,
  X,
  Target,
  FileText,
  Activity,
  Globe
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import SearchBar from './SearchBar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const { status } = useWebSocket();
  const { notifications } = useNotifications();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Target, current: location.pathname === '/' },
    { name: 'Search', href: '/search', icon: Search, current: location.pathname === '/search' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, current: location.pathname === '/analytics' },
    { name: 'Intelligence', href: '/intelligence', icon: Brain, current: location.pathname === '/intelligence' },
    { name: 'Settings', href: '/settings', icon: Settings, current: location.pathname === '/settings' },
  ];

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 glass-strong rounded-r-xl border-r border-white/20">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">BidFetch</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:bg-white/10 rounded-lg p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-3 mt-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg mb-1 transition-all duration-200 ${
                    item.current
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="glass-strong border-r border-white/20 backdrop-blur-xl">
          {/* Logo */}
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse-slow">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white gradient-text">BidFetch</span>
            </div>
          </div>

          {/* Status indicator */}
          <div className="px-6 pb-4">
            <div className="flex items-center space-x-2 text-sm text-white/70">
              <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
              <span className="capitalize">{status === 'connected' ? 'Live Data' : status}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    item.current
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                    item.current ? 'text-white' : 'text-white/50 group-hover:text-white/70'
                  }`} />
                  {item.name}
                  {item.current && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-6">
            <div className="glass rounded-lg p-3 text-center">
              <div className="flex items-center justify-center space-x-2 text-white/70 text-xs">
                <Globe className="h-4 w-4" />
                <span>6 Data Sources Active</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-white/50 text-xs mt-1">
                <Activity className="h-3 w-3" />
                <span>Real-time Monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="glass-strong sticky top-0 z-40 backdrop-blur-xl border-b border-white/10">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search bar */}
            <div className="flex-1 max-w-2xl mx-4">
              <SearchBar />
            </div>

            {/* Right side buttons */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="text-white hover:bg-white/10 rounded-lg p-2 transition-colors relative"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {notifications.length > 9 ? '9+' : notifications.length}
                      </span>
                    </div>
                  )}
                </button>
                
                {notificationsOpen && (
                  <NotificationPanel onClose={() => setNotificationsOpen(false)} />
                )}
              </div>

              {/* User menu */}
              <button className="text-white hover:bg-white/10 rounded-lg p-2 transition-colors">
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-screen">
          <div className="animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
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
  Globe,
  Home
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
    { name: 'Home', href: '/', icon: Home, current: location.pathname === '/' },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3, current: location.pathname === '/dashboard' },
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
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl border-r border-gray-200">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-blue-500 to-primary-blue-600 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">BidFetch</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:bg-gray-100 rounded-lg p-1 transition-colors"
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
                      ? 'bg-primary-blue-50 text-primary-blue-700 border border-primary-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
        <div className="bg-white border-r border-gray-200 shadow-sm">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-blue-500 to-primary-blue-600 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">BidFetch</span>
            </div>
          </div>

          {/* Status indicator */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
              <span className="capitalize">{status === 'connected' ? 'Live Data' : status}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    item.current
                      ? 'bg-primary-blue-50 text-primary-blue-700 border border-primary-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                    item.current ? 'text-primary-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                  {item.name}
                  {item.current && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-primary-blue-500" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100">
            <div className="card-tribble p-3 text-center bg-gray-50">
              <div className="flex items-center justify-center space-x-2 text-gray-600 text-xs">
                <Globe className="h-4 w-4" />
                <span>6 Data Sources Active</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs mt-1">
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
        <div className="bg-white/95 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors"
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
                  className="text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors relative"
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
              <button className="text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors">
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
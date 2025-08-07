import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Clock, 
  DollarSign,
  Globe,
  Zap,
  Target,
  ArrowUpRight,
  Calendar,
  Building,
  Award,
  Activity,
  Eye,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useWebSocket } from '../context/WebSocketContext';
import { useNotifications } from '../context/NotificationContext';

interface OpportunityStats {
  total: number;
  active: number;
  new_today: number;
  closing_soon: number;
  total_value: number;
  sources_active: number;
  avg_response_time: number;
}

interface RecentOpportunity {
  id: string;
  title: string;
  agency: string;
  status: string;
  deadline: string;
  value: number;
  source: string;
  naics_codes: string[];
}

interface TrendData {
  date: string;
  opportunities: number;
  value: number;
}

interface SourceData {
  name: string;
  count: number;
  value: number;
  color: string;
}

const Dashboard: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [liveCount, setLiveCount] = useState(0);
  const { status, subscribe } = useWebSocket();
  const { addNotification } = useNotifications();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<OpportunityStats>({
    queryKey: ['dashboard-stats', selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/stats?range=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent opportunities
  const { data: recentOpportunities, isLoading: opportunitiesLoading, refetch: refetchOpportunities } = useQuery<RecentOpportunity[]>({
    queryKey: ['recent-opportunities'],
    queryFn: async () => {
      const response = await fetch('/api/opportunities?limit=10&sort=created_desc');
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      const data = await response.json();
      return data.data;
    },
    refetchInterval: 30000,
  });

  // Fetch trend data
  const { data: trendData, isLoading: trendLoading } = useQuery<TrendData[]>({
    queryKey: ['trend-data', selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/trends?range=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch trends');
      return response.json();
    },
  });

  // Fetch source breakdown
  const { data: sourceData, isLoading: sourceLoading } = useQuery<SourceData[]>({
    queryKey: ['source-breakdown'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/sources');
      if (!response.ok) throw new Error('Failed to fetch source data');
      return response.json();
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeNew = subscribe('new_opportunity', (data) => {
      setLiveCount(prev => prev + 1);
      refetchStats();
      refetchOpportunities();
    });

    const unsubscribeUpdate = subscribe('opportunity_update', () => {
      refetchStats();
      refetchOpportunities();
    });

    return () => {
      unsubscribeNew();
      unsubscribeUpdate();
    };
  }, [subscribe, refetchStats, refetchOpportunities]);

  const timeRanges = [
    { value: '1d', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
  ];

  const mockTrendData = [
    { date: '2024-01', opportunities: 45, value: 12500000 },
    { date: '2024-02', opportunities: 52, value: 15200000 },
    { date: '2024-03', opportunities: 48, value: 13800000 },
    { date: '2024-04', opportunities: 61, value: 18900000 },
    { date: '2024-05', opportunities: 57, value: 16700000 },
    { date: '2024-06', opportunities: 73, value: 21400000 },
    { date: '2024-07', opportunities: 69, value: 19800000 },
  ];

  const mockSourceData = [
    { name: 'SAM.gov', count: 1247, value: 45600000, color: '#3B82F6' },
    { name: 'Grants.gov', count: 892, value: 28900000, color: '#10B981' },
    { name: 'TED EU', count: 654, value: 19400000, color: '#F59E0B' },
    { name: 'UK Contracts', count: 423, value: 12800000, color: '#8B5CF6' },
    { name: 'FPDS', count: 789, value: 34200000, color: '#EF4444' },
    { name: 'UN Global', count: 321, value: 8900000, color: '#06B6D4' },
  ];

  // Mock stats data
  const mockStats = {
    total: 4326,
    active: 2847,
    new_today: 127,
    closing_soon: 384,
    total_value: 2400000000,
    sources_active: 6,
    avg_response_time: 45
  };

  const mockRecentOpportunities = [
    {
      id: '1',
      title: 'Cloud Infrastructure Modernization Services',
      agency: 'Department of Defense',
      status: 'active',
      deadline: '2024-09-15',
      value: 25000000,
      source: 'SAM.gov',
      naics_codes: ['541511', '541512']
    },
    {
      id: '2', 
      title: 'AI-Powered Data Analytics Platform',
      agency: 'Department of Veterans Affairs',
      status: 'active',
      deadline: '2024-08-28',
      value: 15000000,
      source: 'Grants.gov',
      naics_codes: ['541511']
    },
    {
      id: '3',
      title: 'Cybersecurity Assessment and Implementation',
      agency: 'General Services Administration',
      status: 'active',
      deadline: '2024-09-30',
      value: 8500000,
      source: 'FPDS',
      naics_codes: ['541512']
    },
    {
      id: '4',
      title: 'Green Energy Infrastructure Development',
      agency: 'Department of Energy',
      status: 'active',
      deadline: '2024-10-15',
      value: 45000000,
      source: 'SAM.gov',
      naics_codes: ['237130']
    },
    {
      id: '5',
      title: 'Medical Equipment Procurement and Support',
      agency: 'Department of Health and Human Services',
      status: 'closing_soon',
      deadline: '2024-08-20',
      value: 12000000,
      source: 'Grants.gov',
      naics_codes: ['334510']
    }
  ];

  const displayStats = stats || mockStats;
  const displayOpportunities = recentOpportunities || mockRecentOpportunities;

  if (statsLoading || opportunitiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with real-time indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2 animate-slide-up">
                Procurement Intelligence
              </h1>
              <p className="text-gray-600 text-lg">
                Real-time insights across 6 global procurement platforms
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {liveCount > 0 && (
                <div className="card-tribble rounded-lg px-4 py-2 bg-accent-green-50 border border-accent-green-200">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-accent-green-500 rounded-full animate-pulse" />
                    <span className="text-accent-green-700 text-sm font-medium">+{liveCount} new</span>
                  </div>
                </div>
              )}
              <div className="card-tribble rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Activity className={`h-4 w-4 ${status === 'connected' ? 'text-accent-green-500' : 'text-warning'}`} />
                  <span className="text-gray-700 text-sm capitalize">
                    {status === 'connected' ? 'Live' : status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8">
          <div className="bg-white rounded-xl p-1 inline-flex space-x-1 border border-gray-200 shadow-sm">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedTimeRange(range.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selectedTimeRange === range.value
                    ? 'bg-primary-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-tribble card-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Opportunities</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {displayStats.total.toLocaleString()}
                </p>
                <div className="flex items-center mt-2 text-success">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">+12.5%</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-primary-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary-blue-600" />
              </div>
            </div>
          </div>

          <div className="card-tribble card-hover animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Active Now</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {displayStats.active.toLocaleString()}
                </p>
                <div className="flex items-center mt-2 text-success">
                  <Activity className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Live</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-accent-green-100 rounded-xl flex items-center justify-center">
                <Zap className="h-6 w-6 text-accent-green-600" />
              </div>
            </div>
          </div>

          <div className="card-tribble card-hover animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Closing Soon</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {displayStats.closing_soon.toLocaleString()}
                </p>
                <div className="flex items-center mt-2 text-warning">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">&lt; 7 days</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="card-tribble card-hover animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Value</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  ${(displayStats.total_value / 1000000000).toFixed(1)}B
                </p>
                <div className="flex items-center mt-2 text-primary-blue-600">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">USD</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Award className="h-6 w-6 text-primary-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Trends Chart */}
          <div className="card-tribble animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Opportunity Trends
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData || mockTrendData}>
                  <defs>
                    <linearGradient id="colorOpportunities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#374151'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="opportunities" 
                    stroke="#3B82F6" 
                    fillOpacity={1} 
                    fill="url(#colorOpportunities)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sources Breakdown */}
          <div className="card-tribble animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Data Sources
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData || mockSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {(sourceData || mockSourceData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#374151'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {(sourceData || mockSourceData).map((source) => (
                <div key={source.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: source.color }} 
                    />
                    <span className="text-gray-700 text-sm">{source.name}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{source.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Opportunities */}
        <div className="card-tribble animate-slide-up" style={{ animationDelay: '0.7s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Recent Opportunities
            </h3>
            <Link 
              to="/search"
              className="flex items-center text-primary-blue-600 hover:text-primary-blue-700 transition-colors"
            >
              <span className="text-sm font-medium mr-1">View All</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {displayOpportunities.slice(0, 5).map((opportunity) => (
              <div key={opportunity.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all duration-200 group border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`h-3 w-3 rounded-full ${
                          opportunity.status === 'active' ? 'bg-accent-green-500' : 
                          opportunity.status === 'closed' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-gray-800 font-medium text-sm group-hover:text-primary-blue-600 transition-colors truncate">
                          <Link to={`/opportunity/${opportunity.id}`}>
                            {opportunity.title}
                          </Link>
                        </h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-gray-500 text-xs">
                            <Building className="h-3 w-3 mr-1" />
                            <span>{opportunity.agency}</span>
                          </div>
                          <div className="flex items-center text-gray-500 text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            <span>{opportunity.source}</span>
                          </div>
                          <div className="flex items-center text-gray-500 text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{new Date(opportunity.deadline).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-gray-800 font-medium text-sm">
                        ${(opportunity.value / 1000000).toFixed(1)}M
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Footer Summary */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-200 animate-slide-up" style={{ animationDelay: '1.3s' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {analyticsStats?.summary.total_opportunities.toLocaleString() || '0'}
              </div>
              <div className="text-gray-600 text-sm mt-1">Total Opportunities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(analyticsStats?.summary.total_value || 0)}
              </div>
              <div className="text-gray-600 text-sm mt-1">Total Value</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(analyticsStats?.summary.avg_value || 0)}
              </div>
              <div className="text-gray-600 text-sm mt-1">Average Value</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {analyticsStats?.summary.active_sources || 0}
              </div>
              <div className="text-gray-600 text-sm mt-1">Active Sources</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
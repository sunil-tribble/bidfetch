import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  FileText,
  Briefcase,
  DollarSign,
  Calendar,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Clock,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { opportunitiesApi, contractsApi, intelligenceApi } from '../services/api';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  // Fetch dashboard data
  const { data: opportunities } = useQuery({
    queryKey: ['opportunities', 'recent'],
    queryFn: () => opportunitiesApi.search({ limit: 10, sort: 'posted_date', order: 'desc' }),
  });

  const { data: expiringContracts } = useQuery({
    queryKey: ['contracts', 'expiring'],
    queryFn: () => contractsApi.getExpiring(6),
  });

  const { data: recompetes } = useQuery({
    queryKey: ['recompetes'],
    queryFn: () => intelligenceApi.getRecompetePredictions(12),
  });

  // Mock data for charts
  const trendData = [
    { name: 'Jan', opportunities: 245, contracts: 120, value: 45000000 },
    { name: 'Feb', opportunities: 312, contracts: 145, value: 52000000 },
    { name: 'Mar', opportunities: 289, contracts: 132, value: 48000000 },
    { name: 'Apr', opportunities: 378, contracts: 168, value: 61000000 },
    { name: 'May', opportunities: 423, contracts: 189, value: 72000000 },
    { name: 'Jun', opportunities: 456, contracts: 201, value: 78000000 },
  ];

  const sourceDistribution = [
    { name: 'SAM.gov', value: 45, color: '#3b82f6' },
    { name: 'Grants.gov', value: 20, color: '#10b981' },
    { name: 'TED EU', value: 15, color: '#f59e0b' },
    { name: 'UK Contracts', value: 12, color: '#8b5cf6' },
    { name: 'UNGM', value: 8, color: '#ef4444' },
  ];

  const stats = [
    {
      name: 'Active Opportunities',
      value: '1,234',
      change: '+12.3%',
      trend: 'up',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Total Contract Value',
      value: '$458M',
      change: '+8.7%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Expiring Contracts',
      value: '87',
      change: '18 this month',
      trend: 'neutral',
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      name: 'Win Probability',
      value: '68%',
      change: '+5.2%',
      trend: 'up',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's your procurement intelligence overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    {stat.trend === 'up' && <ArrowUp className="h-3 w-3 text-green-500 mr-1" />}
                    {stat.trend === 'down' && <ArrowDown className="h-3 w-3 text-red-500 mr-1" />}
                    {stat.change}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Opportunities Trend */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Opportunity Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="opportunities"
                stroke="#3b82f6"
                fill="#93bbfc"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="contracts"
                stroke="#10b981"
                fill="#86efac"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Source Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Opportunities by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sourceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Opportunities */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Opportunities</h3>
              <Link to="/opportunities" className="text-sm text-primary-600 hover:text-primary-700">
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {opportunities?.data?.slice(0, 5).map((opp: any) => (
              <Link
                key={opp.id}
                to={`/opportunities/${opp.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {opp.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{opp.agency_name}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Due {format(new Date(opp.response_deadline), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ${(opp.estimated_value / 1000000).toFixed(1)}M
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        opp.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {opp.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Expiring Contracts */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Expiring Contracts</h3>
              <Link to="/contracts" className="text-sm text-primary-600 hover:text-primary-700">
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {expiringContracts?.slice(0, 5).map((contract: any) => (
              <div key={contract.contract_id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{contract.contractor_name}</p>
                    <p className="text-sm text-gray-500 mt-1">{contract.agency_name}</p>
                    <div className="flex items-center mt-2">
                      <AlertCircle className="h-3 w-3 text-yellow-500 mr-1" />
                      <span className="text-xs text-gray-500">
                        Expires in {contract.days_until_expiry} days
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ${(contract.current_value / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(contract.current_completion_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
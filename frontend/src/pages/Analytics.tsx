import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Building,
  Target,
  PieChart,
  Activity,
  Award,
  Globe,
  Filter,
  Download,
  Maximize2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';

interface AnalyticsData {
  trends: Array<{
    date: string;
    opportunities: number;
    value: number;
    activeContracts: number;
  }>;
  sourceBreakdown: Array<{
    name: string;
    opportunities: number;
    value: number;
    color: string;
  }>;
  agencyStats: Array<{
    name: string;
    opportunities: number;
    totalValue: number;
    avgValue: number;
  }>;
  industryAnalysis: Array<{
    naics: string;
    description: string;
    count: number;
    growth: number;
  }>;
  competitionMetrics: {
    avgBidders: number;
    winRate: number;
    avgResponseTime: number;
    successfulContracts: number;
  };
}

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('12m');
  const [selectedMetric, setSelectedMetric] = useState('opportunities');

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
  });

  // Mock analytics data
  const mockAnalytics: AnalyticsData = {
    trends: [
      { date: '2023-08', opportunities: 1234, value: 1.2e9, activeContracts: 456 },
      { date: '2023-09', opportunities: 1456, value: 1.4e9, activeContracts: 523 },
      { date: '2023-10', opportunities: 1678, value: 1.6e9, activeContracts: 612 },
      { date: '2023-11', opportunities: 1543, value: 1.5e9, activeContracts: 587 },
      { date: '2023-12', opportunities: 1789, value: 1.8e9, activeContracts: 678 },
      { date: '2024-01', opportunities: 1891, value: 1.9e9, activeContracts: 723 },
      { date: '2024-02', opportunities: 2012, value: 2.1e9, activeContracts: 756 },
      { date: '2024-03', opportunities: 1945, value: 2.0e9, activeContracts: 734 },
      { date: '2024-04', opportunities: 2156, value: 2.3e9, activeContracts: 812 },
      { date: '2024-05', opportunities: 2289, value: 2.4e9, activeContracts: 845 },
      { date: '2024-06', opportunities: 2345, value: 2.5e9, activeContracts: 891 },
      { date: '2024-07', opportunities: 2467, value: 2.6e9, activeContracts: 923 },
    ],
    sourceBreakdown: [
      { name: 'SAM.gov', opportunities: 45632, value: 12.4e9, color: '#3B82F6' },
      { name: 'Grants.gov', opportunities: 23451, value: 8.9e9, color: '#10B981' },
      { name: 'FPDS', opportunities: 18934, value: 15.2e9, color: '#EF4444' },
      { name: 'TED EU', opportunities: 15678, value: 6.7e9, color: '#F59E0B' },
      { name: 'UK Contracts', opportunities: 12345, value: 4.3e9, color: '#8B5CF6' },
      { name: 'UN Global', opportunities: 8976, value: 2.1e9, color: '#06B6D4' },
    ],
    agencyStats: [
      { name: 'Department of Defense', opportunities: 8934, totalValue: 45.6e9, avgValue: 5.1e6 },
      { name: 'Department of Veterans Affairs', opportunities: 5623, totalValue: 23.4e9, avgValue: 4.2e6 },
      { name: 'General Services Administration', opportunities: 4567, totalValue: 18.9e9, avgValue: 4.1e6 },
      { name: 'Department of Energy', opportunities: 3456, totalValue: 19.2e9, avgValue: 5.6e6 },
      { name: 'Department of Health and Human Services', opportunities: 6789, totalValue: 28.7e9, avgValue: 4.2e6 },
    ],
    industryAnalysis: [
      { naics: '541511', description: 'Custom Computer Programming Services', count: 2345, growth: 15.2 },
      { naics: '541512', description: 'Computer Systems Design Services', count: 1987, growth: 12.8 },
      { naics: '336411', description: 'Aircraft Manufacturing', count: 1654, growth: 8.9 },
      { naics: '541330', description: 'Engineering Services', count: 1432, growth: 11.5 },
      { naics: '541519', description: 'Other Computer Related Services', count: 1298, growth: 18.7 },
    ],
    competitionMetrics: {
      avgBidders: 4.2,
      winRate: 23.8,
      avgResponseTime: 45,
      successfulContracts: 1247
    }
  };

  const displayAnalytics = analytics || mockAnalytics;

  const timeRanges = [
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: '12m', label: '12 Months' },
    { value: '24m', label: '2 Years' },
  ];

  const formatValue = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-white/70">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 animate-slide-up">
            Analytics & Insights
          </h1>
          <p className="text-white/70 text-lg">
            Comprehensive analysis of procurement trends and market intelligence
          </p>
        </div>

        {/* Controls */}
        <div className="glass rounded-2xl p-6 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="text-white/70">Time Range:</div>
              <div className="glass rounded-xl p-1 inline-flex space-x-1">
                {timeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setTimeRange(range.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      timeRange === range.value
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="btn-secondary flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
              <button className="btn-primary flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 card-hover animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Market Value</p>
                <p className="text-3xl font-bold text-white mt-2">
                  $49.6B
                </p>
                <div className="flex items-center mt-2 text-green-400">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">+18.2%</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 card-hover animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Active Opportunities</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {displayAnalytics.competitionMetrics.successfulContracts.toLocaleString()}
                </p>
                <div className="flex items-center mt-2 text-blue-400">
                  <Activity className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Live Tracking</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 card-hover animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Avg Competition</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {displayAnalytics.competitionMetrics.avgBidders.toFixed(1)}
                </p>
                <div className="flex items-center mt-2 text-yellow-400">
                  <Building className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Bidders per RFP</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 card-hover animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Win Rate</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {displayAnalytics.competitionMetrics.winRate}%
                </p>
                <div className="flex items-center mt-2 text-purple-400">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Success Rate</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <PieChart className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Market Trends */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Market Trends
              </h3>
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <Maximize2 className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayAnalytics.trends}>
                  <defs>
                    <linearGradient id="opportunitiesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.6)" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white'
                    }} 
                    formatter={(value: any, name: string) => {
                      if (name === 'value') return [formatValue(value), 'Total Value'];
                      return [value.toLocaleString(), name === 'opportunities' ? 'Opportunities' : 'Active Contracts'];
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="opportunities" 
                    stroke="#3B82F6" 
                    fill="url(#opportunitiesGradient)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    fill="url(#valueGradient)" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="activeContracts" 
                    stroke="#F59E0B" 
                    strokeWidth={3}
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Source Distribution */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Source Distribution
              </h3>
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <Maximize2 className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={displayAnalytics.sourceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="opportunities"
                  >
                    {displayAnalytics.sourceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      value.toLocaleString(),
                      `${props.payload.name} Opportunities`
                    ]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {displayAnalytics.sourceBreakdown.map((source) => (
                <div key={source.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: source.color }} 
                    />
                    <span className="text-white/70">{source.name}</span>
                  </div>
                  <span className="text-white font-medium">{source.opportunities.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agency Performance & Industry Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Agencies */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.8s' }}>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Top Agencies by Volume
            </h3>
            <div className="space-y-4">
              {displayAnalytics.agencyStats.map((agency, index) => (
                <div key={agency.name} className="glass-strong rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">{agency.name}</div>
                        <div className="text-white/60 text-xs">{agency.opportunities.toLocaleString()} opportunities</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{formatValue(agency.totalValue)}</div>
                      <div className="text-white/60 text-xs">Total Value</div>
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${(agency.opportunities / Math.max(...displayAnalytics.agencyStats.map(a => a.opportunities))) * 100}%` 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Industry Growth */}
          <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.9s' }}>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Fastest Growing Industries
            </h3>
            <div className="space-y-4">
              {displayAnalytics.industryAnalysis.map((industry, index) => (
                <div key={industry.naics} className="glass-strong rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm mb-1">{industry.description}</div>
                      <div className="text-white/60 text-xs">NAICS {industry.naics} • {industry.count.toLocaleString()} opportunities</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      industry.growth > 15 ? 'bg-green-500/20 text-green-300' :
                      industry.growth > 10 ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      +{industry.growth}%
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        industry.growth > 15 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        industry.growth > 10 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                        'bg-gradient-to-r from-blue-400 to-blue-600'
                      }`}
                      style={{ width: `${(industry.growth / 20) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="glass rounded-2xl p-8 animate-slide-up" style={{ animationDelay: '1.0s' }}>
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Activity className="h-6 w-6 mr-3" />
            Executive Summary
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Key Insights</h4>
              <div className="space-y-3 text-white/80">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <p>Market value increased 18.2% year-over-year, reaching $49.6B total volume</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <p>Technology services (NAICS 541511/541512) show strongest growth at 15.2%</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                  <p>DoD remains largest buyer with $45.6B in annual contract value</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  <p>Average competition decreased to 4.2 bidders per opportunity</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Recommendations</h4>
              <div className="space-y-3 text-white/80">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <p>Focus on AI/ML and cybersecurity opportunities for highest growth potential</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <p>Expand capabilities in cloud modernization and digital transformation</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                  <p>Monitor smaller agencies for less competitive opportunities</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  <p>Prepare for increased ESG and sustainability requirements</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
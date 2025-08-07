import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
  Clock,
  Award,
  FileText,
  BarChart3,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Download,
  Bookmark,
  Star
} from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'opportunity_match' | 'market_trend' | 'competitive_intel' | 'risk_alert' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'normal' | 'low';
  data: any;
  created_at: string;
  source: string;
}

interface MarketPrediction {
  industry: string;
  naics: string;
  growthForecast: number;
  confidenceLevel: number;
  keyDrivers: string[];
  risks: string[];
  opportunities: number;
  timeframe: string;
}

interface CompetitiveAnalysis {
  opportunityId: string;
  competitorCount: number;
  winProbability: number;
  competitorProfiles: Array<{
    name: string;
    pastWins: number;
    strength: 'high' | 'medium' | 'low';
    specialization: string;
  }>;
  strategicRecommendations: string[];
}

const Intelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState('insights');
  const [insightFilter, setInsightFilter] = useState('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch AI insights
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery<AIInsight[]>({
    queryKey: ['ai-insights', insightFilter],
    queryFn: async () => {
      const response = await fetch(`/api/intelligence/insights?filter=${insightFilter}`);
      if (!response.ok) throw new Error('Failed to fetch insights');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch market predictions
  const { data: predictions, isLoading: predictionsLoading } = useQuery<MarketPrediction[]>({
    queryKey: ['market-predictions'],
    queryFn: async () => {
      const response = await fetch('/api/intelligence/predictions');
      if (!response.ok) throw new Error('Failed to fetch predictions');
      return response.json();
    },
  });

  // Mock data for demonstration
  const mockInsights: AIInsight[] = [
    {
      id: '1',
      type: 'opportunity_match',
      title: 'High-Value Cloud Modernization Match Detected',
      description: 'DoD cloud infrastructure RFP matches 94% of your capabilities. Similar past wins indicate 68% success probability.',
      confidence: 94,
      impact: 'high',
      urgency: 'urgent',
      data: {
        opportunityId: 'HC1028-24-R-0001',
        value: 25000000,
        deadline: '2024-09-15',
        matchFactors: ['Cloud expertise', 'Security clearance', 'DoD experience']
      },
      created_at: '2024-08-07T09:15:00Z',
      source: 'SAM.gov'
    },
    {
      id: '2',
      type: 'market_trend',
      title: 'AI/ML Services Market Surge Detected',
      description: 'AI/ML opportunities increased 187% in Q2. Recommend expanding capabilities to capture growing market.',
      confidence: 89,
      impact: 'high',
      urgency: 'normal',
      data: {
        growthRate: 187,
        marketSize: 2.1e9,
        projectedGrowth: 245
      },
      created_at: '2024-08-07T08:30:00Z',
      source: 'Multi-source analysis'
    },
    {
      id: '3',
      type: 'competitive_intel',
      title: 'Competitor Weakness Identified',
      description: 'Major competitor lost 3 key contracts due to security compliance issues. Opportunity to capture market share.',
      confidence: 76,
      impact: 'medium',
      urgency: 'normal',
      data: {
        competitor: 'TechCorp Solutions',
        lostContracts: 3,
        totalValue: 45000000
      },
      created_at: '2024-08-07T07:45:00Z',
      source: 'FPDS analysis'
    },
    {
      id: '4',
      type: 'risk_alert',
      title: 'Deadline Risk for Active Proposal',
      description: 'Proposal deadline in 3 days with 67% completion. Recommend immediate resource allocation.',
      confidence: 95,
      impact: 'high',
      urgency: 'urgent',
      data: {
        proposalId: 'PROP-2024-089',
        daysLeft: 3,
        completion: 67
      },
      created_at: '2024-08-07T06:20:00Z',
      source: 'Internal tracking'
    },
    {
      id: '5',
      type: 'recommendation',
      title: 'Strategic Partnership Opportunity',
      description: 'Small business set-aside surge detected. Partner with certified SDVOSB to access $890M in opportunities.',
      confidence: 82,
      impact: 'high',
      urgency: 'low',
      data: {
        setAsideType: 'SDVOSB',
        marketSize: 890000000,
        partnershipBenefits: ['Access to set-asides', 'Enhanced capabilities', 'Geographic expansion']
      },
      created_at: '2024-08-07T05:10:00Z',
      source: 'Strategic analysis'
    }
  ];

  const mockPredictions: MarketPrediction[] = [
    {
      industry: 'Cybersecurity Services',
      naics: '541512',
      growthForecast: 34.5,
      confidenceLevel: 89,
      keyDrivers: ['Increasing cyber threats', 'Zero-trust initiatives', 'Compliance requirements'],
      risks: ['Talent shortage', 'Budget constraints'],
      opportunities: 1247,
      timeframe: 'Next 12 months'
    },
    {
      industry: 'Cloud Computing Services',
      naics: '541511',
      growthForecast: 28.7,
      confidenceLevel: 92,
      keyDrivers: ['Digital transformation', 'Remote work adoption', 'Cost optimization'],
      risks: ['Vendor lock-in concerns', 'Security requirements'],
      opportunities: 987,
      timeframe: 'Next 12 months'
    },
    {
      industry: 'AI/ML Development',
      naics: '541511',
      growthForecast: 45.2,
      confidenceLevel: 76,
      keyDrivers: ['Automation initiatives', 'Data analytics needs', 'Decision support systems'],
      risks: ['Regulatory uncertainty', 'Ethical concerns'],
      opportunities: 654,
      timeframe: 'Next 12 months'
    }
  ];

  const displayInsights = insights || mockInsights;
  const displayPredictions = predictions || mockPredictions;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity_match': return Target;
      case 'market_trend': return TrendingUp;
      case 'competitive_intel': return Award;
      case 'risk_alert': return AlertTriangle;
      case 'recommendation': return Lightbulb;
      default: return Brain;
    }
  };

  const getInsightColor = (type: string, impact: string, urgency: string) => {
    if (urgency === 'urgent') return 'border-l-red-500 bg-red-500/10';
    if (impact === 'high') return 'border-l-blue-500 bg-blue-500/10';
    if (type === 'opportunity_match') return 'border-l-green-500 bg-green-500/10';
    return 'border-l-purple-500 bg-purple-500/10';
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'normal': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      refetchInsights();
    }, 3000);
  };

  const tabs = [
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'predictions', label: 'Market Predictions', icon: BarChart3 },
    { id: 'competitive', label: 'Competitive Analysis', icon: Award },
    { id: 'settings', label: 'AI Settings', icon: Settings },
  ];

  const insightFilters = [
    { value: 'all', label: 'All Insights' },
    { value: 'opportunity_match', label: 'Opportunity Matches' },
    { value: 'market_trend', label: 'Market Trends' },
    { value: 'competitive_intel', label: 'Competitive Intel' },
    { value: 'risk_alert', label: 'Risk Alerts' },
    { value: 'recommendation', label: 'Recommendations' },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 animate-slide-up">
            AI Intelligence Center
          </h1>
          <p className="text-white/70 text-lg">
            Powered by advanced machine learning for strategic procurement insights
          </p>
        </div>

        {/* Controls */}
        <div className="glass rounded-2xl p-6 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            {/* Tabs */}
            <div className="glass rounded-xl p-1 inline-flex space-x-1">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <TabIcon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                  isAnalyzing 
                    ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                    : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </button>
              <button className="btn-primary flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'insights' && (
          <>
            {/* Filters */}
            <div className="glass rounded-2xl p-6 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center space-x-4">
                <span className="text-white/70">Filter by:</span>
                <select
                  value={insightFilter}
                  onChange={(e) => setInsightFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {insightFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AI Insights */}
            <div className="space-y-6">
              {displayInsights.map((insight, index) => {
                const InsightIcon = getInsightIcon(insight.type);
                return (
                  <div 
                    key={insight.id} 
                    className={`glass rounded-2xl p-6 border-l-4 ${getInsightColor(insight.type, insight.impact, insight.urgency)} animate-slide-up`}
                    style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-white/10 rounded-xl">
                          <InsightIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-white">{insight.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getImpactBadge(insight.impact)}`}>
                              {insight.impact.toUpperCase()} IMPACT
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyBadge(insight.urgency)}`}>
                              {insight.urgency.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-white/80 mb-4">{insight.description}</p>
                          
                          {/* Confidence Score */}
                          <div className="flex items-center space-x-3 mb-4">
                            <span className="text-white/60 text-sm">Confidence:</span>
                            <div className="flex-1 bg-white/10 rounded-full h-2 max-w-xs">
                              <div 
                                className="bg-gradient-to-r from-blue-400 to-green-400 h-2 rounded-full transition-all duration-500" 
                                style={{ width: `${insight.confidence}%` }}
                              />
                            </div>
                            <span className="text-white font-medium text-sm">{insight.confidence}%</span>
                          </div>

                          {/* Additional Data */}
                          {insight.type === 'opportunity_match' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-white/5 rounded-lg">
                              <div>
                                <div className="text-white/60 text-xs">VALUE</div>
                                <div className="text-white font-bold">${(insight.data.value / 1000000).toFixed(1)}M</div>
                              </div>
                              <div>
                                <div className="text-white/60 text-xs">DEADLINE</div>
                                <div className="text-white font-bold">{new Date(insight.data.deadline).toLocaleDateString()}</div>
                              </div>
                              <div>
                                <div className="text-white/60 text-xs">MATCH FACTORS</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {insight.data.matchFactors?.slice(0, 2).map((factor: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                                      {factor}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                          <Bookmark className="h-4 w-4 text-white" />
                        </button>
                        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                          <Star className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-white/60">
                      <div className="flex items-center space-x-4">
                        <span>Source: {insight.source}</span>
                        <span>•</span>
                        <span>{new Date(insight.created_at).toLocaleString()}</span>
                      </div>
                      <button className="text-blue-400 hover:text-blue-300 transition-colors">
                        View Details →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'predictions' && (
          <div className="space-y-8">
            {displayPredictions.map((prediction, index) => (
              <div 
                key={prediction.industry} 
                className="glass rounded-2xl p-6 animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{prediction.industry}</h3>
                    <div className="flex items-center space-x-4 text-white/60">
                      <span>NAICS {prediction.naics}</span>
                      <span>•</span>
                      <span>{prediction.opportunities.toLocaleString()} opportunities</span>
                      <span>•</span>
                      <span>{prediction.timeframe}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-400">+{prediction.growthForecast}%</div>
                    <div className="text-white/60 text-sm">Projected Growth</div>
                  </div>
                </div>

                {/* Confidence Level */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70">Confidence Level</span>
                    <span className="text-white font-medium">{prediction.confidenceLevel}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-green-400 h-3 rounded-full transition-all duration-700" 
                      style={{ width: `${prediction.confidenceLevel}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Key Drivers */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                      Key Growth Drivers
                    </h4>
                    <div className="space-y-2">
                      {prediction.keyDrivers.map((driver, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          <span className="text-white/80">{driver}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risks */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-yellow-400" />
                      Potential Risks
                    </h4>
                    <div className="space-y-2">
                      {prediction.risks.map((risk, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                          <span className="text-white/80">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Recommendation */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="h-5 w-5 text-blue-400 mt-1" />
                    <div>
                      <div className="text-blue-300 font-medium mb-1">Strategic Recommendation</div>
                      <div className="text-white/80">
                        Position for {prediction.growthForecast}% market growth by developing capabilities in {prediction.keyDrivers[0].toLowerCase()}.
                        Monitor {prediction.opportunities} active opportunities in this sector.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'competitive' && (
          <div className="glass rounded-2xl p-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="text-center py-16">
              <Award className="h-16 w-16 text-white/40 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Competitive Analysis</h3>
              <p className="text-white/70 mb-6">
                Advanced competitive intelligence features coming soon. Analyze competitor strategies, 
                win rates, and market positioning.
              </p>
              <button className="btn-primary">
                Request Early Access
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="glass rounded-2xl p-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="text-2xl font-bold text-white mb-6">AI Configuration</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Analysis Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/70 mb-2">Analysis Frequency</label>
                    <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
                      <option>Real-time</option>
                      <option>Every 30 minutes</option>
                      <option>Hourly</option>
                      <option>Daily</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/70 mb-2">Confidence Threshold</label>
                    <input 
                      type="range" 
                      min="50" 
                      max="95" 
                      defaultValue="75" 
                      className="w-full" 
                    />
                    <div className="text-white/60 text-sm mt-1">Only show insights with 75%+ confidence</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Notification Preferences</h4>
                <div className="space-y-3">
                  {['High-value opportunities', 'Market trend alerts', 'Competitive intelligence', 'Risk warnings'].map((item) => (
                    <label key={item} className="flex items-center space-x-3">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-white/80">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Intelligence;
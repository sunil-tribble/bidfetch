import React from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Target,
  Brain,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Database,
  FileText,
  Users,
  Award,
  ArrowRight,
  CheckCircle,
  DollarSign,
  Clock,
  Building,
  BarChart3,
  Eye,
  Play
} from 'lucide-react';

const Home: React.FC = () => {
  const keyMetrics = [
    {
      icon: FileText,
      label: 'Active Opportunities',
      value: '12,847',
      change: '+234 this week',
      color: 'text-blue-600'
    },
    {
      icon: DollarSign,
      label: 'Total Contract Value',
      value: '$847.2B',
      change: '+$12.4B this month',
      color: 'text-green-600'
    },
    {
      icon: Database,
      label: 'Data Sources',
      value: '6',
      change: 'Real-time monitoring',
      color: 'text-purple-600'
    },
    {
      icon: Clock,
      label: 'Avg. Response Time',
      value: '< 2 mins',
      change: '99.9% uptime',
      color: 'text-orange-600'
    }
  ];

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Advanced machine learning algorithms analyze opportunities and predict success rates for your business.'
    },
    {
      icon: Search,
      title: 'Smart Search & Filtering',
      description: 'Find relevant opportunities instantly with intelligent search, natural language queries, and advanced filters.'
    },
    {
      icon: Shield,
      title: 'Real-Time Monitoring',
      description: 'Get instant notifications about new opportunities, amendments, and deadline changes across all sources.'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Track market trends, analyze competition, and identify emerging opportunities with comprehensive dashboards.'
    },
    {
      icon: Zap,
      title: 'Automated Alerts',
      description: 'Set custom alerts for keywords, agencies, NAICS codes, and contract values to never miss an opportunity.'
    },
    {
      icon: Target,
      title: 'Precision Targeting',
      description: 'Match opportunities to your capabilities with AI-driven recommendations and compatibility scoring.'
    }
  ];

  const dataSources = [
    {
      name: 'SAM.gov',
      description: 'Primary federal contracting opportunities',
      icon: Building,
      status: 'Active'
    },
    {
      name: 'FedBizOpps',
      description: 'Legacy federal procurement system',
      icon: FileText,
      status: 'Active'
    },
    {
      name: 'GSA Schedules',
      description: 'General Services Administration contracts',
      icon: Award,
      status: 'Active'
    },
    {
      name: 'Defense Contracts',
      description: 'Department of Defense opportunities',
      icon: Shield,
      status: 'Active'
    },
    {
      name: 'State & Local',
      description: 'Regional government contracts',
      icon: Globe,
      status: 'Active'
    },
    {
      name: 'Industry Sources',
      description: 'Private sector opportunities',
      icon: Users,
      status: 'Active'
    }
  ];

  const howItWorksSteps = [
    {
      step: '01',
      title: 'Connect & Configure',
      description: 'Set up your profile, capabilities, and search preferences in minutes.',
      icon: Target
    },
    {
      step: '02',
      title: 'AI-Powered Discovery',
      description: 'Our AI continuously scans and analyzes opportunities across all sources.',
      icon: Brain
    },
    {
      step: '03',
      title: 'Smart Matching',
      description: 'Get personalized recommendations based on your business profile and success history.',
      icon: Search
    },
    {
      step: '04',
      title: 'Win More Contracts',
      description: 'Access detailed insights, competitor analysis, and proposal guidance.',
      icon: TrendingUp
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-blue-600 via-primary-blue-700 to-primary-blue-900 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-float"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="h-16 w-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Target className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 text-shadow">
              AI-Powered Government
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">
                Contract Intelligence
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
              Discover, analyze, and win government contracts with advanced AI technology. 
              Access over 12,000 active opportunities worth $847B across 6 major sources.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/search"
                className="btn-tribble-primary btn-large group inline-flex items-center px-8 py-4 bg-white text-primary-blue-600 hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-xl"
              >
                <Search className="h-5 w-5 mr-2" />
                Start Searching
                <ArrowRight className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <button className="btn-tribble-secondary group inline-flex items-center px-8 py-4 border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                <Play className="h-5 w-5 mr-2" />
                View Demo
              </button>
            </div>
            
            <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-blue-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>Real-time data</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>AI-powered insights</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>99.9% uptime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Real-Time Government Contract Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Access comprehensive data and insights across all major government contracting platforms
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {keyMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="card-tribble text-center hover:shadow-lg transition-all duration-300">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${metric.color} bg-opacity-10`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</div>
                  <div className="text-sm font-medium text-gray-700 mb-1">{metric.label}</div>
                  <div className="text-xs text-gray-500">{metric.change}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Contract Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to discover, analyze, and win government contracts
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="card-tribble card-hover group">
                  <div className="flex items-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-blue-100 text-primary-blue-600 rounded-lg mr-4 group-hover:bg-primary-blue-600 group-hover:text-white transition-colors duration-200">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data Sources Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Data Sources
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We monitor and analyze opportunities from all major government contracting platforms
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataSources.map((source, index) => {
              const Icon = source.icon;
              return (
                <div key={index} className="card-tribble card-interactive group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-600 rounded-lg mr-3 group-hover:bg-primary-blue-100 group-hover:text-primary-blue-600 transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{source.name}</h3>
                      </div>
                    </div>
                    <span className="status-indicator status-active text-xs">
                      {source.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{source.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How BidFetch Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in minutes and start winning contracts faster
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;
              const isLastStep = index === howItWorksSteps.length - 1;
              
              return (
                <div key={index} className="relative">
                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 bg-primary-blue-600 text-white rounded-full mb-6">
                      <Icon className="h-7 w-7" />
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-white border-2 border-primary-blue-600 text-primary-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {step.step}
                      </div>
                    </div>
                    
                    {!isLastStep && (
                      <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gray-200 transform -translate-y-1/2 z-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-blue-600 to-transparent w-1/2"></div>
                      </div>
                    )}
                    
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-blue-600 to-primary-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Contract Strategy?
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Join thousands of businesses already using BidFetch to discover and win government contracts. 
            Start your intelligent contract search today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/search"
              className="btn-tribble-primary btn-large group inline-flex items-center px-8 py-4 bg-white text-primary-blue-600 hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-xl"
            >
              <Search className="h-5 w-5 mr-2" />
              Start Searching Now
              <ArrowRight className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/analytics"
              className="btn-tribble-secondary group inline-flex items-center px-8 py-4 border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              View Analytics
            </Link>
          </div>
          
          <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-blue-200 text-sm">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Enterprise security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
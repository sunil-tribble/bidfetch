import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building,
  Calendar,
  DollarSign,
  MapPin,
  Tag,
  FileText,
  ExternalLink,
  Clock,
  User,
  Mail,
  Phone,
  AlertTriangle,
  Download,
  Bookmark,
  Share2,
  Eye,
  Globe,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Briefcase,
  Activity,
  Target,
  Award,
  BarChart3,
  PieChart,
  Users,
  Shield,
  FileCheck,
  Timer,
  Gauge,
  Zap,
  BookOpen,
  MessageSquare,
  Settings,
  ChevronDown,
  Filter,
  Search
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useNotifications } from '../context/NotificationContext';
import { useWebSocket } from '../context/WebSocketContext';

interface Contact {
  name: string;
  title: string;
  email: string;
  phone: string;
  type: string;
}

interface Document {
  id: string;
  filename: string;
  type: string;
  size: number;
  url: string;
  mime_type?: string;
  download_url?: string;
  pages?: number;
}

interface OpportunityDetail {
  id: string;
  title: string;
  description: string;
  agency_name: string;
  office: string;
  source: string;
  posted_date: string;
  response_deadline: string;
  estimated_value: number;
  status: 'active' | 'closed' | 'awarded' | 'cancelled';
  type: string;
  naics_codes: string[];
  psc_codes: string[];
  set_aside_type: string;
  location: string;
  solicitation_number: string;
  contacts: Contact[];
  documents: Document[];
  requirements: string;
  evaluation_criteria: string;
  submission_instructions: string;
  additional_info_link?: string;
  award_date?: string;
  award_amount?: number;
  contractor_name?: string;
  similar_opportunities?: Array<{
    id: string;
    title: string;
    agency: string;
    value: number;
  }>;
}

const OpportunityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bookmarked, setBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const { addNotification } = useNotifications();
  const { subscribe } = useWebSocket();

  // Fetch opportunity details with enhanced data
  const { data: opportunity, isLoading, error, refetch } = useQuery<OpportunityDetail>({
    queryKey: ['opportunity', id],
    queryFn: async () => {
      const response = await fetch(`/api/opportunities/${id}`);
      if (!response.ok) throw new Error('Failed to fetch opportunity');
      return response.json();
    },
    enabled: !!id,
    refetchInterval: 60000,
  });

  // Mock data for demonstration with enhanced fields
  const mockOpportunity: OpportunityDetail = {
    id: id || '1',
    title: 'Cloud Infrastructure Modernization Services',
    description: `The Department of Defense seeks a comprehensive cloud infrastructure modernization solution to migrate legacy systems to a secure, scalable, and efficient cloud environment. This initiative will enhance operational efficiency, reduce costs, and improve security posture across multiple DoD facilities.

The selected contractor will be responsible for:
• Assessment of current infrastructure and applications
• Development of migration strategy and roadmap
• Implementation of cloud-native solutions
• Security compliance and monitoring
• Training and knowledge transfer
• Ongoing support and maintenance

This is a critical mission that requires deep expertise in cloud technologies, federal security requirements, and large-scale enterprise migrations.`,
    agency_name: 'Department of Defense',
    office: 'Defense Information Systems Agency (DISA)',
    source: 'SAM.gov',
    posted_date: '2024-07-15T10:30:00Z',
    response_deadline: '2024-09-15T17:00:00Z',
    estimated_value: 25000000,
    status: 'active',
    type: 'Request for Proposal (RFP)',
    naics_codes: ['541511', '541512'],
    psc_codes: ['D316'],
    set_aside_type: 'None',
    location: 'Fort Belvoir, VA (with potential for multiple locations)',
    solicitation_number: 'HC1028-24-R-0001',
    contacts: [
      {
        name: 'Sarah Johnson',
        title: 'Contracting Officer',
        email: 'sarah.johnson@disa.mil',
        phone: '(571) 555-0123',
        type: 'Primary'
      },
      {
        name: 'Michael Chen',
        title: 'Technical Point of Contact',
        email: 'michael.chen@disa.mil',
        phone: '(571) 555-0124',
        type: 'Technical'
      }
    ],
    documents: [
      {
        id: '1',
        filename: 'RFP_Cloud_Modernization.pdf',
        type: 'Request for Proposal',
        size: 2457600,
        url: '/documents/1/view',
        download_url: '/documents/1/download',
        pages: 45
      },
      {
        id: '2',
        filename: 'Statement_of_Work.pdf',
        type: 'Statement of Work',
        size: 1843200,
        url: '/documents/2/view',
        download_url: '/documents/2/download',
        pages: 32
      },
      {
        id: '3',
        filename: 'Security_Requirements.pdf',
        type: 'Security Requirements',
        size: 987600,
        url: '/documents/3/view',
        download_url: '/documents/3/download',
        pages: 18
      },
      {
        id: '4',
        filename: 'Technical_Specifications.docx',
        type: 'Technical Specifications',
        size: 1234500,
        url: '/documents/4/view',
        download_url: '/documents/4/download'
      },
      {
        id: '5',
        filename: 'Budget_Template.xlsx',
        type: 'Budget Template',
        size: 567800,
        url: '/documents/5/view',
        download_url: '/documents/5/download'
      }
    ],
    requirements: `Minimum Requirements:
• Secret security clearance for key personnel
• FedRAMP High authorization experience
• Minimum 5 years of federal cloud migration experience
• AWS/Azure/GCP certifications required
• FISMA compliance expertise
• 24/7 support capability

Preferred Qualifications:
• Top Secret clearance
• Previous DoD contract experience
• DevSecOps implementation experience
• Container orchestration expertise`,
    evaluation_criteria: `Proposals will be evaluated based on the following criteria:

1. Technical Approach (40%)
   - Migration methodology and tools
   - Security implementation plan
   - Risk mitigation strategies

2. Past Performance (30%)
   - Relevant contract experience
   - Customer references
   - Success metrics from similar projects

3. Management Approach (20%)
   - Project management methodology
   - Resource allocation plan
   - Communication and reporting procedures

4. Price (10%)
   - Cost reasonableness
   - Value proposition`,
    submission_instructions: 'Proposals must be submitted electronically through SAM.gov by 5:00 PM EST on September 15, 2024. Late submissions will not be accepted.',
    additional_info_link: 'https://sam.gov/opp/example-link',
    similar_opportunities: [
      {
        id: '2',
        title: 'Network Infrastructure Upgrade',
        agency: 'Department of Defense',
        value: 18000000
      },
      {
        id: '3',
        title: 'Data Center Consolidation',
        agency: 'General Services Administration',
        value: 32000000
      },
      {
        id: '4',
        title: 'Cybersecurity Assessment Services',
        agency: 'Department of Homeland Security',
        value: 12500000
      }
    ]
  };

  const displayOpportunity = opportunity || mockOpportunity;

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe('opportunity_update', (data) => {
      if (data.id === id) {
        addNotification({
          type: 'info',
          title: 'Opportunity Updated',
          message: 'This opportunity has been updated with new information',
          duration: 5000
        });
        refetch();
      }
    });

    return unsubscribe;
  }, [subscribe, addNotification, refetch, id]);

  const daysUntilDeadline = differenceInDays(
    parseISO(displayOpportunity.response_deadline), 
    new Date()
  );

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle,
          label: 'Active'
        };
      case 'closed':
        return {
          color: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: Clock,
          label: 'Closed'
        };
      case 'awarded':
        return {
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Award,
          label: 'Awarded'
        };
      case 'cancelled':
        return {
          color: 'bg-red-50 text-red-700 border-red-200',
          icon: AlertTriangle,
          label: 'Cancelled'
        };
      default:
        return {
          color: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: AlertCircle,
          label: 'Unknown'
        };
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return { icon: FileText, color: 'text-red-600 bg-red-50 border-red-200' };
      case 'doc':
      case 'docx':
        return { icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'xls':
      case 'xlsx':
        return { icon: FileText, color: 'text-green-600 bg-green-50 border-green-200' };
      default:
        return { icon: FileText, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  const getCompetitionLevel = () => {
    // Mock calculation based on various factors
    return 'Medium'; // High, Medium, Low
  };

  const getAwardProbability = () => {
    // Mock calculation
    return 73; // percentage
  };

  const filteredDocuments = displayOpportunity.documents.filter(doc =>
    doc.filename.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(documentSearchQuery.toLowerCase())
  );

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    addNotification({
      type: 'success',
      title: bookmarked ? 'Bookmark Removed' : 'Opportunity Bookmarked',
      message: bookmarked 
        ? 'Opportunity removed from bookmarks' 
        : 'Opportunity added to your bookmarks',
      duration: 3000
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: displayOpportunity.title,
        text: `Check out this procurement opportunity: ${displayOpportunity.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      addNotification({
        type: 'success',
        title: 'Link Copied',
        message: 'Opportunity link copied to clipboard',
        duration: 3000
      });
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      addNotification({
        type: 'info',
        title: 'Downloading Document',
        message: `Preparing ${doc.filename} for download...`,
        duration: 3000
      });
      
      window.open(doc.download_url || doc.url, '_blank');
      
      addNotification({
        type: 'success',
        title: 'Download Started',
        message: `${doc.filename} is downloading`,
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: `Unable to download ${doc.filename}`,
        duration: 5000
      });
    }
  };

  const downloadAllDocuments = async () => {
    try {
      addNotification({
        type: 'info',
        title: 'Preparing Downloads',
        message: `Preparing ${displayOpportunity.documents.length} documents for download...`,
        duration: 5000
      });
      
      displayOpportunity.documents.forEach((doc, index) => {
        setTimeout(() => {
          window.open(doc.download_url || doc.url, '_blank');
        }, index * 500);
      });
      
      addNotification({
        type: 'success',
        title: 'Downloads Started',
        message: `Downloading ${displayOpportunity.documents.length} documents`,
        duration: 5000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Unable to download documents',
        duration: 5000
      });
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'documents', label: 'Documents', icon: FileText, badge: displayOpportunity.documents.length },
    { id: 'requirements', label: 'Requirements', icon: CheckCircle },
    { id: 'evaluation', label: 'Evaluation', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'timeline', label: 'Timeline', icon: Timer }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading opportunity details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-md border">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Opportunity Not Found</h2>
          <p className="text-slate-600 mb-4">The requested opportunity could not be found or may have been removed.</p>
          <Link 
            to="/search" 
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(displayOpportunity.status);
  const StatusIcon = statusInfo.icon;
  const competitionLevel = getCompetitionLevel();
  const awardProbability = getAwardProbability();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          {/* Navigation */}
          <div className="flex items-center justify-between py-4">
            <Link 
              to="/search" 
              className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Link>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleShare}
                className="inline-flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </button>
              
              <button
                onClick={handleBookmark}
                className={`inline-flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                  bookmarked 
                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Bookmark className={`h-4 w-4 mr-2 ${bookmarked ? 'fill-current' : ''}`} />
                {bookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
              
              <button
                onClick={downloadAllDocuments}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download All
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-4">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                    <StatusIcon className="h-4 w-4 mr-2" />
                    {statusInfo.label}
                  </span>
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium">
                    {displayOpportunity.type}
                  </span>
                  {daysUntilDeadline <= 7 && daysUntilDeadline > 0 && (
                    <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium">
                      <Clock className="h-3 w-3 mr-1 inline" />
                      Urgent
                    </span>
                  )}
                </div>
                
                <h1 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
                  {displayOpportunity.title}
                </h1>
                
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">
                          ${(displayOpportunity.estimated_value / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-sm text-slate-600">Est. Value</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Timer className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${daysUntilDeadline <= 7 ? 'text-red-600' : 'text-slate-900'}`}>
                          {daysUntilDeadline > 0 ? `${daysUntilDeadline}d` : 'Expired'}
                        </div>
                        <div className="text-sm text-slate-600">Days Left</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">{competitionLevel}</div>
                        <div className="text-sm text-slate-600">Competition</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Gauge className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">{awardProbability}%</div>
                        <div className="text-sm text-slate-600">Win Chance</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Agency Information */}
            <div className="border-t border-slate-100 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center">
                  <Building className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <div className="font-semibold text-slate-900">{displayOpportunity.agency_name}</div>
                    <div className="text-sm text-slate-600">{displayOpportunity.office}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Globe className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <div className="font-semibold text-slate-900">{displayOpportunity.source}</div>
                    <div className="text-sm text-slate-600">{displayOpportunity.solicitation_number}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <div className="font-semibold text-slate-900">Location</div>
                    <div className="text-sm text-slate-600">{displayOpportunity.location}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                    {tab.badge && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        activeTab === tab.id 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Description */}
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">Description</h3>
                  <div className="prose prose-slate max-w-none">
                    {displayOpportunity.description.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="text-slate-700 leading-relaxed mb-4 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Key Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Information</h3>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-slate-400 mr-3" />
                        <div>
                          <div className="font-medium text-slate-900">Posted Date</div>
                          <div className="text-sm text-slate-600">
                            {format(parseISO(displayOpportunity.posted_date), 'MMMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-slate-400 mr-3" />
                        <div>
                          <div className="font-medium text-slate-900">Response Deadline</div>
                          <div className="text-sm text-slate-600">
                            {format(parseISO(displayOpportunity.response_deadline), 'MMMM dd, yyyy \'at\' h:mm a')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <Tag className="h-5 w-5 text-slate-400 mr-3" />
                        <div>
                          <div className="font-medium text-slate-900">Set-Aside Type</div>
                          <div className="text-sm text-slate-600">{displayOpportunity.set_aside_type}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Classification</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="font-medium text-slate-900 mb-2">NAICS Codes</div>
                        <div className="flex flex-wrap gap-2">
                          {displayOpportunity.naics_codes.map((code) => (
                            <span key={code} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm">
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {displayOpportunity.psc_codes.length > 0 && (
                        <div>
                          <div className="font-medium text-slate-900 mb-2">PSC Codes</div>
                          <div className="flex flex-wrap gap-2">
                            {displayOpportunity.psc_codes.map((code) => (
                              <span key={code} className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">
                    Documents ({displayOpportunity.documents.length})
                  </h3>
                  
                  {/* Document Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                      value={documentSearchQuery}
                      onChange={(e) => setDocumentSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">
                      {documentSearchQuery ? 'No documents match your search' : 'No documents available'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredDocuments.map((doc) => {
                      const fileInfo = getFileIcon(doc.filename);
                      const FileIcon = fileInfo.icon;
                      const fileExt = doc.filename.split('.').pop()?.toLowerCase();
                      
                      return (
                        <div key={doc.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-all duration-200 group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1 min-w-0">
                              <div className={`p-3 rounded-lg mr-4 border ${fileInfo.color}`}>
                                <FileIcon className="h-6 w-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                  {doc.filename}
                                </div>
                                <div className="text-sm text-slate-500 flex items-center space-x-4 mt-1">
                                  <span className="capitalize">{doc.type}</span>
                                  {doc.size && (
                                    <>
                                      <span>•</span>
                                      <span>{(doc.size / 1024 / 1024).toFixed(1)} MB</span>
                                    </>
                                  )}
                                  {doc.pages && (
                                    <>
                                      <span>•</span>
                                      <span>{doc.pages} pages</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="uppercase font-medium">{fileExt}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-4">
                              {fileExt === 'pdf' && (
                                <button
                                  onClick={() => window.open(doc.url, '_blank')}
                                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                  title="Preview PDF"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => downloadDocument(doc)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Open in New Tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {displayOpportunity.documents.length > 0 && (
                  <div className="border-t border-slate-100 pt-6">
                    <button
                      onClick={downloadAllDocuments}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All Documents ({displayOpportunity.documents.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requirements' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">Requirements</h3>
                  <div className="prose prose-slate max-w-none">
                    {displayOpportunity.requirements.split('\n\n').map((section, index) => (
                      <div key={index} className="mb-6 last:mb-0">
                        {section.split('\n').map((line, lineIndex) => (
                          <p key={lineIndex} className="text-slate-700 leading-relaxed mb-2 last:mb-0">
                            {line}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Submission Instructions</h3>
                  <p className="text-slate-700 leading-relaxed">
                    {displayOpportunity.submission_instructions}
                  </p>
                  
                  {displayOpportunity.additional_info_link && (
                    <div className="mt-4">
                      <a
                        href={displayOpportunity.additional_info_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Additional Information
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'evaluation' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">Evaluation Criteria</h3>
                  <div className="prose prose-slate max-w-none">
                    {displayOpportunity.evaluation_criteria.split('\n\n').map((section, index) => (
                      <div key={index} className="mb-6 last:mb-0">
                        {section.split('\n').map((line, lineIndex) => (
                          <p key={lineIndex} className="text-slate-700 leading-relaxed mb-2 last:mb-0">
                            {line}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Award Probability Gauge */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <Gauge className="h-5 w-5 mr-2 text-blue-600" />
                      Award Probability
                    </h4>
                    <div className="flex items-center justify-center py-8">
                      <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="2"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeDasharray={`${awardProbability}, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-slate-900">{awardProbability}%</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 text-center">
                      Based on historical data and market analysis
                    </p>
                  </div>

                  {/* Competition Analysis */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <Users className="h-5 w-5 mr-2 text-purple-600" />
                      Competition Level
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Expected Bidders</span>
                        <span className="font-semibold text-slate-900">8-12</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Competition Level</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          competitionLevel === 'High' ? 'bg-red-100 text-red-700' :
                          competitionLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {competitionLevel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Market Maturity</span>
                        <span className="font-semibold text-slate-900">Established</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Similar Opportunities */}
                {displayOpportunity.similar_opportunities && displayOpportunity.similar_opportunities.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <Briefcase className="h-5 w-5 mr-2 text-green-600" />
                      Similar Opportunities
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayOpportunity.similar_opportunities.map((opp) => (
                        <Link
                          key={opp.id}
                          to={`/opportunity/${opp.id}`}
                          className="block border border-slate-200 rounded-xl p-4 hover:bg-slate-50 hover:border-blue-300 transition-all duration-200 group"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                            {opp.title}
                          </div>
                          <div className="text-sm text-slate-600 mb-2">{opp.agency}</div>
                          <div className="text-lg font-bold text-green-600">
                            ${(opp.value / 1000000).toFixed(1)}M
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-6">Project Timeline</h3>
                  
                  {/* Timeline Visualization */}
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                    
                    <div className="space-y-8">
                      {/* Posted Date */}
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center relative z-10">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="ml-6">
                          <div className="font-semibold text-slate-900">Opportunity Posted</div>
                          <div className="text-sm text-slate-600">
                            {format(parseISO(displayOpportunity.posted_date), 'MMMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                      
                      {/* Current Date */}
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center relative z-10">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-6">
                          <div className="font-semibold text-slate-900">Today</div>
                          <div className="text-sm text-slate-600">
                            {format(new Date(), 'MMMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            {daysUntilDeadline > 0 ? `${daysUntilDeadline} days until deadline` : 'Deadline has passed'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Response Deadline */}
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative z-10 ${
                          daysUntilDeadline <= 0 ? 'bg-red-100' : daysUntilDeadline <= 7 ? 'bg-yellow-100' : 'bg-slate-100'
                        }`}>
                          <Clock className={`h-4 w-4 ${
                            daysUntilDeadline <= 0 ? 'text-red-600' : daysUntilDeadline <= 7 ? 'text-yellow-600' : 'text-slate-600'
                          }`} />
                        </div>
                        <div className="ml-6">
                          <div className="font-semibold text-slate-900">Response Deadline</div>
                          <div className="text-sm text-slate-600">
                            {format(parseISO(displayOpportunity.response_deadline), 'MMMM dd, yyyy \'at\' h:mm a')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Deadline Progress Bar */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">Time Remaining</h4>
                    <span className={`text-sm font-medium ${
                      daysUntilDeadline <= 0 ? 'text-red-600' : 
                      daysUntilDeadline <= 7 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {daysUntilDeadline <= 0 ? 'Expired' : `${daysUntilDeadline} days left`}
                    </span>
                  </div>
                  
                  {daysUntilDeadline > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          daysUntilDeadline <= 7 ? 'bg-red-500' : 
                          daysUntilDeadline <= 14 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.max(0, (daysUntilDeadline / 60) * 100))}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contacts Sidebar */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Key Contacts
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayOpportunity.contacts.map((contact, index) => (
                <div key={index} className="border border-slate-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-semibold text-slate-900">{contact.name}</div>
                      <div className="text-sm text-slate-600">{contact.title}</div>
                      <div className="text-xs text-slate-500 mt-1 px-2 py-1 bg-slate-100 rounded-full inline-block">
                        {contact.type}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <User className="h-5 w-5 text-slate-600" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <a 
                      href={`mailto:${contact.email}`} 
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors text-sm"
                    >
                      <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                    {contact.phone && (
                      <a 
                        href={`tel:${contact.phone}`} 
                        className="flex items-center text-blue-600 hover:text-blue-700 transition-colors text-sm"
                      >
                        <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                        {contact.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetail;
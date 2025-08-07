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
  Briefcase
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
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
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
    refetchInterval: 60000, // Refetch every minute
  });

  // Mock data for demonstration
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
        size: 2457600, // 2.4MB
        url: '/documents/1/view',
        download_url: '/documents/1/download',
        pages: 45
      },
      {
        id: '2',
        filename: 'Statement_of_Work.pdf',
        type: 'Statement of Work',
        size: 1843200, // 1.8MB
        url: '/documents/2/view',
        download_url: '/documents/2/download',
        pages: 32
      },
      {
        id: '3',
        filename: 'Security_Requirements.pdf',
        type: 'Security Requirements',
        size: 987600, // 965KB
        url: '/documents/3/view',
        download_url: '/documents/3/download',
        pages: 18
      },
      {
        id: '4',
        filename: 'Technical_Specifications.docx',
        type: 'Technical Specifications',
        size: 1234500, // 1.2MB
        url: '/documents/4/view',
        download_url: '/documents/4/download'
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
      
      // Fetch document metadata first
      const response = await fetch(`/api/opportunities/${id}/documents/${doc.id}`);
      if (response.ok) {
        const docData = await response.json();
        // Open the actual document URL
        window.open(docData.download_url || doc.url, '_blank');
        
        addNotification({
          type: 'success',
          title: 'Download Started',
          message: `${doc.filename} is downloading`,
          duration: 3000
        });
      } else {
        throw new Error('Failed to fetch document');
      }
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
      
      // Fetch all documents metadata
      const response = await fetch(`/api/opportunities/${id}/documents`);
      if (response.ok) {
        const data = await response.json();
        
        // Open each document in a new tab with a small delay
        data.documents.forEach((doc: Document, index: number) => {
          setTimeout(() => {
            window.open(doc.url, '_blank');
          }, index * 500); // 500ms delay between each
        });
        
        addNotification({
          type: 'success',
          title: 'Downloads Started',
          message: `Downloading ${data.documents.length} documents`,
          duration: 5000
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Unable to download documents',
        duration: 5000
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'awarded': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'closed': return Clock;
      case 'awarded': return TrendingUp;
      case 'cancelled': return AlertTriangle;
      default: return AlertCircle;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-white/70">Loading opportunity details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Opportunity Not Found</h2>
          <p className="text-white/70 mb-4">The requested opportunity could not be found or may have been removed.</p>
          <Link to="/search" className="btn-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(displayOpportunity.status);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            to="/search" 
            className="inline-flex items-center text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
        </div>

        {/* Header */}
        <div className="glass rounded-2xl p-8 mb-8 animate-slide-up">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(displayOpportunity.status)}`}>
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {displayOpportunity.status.toUpperCase()}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {displayOpportunity.type}
                </span>
              </div>
              
              <h1 className="text-4xl font-bold text-white mb-4">
                {displayOpportunity.title}
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white/70">
                <div className="flex items-center">
                  <Building className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium text-white">{displayOpportunity.agency_name}</div>
                    <div className="text-sm">{displayOpportunity.office}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Globe className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium text-white">{displayOpportunity.source}</div>
                    <div className="text-sm">{displayOpportunity.solicitation_number}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium text-white">
                      ${(displayOpportunity.estimated_value / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-sm">Estimated Value</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Clock className={`h-5 w-5 mr-3 ${daysUntilDeadline <= 7 ? 'text-red-400' : 'text-white/70'}`} />
                  <div>
                    <div className={`font-medium ${daysUntilDeadline <= 7 ? 'text-red-400' : 'text-white'}`}>
                      {daysUntilDeadline > 0 ? `${daysUntilDeadline} days left` : 'Deadline passed'}
                    </div>
                    <div className="text-sm">
                      Due {format(parseISO(displayOpportunity.response_deadline), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3 ml-8">
              <button
                onClick={handleBookmark}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  bookmarked 
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' 
                    : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Bookmark className={`h-5 w-5 ${bookmarked ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleShare}
                className="p-3 bg-white/10 border border-white/20 rounded-xl text-white/70 hover:bg-white/20 hover:text-white transition-all duration-200"
              >
                <Share2 className="h-5 w-5" />
              </button>
              
              <button
                onClick={downloadAllDocuments}
                className="btn-primary flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download All
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{displayOpportunity.documents.length}</div>
              <div className="text-white/60 text-sm">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{displayOpportunity.contacts.length}</div>
              <div className="text-white/60 text-sm">Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{displayOpportunity.naics_codes.length}</div>
              <div className="text-white/60 text-sm">NAICS Codes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">87%</div>
              <div className="text-white/60 text-sm">Match Score</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <FileText className="h-6 w-6 mr-3" />
                Description
              </h2>
              <div className="text-white/80 leading-relaxed space-y-4">
                {displayOpportunity.description.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Requirements */}
            {displayOpportunity.requirements && (
              <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <CheckCircle className="h-6 w-6 mr-3" />
                  Requirements
                </h2>
                <div className="text-white/80 leading-relaxed space-y-2">
                  {displayOpportunity.requirements.split('\n').map((requirement, index) => (
                    <p key={index}>{requirement}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Evaluation Criteria */}
            {displayOpportunity.evaluation_criteria && (
              <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <TrendingUp className="h-6 w-6 mr-3" />
                  Evaluation Criteria
                </h2>
                <div className="text-white/80 leading-relaxed space-y-2">
                  {displayOpportunity.evaluation_criteria.split('\n').map((criteria, index) => (
                    <p key={index}>{criteria}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <FileText className="h-6 w-6 mr-3" />
                  Documents ({displayOpportunity.documents.length})
                </h2>
                {displayOpportunity.documents.length > 0 && (
                  <button
                    onClick={downloadAllDocuments}
                    className="btn-secondary text-sm flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </button>
                )}
              </div>
              
              {displayOpportunity.documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">No documents available for this opportunity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayOpportunity.documents.map((doc) => {
                    const fileExt = doc.filename.split('.').pop()?.toLowerCase();
                    const isPDF = fileExt === 'pdf';
                    const isDoc = ['doc', 'docx'].includes(fileExt || '');
                    const isExcel = ['xls', 'xlsx'].includes(fileExt || '');
                    
                    return (
                      <div key={doc.id} className="glass-strong rounded-xl p-4 hover:bg-white/10 transition-all duration-200 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <div className={`p-2 rounded-lg mr-4 ${
                              isPDF ? 'bg-red-500/20' :
                              isDoc ? 'bg-blue-500/20' :
                              isExcel ? 'bg-green-500/20' :
                              'bg-gray-500/20'
                            }`}>
                              <FileText className={`h-5 w-5 ${
                                isPDF ? 'text-red-300' :
                                isDoc ? 'text-blue-300' :
                                isExcel ? 'text-green-300' :
                                'text-gray-300'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                                {doc.filename}
                              </div>
                              <div className="text-white/60 text-sm flex items-center space-x-4">
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
                                <span className="uppercase">{fileExt}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isPDF && (
                              <button
                                onClick={() => window.open(doc.url, '_blank')}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                title="Preview PDF"
                              >
                                <Eye className="h-4 w-4 text-white" />
                              </button>
                            )}
                            <button
                              onClick={() => downloadDocument(doc)}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                              title="Download Document"
                            >
                              <Download className="h-4 w-4 text-blue-300" />
                            </button>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                              title="Open in New Tab"
                            >
                              <ExternalLink className="h-4 w-4 text-white" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Key Details */}
            <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <h3 className="text-xl font-bold text-white mb-6">Key Details</h3>
              <div className="space-y-4">
                <div className="flex items-center text-white/70">
                  <Calendar className="h-4 w-4 mr-3" />
                  <div>
                    <div className="text-white font-medium">
                      {format(parseISO(displayOpportunity.posted_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm">Posted Date</div>
                  </div>
                </div>
                
                {displayOpportunity.location && (
                  <div className="flex items-center text-white/70">
                    <MapPin className="h-4 w-4 mr-3" />
                    <div>
                      <div className="text-white font-medium">{displayOpportunity.location}</div>
                      <div className="text-sm">Location</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center text-white/70">
                  <Tag className="h-4 w-4 mr-3" />
                  <div>
                    <div className="text-white font-medium">{displayOpportunity.set_aside_type}</div>
                    <div className="text-sm">Set-Aside Type</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="text-sm text-white/60 mb-2">NAICS Codes</div>
                <div className="flex flex-wrap gap-2">
                  {displayOpportunity.naics_codes.map((code) => (
                    <span key={code} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Contacts
              </h3>
              <div className="space-y-4">
                {displayOpportunity.contacts.map((contact, index) => (
                  <div key={index} className="glass-strong rounded-xl p-4">
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-green-500/20 rounded-lg mr-3">
                        <User className="h-4 w-4 text-green-300" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{contact.name}</div>
                        <div className="text-white/60 text-sm">{contact.title}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <a 
                        href={`mailto:${contact.email}`} 
                        className="flex items-center text-blue-300 hover:text-blue-200 transition-colors"
                      >
                        <Mail className="h-3 w-3 mr-2" />
                        {contact.email}
                      </a>
                      {contact.phone && (
                        <a 
                          href={`tel:${contact.phone}`} 
                          className="flex items-center text-blue-300 hover:text-blue-200 transition-colors"
                        >
                          <Phone className="h-3 w-3 mr-2" />
                          {contact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Similar Opportunities */}
            {displayOpportunity.similar_opportunities && displayOpportunity.similar_opportunities.length > 0 && (
              <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.7s' }}>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Similar Opportunities
                </h3>
                <div className="space-y-3">
                  {displayOpportunity.similar_opportunities.map((opp) => (
                    <Link
                      key={opp.id}
                      to={`/opportunity/${opp.id}`}
                      className="block glass-strong rounded-xl p-4 hover:bg-white/10 transition-all duration-200 group"
                    >
                      <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors mb-1">
                        {opp.title}
                      </div>
                      <div className="flex items-center justify-between text-white/60 text-xs">
                        <span>{opp.agency}</span>
                        <span>${(opp.value / 1000000).toFixed(1)}M</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetail;
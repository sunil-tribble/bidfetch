import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search as SearchIcon, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Calendar,
  Building,
  Globe,
  DollarSign,
  FileText,
  Clock,
  Eye,
  Bookmark,
  Download,
  ExternalLink,
  MapPin,
  Tag,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  History,
  FileType,
  File,
  BookOpen,
  Star,
  TrendingUp,
  Settings,
  CheckCircle,
  AlertCircle,
  XCircle,
  Minus,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { useNotifications } from '../context/NotificationContext';
import { useWebSocket } from '../context/WebSocketContext';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  agency: string;
  office: string;
  source: string;
  status: 'active' | 'closed' | 'awarded' | 'cancelled';
  posted_date: string;
  response_deadline: string;
  estimated_value: number;
  naics_codes: string[];
  psc_codes: string[];
  set_aside_type: string;
  documents: Array<{
    name: string;
    type: 'pdf' | 'doc' | 'xls' | 'txt' | 'other';
    size?: string;
  }>;
  location: string;
  type: string;
}

interface SearchFilters {
  query: string;
  sources: string[];
  agencies: string[];
  statuses: string[];
  minValue: number | null;
  maxValue: number | null;
  dateRange: string;
  naicsCodes: string[];
  setAsideTypes: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  timestamp: string;
}

const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { addNotification } = useNotifications();
  const { subscribe } = useWebSocket();

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    sources: searchParams.getAll('source'),
    agencies: searchParams.getAll('agency'),
    statuses: searchParams.getAll('status') || ['active'],
    minValue: searchParams.get('minValue') ? parseInt(searchParams.get('minValue')!) : null,
    maxValue: searchParams.get('maxValue') ? parseInt(searchParams.get('maxValue')!) : null,
    dateRange: searchParams.get('dateRange') || '30d',
    naicsCodes: searchParams.getAll('naics'),
    setAsideTypes: searchParams.getAll('setAside'),
    sortBy: searchParams.get('sortBy') || 'posted_date',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery && !searchHistory.includes(searchQuery)) {
        setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update filters when debounced query changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, query: debouncedQuery }));
  }, [debouncedQuery]);

  // Fetch search results
  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ['search-opportunities', filters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.query) params.append('q', filters.query);
      filters.sources.forEach(source => params.append('source', source));
      filters.agencies.forEach(agency => params.append('agency', agency));
      filters.statuses.forEach(status => params.append('status', status));
      if (filters.minValue) params.append('minValue', filters.minValue.toString());
      if (filters.maxValue) params.append('maxValue', filters.maxValue.toString());
      params.append('dateRange', filters.dateRange);
      filters.naicsCodes.forEach(code => params.append('naics', code));
      filters.setAsideTypes.forEach(type => params.append('setAside', type));
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      
      const response = await fetch(`/api/opportunities/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    refetchInterval: 60000,
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await fetch('/api/opportunities/filters');
      if (!response.ok) throw new Error('Failed to fetch filter options');
      return response.json();
    },
  });

  // Mock data with enhanced document structure
  const mockResults = {
    data: [
      {
        id: '1',
        title: 'Cloud Infrastructure Modernization Services',
        description: 'Comprehensive cloud migration and modernization services for legacy government systems. Includes assessment, planning, migration, and ongoing support for enterprise-scale deployments.',
        agency: 'Department of Defense',
        office: 'Defense Information Systems Agency',
        source: 'SAM.gov',
        status: 'active' as const,
        posted_date: '2024-07-15T10:30:00Z',
        response_deadline: '2024-09-15T17:00:00Z',
        estimated_value: 25000000,
        naics_codes: ['541511', '541512'],
        psc_codes: ['D316'],
        set_aside_type: 'None',
        documents: [
          { name: 'RFP_CloudModernization.pdf', type: 'pdf' as const, size: '2.3 MB' },
          { name: 'Technical_SOW.pdf', type: 'pdf' as const, size: '1.8 MB' },
          { name: 'Requirements_Matrix.xlsx', type: 'xls' as const, size: '456 KB' },
          { name: 'Security_Compliance.docx', type: 'doc' as const, size: '892 KB' }
        ],
        location: 'Fort Belvoir, VA',
        type: 'Request for Proposal'
      },
      {
        id: '2',
        title: 'AI-Powered Data Analytics Platform Development',
        description: 'Development of an advanced AI-powered analytics platform for processing and analyzing large-scale government data sets with real-time insights and predictive capabilities.',
        agency: 'Department of Veterans Affairs',
        office: 'Office of Information and Technology',
        source: 'Grants.gov',
        status: 'active' as const,
        posted_date: '2024-07-20T14:15:00Z',
        response_deadline: '2024-08-28T16:00:00Z',
        estimated_value: 15000000,
        naics_codes: ['541511', '541715'],
        psc_codes: ['D302'],
        set_aside_type: 'Small Business',
        documents: [
          { name: 'AI_Platform_RFP.pdf', type: 'pdf' as const, size: '3.1 MB' },
          { name: 'Technical_Specifications.pdf', type: 'pdf' as const, size: '2.5 MB' },
          { name: 'Data_Requirements.docx', type: 'doc' as const, size: '1.2 MB' }
        ],
        location: 'Washington, DC',
        type: 'Request for Proposal'
      },
      {
        id: '3',
        title: 'Cybersecurity Assessment and Implementation',
        description: 'Comprehensive cybersecurity assessment, vulnerability testing, and implementation of security measures across multiple government facilities and systems.',
        agency: 'General Services Administration',
        office: 'Federal Acquisition Service',
        source: 'FPDS',
        status: 'active' as const,
        posted_date: '2024-07-18T09:45:00Z',
        response_deadline: '2024-09-30T17:00:00Z',
        estimated_value: 8500000,
        naics_codes: ['541512', '541519'],
        psc_codes: ['D316'],
        set_aside_type: '8(a)',
        documents: [
          { name: 'Cybersecurity_SOW.pdf', type: 'pdf' as const, size: '1.7 MB' },
          { name: 'Security_Framework.pdf', type: 'pdf' as const, size: '980 KB' },
          { name: 'Compliance_Checklist.xlsx', type: 'xls' as const, size: '234 KB' }
        ],
        location: 'Multiple Locations',
        type: 'Request for Proposal'
      }
    ],
    total: 156,
    page: currentPage,
    limit: 20,
    totalPages: 8
  };

  const mockFilterOptions = {
    sources: ['SAM.gov', 'Grants.gov', 'FPDS', 'TED EU', 'UK Contracts', 'UN Global'],
    agencies: ['Department of Defense', 'Department of Veterans Affairs', 'General Services Administration', 'Department of Energy', 'Department of Health and Human Services'],
    setAsideTypes: ['None', 'Small Business', '8(a)', 'HubZone', 'SDVOSB', 'WOSB'],
    naicsCodes: ['541511', '541512', '541519', '541715', '334510', '237130']
  };

  const displayResults = searchResults || mockResults;
  const displayFilterOptions = filterOptions || mockFilterOptions;

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.sources.length > 0) count++;
    if (filters.agencies.length > 0) count++;
    if (filters.statuses.length !== 1 || filters.statuses[0] !== 'active') count++;
    if (filters.minValue || filters.maxValue) count++;
    if (filters.dateRange !== '30d') count++;
    if (filters.naicsCodes.length > 0) count++;
    if (filters.setAsideTypes.length > 0) count++;
    return count;
  }, [filters]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    filters.sources.forEach(source => params.append('source', source));
    filters.agencies.forEach(agency => params.append('agency', agency));
    filters.statuses.forEach(status => params.append('status', status));
    if (filters.minValue) params.set('minValue', filters.minValue.toString());
    if (filters.maxValue) params.set('maxValue', filters.maxValue.toString());
    params.set('dateRange', filters.dateRange);
    filters.naicsCodes.forEach(code => params.append('naics', code));
    filters.setAsideTypes.forEach(type => params.append('setAside', type));
    params.set('sortBy', filters.sortBy);
    params.set('sortOrder', filters.sortOrder);
    
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe('new_opportunity', (data) => {
      if (data.matches_search) {
        addNotification({
          type: 'info',
          title: 'New Matching Opportunity',
          message: `${data.title} matches your search criteria`,
          duration: 5000
        });
        refetch();
      }
    });

    return unsubscribe;
  }, [subscribe, addNotification, refetch]);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const clearAllFilters = () => {
    setFilters({
      query: '',
      sources: [],
      agencies: [],
      statuses: ['active'],
      minValue: null,
      maxValue: null,
      dateRange: '30d',
      naicsCodes: [],
      setAsideTypes: [],
      sortBy: 'posted_date',
      sortOrder: 'desc'
    });
    setSearchQuery('');
    setCurrentPage(1);
  };

  const removeFilter = (type: string, value: string) => {
    switch (type) {
      case 'source':
        updateFilter('sources', filters.sources.filter(s => s !== value));
        break;
      case 'agency':
        updateFilter('agencies', filters.agencies.filter(a => a !== value));
        break;
      case 'status':
        const newStatuses = filters.statuses.filter(s => s !== value);
        updateFilter('statuses', newStatuses.length > 0 ? newStatuses : ['active']);
        break;
      case 'naics':
        updateFilter('naicsCodes', filters.naicsCodes.filter(n => n !== value));
        break;
      case 'setAside':
        updateFilter('setAsideTypes', filters.setAsideTypes.filter(s => s !== value));
        break;
    }
  };

  const saveSearch = () => {
    if (!saveSearchName.trim()) return;
    
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: saveSearchName,
      filters: { ...filters },
      timestamp: new Date().toISOString()
    };
    
    setSavedSearches(prev => [newSearch, ...prev]);
    addNotification({
      type: 'success',
      title: 'Search Saved',
      message: `"${saveSearchName}" has been saved`,
      duration: 3000
    });
    
    setShowSaveDialog(false);
    setSaveSearchName('');
  };

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters);
    setSearchQuery(savedSearch.filters.query);
    setCurrentPage(1);
    addNotification({
      type: 'info',
      title: 'Search Loaded',
      message: `"${savedSearch.name}" has been loaded`,
      duration: 3000
    });
  };

  const exportResults = () => {
    addNotification({
      type: 'info',
      title: 'Exporting Results',
      message: 'Your search results are being prepared for download',
      duration: 3000
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200';
      case 'closed': return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'awarded': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />;
      case 'closed': return <XCircle className="h-3 w-3" />;
      case 'awarded': return <Star className="h-3 w-3" />;
      case 'cancelled': return <Minus className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <File className="h-4 w-4 text-red-500" />;
      case 'doc': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'xls': return <BookOpen className="h-4 w-4 text-green-500" />;
      default: return <FileType className="h-4 w-4 text-gray-500" />;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-8 text-center max-w-md mx-auto">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Search Failed</h3>
          <p className="text-gray-600 mb-4">Unable to perform search. Please try again.</p>
          <button 
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Search Opportunities
              </h1>
              <p className="text-gray-600">
                Find and track government contracting opportunities across multiple platforms
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {savedSearches.length > 0 && (
                <div className="relative group">
                  <button className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <History className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700">Saved Searches</span>
                    <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
                  </button>
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="p-2">
                      {savedSearches.map((search) => (
                        <button
                          key={search.id}
                          onClick={() => loadSavedSearch(search)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="font-medium">{search.name}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(search.timestamp), 'MMM dd, yyyy')}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Save className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm text-gray-700">Save Search</span>
              </button>
              <button
                onClick={exportResults}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="text-sm">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Main Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search opportunities, agencies, keywords..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  {searchHistory.length > 0 && searchQuery === '' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-500 mb-2 px-2">Recent Searches</div>
                        {searchHistory.slice(0, 5).map((query, index) => (
                          <button
                            key={index}
                            onClick={() => setSearchQuery(query)}
                            className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Clock className="h-3 w-3 inline mr-2 text-gray-400" />
                            {query}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-4 py-3 rounded-lg border transition-colors ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-5 w-5 mr-2" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Sort Control */}
              <div className="flex items-center space-x-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="posted_date">Posted Date</option>
                  <option value="response_deadline">Deadline</option>
                  <option value="estimated_value">Value</option>
                  <option value="title">Title</option>
                </select>
                <button
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {filters.sortOrder === 'asc' ? 
                    <SortAsc className="h-5 w-5 text-gray-600" /> : 
                    <SortDesc className="h-5 w-5 text-gray-600" />
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="mb-6">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-600">Active filters:</span>
              {filters.sources.map(source => (
                <span key={source} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                  {source}
                  <button onClick={() => removeFilter('source', source)} className="ml-1 hover:text-blue-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {filters.agencies.map(agency => (
                <span key={agency} className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                  {agency}
                  <button onClick={() => removeFilter('agency', agency)} className="ml-1 hover:text-green-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {filters.statuses.filter(status => status !== 'active' || filters.statuses.length > 1).map(status => (
                <span key={status} className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full">
                  {status}
                  <button onClick={() => removeFilter('status', status)} className="ml-1 hover:text-purple-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {(filters.minValue || filters.maxValue) && (
                <span className="inline-flex items-center px-3 py-1 bg-yellow-50 text-yellow-700 text-sm rounded-full">
                  ${filters.minValue || 0}M - ${filters.maxValue || '∞'}M
                  <button onClick={() => { updateFilter('minValue', null); updateFilter('maxValue', null); }} className="ml-1 hover:text-yellow-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-800 ml-2"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* Advanced Filters Sidebar */}
        {showFilters && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
                
                {/* Data Sources */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-gray-500" />
                    Data Sources
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {displayFilterOptions.sources.map((source: string) => (
                      <label key={source} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={filters.sources.includes(source)}
                          onChange={() => toggleArrayFilter('sources', source)}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-600">{source}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Agencies */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Building className="h-4 w-4 mr-2 text-gray-500" />
                    Agencies
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {displayFilterOptions.agencies.map((agency: string) => (
                      <label key={agency} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={filters.agencies.includes(agency)}
                          onChange={() => toggleArrayFilter('agencies', agency)}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-600 truncate" title={agency}>{agency}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Value Range */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                    Value Range (Millions)
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Minimum</label>
                      <input
                        type="number"
                        value={filters.minValue || ''}
                        onChange={(e) => updateFilter('minValue', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Maximum</label>
                      <input
                        type="number"
                        value={filters.maxValue || ''}
                        onChange={(e) => updateFilter('maxValue', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="No limit"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Set-Aside Types */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Tag className="h-4 w-4 mr-2 text-gray-500" />
                    Set-Aside Types
                  </h4>
                  <div className="space-y-2">
                    {displayFilterOptions.setAsideTypes.map((type: string) => (
                      <label key={type} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={filters.setAsideTypes.includes(type)}
                          onChange={() => toggleArrayFilter('setAsideTypes', type)}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-600">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={clearAllFilters}
                  className="w-full text-sm text-red-600 hover:text-red-800 border border-red-200 hover:border-red-300 py-2 rounded-lg transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* Results Area */}
            <div className="lg:col-span-3">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {isLoading ? 'Searching...' : `${displayResults.total.toLocaleString()} Results`}
                  </h2>
                  {filters.query && (
                    <span className="text-gray-500">for "{filters.query}"</span>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Updated in real-time
                </div>
              </div>

              {/* Results */}
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                      <div className="h-3 bg-gray-100 rounded mb-4 w-full" />
                      <div className="flex space-x-4">
                        <div className="h-3 bg-gray-100 rounded w-20" />
                        <div className="h-3 bg-gray-100 rounded w-32" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayResults.data.map((opportunity: any) => (
                    <div 
                      key={opportunity.id} 
                      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                              <Link to={`/opportunity/${opportunity.id}`}>
                                {opportunity.title}
                              </Link>
                            </h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(opportunity.status)}`}>
                              {getStatusIcon(opportunity.status)}
                              <span className="ml-1">{opportunity.status.toUpperCase()}</span>
                            </span>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {opportunity.description}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                            <div className="flex items-center text-gray-500">
                              <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-medium text-gray-700 truncate">{opportunity.agency}</div>
                                <div className="text-xs truncate">{opportunity.office}</div>
                              </div>
                            </div>

                            <div className="flex items-center text-gray-500">
                              <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-medium text-gray-700">{opportunity.source}</div>
                                <div className="text-xs truncate">{opportunity.type}</div>
                              </div>
                            </div>

                            <div className="flex items-center text-gray-500">
                              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-medium text-gray-700">
                                  {format(new Date(opportunity.response_deadline), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-xs">Response Due</div>
                              </div>
                            </div>

                            <div className="flex items-center text-gray-500">
                              <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-medium text-gray-700">
                                  ${(opportunity.estimated_value / 1000000).toFixed(1)}M
                                </div>
                                <div className="text-xs">Estimated Value</div>
                              </div>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex items-center flex-wrap gap-2 mb-4">
                            {opportunity.naics_codes.slice(0, 2).map((code: string) => (
                              <span key={code} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                NAICS {code}
                              </span>
                            ))}
                            {opportunity.set_aside_type !== 'None' && (
                              <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                                {opportunity.set_aside_type}
                              </span>
                            )}
                            {opportunity.location && (
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {opportunity.location}
                              </span>
                            )}
                          </div>

                          {/* Documents */}
                          {opportunity.documents.length > 0 && (
                            <div className="border-t border-gray-100 pt-4">
                              <div className="flex items-start space-x-2">
                                <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-600">Documents:</span>
                                  <div className="flex items-center flex-wrap gap-2 mt-1">
                                    {opportunity.documents.slice(0, 3).map((doc: any, i: number) => (
                                      <div key={i} className="flex items-center space-x-1 px-2 py-1 bg-gray-50 rounded text-xs">
                                        {getFileIcon(doc.type)}
                                        <span className="text-gray-700 truncate max-w-32" title={doc.name}>
                                          {doc.name}
                                        </span>
                                        {doc.size && (
                                          <span className="text-gray-500">({doc.size})</span>
                                        )}
                                      </div>
                                    ))}
                                    {opportunity.documents.length > 3 && (
                                      <span className="text-gray-500 text-xs">
                                        +{opportunity.documents.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-6 flex-shrink-0">
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Quick View">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors" title="Bookmark">
                            <Bookmark className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download Documents">
                            <Download className="h-4 w-4" />
                          </button>
                          <Link 
                            to={`/opportunity/${opportunity.id}`}
                            className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {displayResults.totalPages > 1 && (
                <div className="flex items-center justify-between mt-8">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * displayResults.limit) + 1}-{Math.min(currentPage * displayResults.limit, displayResults.total)} of {displayResults.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <div className="flex items-center space-x-1">
                      {[...Array(Math.min(displayResults.totalPages, 5))].map((_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(displayResults.totalPages, prev + 1))}
                      disabled={currentPage === displayResults.totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No filters sidebar - full width results */}
        {!showFilters && (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {isLoading ? 'Searching...' : `${displayResults.total.toLocaleString()} Results`}
                </h2>
                {filters.query && (
                  <span className="text-gray-500">for "{filters.query}"</span>
                )}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp className="h-4 w-4 mr-1" />
                Updated in real-time
              </div>
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                    <div className="h-3 bg-gray-100 rounded mb-4 w-full" />
                    <div className="flex space-x-4">
                      <div className="h-3 bg-gray-100 rounded w-20" />
                      <div className="h-3 bg-gray-100 rounded w-32" />
                      <div className="h-3 bg-gray-100 rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {displayResults.data.map((opportunity: any) => (
                  <div 
                    key={opportunity.id} 
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                            <Link to={`/opportunity/${opportunity.id}`}>
                              {opportunity.title}
                            </Link>
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(opportunity.status)}`}>
                            {getStatusIcon(opportunity.status)}
                            <span className="ml-1">{opportunity.status.toUpperCase()}</span>
                          </span>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {opportunity.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                          <div className="flex items-center text-gray-500">
                            <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-gray-700 truncate">{opportunity.agency}</div>
                              <div className="text-xs truncate">{opportunity.office}</div>
                            </div>
                          </div>

                          <div className="flex items-center text-gray-500">
                            <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-gray-700">{opportunity.source}</div>
                              <div className="text-xs truncate">{opportunity.type}</div>
                            </div>
                          </div>

                          <div className="flex items-center text-gray-500">
                            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-gray-700">
                                {format(new Date(opportunity.response_deadline), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-xs">Response Due</div>
                            </div>
                          </div>

                          <div className="flex items-center text-gray-500">
                            <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-gray-700">
                                ${(opportunity.estimated_value / 1000000).toFixed(1)}M
                              </div>
                              <div className="text-xs">Estimated Value</div>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex items-center flex-wrap gap-2 mb-4">
                          {opportunity.naics_codes.slice(0, 2).map((code: string) => (
                            <span key={code} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                              NAICS {code}
                            </span>
                          ))}
                          {opportunity.set_aside_type !== 'None' && (
                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                              {opportunity.set_aside_type}
                            </span>
                          )}
                          {opportunity.location && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {opportunity.location}
                            </span>
                          )}
                        </div>

                        {/* Documents */}
                        {opportunity.documents.length > 0 && (
                          <div className="border-t border-gray-100 pt-4">
                            <div className="flex items-start space-x-2">
                              <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-600">Documents:</span>
                                <div className="flex items-center flex-wrap gap-2 mt-1">
                                  {opportunity.documents.slice(0, 3).map((doc: any, i: number) => (
                                    <div key={i} className="flex items-center space-x-1 px-2 py-1 bg-gray-50 rounded text-xs">
                                      {getFileIcon(doc.type)}
                                      <span className="text-gray-700 truncate max-w-32" title={doc.name}>
                                        {doc.name}
                                      </span>
                                      {doc.size && (
                                        <span className="text-gray-500">({doc.size})</span>
                                      )}
                                    </div>
                                  ))}
                                  {opportunity.documents.length > 3 && (
                                    <span className="text-gray-500 text-xs">
                                      +{opportunity.documents.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-6 flex-shrink-0">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Quick View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors" title="Bookmark">
                          <Bookmark className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download Documents">
                          <Download className="h-4 w-4" />
                        </button>
                        <Link 
                          to={`/opportunity/${opportunity.id}`}
                          className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {displayResults.totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * displayResults.limit) + 1}-{Math.min(currentPage * displayResults.limit, displayResults.total)} of {displayResults.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(displayResults.totalPages, 5))].map((_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(displayResults.totalPages, prev + 1))}
                    disabled={currentPage === displayResults.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Save Search</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Name
              </label>
              <input
                type="text"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="Enter a name for this search"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSearch}
                disabled={!saveSearchName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
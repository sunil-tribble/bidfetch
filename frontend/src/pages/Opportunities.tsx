import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  MapPin,
  Building,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { opportunitiesApi, SearchParams } from '../services/api';
import { format } from 'date-fns';

const Opportunities: React.FC = () => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    page: 1,
    limit: 20,
    status: 'active',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', searchParams],
    queryFn: () => opportunitiesApi.search(searchParams),
  });

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSearchParams({
      ...searchParams,
      q: formData.get('search') as string,
      page: 1,
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    setSearchParams({
      ...searchParams,
      [key]: value,
      page: 1,
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams({ ...searchParams, page });
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const blob = await opportunitiesApi.export(format, searchParams);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opportunities-${format}-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-green-600';
    if (probability >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProbabilityBg = (probability: number) => {
    if (probability >= 0.7) return 'bg-green-100';
    if (probability >= 0.4) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Opportunities</h1>
            <p className="mt-2 text-gray-600">
              Browse and search {data?.pagination?.total || 0} active procurement opportunities
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleExport('csv')}
              className="btn btn-secondary flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="btn btn-secondary flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card p-4 mb-6">
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="search"
                placeholder="Search opportunities by title, agency, or keywords..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={searchParams.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="awarded">Awarded</option>
                </select>
              </div>
              
              <div>
                <label className="label">Country</label>
                <select
                  className="input"
                  value={searchParams.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                >
                  <option value="">All Countries</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="UN">United Nations</option>
                </select>
              </div>
              
              <div>
                <label className="label">Min Value</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0"
                  value={searchParams.minValue || ''}
                  onChange={(e) => handleFilterChange('minValue', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              
              <div>
                <label className="label">Max Value</label>
                <input
                  type="number"
                  className="input"
                  placeholder="10000000"
                  value={searchParams.maxValue || ''}
                  onChange={(e) => handleFilterChange('maxValue', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              
              <div>
                <label className="label">Posted From</label>
                <input
                  type="date"
                  className="input"
                  value={searchParams.postedFrom || ''}
                  onChange={(e) => handleFilterChange('postedFrom', e.target.value)}
                />
              </div>
              
              <div>
                <label className="label">Posted To</label>
                <input
                  type="date"
                  className="input"
                  value={searchParams.postedTo || ''}
                  onChange={(e) => handleFilterChange('postedTo', e.target.value)}
                />
              </div>
              
              <div>
                <label className="label">Sort By</label>
                <select
                  className="input"
                  value={searchParams.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                >
                  <option value="posted_date">Posted Date</option>
                  <option value="response_deadline">Deadline</option>
                  <option value="estimated_value">Value</option>
                  <option value="title">Title</option>
                </select>
              </div>
              
              <div>
                <label className="label">Order</label>
                <select
                  className="input"
                  value={searchParams.order}
                  onChange={(e) => handleFilterChange('order', e.target.value as 'asc' | 'desc')}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading opportunities...</div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {data?.data?.map((opportunity: any) => (
              <Link
                key={opportunity.id}
                to={`/opportunities/${opportunity.id}`}
                className="card p-6 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600">
                          {opportunity.title}
                        </h3>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {opportunity.agency_name}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {opportunity.country}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Due {format(new Date(opportunity.response_deadline), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <p className="mt-3 text-gray-600 line-clamp-2">
                          {opportunity.description}
                        </p>
                        <div className="flex items-center mt-3 space-x-2">
                          {opportunity.naics_codes?.slice(0, 3).map((code: string) => (
                            <span
                              key={code}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {code}
                            </span>
                          ))}
                          {opportunity.naics_codes?.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{opportunity.naics_codes.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-6 text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${(opportunity.estimated_value / 1000000).toFixed(1)}M
                        </div>
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              opportunity.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : opportunity.status === 'closed'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {opportunity.status}
                          </span>
                        </div>
                        {opportunity.award_probability && (
                          <div className="mt-3">
                            <div className="text-xs text-gray-500">Win Probability</div>
                            <div className={`text-lg font-semibold ${getProbabilityColor(opportunity.award_probability)}`}>
                              {(opportunity.award_probability * 100).toFixed(0)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bottom Stats Bar */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-6 text-sm">
                    <span className="flex items-center text-gray-500">
                      <FileText className="h-4 w-4 mr-1" />
                      {opportunity.documents?.length || 0} documents
                    </span>
                    {opportunity.estimated_competition && (
                      <span className="flex items-center text-gray-500">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        ~{opportunity.estimated_competition} competitors
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Posted {format(new Date(opportunity.posted_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data?.pagination && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                {data.pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(data.pagination.page - 1)}
                  disabled={data.pagination.page === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {[...Array(Math.min(5, data.pagination.totalPages))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded-lg ${
                        page === data.pagination.page
                          ? 'bg-primary-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(data.pagination.page + 1)}
                  disabled={data.pagination.page === data.pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Opportunities;
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, Clock, TrendingUp, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchSuggestion {
  id: string;
  title: string;
  type: 'opportunity' | 'agency' | 'keyword';
  value: string;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  placeholder = "Search opportunities, agencies, keywords...", 
  onSearch 
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Mock recent searches and trending
  const recentSearches = [
    'IT Services',
    'Construction',
    'Department of Defense',
    'Software Development'
  ];

  const trendingKeywords = [
    'Cybersecurity',
    'Cloud Computing',
    'AI/ML Services',
    'Green Energy'
  ];

  // Debounced search function
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        // Mock API call - replace with actual search API
        const mockSuggestions = [
          {
            id: '1',
            title: 'IT Infrastructure Modernization',
            type: 'opportunity' as const,
            value: 'IT Infrastructure Modernization'
          },
          {
            id: '2',
            title: 'Department of Veterans Affairs',
            type: 'agency' as const,
            value: 'Department of Veterans Affairs'
          },
          {
            id: '3',
            title: 'Cloud Services',
            type: 'keyword' as const,
            value: 'Cloud Services'
          }
        ].filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase())
        );
        
        setSuggestions(mockSuggestions);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      }
      setShowSuggestions(false);
      setQuery(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'agency': return Building;
      case 'opportunity': return TrendingUp;
      default: return Search;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-white/50" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-12 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-200"
          placeholder={placeholder}
        />
        
        {/* Clear button */}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
            }}
            className="absolute inset-y-0 right-8 flex items-center text-white/50 hover:text-white/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        {/* Filter button */}
        <button className="absolute inset-y-0 right-2 flex items-center text-white/50 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/10">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl border border-white/20 shadow-2xl z-50 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-white/60 text-sm">Searching...</p>
            </div>
          ) : (
            <>
              {/* Search suggestions */}
              {suggestions.length > 0 && (
                <div className="border-b border-white/10">
                  <div className="px-4 py-2 text-xs text-white/50 uppercase tracking-wide font-medium">
                    Suggestions
                  </div>
                  {suggestions.map((suggestion) => {
                    const Icon = getSuggestionIcon(suggestion.type);
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSearch(suggestion.value)}
                        className="w-full flex items-center px-4 py-3 hover:bg-white/10 transition-colors text-left"
                      >
                        <Icon className="h-4 w-4 text-white/50 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {suggestion.title}
                          </div>
                          <div className="text-white/50 text-xs capitalize">
                            {suggestion.type}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Recent searches */}
              {query.length === 0 && (
                <>
                  <div className="border-b border-white/10">
                    <div className="px-4 py-2 text-xs text-white/50 uppercase tracking-wide font-medium flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Recent
                    </div>
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(search)}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
                      >
                        <Clock className="h-4 w-4 text-white/50 mr-3" />
                        <span className="text-white text-sm">{search}</span>
                      </button>
                    ))}
                  </div>

                  {/* Trending */}
                  <div>
                    <div className="px-4 py-2 text-xs text-white/50 uppercase tracking-wide font-medium flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </div>
                    {trendingKeywords.map((keyword, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(keyword)}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
                      >
                        <TrendingUp className="h-4 w-4 text-orange-400 mr-3" />
                        <span className="text-white text-sm">{keyword}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              
              {/* No results */}
              {query.length > 0 && suggestions.length === 0 && !isLoading && (
                <div className="p-4 text-center text-white/60">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No results found for "{query}"</p>
                  <button
                    onClick={() => handleSearch()}
                    className="mt-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    Search anyway
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
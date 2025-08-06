"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SOURCE_CONFIGS = exports.SourceRegistry = void 0;
/**
 * Data source registry for managing multiple sources
 */
class SourceRegistry {
    sources = new Map();
    metrics = new Map();
    addSource(config) {
        this.sources.set(config.id, config);
    }
    getSource(id) {
        return this.sources.get(id);
    }
    getAllSources() {
        return Array.from(this.sources.values());
    }
    getEnabledSources() {
        return this.getAllSources().filter(source => source.enabled);
    }
    getSourcesByType(type) {
        return this.getAllSources().filter(source => source.type === type);
    }
    updateSource(id, updates) {
        const source = this.sources.get(id);
        if (!source)
            return false;
        this.sources.set(id, {
            ...source,
            ...updates,
            updatedAt: new Date().toISOString()
        });
        return true;
    }
    removeSource(id) {
        return this.sources.delete(id);
    }
    updateMetrics(sourceId, metrics) {
        const existing = this.metrics.get(sourceId) || {};
        this.metrics.set(sourceId, { ...existing, ...metrics });
    }
    getMetrics(sourceId) {
        return this.metrics.get(sourceId);
    }
    getAllMetrics() {
        return Array.from(this.metrics.values());
    }
}
exports.SourceRegistry = SourceRegistry;
/**
 * Default configurations for common sources
 */
exports.DEFAULT_SOURCE_CONFIGS = {
    sam_gov: {
        type: 'sam_gov',
        baseUrl: 'https://api.sam.gov/opportunities/v2/search',
        rateLimitPerHour: 1500,
        rateLimitBurst: 10,
        pollIntervalMinutes: 15,
        maxRetries: 3,
        config: {
            apiVersion: '2.0',
            format: 'json',
            paginationMethod: 'offset',
            pageSize: 100,
            incrementalSync: true,
            downloadDocuments: true,
            requiredFields: ['title', 'solicitation_number', 'posted_date'],
            samGov: {
                noticeType: ['o', 'k'], // Solicitations and Combined Synopsis/Solicitations
                setAside: [], // All set-asides
            }
        }
    },
    fpds: {
        type: 'fpds',
        baseUrl: 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
        rateLimitPerHour: 1000,
        rateLimitBurst: 5,
        pollIntervalMinutes: 60,
        maxRetries: 3,
        config: {
            format: 'json',
            paginationMethod: 'offset',
            pageSize: 100,
            incrementalSync: true,
            dateField: 'period_of_performance_start_date',
            requiredFields: ['recipient_name', 'award_amount', 'award_date']
        }
    },
    ted_eu: {
        type: 'ted_eu',
        baseUrl: 'https://ted.europa.eu/api/v2.0/notices/search',
        rateLimitPerHour: 500,
        rateLimitBurst: 5,
        pollIntervalMinutes: 30,
        maxRetries: 3,
        config: {
            format: 'json',
            paginationMethod: 'page',
            pageSize: 50,
            incrementalSync: true,
            downloadDocuments: false
        }
    }
};
//# sourceMappingURL=source-config.js.map
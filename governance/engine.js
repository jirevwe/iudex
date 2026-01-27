// Governance Engine - Coordinates all governance rules
import { RestStandardsRule } from './rules/rest-standards.js';
import { VersioningRule } from './rules/versioning.js';
import { NamingConventionsRule } from './rules/naming-conventions.js';
import { HttpMethodsRule } from './rules/http-methods.js';
import { PaginationRule } from './rules/pagination.js';

export class GovernanceEngine {
    constructor(config = {}) {
        this.config = config.governance || {};
        this.enabled = this.config.enabled === true;
        this.rules = [];

        if (this.enabled) {
            this.loadRules();
        }
    }

    /**
     * Load and initialize enabled governance rules
     */
    loadRules() {
        const rulesConfig = this.config.rules || {};

        // Load rules that are explicitly configured
        // Only load if the rule is present in config and enabled !== false
        if ('rest-standards' in rulesConfig && rulesConfig['rest-standards']?.enabled !== false) {
            this.rules.push({
                name: 'rest-standards',
                instance: new RestStandardsRule(rulesConfig['rest-standards'] || {})
            });
        }

        if ('versioning' in rulesConfig && rulesConfig['versioning']?.enabled !== false) {
            this.rules.push({
                name: 'versioning',
                instance: new VersioningRule(rulesConfig['versioning'] || {})
            });
        }

        if ('naming-conventions' in rulesConfig && rulesConfig['naming-conventions']?.enabled !== false) {
            this.rules.push({
                name: 'naming-conventions',
                instance: new NamingConventionsRule(rulesConfig['naming-conventions'] || {})
            });
        }

        if ('http-methods' in rulesConfig && rulesConfig['http-methods']?.enabled !== false) {
            this.rules.push({
                name: 'http-methods',
                instance: new HttpMethodsRule(rulesConfig['http-methods'] || {})
            });
        }

        if ('pagination' in rulesConfig && rulesConfig['pagination']?.enabled !== false) {
            this.rules.push({
                name: 'pagination',
                instance: new PaginationRule(rulesConfig['pagination'] || {})
            });
        }
    }

    /**
     * Dynamically add a rule (useful for testing and extensions)
     */
    addRule(name, ruleInstance) {
        this.rules.push({ name, instance: ruleInstance });
    }

    /**
     * Check request/response against all enabled governance rules
     * @param {Object} request - HTTP request object
     * @param {Object} response - HTTP response object
     * @param {string} endpoint - Endpoint URL
     * @param {Object} testContext - Test context (suite, test name)
     * @returns {Promise<Array>} - Array of violations
     */
    async check(request, response, endpoint, testContext = {}) {
        if (!this.enabled || this.rules.length === 0) {
            return [];
        }

        const allViolations = [];

        for (const rule of this.rules) {
            try {
                const result = await rule.instance.validate(request, response, endpoint);

                if (result && result.violations && result.violations.length > 0) {
                    // Normalize violations to include all required fields
                    const normalizedViolations = result.violations.map(v => ({
                        rule: rule.name,
                        category: v.rule || v.category || 'unknown',
                        severity: v.severity || rule.instance.severity || 'warning',
                        message: v.message || 'Governance violation detected',
                        endpoint: endpoint?.url || endpoint || request.url,
                        method: request.method?.toUpperCase(),
                        location: v.location || 'response',
                        remediation: v.remediation || 'Review and fix the violation',
                        suite: testContext.suite,
                        test: testContext.test
                    }));

                    allViolations.push(...normalizedViolations);
                }
            } catch (error) {
                // Log error but don't fail the test
                console.warn(`Governance rule '${rule.name}' failed:`, error.message);
            }
        }

        return allViolations;
    }

    /**
     * Get list of enabled rule names
     */
    getRuleNames() {
        return this.rules.map(r => r.name);
    }

    /**
     * Check if governance is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Get total number of loaded rules
     */
    getRuleCount() {
        return this.rules.length;
    }
}

export default GovernanceEngine;

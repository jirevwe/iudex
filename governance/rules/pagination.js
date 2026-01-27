// Pagination Standards Governance Rule
export class PaginationRule {
    constructor(config = {}) {
        this.name = 'pagination';
        this.severity = config.severity || 'warning';
        this.enabled = config.enabled !== false;
        this.threshold = config.threshold || 100; // Items before pagination required
        this.preferredStyle = config.preferredStyle || 'cursor'; // 'offset', 'cursor', 'link'
        this.requireMetadata = config.requireMetadata !== false;
        this.allowNoPagination = config.allowNoPagination || false;
    }

    async validate(request, response, endpoint) {
        const violations = [];
        const body = response.body;
        const headers = response.headers || {};

        // Check if response is an array (collection)
        let collection = null;
        let collectionSize = 0;

        if (Array.isArray(body)) {
            // Direct array response
            collection = body;
            collectionSize = body.length;
        } else if (body && typeof body === 'object') {
            // Check for common collection wrappers
            const collectionKeys = ['data', 'items', 'results', 'records'];
            for (const key of collectionKeys) {
                if (Array.isArray(body[key])) {
                    collection = body[key];
                    collectionSize = body[key].length;
                    break;
                }
            }
        }

        // If no collection found, nothing to check
        if (!collection) {
            return { passed: true, violations: [] };
        }

        // Check if collection exceeds threshold
        if (collectionSize > this.threshold && !this.allowNoPagination) {
            const hasPagination = this.detectPagination(body, headers);

            if (!hasPagination) {
                violations.push({
                    rule: 'missing-pagination',
                    message: `Collection with ${collectionSize} items exceeds threshold (${this.threshold}) but has no pagination`,
                    severity: this.severity,
                    location: 'response.body',
                    remediation: `Add pagination metadata (limit, offset, total) or Link headers for collections larger than ${this.threshold} items`
                });
            }
        }

        // If pagination is detected, validate it
        if (collection) {
            const paginationStyle = this.detectPaginationStyle(body, headers);

            if (paginationStyle) {
                const metadataViolations = this.validatePaginationMetadata(body, headers, paginationStyle);
                violations.push(...metadataViolations);
            }
        }

        return { passed: violations.length === 0, violations };
    }

    /**
     * Detect if pagination is present
     */
    detectPagination(body, headers) {
        // Check for offset-based pagination
        if (body && (body.total !== undefined || body.limit !== undefined || body.offset !== undefined || body.page !== undefined)) {
            return true;
        }

        // Check for cursor-based pagination
        if (body && (body.cursor !== undefined || body.next_cursor !== undefined || body.has_more !== undefined)) {
            return true;
        }

        // Check for link-based pagination (Link header)
        if (headers && headers.link) {
            return true;
        }

        // Check for next/prev URLs in body
        if (body && (body.next || body.previous || body.next_url || body.prev_url)) {
            return true;
        }

        return false;
    }

    /**
     * Detect pagination style
     */
    detectPaginationStyle(body, headers) {
        // Link-based (Link header)
        if (headers && headers.link) {
            return 'link';
        }

        // Cursor-based
        if (body && (body.cursor !== undefined || body.next_cursor !== undefined || body.has_more !== undefined)) {
            return 'cursor';
        }

        // Offset-based
        if (body && (body.total !== undefined || body.limit !== undefined || body.offset !== undefined || body.page !== undefined)) {
            return 'offset';
        }

        return null;
    }

    /**
     * Validate pagination metadata
     */
    validatePaginationMetadata(body, headers, style) {
        const violations = [];

        if (!this.requireMetadata) {
            return violations;
        }

        switch (style) {
            case 'offset':
                violations.push(...this.validateOffsetPagination(body));
                break;

            case 'cursor':
                violations.push(...this.validateCursorPagination(body));
                break;

            case 'link':
                violations.push(...this.validateLinkPagination(headers));
                break;
        }

        // Check for preferred style
        if (this.preferredStyle !== style) {
            violations.push({
                rule: 'inconsistent-pagination-style',
                message: `Using ${style} pagination, but ${this.preferredStyle} is preferred`,
                severity: 'info',
                location: 'response.body',
                remediation: `Consider switching to ${this.preferredStyle}-based pagination for consistency`
            });
        }

        return violations;
    }

    /**
     * Validate offset-based pagination
     */
    validateOffsetPagination(body) {
        const violations = [];

        // Should have: total, limit, offset (or page)
        if (body.total === undefined) {
            violations.push({
                rule: 'incomplete-pagination-metadata',
                message: 'Offset-based pagination missing "total" field',
                severity: 'warning',
                location: 'response.body',
                remediation: 'Add "total" field to indicate total number of items'
            });
        }

        if (body.limit === undefined) {
            violations.push({
                rule: 'incomplete-pagination-metadata',
                message: 'Offset-based pagination missing "limit" field',
                severity: 'warning',
                location: 'response.body',
                remediation: 'Add "limit" field to indicate page size'
            });
        }

        if (body.offset === undefined && body.page === undefined) {
            violations.push({
                rule: 'incomplete-pagination-metadata',
                message: 'Offset-based pagination missing "offset" or "page" field',
                severity: 'warning',
                location: 'response.body',
                remediation: 'Add "offset" or "page" field to indicate current position'
            });
        }

        // Validate values
        if (body.offset !== undefined && (body.offset < 0 || !Number.isInteger(body.offset))) {
            violations.push({
                rule: 'invalid-pagination-values',
                message: 'Invalid offset value (must be non-negative integer)',
                severity: 'error',
                location: 'response.body.offset',
                remediation: 'Ensure offset is a non-negative integer'
            });
        }

        if (body.limit !== undefined && (body.limit <= 0 || !Number.isInteger(body.limit))) {
            violations.push({
                rule: 'invalid-pagination-values',
                message: 'Invalid limit value (must be positive integer)',
                severity: 'error',
                location: 'response.body.limit',
                remediation: 'Ensure limit is a positive integer'
            });
        }

        return violations;
    }

    /**
     * Validate cursor-based pagination
     */
    validateCursorPagination(body) {
        const violations = [];

        // Should have: cursor or next_cursor, and has_more or next
        const hasCursor = body.cursor !== undefined || body.next_cursor !== undefined;
        const hasNavigation = body.has_more !== undefined || body.next !== undefined;

        if (!hasCursor) {
            violations.push({
                rule: 'incomplete-pagination-metadata',
                message: 'Cursor-based pagination missing cursor field',
                severity: 'warning',
                location: 'response.body',
                remediation: 'Add "cursor" or "next_cursor" field'
            });
        }

        if (!hasNavigation) {
            violations.push({
                rule: 'incomplete-pagination-metadata',
                message: 'Cursor-based pagination missing navigation field',
                severity: 'warning',
                location: 'response.body',
                remediation: 'Add "has_more" boolean or "next" URL field'
            });
        }

        return violations;
    }

    /**
     * Validate link-based pagination (Link header)
     */
    validateLinkPagination(headers) {
        const violations = [];

        const linkHeader = headers.link || headers.Link;

        if (!linkHeader) {
            return violations;
        }

        // Parse Link header and check for rel=next or rel=prev
        const hasNext = /rel="?next"?/i.test(linkHeader);
        const hasPrev = /rel="?prev"?/i.test(linkHeader);

        if (!hasNext && !hasPrev) {
            violations.push({
                rule: 'incomplete-pagination-metadata',
                message: 'Link header missing rel="next" or rel="prev"',
                severity: 'warning',
                location: 'response.headers.Link',
                remediation: 'Add rel="next" or rel="prev" links to Link header'
            });
        }

        return violations;
    }
}

export default PaginationRule;

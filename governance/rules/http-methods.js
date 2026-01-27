// HTTP Method Standards Governance Rule
export class HttpMethodsRule {
    constructor(config = {}) {
        this.name = 'http-methods';
        this.severity = config.severity || 'error';
        this.enabled = config.enabled !== false;
        this.enforceSemantics = config.enforceSemantics !== false;
        this.enforceIdempotency = config.enforceIdempotency !== false;
        this.strictStatusCodes = config.strictStatusCodes !== false;

        // Expected status codes for each HTTP method
        this.expectedStatusCodes = {
            GET: [200, 204, 206, 304, 404],
            POST: [200, 201, 202, 204, 400, 404, 409],
            PUT: [200, 204, 400, 404, 409],
            PATCH: [200, 204, 400, 404, 409],
            DELETE: [200, 204, 404],
            HEAD: [200, 204, 304, 404],
            OPTIONS: [200, 204]
        };
    }

    async validate(request, response, endpoint) {
        const violations = [];
        const method = (request.method || '').toUpperCase();
        const status = response.status;

        // Validate method semantics
        if (this.enforceSemantics) {
            const semanticsViolations = this.checkMethodSemantics(method, status, request, response);
            violations.push(...semanticsViolations);
        }

        // Validate status codes
        if (this.strictStatusCodes) {
            const statusViolations = this.checkStatusCodes(method, status);
            violations.push(...statusViolations);
        }

        return { passed: violations.length === 0, violations };
    }

    /**
     * Check HTTP method semantics
     */
    checkMethodSemantics(method, status, request, response) {
        const violations = [];

        switch (method) {
            case 'GET':
            case 'HEAD':
                // Safe methods should have no side effects
                // We can't really detect this programmatically, but we can check for suspicious patterns
                if (response.body?.created || response.body?.updated || response.body?.deleted) {
                    violations.push({
                        rule: 'unsafe-method',
                        message: `${method} request appears to have side effects (created/updated/deleted fields in response)`,
                        severity: 'error',
                        location: 'response.body',
                        remediation: `${method} should be read-only. Use POST, PUT, PATCH, or DELETE for modifications.`
                    });
                }
                break;

            case 'POST':
                // POST for resource creation should return 201
                if (status === 200 && response.body?.id && !response.body?.errors) {
                    violations.push({
                        rule: 'wrong-status-code',
                        message: 'POST for resource creation should return 201 Created, not 200 OK',
                        severity: 'warning',
                        location: 'response.status',
                        remediation: 'Change response status to 201 for successful resource creation'
                    });
                }
                break;

            case 'PUT':
                // PUT should replace entire resource (not partial update)
                // Validate that request body is complete (not partial)
                if (request.body && response.body && status === 200) {
                    const putViolations = this.validatePutSemantics(request.body, response.body);
                    violations.push(...putViolations);
                } else if (status === 201) {
                    // PUT can create if resource doesn't exist (idempotent)
                    // This is acceptable
                } else if (status === 200 && !response.body) {
                    violations.push({
                        rule: 'wrong-status-code',
                        message: 'PUT with 200 status should include updated resource in response body, or use 204 No Content',
                        severity: 'info',
                        location: 'response.body',
                        remediation: 'Return updated resource with 200 OK, or use 204 No Content'
                    });
                }
                break;

            case 'PATCH':
                // PATCH should be partial update
                // Validate that request body is partial (not complete replacement)
                if (request.body && response.body && status === 200) {
                    const patchViolations = this.validatePatchSemantics(request.body, response.body);
                    violations.push(...patchViolations);
                } else if (status === 200 && !response.body) {
                    violations.push({
                        rule: 'wrong-status-code',
                        message: 'PATCH with 200 status should include updated resource in response body, or use 204 No Content',
                        severity: 'info',
                        location: 'response.body',
                        remediation: 'Return updated resource with 200 OK, or use 204 No Content'
                    });
                }
                break;

            case 'DELETE':
                // DELETE should return 204 No Content or 200 with details
                if (status === 200 && !response.body) {
                    violations.push({
                        rule: 'wrong-status-code',
                        message: 'DELETE with 200 status should include response body, or use 204 No Content',
                        severity: 'info',
                        location: 'response.status',
                        remediation: 'Use 204 No Content for DELETE, or return details with 200 OK'
                    });
                }
                if (status === 204 && response.body) {
                    violations.push({
                        rule: 'wrong-status-code',
                        message: '204 No Content should not have a response body',
                        severity: 'warning',
                        location: 'response.body',
                        remediation: 'Remove response body or use 200 OK instead of 204'
                    });
                }
                break;
        }

        return violations;
    }

    /**
     * Validate PUT semantics - should replace entire resource
     */
    validatePutSemantics(requestBody, responseBody) {
        const violations = [];

        // Count fields in request vs response
        const requestFields = this.getFieldNames(requestBody);
        const responseFields = this.getFieldNames(responseBody);

        // Calculate field overlap
        const commonFields = requestFields.filter(f => responseFields.includes(f));

        // PUT should be a full replacement, so request should have most/all fields
        // If request has very few fields compared to response, it might be a partial update (should use PATCH)
        const requestCoverage = requestFields.length / Math.max(responseFields.length, 1);

        if (requestCoverage < 0.5 && requestFields.length < responseFields.length) {
            violations.push({
                rule: 'wrong-method',
                message: `PUT request appears to be partial update (${requestFields.length} fields sent, ${responseFields.length} fields in resource). Consider using PATCH for partial updates.`,
                severity: 'info',
                location: 'request.body',
                remediation: 'Use PATCH for partial updates, or include all resource fields in PUT request for full replacement'
            });
        }

        // Check if request values match response values for updated fields
        // This helps detect if PUT properly replaced the resource
        const mismatchedFields = [];
        for (const field of commonFields) {
            const reqVal = requestBody[field];
            const resVal = responseBody[field];

            // Skip timestamp/ID fields that may be server-generated
            if (['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt'].includes(field)) {
                continue;
            }

            if (reqVal !== resVal && JSON.stringify(reqVal) !== JSON.stringify(resVal)) {
                mismatchedFields.push(field);
            }
        }

        if (mismatchedFields.length > 0 && mismatchedFields.length / commonFields.length > 0.3) {
            violations.push({
                rule: 'unexpected-response',
                message: `PUT response doesn't reflect request values for fields: ${mismatchedFields.slice(0, 3).join(', ')}${mismatchedFields.length > 3 ? '...' : ''}`,
                severity: 'warning',
                location: 'response.body',
                remediation: 'Ensure PUT response reflects the updated resource state'
            });
        }

        return violations;
    }

    /**
     * Validate PATCH semantics - should be partial update
     */
    validatePatchSemantics(requestBody, responseBody) {
        const violations = [];

        const requestFields = this.getFieldNames(requestBody);
        const responseFields = this.getFieldNames(responseBody);

        // PATCH should update only specific fields
        // If request has ALL or most fields, why not use PUT?
        const requestCoverage = requestFields.length / Math.max(responseFields.length, 1);

        // Consider it "full replacement" if request has 60%+ of response fields
        // (excluding server-generated fields like id, timestamps)
        const nonGeneratedResponseFields = responseFields.filter(f =>
            !['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt'].includes(f)
        );
        const nonGeneratedCoverage = requestFields.length / Math.max(nonGeneratedResponseFields.length, 1);

        if (nonGeneratedCoverage >= 0.8 || requestFields.length >= responseFields.length * 0.7) {
            violations.push({
                rule: 'wrong-method',
                message: `PATCH request includes most/all resource fields (${requestFields.length}/${responseFields.length}). Consider using PUT for full replacement.`,
                severity: 'info',
                location: 'request.body',
                remediation: 'Use PUT for full resource replacement, or send only changed fields in PATCH request'
            });
        }

        // Verify that request fields exist in response (PATCH should update subset)
        const unmatchedFields = requestFields.filter(f => !responseFields.includes(f));
        if (unmatchedFields.length > 0) {
            violations.push({
                rule: 'unexpected-response',
                message: `PATCH request includes fields not present in response: ${unmatchedFields.slice(0, 3).join(', ')}${unmatchedFields.length > 3 ? '...' : ''}`,
                severity: 'warning',
                location: 'request.body',
                remediation: 'Ensure PATCH request only includes valid resource fields'
            });
        }

        return violations;
    }

    /**
     * Get field names from an object (recursively for nested objects)
     */
    getFieldNames(obj, prefix = '') {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            return [];
        }

        const fields = [];
        for (const key of Object.keys(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            fields.push(fullKey);

            // Recursively get nested fields (but only go one level deep to avoid complexity)
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !prefix) {
                fields.push(...this.getFieldNames(obj[key], fullKey));
            }
        }

        return fields;
    }

    /**
     * Check if status code is appropriate for HTTP method
     */
    checkStatusCodes(method, status) {
        const violations = [];
        const expectedCodes = this.expectedStatusCodes[method];

        if (!expectedCodes) {
            // Unknown method
            violations.push({
                rule: 'unknown-method',
                message: `Unknown HTTP method: ${method}`,
                severity: 'error',
                location: 'request.method',
                remediation: 'Use standard HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)'
            });
            return violations;
        }

        // Check if status code is in expected range
        if (!expectedCodes.includes(status) && !this.isExpectedErrorStatus(status)) {
            violations.push({
                rule: 'unexpected-status-code',
                message: `${method} returned unexpected status code ${status}. Expected one of: ${expectedCodes.join(', ')}`,
                severity: 'info',
                location: 'response.status',
                remediation: `Use appropriate status code for ${method} method`
            });
        }

        return violations;
    }

    /**
     * Check if status is a common error status (acceptable for any method)
     */
    isExpectedErrorStatus(status) {
        const commonErrorCodes = [
            400, // Bad Request
            401, // Unauthorized
            403, // Forbidden
            405, // Method Not Allowed
            408, // Request Timeout
            422, // Unprocessable Entity
            429, // Too Many Requests
            500, // Internal Server Error
            502, // Bad Gateway
            503, // Service Unavailable
            504  // Gateway Timeout
        ];

        return commonErrorCodes.includes(status);
    }

    /**
     * Check idempotency
     * Note: This is difficult to verify programmatically without making multiple requests
     * This method is a placeholder for future enhancement
     */
    checkIdempotency(method, response) {
        const violations = [];

        // Idempotent methods: GET, HEAD, PUT, DELETE, OPTIONS
        // Non-idempotent: POST, PATCH (usually)

        // We can't really check this without making multiple requests
        // Future enhancement: Store request/response history and compare

        return violations;
    }
}

export default HttpMethodsRule;

// Iudex - Result Collector
// Aggregates and organizes test results for reporting

export class ResultCollector {
    constructor() {
        this.results = {
            suites: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                todo: 0,
                duration: 0,
                startTime: null,
                endTime: null
            },
            governance: {
                violations: [],
                warnings: []
            },
            security: {
                findings: []
            },
            metadata: {
                framework: 'Iudex',
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            }
        };
    }

    /**
     * Add test results from runner
     */
    addResults(runnerResults) {
        this.results.suites = runnerResults.suites || [];
        this.results.summary = {
            ...runnerResults.summary,
            startTime: this.results.summary.startTime,
            endTime: Date.now()
        };
        return this;
    }

    /**
     * Add governance violations
     */
    addGovernanceViolation(violation) {
        if (violation.severity === 'error') {
            this.results.governance.violations.push(violation);
        } else {
            this.results.governance.warnings.push(violation);
        }
        return this;
    }

    /**
     * Add security finding
     */
    addSecurityFinding(finding) {
        this.results.security.findings.push(finding);
        return this;
    }

    /**
     * Start timing
     */
    start() {
        this.results.summary.startTime = Date.now();
        return this;
    }

    /**
     * End timing
     */
    end() {
        this.results.summary.endTime = Date.now();
        if (this.results.summary.startTime) {
            this.results.summary.duration =
                this.results.summary.endTime - this.results.summary.startTime;
        }
        return this;
    }

    /**
     * Get all results
     */
    getResults() {
        return this.results;
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        return this.results.summary;
    }

    /**
     * Get metadata
     */
    getMetadata() {
        return this.results.metadata;
    }

    /**
     * Set metadata (allows customization)
     */
    setMetadata(metadata) {
        this.results.metadata = {...this.results.metadata, ...metadata};
        return this;
    }

    /**
     * Get all test results as a flattened array
     */
    getAllResults() {
        const allResults = [];
        for (const suite of this.results.suites) {
            for (const test of suite.tests) {
                allResults.push({
                    suite: suite.name,
                    test: test.name,
                    name: test.name,
                    description: test.description || null,
                    testId: test.testId || null,
                    file: test.file || null,
                    endpoint: test.endpoint || null,
                    method: test.method || test.httpMethod || null,
                    status: test.status,
                    duration: test.duration || 0,
                    responseTime: test.responseTime || null,
                    statusCode: test.statusCode || null,
                    error: test.error?.message || test.error || null,
                    errorType: test.error?.name || null,
                    stack: test.error?.stack || null,
                    assertionsPassed: test.assertionsPassed || null,
                    assertionsFailed: test.assertionsFailed || null,
                    requestBody: test.requestBody || null,
                    responseBody: test.responseBody || null,
                    tags: test.tags || []
                });
            }
        }
        return allResults;
    }

    /**
     * Get all test results including access to raw test objects
     * This is an alias for backwards compatibility
     */
    get testResults() {
        return this.getAllResults();
    }

    /**
     * Get failed tests
     */
    getFailedTests() {
        const failed = [];
        for (const suite of this.results.suites) {
            for (const test of suite.tests) {
                if (test.status === 'failed') {
                    failed.push({
                        suite: suite.name,
                        test: test.name,
                        error: test.error,
                        duration: test.duration
                    });
                }
            }
        }
        return failed;
    }

    /**
     * Get passed tests
     */
    getPassedTests() {
        const passed = [];
        for (const suite of this.results.suites) {
            for (const test of suite.tests) {
                if (test.status === 'passed') {
                    passed.push({
                        suite: suite.name,
                        test: test.name,
                        duration: test.duration
                    });
                }
            }
        }
        return passed;
    }

    /**
     * Get skipped tests
     */
    getSkippedTests() {
        const skipped = [];
        for (const suite of this.results.suites) {
            for (const test of suite.tests) {
                if (test.status === 'skipped') {
                    skipped.push({
                        suite: suite.name,
                        test: test.name
                    });
                }
            }
        }
        return skipped;
    }

    /**
     * Get todo tests
     */
    getUnimplementedTests() {
        const todo = [];
        for (const suite of this.results.suites) {
            for (const test of suite.tests) {
                if (test.status === 'todo') {
                    todo.push({
                        suite: suite.name,
                        test: test.name
                    });
                }
            }
        }
        return todo;
    }

    /**
     * Get tests by tag
     */
    getTestsByTag(tag) {
        const tests = [];
        for (const suite of this.results.suites) {
            for (const test of suite.tests) {
                if (test.tags && test.tags.includes(tag)) {
                    tests.push({
                        suite: suite.name,
                        test: test.name,
                        status: test.status,
                        duration: test.duration
                    });
                }
            }
        }
        return tests;
    }

    /**
     * Get slowest tests
     */
    getSlowestTests(limit = 10) {
        const allTests = [];
        for (const suite of this.results.suites) {
            for (const test of suite.tests) {
                allTests.push({
                    suite: suite.name,
                    test: test.name,
                    duration: test.duration || 0,
                    status: test.status
                });
            }
        }
        return allTests
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }

    /**
     * Check if all tests passed
     */
    hasAllPassed() {
        return this.results.summary.failed === 0 &&
            this.results.summary.total > 0;
    }

    /**
     * Check if any tests failed
     */
    hasFailures() {
        return this.results.summary.failed > 0;
    }

    /**
     * Get success rate as percentage
     */
    getSuccessRate() {
        if (this.results.summary.total === 0) return 0;
        return (this.results.summary.passed / this.results.summary.total) * 100;
    }

    /**
     * Format results for JSON export
     */
    toJSON() {
        return JSON.stringify(this.results, null, 2);
    }

    /**
     * Format results for JUnit XML
     */
    toJUnit() {
        const testsuites = [];

        for (const suite of this.results.suites) {
            const testsuite = {
                name: suite.name,
                tests: suite.tests.length,
                failures: suite.failed,
                skipped: suite.skipped,
                time: (suite.duration / 1000).toFixed(3),
                testcases: suite.tests.map(test => ({
                    name: test.name,
                    classname: suite.name,
                    time: ((test.duration || 0) / 1000).toFixed(3),
                    failure: test.status === 'failed' ? {
                        message: test.error?.message || 'Test failed',
                        type: test.error?.timeout ? 'Timeout' : 'AssertionError',
                        content: test.error?.stack || ''
                    } : null,
                    skipped: test.status === 'skipped'
                }))
            };
            testsuites.push(testsuite);
        }

        return this._buildJUnitXML(testsuites);
    }

    /**
     * Build JUnit XML string
     */
    _buildJUnitXML(testsuites) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<testsuites>\n';

        for (const suite of testsuites) {
            xml += `  <testsuite name="${this._escapeXML(suite.name)}" `;
            xml += `tests="${suite.tests}" `;
            xml += `failures="${suite.failures}" `;
            xml += `skipped="${suite.skipped}" `;
            xml += `time="${suite.time}">\n`;

            for (const testcase of suite.testcases) {
                xml += `    <testcase name="${this._escapeXML(testcase.name)}" `;
                xml += `classname="${this._escapeXML(testcase.classname)}" `;
                xml += `time="${testcase.time}">\n`;

                if (testcase.failure) {
                    xml += `      <failure message="${this._escapeXML(testcase.failure.message)}" `;
                    xml += `type="${testcase.failure.type}">\n`;
                    xml += `        ${this._escapeXML(testcase.failure.content)}\n`;
                    xml += `      </failure>\n`;
                }

                if (testcase.skipped) {
                    xml += `      <skipped/>\n`;
                }

                xml += `    </testcase>\n`;
            }

            xml += `  </testsuite>\n`;
        }

        xml += '</testsuites>\n';
        return xml;
    }

    /**
     * Escape XML special characters
     */
    _escapeXML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Reset collector
     */
    reset() {
        this.results = {
            suites: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                todo: 0,
                duration: 0,
                startTime: null,
                endTime: null
            },
            governance: {
                violations: [],
                warnings: []
            },
            security: {
                findings: []
            },
            metadata: {
                framework: 'Iudex',
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            }
        };
        return this;
    }
}

export default {ResultCollector};

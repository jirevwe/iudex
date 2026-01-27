import { DashboardServer } from '../dashboard-server.js';
import fp from 'fastify-plugin';

/**
 * Fastify plugin for the Iudex dashboard
 *
 * @param {Object} fastify - Fastify instance
 * @param {Object} opts - Plugin options
 * @param {string} [opts.prefix='/dashboard'] - Route prefix
 * @param {string} [opts.resultsDir='.iudex/results'] - Directory containing test results
 * @param {string} [opts.title='Iudex Test Dashboard'] - Dashboard title
 * @param {string} [opts.apiEndpoint] - Optional PostgreSQL analytics API endpoint
 * @param {string} [opts.theme='light'] - Dashboard theme
 *
 * @example
 * import Fastify from 'fastify';
 * import { createFastifyDashboard } from 'iudex/server/fastify';
 *
 * const fastify = Fastify();
 * await fastify.register(createFastifyDashboard, {
 *   prefix: '/test-dashboard',
 *   resultsDir: '.iudex/results'
 * });
 */
async function fastifyDashboardPlugin(fastify, opts) {
  // Set basePath from Fastify prefix if not explicitly configured
  const basePath = opts.basePath || opts.prefix || '/';
  const dashboardConfig = { ...opts, basePath };
  const dashboard = new DashboardServer(dashboardConfig);

  // Helper to convert Node.js req/res to Fastify-compatible format
  const handleRequest = async (request, reply) => {
    // Construct full URL path for the dashboard server
    // Since we're in a prefixed context, request.url is relative to the prefix
    const fullUrl = `${basePath}${request.url}`.replace('//', '/');

    // Create a minimal req object that DashboardServer expects
    const req = {
      url: fullUrl,
      method: request.method,
      headers: request.headers
    };

    // Create a response wrapper that works with Fastify's reply
    const res = {
      writeHead: (statusCode, headers) => {
        reply.code(statusCode);
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            reply.header(key, value);
          });
        }
        return res;
      },
      end: (data) => {
        reply.send(data);
      }
    };

    await dashboard.handleRequest(req, res);
  };

  // Register routes to handle all paths under this prefix
  // Need both / and /* to catch root and nested paths
  fastify.all('/', handleRequest);
  fastify.all('/*', handleRequest);
}

/**
 * Export the plugin function directly (without fp wrapper) to maintain encapsulation
 * This ensures routes are properly scoped within the prefix
 */
export const createFastifyDashboard = fastifyDashboardPlugin;

/**
 * Iudex - Fastify Handler
 * Fastify plugin for the Iudex dashboard
 */

import { DashboardServer } from '../dashboard-server.js';
import type { DashboardServerConfig } from '../dashboard-server.js';

// Define minimal types for Fastify to avoid requiring @types/fastify as a dependency
// Users who use Fastify will have the full types available

/** Minimal Fastify request interface */
interface FastifyRequest {
  url: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
}

/** Minimal Fastify reply interface */
interface FastifyReply {
  code: (statusCode: number) => FastifyReply;
  header: (key: string, value: string) => FastifyReply;
  send: (data?: string | Buffer) => void;
}

/** Minimal Fastify instance interface */
interface FastifyInstance {
  all: (path: string, handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>) => void;
}

/** Fastify dashboard plugin options */
export interface FastifyDashboardOptions extends DashboardServerConfig {
  prefix?: string;
}

/** Minimal response interface for Fastify adapter */
interface FastifyResponseAdapter {
  writeHead: (statusCode: number, headers?: Record<string, string>) => FastifyResponseAdapter;
  end: (data?: string | Buffer) => void;
}

/**
 * Fastify plugin for the Iudex dashboard
 *
 * @param fastify - Fastify instance
 * @param opts - Plugin options
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
async function fastifyDashboardPlugin(
  fastify: FastifyInstance,
  opts: FastifyDashboardOptions
): Promise<void> {
  // Set basePath from Fastify prefix if not explicitly configured
  const basePath = opts.basePath || opts.prefix || '/';
  const dashboardConfig = { ...opts, basePath };
  const dashboard = new DashboardServer(dashboardConfig);

  // Helper to convert Node.js req/res to Fastify-compatible format
  const handleRequest = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Construct full URL path for the dashboard server
    // Since we're in a prefixed context, request.url is relative to the prefix
    const fullUrl = `${basePath}${request.url}`.replace('//', '/');

    // Create a minimal req object that DashboardServer expects
    const req = {
      url: fullUrl,
      method: request.method,
      headers: request.headers as Record<string, string | string[] | undefined>
    };

    // Create a response wrapper that works with Fastify's reply
    const res: FastifyResponseAdapter = {
      writeHead: (statusCode: number, headers?: Record<string, string>) => {
        reply.code(statusCode);
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            reply.header(key, value);
          });
        }
        return res;
      },
      end: (data?: string | Buffer) => {
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

export default createFastifyDashboard;

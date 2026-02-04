/**
 * Iudex - HTTP Client
 * Axios-based HTTP client with request/response history tracking
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios';
import type { HttpClientConfig, HttpMethod, RequestHistoryEntry } from '../types/index.js';

/** Extended axios config with metadata */
interface AxiosRequestConfigWithMetadata extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

/** Extended axios response with timing */
interface AxiosResponseWithTiming<T = unknown> extends AxiosResponse<T> {
  responseTime: number;
  duration: number;
  config: AxiosRequestConfigWithMetadata;
}

/** Request options */
interface RequestOptions {
  params?: Record<string, unknown>;
  qs?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
}

/** Data options with body/data support */
interface DataOptions extends RequestOptions {
  body?: unknown;
  data?: unknown;
}

/**
 * HTTP Client class with history tracking
 */
export class HttpClient {
  private config: HttpClientConfig;
  private axios: AxiosInstance;
  private history: RequestHistoryEntry[];

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || process.env.API_BASE_URL || '',
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      ...config
    };

    this.axios = axios.create({
      ...this.config,
      validateStatus: () => true
    });

    this.history = [];
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const configWithMetadata = config as AxiosRequestConfigWithMetadata;
      configWithMetadata.metadata = { startTime: Date.now() };
      return configWithMetadata;
    });

    this.axios.interceptors.response.use((response: AxiosResponse) => {
      const endTime = Date.now();
      const configWithMetadata = response.config as AxiosRequestConfigWithMetadata;
      const startTime = configWithMetadata.metadata?.startTime || endTime;

      const responseWithTiming = response as AxiosResponseWithTiming;
      responseWithTiming.responseTime = endTime - startTime;
      responseWithTiming.duration = responseWithTiming.responseTime;

      this.history.push({
        request: {
          url: response.config.url || '',
          method: (response.config.method?.toUpperCase() || 'GET') as HttpMethod,
          headers: (response.config.headers || {}) as Record<string, string>,
          data: response.config.data
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
          body: response.data,
          responseTime: responseWithTiming.responseTime,
          request: {
            url: response.config.url || '',
            method: (response.config.method?.toUpperCase() || 'GET') as HttpMethod
          }
        },
        timestamp: new Date()
      });

      return responseWithTiming;
    });
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(url: string, options: RequestOptions = {}): Promise<AxiosResponseWithTiming<T>> {
    return this.axios.get<T>(url, {
      params: options.params || options.qs,
      ...options
    }) as Promise<AxiosResponseWithTiming<T>>;
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    url: string,
    data: DataOptions | unknown = {},
    options: RequestOptions = {}
  ): Promise<AxiosResponseWithTiming<T>> {
    // Support both post(url, payload) and post(url, {body: payload})
    const dataOpts = data as DataOptions;
    const payload = dataOpts.body !== undefined
      ? dataOpts.body
      : (dataOpts.data !== undefined ? dataOpts.data : data);
    const config = dataOpts.body !== undefined || dataOpts.data !== undefined ? dataOpts : options;

    return this.axios.post<T>(url, payload, config as AxiosRequestConfig) as Promise<AxiosResponseWithTiming<T>>;
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(
    url: string,
    data: DataOptions | unknown = {},
    options: RequestOptions = {}
  ): Promise<AxiosResponseWithTiming<T>> {
    const dataOpts = data as DataOptions;
    const payload = dataOpts.body !== undefined
      ? dataOpts.body
      : (dataOpts.data !== undefined ? dataOpts.data : data);
    const config = dataOpts.body !== undefined || dataOpts.data !== undefined ? dataOpts : options;

    return this.axios.put<T>(url, payload, config as AxiosRequestConfig) as Promise<AxiosResponseWithTiming<T>>;
  }

  /**
   * Make a PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data: DataOptions | unknown = {},
    options: RequestOptions = {}
  ): Promise<AxiosResponseWithTiming<T>> {
    const dataOpts = data as DataOptions;
    const payload = dataOpts.body !== undefined
      ? dataOpts.body
      : (dataOpts.data !== undefined ? dataOpts.data : data);
    const config = dataOpts.body !== undefined || dataOpts.data !== undefined ? dataOpts : options;

    return this.axios.patch<T>(url, payload, config as AxiosRequestConfig) as Promise<AxiosResponseWithTiming<T>>;
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(url: string, options: RequestOptions = {}): Promise<AxiosResponseWithTiming<T>> {
    return this.axios.delete<T>(url, options) as Promise<AxiosResponseWithTiming<T>>;
  }

  /**
   * Make a HEAD request
   */
  async head<T = unknown>(url: string, options: RequestOptions = {}): Promise<AxiosResponseWithTiming<T>> {
    return this.axios.head<T>(url, options) as Promise<AxiosResponseWithTiming<T>>;
  }

  /**
   * Make an OPTIONS request
   */
  async options<T = unknown>(url: string, options: RequestOptions = {}): Promise<AxiosResponseWithTiming<T>> {
    return this.axios.options<T>(url, options) as Promise<AxiosResponseWithTiming<T>>;
  }

  /**
   * Get request/response history
   */
  getHistory(): RequestHistoryEntry[] {
    return this.history;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get last request from history
   */
  getLastRequest(): RequestHistoryEntry['request'] | null {
    if (this.history.length === 0) {
      return null;
    }
    return this.history[this.history.length - 1].request;
  }

  /**
   * Get last response from history
   */
  getLastResponse(): RequestHistoryEntry['response'] | null {
    if (this.history.length === 0) {
      return null;
    }
    return this.history[this.history.length - 1].response;
  }

  /**
   * Get last request/response pair
   */
  getLastExchange(): RequestHistoryEntry | null {
    if (this.history.length === 0) {
      return null;
    }
    return this.history[this.history.length - 1];
  }
}

/**
 * Create a new HTTP client
 * @param config - Client configuration
 * @returns HttpClient instance
 */
export function createClient(config?: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}

export default { HttpClient, createClient };

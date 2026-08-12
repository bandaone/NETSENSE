import {
  TopologyAccessError,
  TopologyAuthenticationError,
  TopologyNotFoundError,
  TopologyTransportError,
  TopologyValidationError,
} from '../domain/errors';
import type { TopologySnapshot } from '../domain/types';
import { assertTopologyScope, parseTopologySnapshot } from './fixtureTopologyRepository';
import type { TopologyRepository, TopologySnapshotRequest } from './topologyRepository';

export type AccessTokenProvider = () => string | null | Promise<string | null>;
export type TopologyFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const browserFetch: TopologyFetch = (input, init) => globalThis.fetch(input, init);

function normalizedBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export class HttpTopologyRepository implements TopologyRepository {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly accessToken: AccessTokenProvider,
    private readonly fetchTopology: TopologyFetch = browserFetch,
    private readonly allowDevelopmentProxyAuthentication = false,
  ) {
    this.baseUrl = normalizedBaseUrl(baseUrl);
  }

  async getSnapshot(
    request: TopologySnapshotRequest,
    signal?: AbortSignal,
  ): Promise<TopologySnapshot> {
    const token = (await this.accessToken())?.trim();
    if (!token && !this.allowDevelopmentProxyAuthentication) {
      throw new TopologyAuthenticationError();
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await this.fetchTopology(
        `${this.baseUrl}/api/v1/sites/${encodeURIComponent(request.siteId)}/topology`,
        {
          method: 'GET',
          headers,
          cache: 'no-store',
          credentials: 'omit',
          signal,
        },
      );
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') throw reason;
      throw new TopologyTransportError();
    }

    if (response.status === 401) throw new TopologyAuthenticationError();
    if (response.status === 403) throw new TopologyAccessError();
    if (response.status === 404) throw new TopologyNotFoundError(request.siteId);
    if (!response.ok) {
      throw new TopologyTransportError(
        `The live topology service returned status ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new TopologyValidationError('The live topology response was not valid JSON.');
    }
    const snapshot = parseTopologySnapshot(payload);
    assertTopologyScope(snapshot, request);
    return snapshot;
  }
}

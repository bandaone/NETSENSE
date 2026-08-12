import { chmodSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDevelopmentProxyAuthorization } from './devProxyAuthentication';

function tokenFile(mode = 0o600): string {
  const directory = mkdtempSync(join(tmpdir(), 'netsense-vite-auth-'));
  const path = join(directory, 'operator.jwt');
  writeFileSync(path, 'header.payload.signature', { mode });
  chmodSync(path, mode);
  return path;
}

describe('loadDevelopmentProxyAuthorization', () => {
  it('loads an owner-only token for a loopback platform target', () => {
    expect(loadDevelopmentProxyAuthorization(
      'http://127.0.0.1:8000',
      tokenFile(),
    )).toBe('Bearer header.payload.signature');
  });

  it('rejects a token file when the proxy target is not loopback', () => {
    expect(() => loadDevelopmentProxyAuthorization(
      'https://platform.example',
      tokenFile(),
    )).toThrow('allowed only with a loopback API proxy target');
  });

  it('rejects token files accessible by another user class', () => {
    expect(() => loadDevelopmentProxyAuthorization(
      'http://localhost:8000',
      tokenFile(0o640),
    )).toThrow('must not be accessible by group or other users');
  });

  it('rejects symlink token paths', () => {
    const source = tokenFile();
    const link = `${source}.link`;
    symlinkSync(source, link);

    expect(() => loadDevelopmentProxyAuthorization(
      'http://[::1]:8000',
      link,
    )).toThrow('regular, non-symlink file');
  });
});

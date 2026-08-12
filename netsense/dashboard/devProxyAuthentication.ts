import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

export function loadDevelopmentProxyAuthorization(
  proxyTarget: string,
  tokenFile: string | undefined,
): string | undefined {
  const path = tokenFile?.trim();
  if (!path) return undefined;

  const target = new URL(proxyTarget);
  if (!LOOPBACK_HOSTS.has(target.hostname)) {
    throw new Error('NETSENSE_DEV_PROXY_TOKEN_FILE is allowed only with a loopback API proxy target.');
  }
  if (!isAbsolute(path)) {
    throw new Error('NETSENSE_DEV_PROXY_TOKEN_FILE must be an absolute path.');
  }

  const metadata = lstatSync(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error('NETSENSE_DEV_PROXY_TOKEN_FILE must identify a regular, non-symlink file.');
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error('NETSENSE_DEV_PROXY_TOKEN_FILE must not be accessible by group or other users.');
  }
  if (typeof process.getuid === 'function' && metadata.uid !== process.getuid()) {
    throw new Error('NETSENSE_DEV_PROXY_TOKEN_FILE must be owned by the Vite process user.');
  }

  const token = readFileSync(path, 'utf8').trim();
  if (token.split('.').length !== 3) {
    throw new Error('NETSENSE_DEV_PROXY_TOKEN_FILE does not contain a compact JWT.');
  }
  return `Bearer ${token}`;
}

import { build } from 'esbuild';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { load as parseYaml } from 'js-yaml';
import { z } from 'zod';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractsRoot = resolve(dashboardRoot, '../docs/contracts');
const checkOnly = process.argv.includes('--check');

const contractDefinitions = [
  ['topology-snapshot-schema.json', 'topologySnapshotSchema', 'NetSense Topology Snapshot', 'Validated tenant-scoped topology state without renderer positions.'],
  ['topology-diff-schema.json', 'topologyDiffSchema', 'NetSense Topology Diff', 'Ordered, idempotent operations that advance one topology snapshot.'],
  ['incident-case-schema.json', 'incidentScenarioSchema', 'NetSense Incident Case', 'Evidence, candidate targets, and topology context required for deterministic incident analysis.'],
  ['incident-summary-schema.json', 'incidentSummarySchema', 'NetSense Incident Summary', 'Tenant-scoped durable incident workflow state.'],
  ['incident-analysis-schema.json', 'incidentAnalysisSchema', 'NetSense Incident Analysis', 'Explainable deterministic candidates, impact, alternatives, checks, and limitations.'],
  ['incident-list-schema.json', 'incidentListResponseSchema', 'NetSense Incident List', 'Cursor-paginated incident summaries.'],
  ['incident-acknowledgement-request-schema.json', 'incidentAcknowledgementRequestSchema', 'NetSense Incident Acknowledgement Request', 'Expected-state precondition for an idempotent acknowledgement.'],
  ['incident-notes-request-schema.json', 'incidentNotesRequestSchema', 'NetSense Incident Notes Request', 'Expected-state precondition and durable investigation notes.'],
  ['incident-resolution-request-schema.json', 'incidentResolutionRequestSchema', 'NetSense Incident Resolution Request', 'Expected-state precondition, resolution evidence, and optional actual source.'],
  ['topology-ingestion-receipt-schema.json', 'topologyIngestionReceiptSchema', 'NetSense Topology Ingestion Receipt', 'Server-authoritative receipt for ordered idempotent topology snapshot ingestion.'],
  ['problem-schema.json', 'problemDetailsSchema', 'NetSense Problem Details', 'Non-disclosing API problem response with trace correlation.'],
];

const temporaryRoot = await mkdtemp(join(tmpdir(), 'netsense-contracts-'));
const bundlePath = join(temporaryRoot, 'contracts.mjs');

try {
  await build({
    entryPoints: [join(dashboardRoot, 'scripts/contract-entry.ts')],
    bundle: true,
    format: 'esm',
    outfile: bundlePath,
    platform: 'node',
    target: 'node18',
  });
  const schemas = await import(`${pathToFileURL(bundlePath).href}?generated=${Date.now()}`);

  const drift = [];
  for (const [fileName, exportName, title, description] of contractDefinitions) {
    const schema = schemas[exportName];
    if (!schema) throw new Error(`Contract schema export is missing: ${exportName}`);
    const generated = z.toJSONSchema(schema, { reused: 'ref' });
    const { $schema, ...shape } = generated;
    const document = {
      $schema,
      $id: `https://contracts.netsense.example/schemas/${fileName}`,
      title,
      description,
      ...shape,
    };
    const serialized = `${JSON.stringify(document, null, 2)}\n`;
    const destination = join(contractsRoot, fileName);

    if (checkOnly) {
      const existing = await readFile(destination, 'utf8').catch(() => '');
      if (existing !== serialized) drift.push(fileName);
    } else {
      await writeFile(destination, serialized, 'utf8');
    }
  }

  const openApi = parseYaml(await readFile(join(contractsRoot, 'openapi.yaml'), 'utf8'));
  const externalReferences = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if ('$ref' in value && typeof value.$ref === 'string' && value.$ref.startsWith('./')) {
      externalReferences.add(value.$ref);
    }
    for (const nested of Object.values(value)) visit(nested);
  };
  visit(openApi);
  for (const [fileName] of contractDefinitions) {
    if (!externalReferences.has(`./${fileName}`)) {
      throw new Error(`OpenAPI does not reference generated contract: ${fileName}`);
    }
  }

  if (drift.length > 0) {
    throw new Error(`Generated contracts are out of date: ${drift.join(', ')}`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

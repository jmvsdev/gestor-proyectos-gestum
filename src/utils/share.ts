import type { Task, Phase } from '../data/types';
import type { RawAssignee } from '../components/widgets/CSVImporter';

export interface SharePayload {
  version: 1;
  projectName: string;
  tasks: Task[];
  phases: Phase[];
  assignees: RawAssignee[];
}

// ── Compression (native CompressionStream, no extra deps) ─────────────────────

export async function compressToBase64(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const cs = new CompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(cs);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const arr = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { arr.set(c, offset); offset += c.length; }
  let binary = '';
  for (const byte of arr) binary += String.fromCharCode(byte);
  // URL-safe base64 (no +/= that break URLs)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function decompressFromBase64(b64url: string): Promise<string> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (b64.length % 4)) % 4;
  const binary = atob(b64 + '='.repeat(pad));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(out);
}

// ── URL size check ────────────────────────────────────────────────────────────

// Keep URL under 2000 chars; base URL (e.g. http://localhost:5175/#shared=) ≈ 40 chars
export const MAX_B64_CHARS = 1900;

// ── File download helper ──────────────────────────────────────────────────────

export function downloadShareFile(payload: SharePayload) {
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${payload.projectName.replace(/\s+/g, '-').toLowerCase()}-compartido.json`;
  a.click();
  URL.revokeObjectURL(url);
}

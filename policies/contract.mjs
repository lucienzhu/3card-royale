export const API = 'royale-policy-v1';
export const MAX_BYTES = 5_000_000;
export const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validateManifest(m) {
  if (!m || m.api !== API || typeof m.id !== 'string' || !ID.test(m.id) || !['javascript','onnx'].includes(m.type)) throw Error('Unsupported policy manifest');
  if (m.rules !== '1.0.0' || m.episode !== 'game' || m.information !== 'public') throw Error('Only standard public-information small games enter this ladder');
  if (typeof m.name !== 'string' || !m.name.length || m.name.length > 80 || typeof m.author !== 'string' || !m.author.length || typeof m.license !== 'string' || !m.license) throw Error('Missing policy identity / license');
  if (!['none','episode'].includes(m.memory)) throw Error('Declare memory: none or episode');
  const a = m.artifact;
  if (!a || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(mjs|onnx)$/.test(a.file) || !/^[a-f0-9]{64}$/.test(a.sha256) || !Number.isInteger(a.bytes) || a.bytes < 1 || a.bytes > MAX_BYTES) throw Error('Invalid policy artifact');
  if (!a.file.endsWith(m.type === 'onnx' ? '.onnx' : '.mjs')) throw Error('Artifact type mismatch');
  if (m.type === 'onnx' && (m.features !== 'gym-v1' || m.memory !== 'none')) throw Error('ONNX requires the stateless gym-v1 contract');
  return m;
}
export function validateIndex(index, count) {
  if (!Number.isInteger(index) || index < 0 || index >= count) throw Error('Policy returned an illegal action index');
  return index;
}
export function seededRandom(seed) {
  let s = (seed >>> 0) || 1;
  return () => {s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296;};
}
export function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.freeze(value); for (const child of Object.values(value)) freeze(child);}
  return value;
}

export const PROJECT_SCHEMA_VERSION = 1;

const finiteTriplet = values => Array.isArray(values) && values.length === 3 && values.every(Number.isFinite);
const cleanName = value => String(value || 'Untitled Deck').trim().slice(0, 64) || 'Untitled Deck';

export function normalizeProject(input) {
  if (!input || typeof input !== 'object') throw new Error('Projektdatei ist ungültig.');
  if (input.version !== PROJECT_SCHEMA_VERSION) throw new Error(`Projektversion ${input.version ?? 'unbekannt'} wird nicht unterstützt.`);
  if (typeof input.id !== 'string' || !input.id.trim()) throw new Error('Projekt-ID fehlt.');
  if (typeof input.keyboard !== 'string' || !input.keyboard.trim()) throw new Error('Tastatur-ID fehlt.');

  const caseSize = input.caseSize == null
    ? null
    : finiteTriplet(input.caseSize)
      ? input.caseSize.map(value => Math.round(value * 10) / 10)
      : (() => { throw new Error('Gehäusemaße sind ungültig.'); })();

  const transforms = {};
  for (const [key, transform] of Object.entries(input.transforms || {}).slice(0, 250)) {
    if (!/^[a-z0-9-]+:[A-Za-z0-9-]+$/.test(key)) continue;
    if (!finiteTriplet(transform?.position) || !finiteTriplet(transform?.rotation)) continue;
    transforms[key] = {
      position: transform.position.map(Number),
      rotation: transform.rotation.map(Number)
    };
  }

  return {
    version: PROJECT_SCHEMA_VERSION,
    id: input.id.trim().slice(0, 80),
    name: cleanName(input.name),
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date(0).toISOString(),
    keyboard: input.keyboard.trim(),
    caseSize,
    transforms,
    view: {
      mode: ['assembly', 'exploded', 'component'].includes(input.view?.mode) ? input.view.mode : 'assembly',
      explode: Math.max(0, Math.min(1, Number(input.view?.explode) || 0)),
      xray: Boolean(input.view?.xray)
    }
  };
}

export function projectFilename(name) {
  const slug = cleanName(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'hackerdeck';
  return `${slug}.hackerdeck.json`;
}

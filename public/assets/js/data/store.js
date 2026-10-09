// Imported records and browser submissions have separate lifecycles.
const runners = [];
const sampleRuns = globalThis.YOSHI_MOCK_DATA?.enabled ? globalThis.YOSHI_MOCK_DATA.runs : [];
const storageKey = 'yoshi-visual-prototype-v1';
let saved = {runs:[], viewer:''};

function validSavedRun(run) {
  return run && typeof run.runner === 'string'
    && boards.some(board => board.slug === run.category)
    && Number.isSafeInteger(run.timeMs) && run.timeMs > 0
    && ['pending', 'verified', 'rejected'].includes(run.status);
}

try {
  const value = JSON.parse(localStorage.getItem(storageKey));
  if (value && Array.isArray(value.runs)) {
    saved.runs = value.runs.filter(validSavedRun);
    saved.viewer = typeof value.viewer === 'string' ? value.viewer : '';
  }
} catch {
  // Invalid or inaccessible browser storage starts an empty local session.
}

const allRuns = () => [...sampleRuns, ...saved.runs];

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {
    toast('Browser storage is unavailable; changes last for this session.');
  }
}

#!/usr/bin/env node
// Generates teh-v1-seed-cases.json from the two pinchos dogfood corpora.
// Rewrite rules: strip the pinchos runner wrapper; re-point "this <artifact>"
// prompts at named workspace files; classify each prompt into a harness task_type.
// Re-runnable: same inputs -> same output.
import fs from 'node:fs';

const ROOT = '/home/kwad77/pinchos';
const modes = JSON.parse(fs.readFileSync(`${ROOT}/docs/dogfood/modes-400-journeys.json`, 'utf8'));
const answers = JSON.parse(fs.readFileSync(`${ROOT}/docs/dogfood/answer-cases-100.json`, 'utf8'));

const CODEISH = /\b(code|python|javascript|typescript|html|css|sql|json|xml|api|regex|regular expression|docker|dockerfile|react|git|schema|database|algorithm|spreadsheet formula|deployment script|function|query|payload|system prompt|test case|script to|bot|app|website|web page|webpage|scraper|parser|cli|program)\b/i;
// doc-shaped despite matching a code keyword
const BUILD_DOC_OVERRIDES = /cheat sheet|wireframe|onboarding sequence/i;
// refine cases that are code even though the generic regex is ambiguous ("script" = screenplay in M219/M327/M343)
const REFINE_CODE_IDS = new Set(['M303','M310','M315','M320','M330','M335','M340','M345','M353','M357','M369','M375','M383','M399']);

const EXT_RULES = [
  [/csv|spreadsheet|expenses|products/i, 'csv'],
  [/python/i, 'py'],
  [/react hook/i, 'jsx'],
  [/javascript/i, 'js'],
  [/html/i, 'html'],
  [/json/i, 'json'],
  [/xml/i, 'xml'],
  [/sql/i, 'sql'],
  [/docker compose/i, 'yml'],
  [/git diff/i, 'diff'],
  [/log/i, 'log'],
  [/chess/i, 'pgn'],
  [/contract|manual|draft|abstract|syllabus|story|thread|resume|documentation|proposal|statement|description|report|agreement|essay|article|post|letter|email|agenda|plan|account|entry|copy|pitch|persona|guideline|rubric|analysis|strategy|checklist|canvas|summons|prompt|objective|question|clause|funnel|document|deck/i, 'md'],
];

function artifactFile(np) {
  const stop = new Set(['this','the','a','an','of','block','piece','set','raw','list','text','data','file','snippet','short']);
  const words = np.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w && !stop.has(w));
  let ext = 'txt';
  for (const [re, e] of EXT_RULES) if (re.test(np)) { ext = e; break; }
  let slug = words.filter(w => w !== ext).slice(0, 2).join('-') || 'input';
  if (slug === ext || slug === 'input') slug = 'data';
  return `${slug}.${ext}`;
}

const DETERMINISTIC = /\b(count|sort|median|mode|duplicates|extract|calculate|solve|transpose|convert all measurements|identify which|format them|alphabetically|replace all|frequency|distance between|most expensive|private|morse)\b/i;

function slugFamily(goal) {
  const stop = new Set(['build','me','a','an','the','this','to','for','my','of','and','with','interact','refine','change','ask','questions','help','how','what','whats','why','is','it','in','that','be','more','into','like','written','style','read','using','from','all','which','ones','are','do','i','you','list']);
  const words = goal.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w && !stop.has(w));
  return words.slice(0, 3).join('-') || 'misc';
}

const cases = [];
const rewrites = { unchanged: 0, repointed: 0, fallback: [] };

function push(id, task_type, prompt, src, extra = {}) {
  const c = {
    id,
    task_type,
    family: slugFamily(extra.original_prompt || prompt),
    tier: extra.tier || 'M',
    prompt,
    workspace: extra.workspace || { required: false, artifact: null, status: 'n/a' },
    gate: { status: task_type === 'interactive' ? 'deferred-v2' : 'todo', style: extra.gate_style },
    gold: { required: !!extra.gold_required, status: extra.gold_required ? 'todo' : 'n/a' },
    provenance: src,
  };
  if (extra.original_prompt && extra.original_prompt !== prompt) c.original_prompt = extra.original_prompt;
  cases.push(c);
}

let b = 0, q = 0, g = 0, r = 0;
for (const m of modes) {
  const src = `corpus:modes-400-journeys#${m.id}`;
  const goal = m.goal.trim();
  if (m.component === 'build') {
    b++;
    const isCode = CODEISH.test(goal) && !BUILD_DOC_OVERRIDES.test(goal);
    push(`TEH-B${String(b).padStart(3, '0')}`, isCode ? 'spec-to-code' : 'doc-deliverable', goal, src, {
      gate_style: isCode ? 'command' : 'structural',
    });
    rewrites.unchanged++;
  } else if (m.component === 'ask') {
    q++;
    push(`TEH-Q${String(q).padStart(3, '0')}`, 'interactive', goal, src, { gate_style: 'deferred' });
    rewrites.unchanged++;
  } else if (m.component === 'interact') {
    g++;
    const mm = goal.match(/^Interact with this (.+?) and (.+?)\.?$/);
    let prompt, ws;
    if (mm) {
      const [, np, rest] = mm;
      const file = artifactFile(np);
      prompt = `Using the workspace file \`${file}\` (${/^[aeiou]/i.test(np) ? 'an' : 'a'} ${np}), ${rest}.`;
      ws = { required: true, artifact: file, status: 'todo' };
      rewrites.repointed++;
    } else {
      prompt = goal; ws = { required: true, artifact: 'input.md', status: 'todo' };
      rewrites.fallback.push(m.id);
    }
    push(`TEH-G${String(g).padStart(3, '0')}`, 'grounded-transform', prompt, src, {
      original_prompt: goal,
      workspace: ws,
      gate_style: DETERMINISTIC.test(goal) ? 'exact-match' : 'judged',
      gold_required: true,
    });
  } else if (m.component === 'refine') {
    r++;
    const isCode = REFINE_CODE_IDS.has(m.id);
    const mm = goal.match(/^(Refine|Change) this (.+?) (to|into) (.+?)\.?$/);
    let prompt, ws;
    if (mm) {
      const [, , np, prep, rest] = mm;
      const file = artifactFile(np);
      prompt = `Revise the ${np} in the workspace file \`${file}\` ${prep} ${rest}.`;
      ws = { required: true, artifact: file, status: 'todo' };
      rewrites.repointed++;
    } else {
      prompt = goal; ws = { required: true, artifact: 'input.md', status: 'todo' };
      rewrites.fallback.push(m.id);
    }
    push(`TEH-R${String(r).padStart(3, '0')}`, isCode ? 'refactor' : 'doc-revision', prompt, src, {
      original_prompt: goal,
      workspace: ws,
      gate_style: isCode ? 'command+invariant' : 'judged+structural',
      gold_required: !isCode,
    });
  }
}

let e = 0;
for (const a of answers) {
  e++;
  push(`TEH-E${String(e).padStart(3, '0')}`, 'explain', a.goal.trim(), `corpus:answer-cases-100#${a.id}`, {
    tier: 'S',
    gate_style: 'judged',
    gold_required: true,
  });
}

const byType = cases.reduce((m, c) => ((m[c.task_type] = (m[c.task_type] || 0) + 1), m), {});
const out = {
  schema_version: 1,
  case_set: 'teh-v1-seed',
  status: 'seed — prompts are frozen; workspaces, gates, and golds are authored during promotion (see testing-harness.md §2.2)',
  generated_by: 'docs/testing/teh/build-seed-cases.mjs',
  sources: ['docs/dogfood/modes-400-journeys.json', 'docs/dogfood/answer-cases-100.json'],
  counts: { total: cases.length, by_task_type: byType },
  notes: [
    'tier is a seed default (explain=S, rest=M); re-band during promotion',
    'interactive cases are deferred to v2 (need a scripted-user simulator)',
    'original_prompt preserved wherever the prompt was rewritten to re-point at a workspace artifact',
  ],
  cases,
};

fs.writeFileSync(`${ROOT}/docs/testing/teh/teh-v1-seed-cases.json`, JSON.stringify(out, null, 1) + '\n');
console.log('counts:', JSON.stringify(byType));
console.log('rewrites:', rewrites.unchanged, 'unchanged,', rewrites.repointed, 'repointed, fallbacks:', rewrites.fallback.join(',') || 'none');

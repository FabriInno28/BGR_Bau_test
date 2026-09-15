import { BASELINE_PROJECTS } from "./projects-data.js";
import {
  CAPACITY_RESOURCES,
  ROLE_OPTIONS,
  SCHEMA_VERSION,
  assessResourceCapacity,
  canonicalResourceName,
  clone,
  csvSafe,
  migratePhaseResponsibilities,
  migrateState,
  nullableNumberValue,
  phaseMonthWindow,
  numberValue,
  quarterIndex,
  resourceKey,
  uuid,
  validateDemand
} from "./model.js";

const PHASES = [
  { key: "anlass", label: "Anlass / Prüfauftrag", short: "Anlass", className: "p1" },
  { key: "machbarkeit", label: "Machbarkeitsstudie", short: "MBS", className: "p2" },
  { key: "planerwahl", label: "Planerauswahl", short: "Planer", className: "p3" },
  { key: "planung", label: "Planung / Projektierung", short: "Planung", className: "p4" },
  { key: "vergabe", label: "Ausschreibung / Vergabe", short: "Vergabe", className: "p5" },
  { key: "realisierung", label: "Realisierung", short: "Bau", className: "p6" },
  { key: "abschluss", label: "Abschluss / Übergabe", short: "Abschluss", className: "p7" }
];

const COST_STATUSES = [
  { key: "estimate", label: "Schätzung", className: "estimate" },
  { key: "budgeted", label: "budgetiert", className: "budgeted" },
  { key: "approved", label: "freigegeben", className: "approved" },
  { key: "bound", label: "vertraglich gebunden", className: "bound" }
];

const GATE_STATUSES = ["freigegeben", "mit Auflagen", "zurückgestellt", "gestoppt"];
const GATE_AUTHORITIES = ["BK", "BHB", "Gesamtvorstand", "Geschäftsstelle"];
const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const START_QUARTER = "2026-Q3";
const DISPLAY_QUARTERS = makeQuarters(START_QUARTER, 12);
const ALL_QUARTERS = makeQuarters("2026-Q1", 44);
const YEARS = Array.from({ length: 11 }, (_, index) => 2026 + index);
const TODAY = new Date();
const CURRENT_MONTH = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}`;
const RESOURCE_STATUS = {
  ok: { label: "Rechnerisch tragbar", short: "tragbar" },
  watch: { label: "Kapazität knapp", short: "knapp" },
  gap: { label: "Nicht gemeinsam tragbar", short: "nicht tragbar" },
  open: { label: "Noch nicht beurteilbar", short: "ungeklärt" }
};
const PHASE_STATUS = {
  open: "Offen",
  planned: "Geplant",
  current: "Aktuell",
  done: "Abgeschlossen"
};
const STORE_KEY = "bgr-bauradar-v5";
const PREVIOUS_STORE_KEY = "bgr-bauradar-v4";
const LEGACY_STORE_KEY = "bgr-portfolio-cockpit-v3";
const HISTORY_KEY = "bgr-bauradar-v5-history";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[character]));
const num = numberValue;
const chf = (value, short = false) => {
  const number = num(value);
  if (!number) return "CHF 0";
  if (short && Math.abs(number) >= 1e6) return `CHF ${(number / 1e6).toLocaleString("de-CH", { maximumFractionDigits: 1 })} Mio.`;
  if (short && Math.abs(number) >= 1e3) return `CHF ${(number / 1e3).toLocaleString("de-CH", { maximumFractionDigits: 0 })} Tsd.`;
  return new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(number);
};

function qIndex(quarter) {
  const index = quarterIndex(quarter);
  return Number.isFinite(index) ? index : 0;
}
function qFromIndex(index) { return `${Math.floor(index / 4)}-Q${index % 4 + 1}`; }
function makeQuarters(start, count) {
  const first = qIndex(start);
  return Array.from({ length: count }, (_, index) => qFromIndex(first + index));
}
function qLabel(quarter) {
  if (!quarter) return "Termin offen";
  const [year, number] = quarter.split("-Q");
  return `Q${number} ${year}`;
}
function monthLabel(month) {
  if (!month) return "Monat offen";
  return new Intl.DateTimeFormat("de-CH", { month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`));
}
function monthsForQuarter(quarter) {
  const [year, q] = quarter.split("-Q").map(Number);
  const first = (q - 1) * 3 + 1;
  return [0, 1, 2].map(offset => `${year}-${String(first + offset).padStart(2, "0")}`);
}
function phaseIndex(key) { return Math.max(0, PHASES.findIndex(phase => phase.key === key)); }
function phaseInfo(key) { return PHASES[phaseIndex(key)]; }
function phaseFromLegacy(value) {
  const text = String(value || "");
  if (text.includes("21")) return "machbarkeit";
  if (text.includes("PW")) return "planerwahl";
  if (/31|32|33/.test(text)) return "planung";
  if (text.includes("41")) return "vergabe";
  if (/51|52/.test(text)) return "realisierung";
  if (text.includes("53")) return "abschluss";
  if (text.includes("U")) return "realisierung";
  return "anlass";
}
function inferKind(project) {
  const text = `${project.measure} ${project.object}`.toLowerCase();
  return project.phase?.includes("U") || (/küchengeräte|fernwärmeanschluss|einfache badsanierung|kurzfristige unterhalt/.test(text) && project.currentOwner === "Geschäftsstelle")
    ? "Kleinprojekt"
    : "Bauprojekt";
}
function inferRoles(project) {
  return {
    gs: project.currentOwner === "Geschäftsstelle" ? "Geschäftsstelle" : "offen",
    bk: project.bgrResponsibility === "Baukommission" ? (project.currentOwner || "Baukommission") : "offen",
    vs: "nach Bedarf",
    bhb: ["Büro 8", "Tresto", "TRESTO", "andere externe Partner"].includes(project.projectManagement) ? project.projectManagement : "offen",
    control: project.control || "offen",
    deputy: project.deputy || "offen"
  };
}
function defaultPhasePlan(currentKey, currentAssignee = "") {
  const current = phaseIndex(currentKey);
  return PHASES.map((phase, index) => ({
    phaseKey: phase.key,
    status: index < current ? "done" : index === current ? "current" : "open",
    startQuarter: "",
    endQuarter: "",
    assignee: phase.key === currentKey && ROLE_OPTIONS.includes(currentAssignee) ? currentAssignee : ""
  }));
}
function rawMotherCost(project) {
  const known = (project.cashflow || []).filter(item => item.status === "bekannt").reduce((sum, item) => sum + num(item.amount), 0);
  return known || num(project.cost);
}
function normalizeProject(project) {
  const motherPhaseKey = project.motherPhaseKey || phaseFromLegacy(project.phase);
  const currentPhaseKey = project.currentPhaseKey || project.phaseKey || motherPhaseKey;
  const inferredAssignee = canonicalResourceName(project.currentAssignee || project.currentOwner || project.bgrResponsibility || "");
  const migrated = migrateState({ projects: [project] }).projects[0];
  const migratedPhasePlan = migratePhaseResponsibilities({
    ...project,
    phasePlan: migrated.phasePlan,
    currentPhaseKey,
    currentAssignee: inferredAssignee
  });
  const phasePlan = migratedPhasePlan.length === PHASES.length
    ? migratedPhasePlan
    : defaultPhasePlan(currentPhaseKey, inferredAssignee);
  const currentAssignee = phasePlan.find(row => row.phaseKey === currentPhaseKey)?.assignee || "";
  return {
    ...clone(project),
    ...migrated,
    kind: ["Kleinprojekt", "Bauprojekt"].includes(project.kind)
      ? project.kind
      : project.category === "Bauprojekt"
        ? "Bauprojekt"
        : inferKind(project),
    motherPhaseKey,
    currentPhaseKey,
    currentAssignee,
    motherQuarter: project.motherQuarter || ((parseInt(project.startYear, 10) || 2026) > 2026 ? `${project.startYear}-Q1` : START_QUARTER),
    roles: project.roles || inferRoles(project),
    phasePlan,
    phaseCosts: Array.isArray(project.phaseCosts) ? project.phaseCosts : [],
    gateHistory: Array.isArray(project.gateHistory) ? project.gateHistory : []
  };
}

const BASELINE = BASELINE_PROJECTS.map(normalizeProject);

function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: "sharp",
    activeScenarioId: null,
    projects: clone(BASELINE),
    capacities: [],
    deletedIds: [],
    auditLog: [],
    scenarios: []
  };
}
function normalizeWorkspace(workspace) {
  const migrated = migrateState(workspace, BASELINE);
  return {
    ...migrated,
    projects: migrated.projects.map(normalizeProject),
    scenarios: undefined
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(PREVIOUS_STORE_KEY) || localStorage.getItem(LEGACY_STORE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    const migrated = migrateState(parsed, BASELINE);
    return {
      ...migrated,
      projects: migrated.projects.map(normalizeProject),
      scenarios: (migrated.scenarios || []).map(scenario => ({
        ...scenario,
        ...normalizeWorkspace(scenario)
      }))
    };
  } catch (error) {
    console.error("Gespeicherter Stand konnte nicht geladen werden", error);
    return emptyState();
  }
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function activeWorkspace() {
  if (state.mode === "scenario") {
    return state.scenarios.find(scenario => scenario.id === state.activeScenarioId) || state;
  }
  return state;
}
function save(label = "") {
  state.schemaVersion = SCHEMA_VERSION;
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  if (label) addAudit(label);
  renderAll();
}
function addAudit(action, detail = "") {
  activeWorkspace().auditLog.push({
    id: uuid("audit"),
    at: new Date().toISOString(),
    action,
    detail
  });
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}
function snapshot(label) {
  history.push({ label, state: clone(state) });
  history = history.slice(-30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function toast(message, type = "", duration = 3000) {
  const element = $("#toast");
  element.textContent = message;
  element.className = `toast show ${type}`.trim();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), duration);
}

let state = loadState();
let history = loadHistory();
let selectedId = activeWorkspace().projects[0]?.id;
let longOpen = false;
let editPhasePlan = [];
let editDemands = [];
let editPhaseCosts = [];
let editGateHistory = [];

function projects() { return activeWorkspace().projects; }
function capacities() { return activeWorkspace().capacities; }
function plannedPhases(project) { return project.phasePlan.filter(row => row.startQuarter && row.endQuarter); }
function planAt(project, quarter) {
  return project.phasePlan.find(row => row.startQuarter && row.endQuarter && qIndex(quarter) >= qIndex(row.startQuarter) && qIndex(quarter) <= qIndex(row.endQuarter)) || null;
}
function phasePlanIssues(project) {
  const issues = [];
  let previousEnd = null;
  project.phasePlan.forEach(row => {
    if (Boolean(row.startQuarter) !== Boolean(row.endQuarter)) issues.push(`${phaseInfo(row.phaseKey).short}: Start oder Ende fehlt`);
    if (row.startQuarter && row.endQuarter && qIndex(row.endQuarter) < qIndex(row.startQuarter)) issues.push(`${phaseInfo(row.phaseKey).short}: Ende vor Start`);
    if (previousEnd != null && row.startQuarter && qIndex(row.startQuarter) < previousEnd) issues.push(`${phaseInfo(row.phaseKey).short}: überschneidet vorherige Phase`);
    if (row.endQuarter) previousEnd = Math.max(previousEnd ?? 0, qIndex(row.endQuarter));
  });
  return issues;
}
function projectIssues(project) {
  const issues = [];
  project.phasePlan.forEach(row => {
    const responsibilityRelevant = row.phaseKey === project.currentPhaseKey || Boolean(row.startQuarter || row.endQuarter);
    if (responsibilityRelevant && !row.assignee) issues.push(`${phaseInfo(row.phaseKey).short}: Verantwortung offen`);
  });
  if (!plannedPhases(project).length) issues.push("Phasenplan offen");
  if (project.kind === "Bauprojekt" && phaseIndex(project.currentPhaseKey) >= 1 && (!project.roles.bhb || project.roles.bhb.toLowerCase() === "offen")) issues.push("Bauherrenbegleitung offen");
  for (const demand of project.demands) {
    const item = allPhaseDemands().find(entry => entry.id === demand.id);
    if (item?.past) continue;
    if (nullableNumberValue(demand.remainingPt) == null) issues.push(`${demand.name || "Ressource"}: Restbedarf noch nicht erfasst`);
    else if (!item?.startMonth || !item?.endMonth) issues.push(`${demand.name}: ${phaseInfo(demand.phaseKey).short} zeitlich noch nicht beurteilbar`);
    else {
      const status = demandStatus(item);
      if (status === "gap") issues.push(`${phaseInfo(demand.phaseKey).short}: ${demand.name} nicht gemeinsam tragbar`);
      if (status === "watch") issues.push(`${phaseInfo(demand.phaseKey).short}: ${demand.name} Kapazität knapp`);
      if (status === "open") issues.push(`${phaseInfo(demand.phaseKey).short}: ${demand.name} Verfügbarkeit ungeklärt`);
    }
  }
  project.phaseCosts.forEach(cost => {
    if (!cost.source || !cost.informationDate) issues.push(`${phaseInfo(cost.phaseKey).short}: Kostenquelle oder Informationsdatum offen`);
  });
  if (plannedPhases(project).length && !project.phaseCosts.length) issues.push("Phasenkosten offen");
  issues.push(...phasePlanIssues(project));
  return issues;
}
function securedCost(project) {
  return project.phaseCosts.filter(item => ["approved", "bound"].includes(item.status)).reduce((sum, item) => sum + num(item.amount), 0);
}
function changedProject(project) {
  const baseline = BASELINE.find(item => item.id === project.id);
  return !baseline || JSON.stringify(project) !== JSON.stringify(baseline);
}

function resourceGroups() {
  const map = new Map();
  capacities().forEach(item => {
    const key = resourceKey(item.name);
    if (key && !map.has(key)) map.set(key, { key, name: item.name });
  });
  projects().flatMap(project => project.demands).forEach(item => {
    const key = resourceKey(item.name);
    if (key && !map.has(key)) map.set(key, { key, name: item.name });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}
function allPhaseDemands() {
  return projects().flatMap(project => project.demands.map(demand => {
    const phase = project.phasePlan.find(item => item.phaseKey === demand.phaseKey);
    const window = phaseMonthWindow(phase, CURRENT_MONTH);
    return {
      id: demand.id,
      name: demand.name,
      resourceKey: resourceKey(demand.name),
      pt: nullableNumberValue(demand.remainingPt),
      startMonth: window.startMonth,
      endMonth: window.endMonth,
      past: Boolean(window.past),
      project,
      phase,
      demand
    };
  }));
}
function assessmentForResource(key) {
  return assessResourceCapacity({
    demands: allPhaseDemands().filter(item => item.resourceKey === key && !item.past),
    capacities: capacities().filter(item => resourceKey(item.name) === key)
  });
}
function assessmentLabel(assessment) {
  return assessment.status === "open" && assessment.confirmation?.unconfirmedNeeded > 0
    ? "Kapazität nicht abgesichert"
    : RESOURCE_STATUS[assessment.status].label;
}
function assessmentWarning(name, assessment) {
  if (assessment.status === "gap" && assessment.bottleneck) {
    return {
      type: "gap",
      message: `${name}: ${assessment.bottleneck.demand} PT Bedarf, ${assessment.bottleneck.capacity} PT verfügbar. ${assessment.bottleneck.shortfall} PT fehlen.`
    };
  }
  if (assessment.status === "open" && assessment.confirmation?.unconfirmedNeeded > 0) {
    return {
      type: "warning",
      message: `${name}: ${assessment.confirmation.demand} PT Bedarf, erst ${assessment.confirmation.capacity} PT bestätigt. ${assessment.confirmation.unconfirmedNeeded} PT müssen zusätzlich bestätigt werden.`
    };
  }
  return null;
}
function focusResourceWarning(name, project = null) {
  const key = resourceKey(name);
  const projectItems = project
    ? allPhaseDemands().filter(entry => entry.project.id === project.id && entry.resourceKey === key && !entry.past)
    : [];
  const assessment = assessmentForResource(key);
  const warning = assessmentWarning(name, assessment);
  const involvedIds = assessment.bottleneck?.involvedIds || assessment.confirmation?.involvedIds || [];
  const involved = warning && (!project || projectItems.some(item => involvedIds.includes(item.id)));
  if (!warning || !involved) return false;
  $("#resource-focus").value = key;
  renderResources();
  $("#ressourcen").scrollIntoView({ behavior: "smooth", block: "start" });
  toast(warning.message, warning.type, 9000);
  return true;
}
function focusProjectResourceWarning(project) {
  const candidates = [...new Set(project.demands.map(demand => canonicalResourceName(demand.name)).filter(Boolean))].map(name => {
    const key = resourceKey(name);
    const assessment = assessmentForResource(key);
    const warning = assessmentWarning(name, assessment);
    const involvedIds = assessment.bottleneck?.involvedIds || assessment.confirmation?.involvedIds || [];
    const involved = allPhaseDemands().some(item => item.project.id === project.id && item.resourceKey === key && involvedIds.includes(item.id));
    return warning && involved ? { name, warning } : null;
  }).filter(Boolean).sort((a, b) => ({ gap: 2, warning: 1 })[b.warning.type] - ({ gap: 2, warning: 1 })[a.warning.type]);
  return candidates.length ? focusResourceWarning(candidates[0].name, project) : false;
}
function allResourceAssessments() {
  return resourceGroups().map(group => ({ group, ...assessmentForResource(group.key) }));
}
function demandStatus(item) {
  if (item.past) return "ok";
  if (item.pt == null || item.pt <= 0 || !item.startMonth || !item.endMonth) return "open";
  const assessment = assessmentForResource(item.resourceKey);
  if (assessment.bottleneck?.utilization > 1 && assessment.bottleneck.involvedIds.includes(item.id)) return "gap";
  if (assessment.bottleneck?.utilization > 0.8 && assessment.bottleneck.involvedIds.includes(item.id)) return "watch";
  if (assessment.unknownMonths.some(month => month >= item.startMonth && month <= item.endMonth)) return "open";
  return "ok";
}
function phaseResourceStatus(project, phaseKey) {
  const items = allPhaseDemands().filter(item => item.project.id === project.id && item.demand.phaseKey === phaseKey);
  if (!items.length) return "open";
  const severity = { ok: 0, watch: 1, open: 2, gap: 3 };
  return items.map(demandStatus).sort((a, b) => severity[b] - severity[a])[0];
}
function unassessedNeeds() {
  return allPhaseDemands().filter(item => !item.past && (item.pt == null || !item.startMonth || !item.endMonth || demandStatus(item) === "open"));
}

function capacityYearGroups() {
  const groups = new Map();
  capacities().forEach(item => {
    const year = item.month?.slice(0, 4) || item.legacyQuarter?.slice(0, 4) || "offen";
    const key = `${resourceKey(item.name)}-${year}`;
    if (!groups.has(key)) groups.set(key, { firstId: item.id, name: item.name, year, rows: [], legacy: false });
    const group = groups.get(key);
    group.rows.push(item);
    group.legacy ||= !item.month || item.requiresReview;
  });
  return [...groups.values()].map(group => ({
    ...group,
    months: group.rows.filter(item => item.month && item.pt != null).length,
    total: group.rows.filter(item => item.month && item.pt != null).reduce((sum, item) => sum + num(item.pt), 0)
  })).sort((a, b) => a.name.localeCompare(b.name, "de") || String(a.year).localeCompare(String(b.year)));
}

function renderAll() {
  renderHeader();
  renderTimeline();
  renderDetail();
  renderResources();
  renderFinance();
}
function renderHeader() {
  const workspace = activeWorkspace();
  const planned = projects().reduce((sum, project) => sum + plannedPhases(project).length, 0);
  const assessments = allResourceAssessments();
  const gaps = assessments.filter(item => item.status === "gap").length;
  const approved = allPhaseCosts().filter(item => item.status === "approved").reduce((sum, item) => sum + num(item.amount), 0);
  const bound = allPhaseCosts().filter(item => item.status === "bound").reduce((sum, item) => sum + num(item.amount), 0);
  const changes = projects().filter(changedProject).length + workspace.deletedIds.length + capacities().length;
  $("#data-state").textContent = state.mode === "scenario" ? `Szenario: ${workspace.name}` : (changes ? `${changes} lokale Planungsänderungen` : "Scharfer Stand");
  $("#mode-pill").innerHTML = `<i></i>${state.mode === "scenario" ? `Szenario: ${esc(workspace.name)}` : "Scharfer Stand"}`;
  $("#mode-pill").classList.toggle("scenario", state.mode === "scenario");
  $("#workspace-select").innerHTML = `<option value="sharp">Scharfer Stand</option>${state.scenarios.map(scenario => `<option value="${esc(scenario.id)}">${esc(scenario.name)}</option>`).join("")}`;
  $("#workspace-select").value = state.mode === "scenario" ? state.activeScenarioId : "sharp";
  $("#kpis").innerHTML = [
    ["Vorhaben", projects().length, "im Portfolio"],
    ["Geplante Phasen", planned, `von ${projects().length * PHASES.length}`],
    ["Kritische Ressourcen", gaps, gaps ? "nicht gemeinsam tragbar" : "keine nachgewiesen"],
    ["Nicht beurteilbare Bedarfe", unassessedNeeds().length, "bleiben sichtbar"],
    ["Finanziell gesichert", chf(approved + bound, true), "freigegeben / gebunden"]
  ].map(item => `<div class="kpi"><span>${item[0]}</span><strong>${item[1]}</strong><small>${item[2]}</small></div>`).join("");
  $("#undo").disabled = !history.length;
}
function filteredProjects() {
  const search = $("#search").value.trim().toLowerCase();
  const kind = $("#kind-filter").value;
  const phase = $("#phase-filter").value;
  const pressure = $("#only-pressure").checked;
  return projects().filter(project =>
    (!search || `${project.object} ${project.measure}`.toLowerCase().includes(search)) &&
    (kind === "all" || project.kind === kind) &&
    (phase === "all" || project.currentPhaseKey === phase) &&
    (!pressure || projectIssues(project).length)
  );
}
function renderTimeline() {
  const list = filteredProjects().sort((a, b) => qIndex(a.motherQuarter) - qIndex(b.motherQuarter) || a.object.localeCompare(b.object, "de"));
  $("#phase-legend").innerHTML = PHASES.map(phase => `<span><i class="${phase.className}"></i>${phase.short}</span>`).join("");
  const header = `<div class="timeline-header"><div>${list.length} Projekte</div>${DISPLAY_QUARTERS.map(quarter => `<div>${qLabel(quarter)}</div>`).join("")}</div>`;
  const rows = list.map(project => {
    const issues = projectIssues(project);
    return `<div class="timeline-row ${project.id === selectedId ? "selected" : ""}" data-select="${esc(project.id)}">
      <div class="project-label"><strong>${esc(project.object)}</strong><span>${esc(project.measure)} · ${esc(project.kind)}</span>${issues.length ? '<i class="pressure-dot" title="Klärungsbedarf"></i>' : ""}</div>
      ${DISPLAY_QUARTERS.map(quarter => {
        const phase = planAt(project, quarter);
        const mother = project.motherQuarter === quarter;
        return `<div class="qcell">${phase
          ? `<div class="phase-block ${phaseInfo(phase.phaseKey).className}" title="${esc(phaseInfo(phase.phaseKey).label)}">${phaseInfo(phase.phaseKey).short}</div>`
          : mother
            ? `<div class="mother-marker ${phaseInfo(project.currentPhaseKey).className}" title="Mutterstand: ${esc(phaseInfo(project.currentPhaseKey).label)}"></div>`
            : '<i class="empty-cell"></i>'}</div>`;
      }).join("")}
    </div>`;
  }).join("");
  $("#timeline").innerHTML = header + (rows || '<div class="empty-note">Keine Projekte entsprechen dem Filter.</div>');
  renderLongHorizon();
}
function renderLongHorizon() {
  const years = [2030, 2031, 2032, 2033, 2034, 2035, 2036, "10+"];
  $("#long-horizon").classList.toggle("hidden", !longOpen);
  $("#expand-long").textContent = longOpen ? "Jahre 4 bis 10 ausblenden" : "Jahre 4 bis 10 einblenden";
  $("#long-horizon").innerHTML = `<div class="long-title"><strong>Mittelfrist und Langfrist</strong><span>Phasen mit eingetragener Planung</span></div><div class="long-grid">${years.map(year => {
    const entries = projects().flatMap(project => project.phasePlan.filter(row => row.startQuarter && (year === "10+" ? parseInt(row.startQuarter, 10) > 2036 : parseInt(row.startQuarter, 10) === year)).map(row => ({ project, row })));
    return `<div class="year-bucket"><strong>${year === "10+" ? "> 10 Jahre" : year}</strong><b>${entries.length}</b><span>${entries.slice(0, 2).map(item => `${esc(item.project.object)} · ${phaseInfo(item.row.phaseKey).short}`).join(" · ") || "noch keine Phase geplant"}</span></div>`;
  }).join("")}</div>`;
}
function renderDetail() {
  let project = projects().find(item => item.id === selectedId);
  if (!project) {
    project = projects()[0];
    selectedId = project?.id;
  }
  if (!project) {
    $("#project-detail").innerHTML = '<div class="empty-note">Noch kein Projekt vorhanden.</div>';
    return;
  }
  const issues = projectIssues(project);
  const planned = plannedPhases(project);
  const latestGate = project.gateHistory.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const resources = project.demands.slice(0, 4);
  $("#project-detail").innerHTML = `<div class="project-cover"><div class="meta"><span>${esc(project.kind)} · ${state.mode === "scenario" ? "Szenario" : "scharfer Stand"}</span><span class="status-chip">${issues.length ? `${issues.length} Punkte offen` : "Plan prüfbar"}</span></div><h3>${esc(project.object)}</h3><p>${esc(project.measure)}</p></div>
    <div class="project-body">
      <div class="mother-current"><span>Stand Mutterliste</span><strong>${esc(phaseInfo(project.motherPhaseKey).label)}</strong><small>${phaseAssignee(project) ? `Verantwortung aktuelle Phase: ${esc(phaseAssignee(project))}` : "Verantwortung aktuelle Phase noch offen"}</small></div>
      <div class="next-box"><span>Letzter Phasentorentscheid</span><strong>${esc(latestGate?.status || "noch kein Entscheid erfasst")}</strong><small>${latestGate ? `${esc(phaseInfo(latestGate.phaseKey).short)} · ${esc(latestGate.authority)} · ${esc(latestGate.date)}` : "Im Projekt protokollieren"}</small></div>
      <span class="section-label">Alle Projektphasen</span>
      <div class="phase-steps">${PHASES.map(phase => {
        const row = project.phasePlan.find(item => item.phaseKey === phase.key);
        const resourceStatus = row?.startQuarter ? phaseResourceStatus(project, phase.key) : "open";
        const statusText = project.demands.some(demand => demand.phaseKey === phase.key) ? RESOURCE_STATUS[resourceStatus].label : "Ressourcenbedarf offen";
        const responsibility = row?.assignee ? `Verantwortung ${row.assignee}` : "Verantwortung offen";
        return `<button class="phase-step ${phase.className} resource-${resourceStatus} ${row?.startQuarter ? "done" : ""} ${phase.key === project.currentPhaseKey ? "current" : ""}" title="${esc(phase.label)} · ${responsibility} · ${row?.startQuarter ? `${qLabel(row.startQuarter)} bis ${qLabel(row.endQuarter)} · ${statusText}` : "noch nicht geplant"}" aria-label="${esc(phase.label)}: ${esc(responsibility)}, ${esc(statusText)}"></button>`;
      }).join("")}</div>
      <div class="perspectives"><div class="perspective"><span>Phasen geplant</span><strong>${planned.length} von 7</strong></div><div class="perspective"><span>Ressourcen</span><strong>${project.demands.length || "offen"}</strong></div><div class="perspective"><span>Freigegeben / gebunden</span><strong>${chf(securedCost(project), true)}</strong></div><div class="perspective"><span>Offene Punkte</span><strong>${issues.length}</strong></div></div>
      <span class="section-label">Ressourcen dieses Projekts</span>
      <div class="mini-resources">${resources.length ? resources.map(demand => {
        const item = allPhaseDemands().find(entry => entry.id === demand.id);
        const status = item ? demandStatus(item) : "open";
        const statusLabel = item?.past ? "Vergangene Phase, nicht mehr geprüft" : RESOURCE_STATUS[status].label;
        return `<div class="mini-resource ${status}"><div><strong>${esc(demand.name)}</strong><span>${phaseInfo(demand.phaseKey).short} · ${esc(statusLabel)}</span></div><b>${nullableNumberValue(demand.remainingPt) == null ? "offen" : `${num(demand.remainingPt)} PT`}</b></div>`;
      }).join("") : '<div class="empty-note">Noch kein Ressourcenbedarf eingetragen.</div>'}</div>
      ${issues.length ? `<div class="issue-list">${issues.slice(0, 5).map(issue => `<span>${esc(issue)}</span>`).join("")}</div>` : ""}
      <div class="project-actions"><button class="button primary" data-edit-project="${esc(project.id)}">Projekt planen</button><button class="button ghost" data-focus-resource="${esc(resourceKey(resources[0]?.name || ""))}">Ressourcenwirkung</button></div>
      ${changedProject(project) && state.mode === "sharp" ? `<button class="restore-link" data-restore="${esc(project.id)}">Planung auf Stand Mutterliste zurücksetzen</button>` : ""}
    </div>`;
}
function renderResources() {
  const groups = resourceGroups();
  const select = $("#resource-focus");
  const previous = select.value;
  select.innerHTML = groups.length ? groups.map(group => `<option value="${esc(group.key)}">${esc(group.name)}</option>`).join("") : '<option value="">Noch keine Ressource</option>';
  if (groups.some(group => group.key === previous)) select.value = previous;
  const focus = select.value;
  const focusAssessment = assessmentForResource(focus);
  const focusedDemands = allPhaseDemands().filter(item => item.resourceKey === focus && item.pt != null && item.pt > 0);
  const bottleneck = focusAssessment.bottleneck;
  const confirmation = focusAssessment.confirmation;
  const evidence = bottleneck || confirmation;
  const period = evidence ? `${monthLabel(evidence.startMonth)} bis ${monthLabel(evidence.endMonth)}` : "Noch kein prüfbarer Zeitraum";
  const utilization = bottleneck ? (Number.isFinite(bottleneck.utilization) ? `${Math.round(bottleneck.utilization * 100)} %` : "über 100 %") : "offen";
  const explanation = focusAssessment.status === "gap"
    ? `In dieser Periode fehlen mindestens ${bottleneck.shortfall} PT. Keine Verteilung innerhalb der Phasenfenster kann diese Lücke lösen.`
    : focusAssessment.status === "watch"
      ? "Die gemeinsame Beanspruchung liegt über 80 Prozent. Die Phasen sind rechnerisch tragbar, aber ohne ausreichende Reserve."
      : focusAssessment.status === "open" && confirmation?.unconfirmedNeeded > 0
        ? `Die Phase ist noch nicht freigabefähig. ${confirmation.demand} PT Bedarf stehen erst ${confirmation.capacity} bestätigte PT gegenüber. ${confirmation.unconfirmedNeeded} PT zusätzliche Kapazität müssen bestätigt werden. Für ${confirmation.unknownMonths.length} Monate fehlen noch Angaben.`
      : focusAssessment.status === "open"
        ? `${focusAssessment.undatedPt ? `${focusAssessment.undatedPt} PT haben noch kein prüfbares Phasenfenster. ` : ""}${focusAssessment.unknownMonths.length ? `Für ${focusAssessment.unknownMonths.length} benötigte Monate fehlt eine bestätigte Verfügbarkeit.` : ""}`
        : focusedDemands.length
          ? "Der gesamte Restbedarf findet innerhalb der geplanten Phasenfenster rechnerisch Platz. Es wurde keine Monatsverteilung erzeugt."
          : "Für diese Ressource ist noch kein Restbedarf erfasst.";
  const involved = evidence ? focusedDemands.filter(item => evidence.involvedIds.includes(item.id)) : [];
  const unsecured = focusAssessment.status === "open" && confirmation?.unconfirmedNeeded > 0;
  $("#resource-chart").innerHTML = `<div class="resource-assessment ${focusAssessment.status} ${unsecured ? "unsecured" : ""}">
    <div class="assessment-head"><span class="status-dot"></span><div><small>Gesamtstatus ${esc(groups.find(group => group.key === focus)?.name || "Ressource")}</small><strong>${esc(assessmentLabel(focusAssessment))}</strong></div></div>
    <p>${esc(explanation)}</p>
    ${evidence ? `<div class="assessment-numbers"><div><span>Kritischer Zeitraum</span><strong>${esc(period)}</strong></div><div><span>Gemeinsamer Bedarf</span><strong>${evidence.demand} PT</strong></div><div><span>${bottleneck ? "Verfügbarkeit" : "Bisher bestätigt"}</span><strong>${evidence.capacity} PT</strong></div><div><span>${bottleneck ? "Beanspruchung" : "Noch zu bestätigen"}</span><strong>${bottleneck ? utilization : `${confirmation.unconfirmedNeeded} PT`}</strong></div></div>` : ""}
    ${involved.length ? `<div class="involved-phases"><span>Beteiligte Phasen</span>${involved.map(item => `<button type="button" data-edit-project="${esc(item.project.id)}"><strong>${esc(item.project.object)}</strong><small>${esc(phaseInfo(item.demand.phaseKey).label)} · ${item.pt} PT</small></button>`).join("")}</div>` : ""}
  </div>`;
  const capacityPlans = capacityYearGroups();
  $("#capacity-count").textContent = capacityPlans.length ? `${capacityPlans.length} Jahresplanungen` : "noch keine Einträge";
  $("#capacity-list").innerHTML = capacityPlans.length ? capacityPlans.map(plan =>
    `<div class="capacity-list-row" data-edit-capacity="${esc(plan.firstId)}"><div><strong>${esc(plan.name)} · ${esc(plan.year)}</strong><span>${plan.months} von 12 Monaten bestätigt${plan.legacy ? " · frühere Werte neu bestätigen" : ""}</span></div><b>${plan.total} PT</b><span>›</span></div>`
  ).join("") : '<div class="empty-note">Noch keine verbindliche Jahresverfügbarkeit erfasst.</div>';

  const assessments = allResourceAssessments();
  const alerts = assessments.filter(item => ["gap", "watch"].includes(item.status));
  const unsecuredAssessments = assessments.filter(item => item.status === "open" && item.confirmation?.unconfirmedNeeded > 0);
  const openNeeds = unassessedNeeds();
  const strip = $("#resource-alert");
  strip.classList.toggle("hidden", !alerts.length && !unsecuredAssessments.length && !openNeeds.length);
  strip.classList.toggle("unsecured", unsecuredAssessments.length > 0);
  if (alerts.length || unsecuredAssessments.length || openNeeds.length) {
    const gaps = alerts.filter(item => item.status === "gap").length;
    const tight = alerts.filter(item => item.status === "watch").length;
    const firstCritical = assessments.find(item => item.status === "gap") || unsecuredAssessments[0];
    const criticalWarning = firstCritical ? assessmentWarning(firstCritical.group.name, firstCritical) : null;
    strip.innerHTML = `<strong>${gaps ? `${gaps} nicht tragbare Ressourcenlagen` : unsecuredAssessments.length ? `${unsecuredAssessments.length} Ressourcenlagen nicht abgesichert` : "Keine nachgewiesene Kapazitätslücke"} · ${openNeeds.length} Bedarfe noch nicht beurteilbar</strong><span>${esc(criticalWarning?.message || `${tight} knappe Ressourcenlagen. Geprüft werden gemeinsame Phasenzeitfenster, nicht erfundene Monatsauslastungen.`)}</span>`;
  }

  const phaseRows = allPhaseDemands().sort((a, b) => a.project.object.localeCompare(b.project.object, "de") || phaseIndex(a.demand.phaseKey) - phaseIndex(b.demand.phaseKey));
  $("#resource-matrix").innerHTML = phaseRows.length ? `<table class="resource-matrix phase-resource-table"><thead><tr><th>Projekt und Phase</th><th>Zeitraum</th><th>Ressource</th><th>Restbedarf</th><th>Beurteilung</th></tr></thead><tbody>${phaseRows.map(item => {
    const status = demandStatus(item);
    const assessment = assessmentForResource(item.resourceKey);
    const itemBottleneck = assessment.bottleneck?.involvedIds.includes(item.id) ? assessment.bottleneck : null;
    const itemConfirmation = assessment.confirmation?.involvedIds.includes(item.id) ? assessment.confirmation : null;
    const detail = item.past
      ? "Die Phase liegt vollständig in der Vergangenheit und wird nicht gegen künftige Kapazität gerechnet."
      : status === "gap" && itemBottleneck
      ? `${monthLabel(itemBottleneck.startMonth)} bis ${monthLabel(itemBottleneck.endMonth)}: ${itemBottleneck.demand} PT Bedarf, ${itemBottleneck.capacity} PT verfügbar, ${itemBottleneck.shortfall} PT fehlen.`
      : status === "watch" && itemBottleneck
        ? `${monthLabel(itemBottleneck.startMonth)} bis ${monthLabel(itemBottleneck.endMonth)}: ${Math.round(itemBottleneck.utilization * 100)} Prozent beansprucht.`
        : status === "open" && itemConfirmation?.unconfirmedNeeded > 0
          ? `${monthLabel(itemConfirmation.startMonth)} bis ${monthLabel(itemConfirmation.endMonth)}: ${itemConfirmation.demand} PT Bedarf, erst ${itemConfirmation.capacity} PT bestätigt. ${itemConfirmation.unconfirmedNeeded} PT müssen zusätzlich bestätigt werden.`
        : status === "open"
          ? item.pt == null ? "Noch benötigte PT fehlen." : !item.startMonth ? "Die Phase hat noch kein vollständiges Zeitfenster." : "Für benötigte Monate fehlt die bestätigte Verfügbarkeit."
          : "Der Restbedarf ist innerhalb des Phasenfensters rechnerisch tragbar.";
    const rowUnsecured = status === "open" && itemConfirmation?.unconfirmedNeeded > 0;
    const statusLabel = item.past ? "Vergangene Phase" : rowUnsecured ? "Kapazität nicht abgesichert" : RESOURCE_STATUS[status].label;
    return `<tr class="phase-resource-row ${status} ${rowUnsecured ? "unsecured" : ""}" data-edit-project="${esc(item.project.id)}"><td><strong>${esc(item.project.object)}</strong><small>${esc(phaseInfo(item.demand.phaseKey).label)}</small></td><td>${item.startMonth ? `${monthLabel(item.startMonth)} bis ${monthLabel(item.endMonth)}` : "noch offen"}</td><td><strong>${esc(item.name || "offen")}</strong></td><td>${item.pt == null ? "offen" : `${item.pt} PT`}</td><td><span class="resource-status ${status} ${rowUnsecured ? "unsecured" : ""}">${esc(statusLabel)}</span><small>${esc(detail)}</small></td></tr>`;
  }).join("")}</tbody></table>` : '<div class="empty-note">Noch kein Restbedarf erfasst. Im Projekt wird je Ressource und Phase genau ein Wert eingetragen.</div>';
}
function allPhaseCosts() {
  return projects().flatMap(project => project.phaseCosts.map(item => ({ ...item, projectId: project.id, object: project.object })));
}
function costForYears(years, statuses = null) {
  return allPhaseCosts().filter(item => years.includes(Number(item.year)) && (!statuses || statuses.includes(item.status))).reduce((sum, item) => sum + num(item.amount), 0);
}
function renderFinance() {
  const horizons = [
    { label: "0 bis 1 Jahr", years: [2026, 2027] },
    { label: "2 bis 3 Jahre", years: [2028, 2029] },
    { label: "4 bis 10 Jahre", years: [2030, 2031, 2032, 2033, 2034, 2035, 2036] }
  ];
  $("#finance-horizons").innerHTML = horizons.map(horizon => {
    const secured = costForYears(horizon.years, ["approved", "bound"]);
    const bound = costForYears(horizon.years, ["bound"]);
    const planning = costForYears(horizon.years, ["estimate", "budgeted"]);
    return `<article><span>${horizon.label}</span><strong>${chf(secured, true)}</strong><small>freigegeben und gebunden</small><div><b>${chf(bound, true)}</b> gebunden · <b>${chf(planning, true)}</b> Planung</div></article>`;
  }).join("");
  const totals = YEARS.map(year => Object.fromEntries(COST_STATUSES.map(status => [status.key, costForYears([year], [status.key])])));
  const max = Math.max(1, ...totals.map(total => Object.values(total).reduce((a, b) => a + b, 0)));
  $("#finance-chart").innerHTML = YEARS.map((year, index) => {
    const total = Object.values(totals[index]).reduce((a, b) => a + b, 0);
    return `<div class="finance-year"><strong>${total ? chf(total, true) : "–"}</strong><div class="finance-stack" style="height:${total / max * 88}%">${COST_STATUSES.map(status => `<i class="${status.className}" style="height:${total ? totals[index][status.key] / total * 100 : 0}%" title="${status.label}: ${chf(totals[index][status.key])}"></i>`).join("")}</div><span>${year}</span></div>`;
  }).join("");
  $("#finance-legend").innerHTML = COST_STATUSES.map(status => `<span><i class="${status.className}"></i>${status.label}</span>`).join("");
}

function quarterOptions(selected, blank = true) {
  return `${blank ? '<option value="">noch offen</option>' : ""}${ALL_QUARTERS.map(quarter => `<option value="${quarter}" ${quarter === selected ? "selected" : ""}>${qLabel(quarter)}</option>`).join("")}`;
}
function phaseOptions(selected) {
  return PHASES.map(phase => `<option value="${phase.key}" ${phase.key === selected ? "selected" : ""}>${phase.label}</option>`).join("");
}
function options(values, selected, placeholder) {
  return `${placeholder ? `<option value="">${placeholder}</option>` : ""}${values.map(value => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(value)}</option>`).join("")}`;
}
function phaseStatusOptions(selected) {
  return Object.entries(PHASE_STATUS).map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
}
function roleOptions(selected = "", placeholder = "Verantwortung wählen") {
  const value = canonicalResourceName(selected);
  const legacy = value && !ROLE_OPTIONS.includes(value) ? `<option value="${esc(value)}" selected>${esc(value)} · bestehender Wert</option>` : "";
  return `<option value="">${placeholder}</option>${legacy}${options(ROLE_OPTIONS, value)}`;
}
function phaseAssignee(project, phaseKey = project.currentPhaseKey) {
  return project.phasePlan.find(row => row.phaseKey === phaseKey)?.assignee || "";
}
function capacityResourceOptions(selected = "") {
  const value = canonicalResourceName(selected);
  return `<option value="">Ressource wählen</option>${options(CAPACITY_RESOURCES, value)}`;
}
function setRoleSelect(selector, value, emptyLabel) {
  const normalized = canonicalResourceName(value);
  const isEmpty = ["offen", "nach bedarf", "noch nicht definiert"].includes(normalized.toLowerCase());
  $(selector).innerHTML = roleOptions(isEmpty ? "" : normalized, emptyLabel);
}
function renderPhasePlanEditor() {
  $("#phase-plan-editor").innerHTML = editPhasePlan.map((row, index) => `<div class="phase-plan-row ${phaseInfo(row.phaseKey).className}" data-phase-plan="${index}"><div><i></i><strong>${phaseInfo(row.phaseKey).label}</strong><span>${index === 1 ? "Danach Entscheid Gesamtvorstand" : index === 3 ? "Danach Projektfreigabe Gesamtvorstand" : "Entscheid im Kompetenzrahmen"}</span></div><label><span>Status</span><select class="pp-status">${phaseStatusOptions(row.status)}</select></label><label><span>Verantwortung</span><select class="pp-assignee">${roleOptions(row.assignee)}</select></label><label><span>Start</span><select class="pp-start">${quarterOptions(row.startQuarter)}</select></label><label><span>Ende</span><select class="pp-end">${quarterOptions(row.endQuarter)}</select></label></div>`).join("");
  renderCurrentAssigneeSummary();
}
function renderCurrentAssigneeSummary() {
  const summary = $("#f-current-assignee-summary");
  if (!summary) return;
  const currentPhaseKey = $("#f-phase").value;
  const assignee = editPhasePlan.find(row => row.phaseKey === currentPhaseKey)?.assignee || "";
  summary.textContent = assignee || "noch offen";
  summary.classList.toggle("open", !assignee);
}
function renderDemandEditor() {
  $("#demand-editor").innerHTML = editDemands.length ? editDemands.map((demand, index) => {
    const phase = editPhasePlan.find(item => item.phaseKey === demand.phaseKey);
    const window = phaseMonthWindow(phase, CURRENT_MONTH);
    const statusText = window.startMonth ? `${monthLabel(window.startMonth)} bis ${monthLabel(window.endMonth)}` : "Phasenzeitraum noch offen";
    return `<div class="demand-card" data-demand="${index}">
      <div class="demand-summary simple"><label><span>Projektphase</span><select class="d-phase">${phaseOptions(demand.phaseKey)}</select></label><label><span>Person oder Firma</span><select class="d-name">${capacityResourceOptions(demand.name)}</select></label><label><span>Noch benötigte PT</span><input class="d-remaining" type="number" min="0.5" step=".5" value="${esc(demand.remainingPt)}" placeholder="z. B. 18"></label><button type="button" class="remove" data-remove-demand="${index}" aria-label="Ressourcenbedarf löschen">×</button></div>
      <div class="planning-state"><strong>${esc(statusText)}</strong><span>Dieser eine Wert gilt für die ganze Phase. Das BauRadar verteilt ihn nicht auf Monate.</span>${demand.migrationNote ? `<small>${esc(demand.migrationNote)}</small>` : ""}</div>
    </div>`;
  }).join("") : '<div class="empty-note">Noch kein Ressourcenbedarf eingetragen.</div>';
}
function renderPhaseCostEditor() {
  $("#phase-cost-editor").innerHTML = editPhaseCosts.length ? editPhaseCosts.map((item, index) => `<div class="edit-row cost" data-phase-cost="${index}"><label><span>Projektphase</span><select class="pc-phase">${phaseOptions(item.phaseKey)}</select></label><label><span>Jahr</span><select class="pc-year">${YEARS.map(year => `<option ${Number(item.year) === year ? "selected" : ""}>${year}</option>`).join("")}</select></label><label><span>Betrag CHF</span><input class="pc-amount" inputmode="decimal" value="${esc(item.amount)}"></label><label><span>Qualität</span><select class="pc-status">${COST_STATUSES.map(status => `<option value="${status.key}" ${item.status === status.key ? "selected" : ""}>${status.label}</option>`).join("")}</select></label><label><span>Quelle</span><input class="pc-source" value="${esc(item.source || "")}" placeholder="z. B. Offerte"></label><label><span>Informationsdatum</span><input class="pc-date" type="date" value="${esc(item.informationDate || "")}"></label><button type="button" class="remove" data-remove-phase-cost="${index}">×</button></div>`).join("") : '<div class="empty-note">Noch keine Kosten einer Projektphase und einem Jahr zugeordnet.</div>';
}
function renderGateEditor() {
  $("#gate-editor").innerHTML = editGateHistory.length ? editGateHistory.map((gate, index) => {
    const locked = gate.persisted ? "disabled" : "";
    return `<div class="gate-history-row" data-gate="${index}"><label><span>Phase</span><select class="g-phase" ${locked}>${phaseOptions(gate.phaseKey)}</select></label><label><span>Entscheid</span><select class="g-status" ${locked}>${options(GATE_STATUSES, gate.status)}</select></label><label><span>Instanz</span><select class="g-authority" ${locked}>${options(GATE_AUTHORITIES, gate.authority)}</select></label><label><span>Datum</span><input class="g-date" type="date" value="${esc(gate.date)}" ${locked}></label><label><span>Kurzbegründung</span><input class="g-reason" value="${esc(gate.reason || "")}" ${locked}></label><label><span>Auflagen</span><input class="g-conditions" value="${esc(gate.conditions || "")}" ${locked}></label><label><span>Nächste Phase</span><select class="g-next" ${locked}><option value="">keine</option>${phaseOptions(gate.nextPhase)}</select></label>${gate.persisted ? '<span class="history-lock">protokolliert</span>' : `<button type="button" class="remove" data-remove-gate="${index}">×</button>`}</div>`;
  }).join("") : '<div class="empty-note">Noch kein Phasentorentscheid protokolliert.</div>';
}
function syncEditors() {
  editPhasePlan = $$("[data-phase-plan]").map((row, index) => ({
    ...editPhasePlan[index],
    status: row.querySelector(".pp-status").value,
    assignee: row.querySelector(".pp-assignee").value,
    startQuarter: row.querySelector(".pp-start").value,
    endQuarter: row.querySelector(".pp-end").value
  }));
  editDemands = $$("[data-demand]").map((row, index) => ({
    ...editDemands[index],
    id: editDemands[index]?.id || uuid("d"),
    name: canonicalResourceName(row.querySelector(".d-name").value),
    phaseKey: row.querySelector(".d-phase").value,
    remainingPt: row.querySelector(".d-remaining").value
  }));
  editPhaseCosts = $$("[data-phase-cost]").map((row, index) => ({
    id: editPhaseCosts[index]?.id || uuid("pc"),
    phaseKey: row.querySelector(".pc-phase").value,
    year: Number(row.querySelector(".pc-year").value),
    amount: row.querySelector(".pc-amount").value,
    status: row.querySelector(".pc-status").value,
    source: row.querySelector(".pc-source").value.trim(),
    informationDate: row.querySelector(".pc-date").value
  }));
  editGateHistory = $$("[data-gate]").map((row, index) => {
    if (editGateHistory[index]?.persisted) return editGateHistory[index];
    return {
      ...editGateHistory[index],
      id: editGateHistory[index]?.id || uuid("gate"),
      phaseKey: row.querySelector(".g-phase").value,
      status: row.querySelector(".g-status").value,
      authority: row.querySelector(".g-authority").value,
      date: row.querySelector(".g-date").value,
      reason: row.querySelector(".g-reason").value.trim(),
      conditions: row.querySelector(".g-conditions").value.trim(),
      nextPhase: row.querySelector(".g-next").value
    };
  });
}
function validateProjectEditors() {
  const errors = [];
  for (const demand of editDemands) {
    errors.push(...validateDemand(demand).map(error => `${demand.name || "Ressource"}: ${error}`));
  }
  const demandKeys = editDemands.map(demand => `${resourceKey(demand.name)}:${demand.phaseKey}`).filter(key => !key.startsWith(":"));
  if (new Set(demandKeys).size !== demandKeys.length) errors.push("Dieselbe Ressource darf je Projektphase nur einmal erfasst werden");
  for (const cost of editPhaseCosts) {
    if (cost.amount === "") errors.push("Kostenzeile: Betrag fehlt");
  }
  for (const gate of editGateHistory.filter(item => !item.persisted)) {
    if (!gate.date || !gate.reason) errors.push("Phasentor: Datum und Kurzbegründung sind Pflicht");
  }
  return errors;
}
function openProject(id, newProject = false) {
  let project = projects().find(item => item.id === id);
  if (newProject) project = normalizeProject({
    id: uuid("project"),
    object: "",
    measure: "",
    kind: "Bauprojekt",
    phase: "-",
    motherPhaseKey: "anlass",
    currentPhaseKey: "anlass",
    currentAssignee: "",
    roles: { gs: "offen", bk: "offen", vs: "nach Bedarf", bhb: "offen", control: "offen", deputy: "offen" },
    cashflow: [],
    cost: "",
    nextDecision: ""
  });
  if (!project) return;
  $("#project-id").value = project.id;
  $("#project-dialog-title").textContent = newProject ? "Neues Projekt" : project.object;
  $("#mother-state").textContent = phaseInfo(project.motherPhaseKey).label;
  $("#f-object").value = project.object;
  $("#f-measure").value = project.measure;
  $("#f-kind").value = project.kind;
  renderProjectTypeGuidance();
  $("#f-phase").value = project.currentPhaseKey;
  $("#f-next").value = project.nextDecision || "";
  setRoleSelect("#f-gs", project.roles.gs, "offen");
  setRoleSelect("#f-bk", project.roles.bk, "offen");
  setRoleSelect("#f-vs", project.roles.vs, "nach Bedarf");
  setRoleSelect("#f-bhb", project.roles.bhb, "offen");
  setRoleSelect("#f-control", project.roles.control, "offen");
  setRoleSelect("#f-deputy", project.roles.deputy, "offen");
  editPhasePlan = clone(project.phasePlan);
  editDemands = clone(project.demands);
  editPhaseCosts = clone(project.phaseCosts);
  editGateHistory = clone(project.gateHistory).map(gate => ({ ...gate, persisted: true }));
  $("#mother-cost-note").innerHTML = rawMotherCost(project)
    ? `<strong>Referenz ImmoTool / Excel: ${chf(rawMotherCost(project))}</strong><span>Dieser Referenzwert wird nie automatisch mit den Phasenkosten summiert.</span>`
    : "<strong>Kein Referenzwert</strong><span>Phasenkosten werden mit Quelle, Informationsdatum und Qualität erfasst.</span>";
  renderPhasePlanEditor();
  renderCurrentAssigneeSummary();
  renderDemandEditor();
  renderPhaseCostEditor();
  renderGateEditor();
  $("#delete-project").classList.toggle("hidden", newProject);
  setFormTab("base");
  $("#project-dialog").showModal();
}
function setFormTab(name) {
  $$("[data-form-tab]").forEach(button => button.classList.toggle("active", button.dataset.formTab === name));
  $$("[data-panel]").forEach(panel => panel.classList.toggle("hidden", panel.dataset.panel !== name));
}
function renderProjectTypeGuidance() {
  const selected = $("#f-kind").value;
  $$('[data-project-type]').forEach(card => card.classList.toggle("active", card.dataset.projectType === selected));
}
function renderCapacityYearSummary() {
  const values = $$("[data-capacity-month] .cy-pt").map(input => input.value).filter(value => value !== "");
  const total = values.reduce((sum, value) => sum + (nullableNumberValue(value) ?? 0), 0);
  $("#c-year-total").textContent = `${total} PT erfasst`;
  $("#c-year-open").textContent = values.length === 12 ? "Alle 12 Monate ausgefüllt" : `${12 - values.length} Monate noch offen`;
}
function renderCapacityYearGrid() {
  const name = canonicalResourceName($("#c-name").value);
  const year = $("#c-year").value;
  const existing = new Map(capacities().filter(item => resourceKey(item.name) === resourceKey(name) && item.month?.startsWith(`${year}-`)).map(item => [item.month, item]));
  $("#capacity-year-grid").innerHTML = MONTH_NAMES.map((label, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const item = existing.get(month);
    return `<article class="capacity-month ${item?.requiresReview ? "review" : ""}" data-capacity-month="${month}"><strong>${label}</strong><label><span>Verfügbare PT</span><input class="cy-pt" type="number" min="0" step=".5" value="${esc(item?.pt ?? "")}" inputmode="decimal" placeholder="offen"></label>${item?.requiresReview ? '<small>früheren Wert neu bestätigen</small>' : ""}</article>`;
  }).join("");
  renderCapacityYearSummary();
  const hasYear = capacities().some(item => resourceKey(item.name) === resourceKey(name) && (item.month?.startsWith(`${year}-`) || item.legacyQuarter?.startsWith(`${year}-`)));
  $("#delete-capacity").classList.toggle("hidden", !hasYear);
}
function openCapacity(id) {
  const item = capacities().find(capacity => capacity.id === id) || { id: "", name: "", month: "", pt: null };
  $("#c-name").innerHTML = capacityResourceOptions(item.name);
  const selectedYear = item.month?.slice(0, 4) || item.legacyQuarter?.slice(0, 4) || String(new Date().getFullYear());
  $("#c-year").innerHTML = YEARS.map(year => `<option value="${year}" ${String(year) === selectedYear ? "selected" : ""}>${year}</option>`).join("");
  $("#c-confirmed").checked = false;
  renderCapacityYearGrid();
  $("#capacity-dialog").showModal();
}
function csv(name, rows) {
  const content = "\ufeff" + rows.map(row => row.map(value => `"${csvSafe(value).replaceAll('"', '""')}"`).join(";")).join("\n");
  download(name, content, "text/csv;charset=utf-8");
}

$("#phase-filter").innerHTML += PHASES.map(phase => `<option value="${phase.key}">${phase.label}</option>`).join("");
$("#f-phase").innerHTML = PHASES.map(phase => `<option value="${phase.key}">${phase.label}</option>`).join("");
[$("#search"), $("#kind-filter"), $("#phase-filter"), $("#only-pressure")].forEach(element => element.addEventListener("input", renderTimeline));

$("#workspace-select").addEventListener("change", event => {
  snapshot("Arbeitsstand gewechselt");
  if (event.target.value === "sharp") {
    state.mode = "sharp";
    state.activeScenarioId = null;
  } else {
    state.mode = "scenario";
    state.activeScenarioId = event.target.value;
  }
  selectedId = activeWorkspace().projects[0]?.id;
  save();
});
$("#new-scenario").addEventListener("click", () => {
  if (state.mode !== "sharp") {
    toast("Ein neues Szenario wird immer aus dem scharfen Stand erstellt");
    return;
  }
  const name = prompt("Name des neuen Szenarios");
  if (!name?.trim()) return;
  const question = prompt("Welche Frage soll dieses Szenario beantworten?") || "";
  snapshot("Szenario erstellt");
  const scenario = {
    id: uuid("scenario"),
    name: name.trim(),
    question: question.trim(),
    createdAt: new Date().toISOString(),
    baseCreatedAt: new Date().toISOString(),
    projects: clone(state.projects),
    capacities: clone(state.capacities),
    deletedIds: clone(state.deletedIds),
    auditLog: []
  };
  state.scenarios.push(scenario);
  state.mode = "scenario";
  state.activeScenarioId = scenario.id;
  selectedId = scenario.projects[0]?.id;
  save("Szenario aus scharfem Stand erstellt");
  toast("Szenario erstellt. Der scharfe Stand bleibt unverändert.");
});

$("#timeline").addEventListener("click", event => {
  const row = event.target.closest("[data-select]");
  if (row) {
    selectedId = row.dataset.select;
    renderTimeline();
    renderDetail();
  }
});
$("#project-detail").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit-project]");
  if (edit) openProject(edit.dataset.editProject);
  const restore = event.target.closest("[data-restore]");
  if (restore) {
    const baseline = BASELINE.find(item => item.id === restore.dataset.restore);
    if (baseline && confirm("Planung dieses Projekts auf den importierten Mutterstand zurücksetzen?")) {
      snapshot("Projektplanung zurückgesetzt");
      activeWorkspace().projects[projects().findIndex(item => item.id === baseline.id)] = clone(baseline);
      save("Projektplanung zurückgesetzt");
      toast("Projektplanung zurückgesetzt");
    }
  }
  const focus = event.target.closest("[data-focus-resource]");
  if (focus?.dataset.focusResource) {
    $("#resource-focus").value = focus.dataset.focusResource;
    renderResources();
    $("#ressourcen").scrollIntoView({ behavior: "smooth" });
  }
});
$("#edit-selected").addEventListener("click", () => openProject(selectedId));
$("#new-project").addEventListener("click", () => openProject(null, true));
$("#f-kind").addEventListener("change", renderProjectTypeGuidance);
$("#f-phase").addEventListener("change", renderCurrentAssigneeSummary);
$("#phase-plan-editor").addEventListener("change", event => {
  const select = event.target.closest(".pp-assignee");
  const row = select?.closest("[data-phase-plan]");
  if (!select || !row) return;
  editPhasePlan[Number(row.dataset.phasePlan)].assignee = select.value;
  renderCurrentAssigneeSummary();
});
$("#expand-long").addEventListener("click", () => { longOpen = !longOpen; renderLongHorizon(); });
$$("[data-form-tab]").forEach(button => button.addEventListener("click", () => {
  syncEditors();
  if (button.dataset.formTab === "resources") renderDemandEditor();
  setFormTab(button.dataset.formTab);
}));

$("#add-demand").addEventListener("click", () => {
  syncEditors();
  editDemands.push({ id: uuid("d"), name: "", phaseKey: $("#f-phase").value, remainingPt: "" });
  renderDemandEditor();
});
$("#demand-editor").addEventListener("click", event => {
  const removeDemand = event.target.closest("[data-remove-demand]");
  if (removeDemand) {
    syncEditors();
    editDemands.splice(Number(removeDemand.dataset.removeDemand), 1);
    renderDemandEditor();
  }
});
$("#demand-editor").addEventListener("change", () => {
  syncEditors();
  renderDemandEditor();
});
$("#add-phase-cost").addEventListener("click", () => {
  syncEditors();
  editPhaseCosts.push({ id: uuid("pc"), phaseKey: $("#f-phase").value, year: 2027, amount: "", status: "estimate", source: "", informationDate: "" });
  renderPhaseCostEditor();
});
$("#phase-cost-editor").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-phase-cost]");
  if (button) {
    syncEditors();
    editPhaseCosts.splice(Number(button.dataset.removePhaseCost), 1);
    renderPhaseCostEditor();
  }
});
$("#add-gate").addEventListener("click", () => {
  syncEditors();
  editGateHistory.push({ id: uuid("gate"), phaseKey: $("#f-phase").value, status: "freigegeben", authority: "BK", date: "", reason: "", conditions: "", nextPhase: "" });
  renderGateEditor();
});
$("#gate-editor").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-gate]");
  if (button) {
    syncEditors();
    editGateHistory.splice(Number(button.dataset.removeGate), 1);
    renderGateEditor();
  }
});

$("#project-form").addEventListener("submit", event => {
  event.preventDefault();
  syncEditors();
  const id = $("#project-id").value;
  const existing = projects().find(item => item.id === id);
  const phaseErrors = phasePlanIssues({ phasePlan: editPhasePlan });
  const editorErrors = validateProjectEditors();
  if (phaseErrors.length || editorErrors.length) {
    const message = phaseErrors[0] || editorErrors[0];
    toast(message);
    setFormTab(phaseErrors.length ? "phases" : "resources");
    return;
  }
  const currentPhaseKey = $("#f-phase").value;
  const currentAssignee = editPhasePlan.find(row => row.phaseKey === currentPhaseKey)?.assignee || "";
  if (!currentAssignee) {
    toast(`Verantwortung ${phaseInfo(currentPhaseKey).short} fehlt`);
    setFormTab("phases");
    return;
  }
  const newGates = editGateHistory.filter(gate => !gate.persisted).map(({ persisted, ...gate }) => gate);
  const oldGates = editGateHistory.filter(gate => gate.persisted).map(({ persisted, ...gate }) => gate);
  const project = normalizeProject({
    ...existing,
    id,
    object: $("#f-object").value.trim(),
    measure: $("#f-measure").value.trim(),
    kind: $("#f-kind").value,
    currentPhaseKey,
    currentAssignee,
    nextDecision: $("#f-next").value.trim(),
    roles: {
      gs: $("#f-gs").value || "offen",
      bk: $("#f-bk").value || "offen",
      vs: $("#f-vs").value || "nach Bedarf",
      bhb: $("#f-bhb").value || "offen",
      control: $("#f-control").value || "offen",
      deputy: $("#f-deputy").value || "offen"
    },
    phasePlan: editPhasePlan,
    demands: editDemands,
    phaseCosts: editPhaseCosts,
    gateHistory: [...oldGates, ...newGates],
    category: $("#f-kind").value
  });
  snapshot(existing ? "Projektplanung geändert" : "Projekt erstellt");
  if (existing) activeWorkspace().projects[projects().findIndex(item => item.id === id)] = project;
  else activeWorkspace().projects.push(project);
  selectedId = id;
  save(existing ? "Projektplanung geändert" : "Projekt erstellt");
  $("#project-dialog").close();
  const warningShown = focusProjectResourceWarning(project);
  if (!warningShown) toast("Projektplanung gespeichert");
});
$("#delete-project").addEventListener("click", () => {
  const id = $("#project-id").value;
  const project = projects().find(item => item.id === id);
  if (project && confirm(`Projekt «${project.object}» aus diesem Arbeitsstand löschen?`)) {
    snapshot("Projekt gelöscht");
    activeWorkspace().projects = projects().filter(item => item.id !== id);
    if (BASELINE.some(item => item.id === id)) activeWorkspace().deletedIds.push(id);
    selectedId = projects()[0]?.id;
    save("Projekt gelöscht");
    $("#project-dialog").close();
  }
});

$("#new-capacity").addEventListener("click", () => openCapacity());
$("#capacity-list").addEventListener("click", event => {
  const row = event.target.closest("[data-edit-capacity]");
  if (row) openCapacity(row.dataset.editCapacity);
});
$("#resource-focus").addEventListener("change", renderResources);
[$("#resource-chart"), $("#resource-matrix")].forEach(element => element.addEventListener("click", event => {
  const target = event.target.closest("[data-edit-project]");
  if (target) openProject(target.dataset.editProject);
}));
$("#c-name").addEventListener("change", renderCapacityYearGrid);
$("#c-year").addEventListener("change", renderCapacityYearGrid);
$("#capacity-year-grid").addEventListener("input", renderCapacityYearSummary);
$("#capacity-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = canonicalResourceName($("#c-name").value);
  const year = $("#c-year").value;
  const existing = new Map(capacities().filter(item => resourceKey(item.name) === resourceKey(name) && item.month?.startsWith(`${year}-`)).map(item => [item.month, item]));
  const rows = $$('[data-capacity-month]').map(card => ({
    month: card.dataset.capacityMonth,
    pt: card.querySelector(".cy-pt").value
  }));
  for (const row of rows) {
    if (row.pt !== "" && nullableNumberValue(row.pt) == null) {
      toast(`${monthLabel(row.month)}: Bitte einen gültigen Wert eingeben`);
      return;
    }
  }
  const filled = rows.filter(row => row.pt !== "");
  const previousCount = capacities().filter(item => resourceKey(item.name) === resourceKey(name) && (item.month?.startsWith(`${year}-`) || item.legacyQuarter?.startsWith(`${year}-`))).length;
  if (!filled.length && !previousCount) {
    toast("Bitte mindestens einen Monat erfassen");
    return;
  }
  if (filled.length < previousCount && !confirm(`${previousCount - filled.length} bisherige Monatswerte werden entfernt. Fortfahren?`)) return;
  snapshot(previousCount ? "Jahresverfügbarkeit geändert" : "Jahresverfügbarkeit erfasst");
  const untouched = capacities().filter(item => !(resourceKey(item.name) === resourceKey(name) && (item.month?.startsWith(`${year}-`) || item.legacyQuarter?.startsWith(`${year}-`))));
  const annualValues = filled.map(row => ({
    id: existing.get(row.month)?.id || uuid("cap"),
    name,
    month: row.month,
    pt: nullableNumberValue(row.pt),
    confirmed: true,
    confirmedAt: new Date().toISOString()
  }));
  activeWorkspace().capacities = [...untouched, ...annualValues];
  save(previousCount ? "Jahresverfügbarkeit geändert" : "Jahresverfügbarkeit erfasst");
  $("#capacity-dialog").close();
  if (!focusResourceWarning(name)) toast(`${filled.length} Monatswerte für ${year} gespeichert`);
});
$("#delete-capacity").addEventListener("click", () => {
  const name = canonicalResourceName($("#c-name").value);
  const year = $("#c-year").value;
  if (name && confirm(`Alle Verfügbarkeitswerte von ${name} für ${year} löschen?`)) {
    snapshot("Jahresverfügbarkeit gelöscht");
    activeWorkspace().capacities = capacities().filter(item => !(resourceKey(item.name) === resourceKey(name) && (item.month?.startsWith(`${year}-`) || item.legacyQuarter?.startsWith(`${year}-`))));
    save("Jahresverfügbarkeit gelöscht");
    $("#capacity-dialog").close();
  }
});

$("#undo").addEventListener("click", () => {
  const previous = history.pop();
  if (!previous) return;
  state = previous.state;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  selectedId = activeWorkspace().projects[0]?.id;
  renderAll();
  toast(`Rückgängig: ${previous.label}`);
});
$("#reset-all").addEventListener("click", () => {
  const confirmation = prompt("Diese Aktion verwirft alle lokalen Planungen. Tippe ZURÜCKSETZEN.");
  if (confirmation !== "ZURÜCKSETZEN") return;
  snapshot("Planung zurückgesetzt");
  state = emptyState();
  selectedId = state.projects[0]?.id;
  save("Planung vollständig zurückgesetzt");
  toast("Planung zurückgesetzt");
});

$("#export-backup").addEventListener("click", () => {
  const backup = { product: "BGR BauRadar", exportedAt: new Date().toISOString(), schemaVersion: SCHEMA_VERSION, state };
  download(`BGR_BauRadar_Vollsicherung_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), "application/json");
  toast("Vollsicherung heruntergeladen");
});
$("#import-backup-button").addEventListener("click", () => $("#import-backup").click());
$("#import-backup").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const source = parsed.state || parsed;
    if (!Array.isArray(source.projects)) throw new Error("Keine Projekte gefunden");
    if (!confirm("Die Sicherung ersetzt den aktuellen lokalen Stand. Fortfahren?")) return;
    snapshot("Vor Import einer Sicherung");
    const migrated = migrateState(source, BASELINE);
    state = {
      ...migrated,
      projects: migrated.projects.map(normalizeProject),
      scenarios: (migrated.scenarios || []).map(scenario => ({ ...scenario, ...normalizeWorkspace(scenario) }))
    };
    selectedId = activeWorkspace().projects[0]?.id;
    save("Vollsicherung eingelesen");
    toast("Sicherung erfolgreich eingelesen");
  } catch (error) {
    toast(`Sicherung nicht eingelesen: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});

$("#export-projects").addEventListener("click", () => csv("BGR_BauRadar_Projekte_und_Phasen.csv", [
  ["Arbeitsstand", "Projekt ID", "Objekt", "Projektart", "Mutterstand", "Arbeitsstand Phase", "Verantwortung aktuelle Phase", "Projektphase", "Verantwortung Projektphase", "Status", "Start", "Ende"],
  ...projects().flatMap(project => project.phasePlan.map(row => [state.mode === "scenario" ? activeWorkspace().name : "Scharfer Stand", project.id, project.object, project.kind, phaseInfo(project.motherPhaseKey).label, phaseInfo(project.currentPhaseKey).label, phaseAssignee(project), phaseInfo(row.phaseKey).label, row.assignee, PHASE_STATUS[row.status] || row.status, row.startQuarter, row.endQuarter]))
]));
$("#export-resources").addEventListener("click", () => csv("BGR_BauRadar_Ressourcenbedarf.csv", [
  ["Arbeitsstand", "Projekt ID", "Objekt", "Projektphase", "Phasenbeginn", "Phasenende", "Person oder Firma", "Noch benötigte PT", "Beurteilung", "Kritischer Zeitraum", "Gemeinsamer Bedarf PT", "Verfügbarkeit PT", "Fehlende PT"],
  ...allPhaseDemands().map(item => {
    const status = demandStatus(item);
    const assessment = assessmentForResource(item.resourceKey);
    const bottleneck = assessment.bottleneck?.involvedIds.includes(item.id) ? assessment.bottleneck : null;
    return [state.mode === "scenario" ? activeWorkspace().name : "Scharfer Stand", item.project.id, item.project.object, phaseInfo(item.demand.phaseKey).label, item.startMonth, item.endMonth, item.name, item.pt ?? "", RESOURCE_STATUS[status].label, bottleneck ? `${bottleneck.startMonth} bis ${bottleneck.endMonth}` : "", bottleneck?.demand ?? "", bottleneck?.capacity ?? "", bottleneck?.shortfall ?? ""];
  })
]));
$("#export-capacity").addEventListener("click", () => csv("BGR_BauRadar_Verbindliche_Verfuegbarkeit.csv", [
  ["Arbeitsstand", "Name", "Monat", "Verfügbare PT", "Bestätigt", "Bestätigt am"],
  ...capacities().map(item => [state.mode === "scenario" ? activeWorkspace().name : "Scharfer Stand", item.name, item.month, item.pt ?? "", item.confirmed ? "ja" : "nein", item.confirmedAt || ""])
]));
$("#export-money").addEventListener("click", () => csv("BGR_BauRadar_Finanzen_nach_Projektphase.csv", [
  ["Arbeitsstand", "Projekt ID", "Objekt", "Projektphase", "Jahr", "Betrag CHF", "Qualität", "Quelle", "Informationsdatum"],
  ...projects().flatMap(project => project.phaseCosts.map(item => [state.mode === "scenario" ? activeWorkspace().name : "Scharfer Stand", project.id, project.object, phaseInfo(item.phaseKey).label, item.year, item.amount, COST_STATUSES.find(status => status.key === item.status)?.label || item.status, item.source || "", item.informationDate || ""]))
]));
$("#export-changes").addEventListener("click", () => csv("BGR_BauRadar_Aenderungsprotokoll.csv", [
  ["Zeitpunkt", "Arbeitsstand", "Aktion", "Detail"],
  ...activeWorkspace().auditLog.map(item => [item.at, state.mode === "scenario" ? activeWorkspace().name : "Scharfer Stand", item.action, item.detail])
]));

renderAll();

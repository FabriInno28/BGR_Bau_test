import { BASELINE_META, BASELINE_PROJECTS } from "./projects-data.js";
import {
  CAPACITY_RESOURCES,
  DEMAND_RESOURCES,
  OFFICE_PEOPLE,
  OFFICE_UNASSIGNED,
  ROLE_OPTIONS,
  allocateOfficeDemand,
  isOfficeUnassigned,
  SCHEMA_VERSION,
  assessResourceCapacity,
  canonicalPhaseKey,
  canonicalResourceName,
  clone,
  csvSafe,
  migratePhaseResponsibilities,
  migrateState,
  nullableNumberValue,
  phaseMonthWindow,
  planningHorizon,
  numberValue,
  quarterIndex,
  resourceKey,
  uuid,
  validateDemand,
  validateFinanceEntry,
  validatePhaseTransitions
} from "./model.js";

const PHASES = [
  { key: "anlass", label: "Anlass & Prüfauftrag", short: "Anlass", className: "p1" },
  { key: "machbarkeit", label: "Machbarkeitsstudie", short: "Machbarkeit", className: "p2" },
  { key: "planerwahl", label: "Auswahl der Planenden", short: "Planendenwahl", className: "p3" },
  { key: "planung", label: "Planung & Projektierung", short: "Planung", className: "p4" },
  { key: "ausfuehrung", label: "Ausschreibung & Ausführung", short: "Ausführung", className: "p5" },
  { key: "abschluss", label: "Übergabe & Projektabschluss", short: "Abschluss", className: "p6" }
];

const FORMAL_GATES = [
  { key: "tor1", label: "Tor 1", afterPhase: "machbarkeit", timing: "Nach der Machbarkeitsstudie", decision: "Strategische Ausrichtung bestätigen, Variante wählen sowie Auswahl der Planenden und Planungsauftrag freigeben." },
  { key: "tor2", label: "Tor 2", afterPhase: "planung", timing: "Nach Planung & Projektierung", decision: "Über die Realisierung entscheiden und Kredit sowie Terminplan bewilligen." },
  { key: "tor3", label: "Tor 3", afterPhase: "abschluss", timing: "Nach Übergabe & Projektabschluss", decision: "Bauabrechnung genehmigen und das Projekt formell abschliessen." }
];

const PHASE_CLOSE_FIELDS = [
  { key: "goal", label: "Ziel", question: "Ist das Ziel weiterhin richtig und mit Immobilienstrategie und Portfolio abgestimmt?" },
  { key: "result", label: "Ergebnis", question: "Sind die erforderlichen Unterlagen vollständig und entscheidungsreif?" },
  { key: "organization", label: "Organisation", question: "Passt die Organisation zu Bedeutung, Risiken und Komplexität des Projekts?" },
  { key: "resources", label: "Ressourcen", question: "Sind Finanzierung, Personal und Zeit für die nächste Phase gesichert?" },
  { key: "changes", label: "Veränderungen", question: "Sind wesentliche Änderungen bei Kosten, Terminen, Risiken oder Abhängigkeiten berücksichtigt?" }
];

const COST_STATUSES = [
  { key: "estimate", label: "Schätzung", className: "estimate" },
  { key: "budgeted", label: "budgetiert", className: "budgeted" },
  { key: "approved", label: "freigegeben", className: "approved" },
  { key: "bound", label: "vertraglich gebunden", className: "bound" }
];

const GATE_STATUSES = ["geplant", "freigegeben", "mit Auflagen", "zurückgestellt", "gestoppt"];
const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_QUARTER = `${CURRENT_YEAR}-Q${Math.floor(TODAY.getMonth() / 3) + 1}`;
const CURRENT_MONTH = `${CURRENT_YEAR}-${String(TODAY.getMonth() + 1).padStart(2, "0")}`;
const START_QUARTER = CURRENT_QUARTER;
const DISPLAY_QUARTERS = makeQuarters(START_QUARTER, 12);
const ALL_QUARTERS = makeQuarters(`${CURRENT_YEAR}-Q1`, 44);
const YEARS = Array.from({ length: 11 }, (_, index) => CURRENT_YEAR + index);
const BASELINE_VERSION = BASELINE_META.version;
const BASELINE_DATE = BASELINE_META.date;
const [BASELINE_YEAR, BASELINE_MONTH] = BASELINE_DATE.split("-").map(Number);
const BASELINE_QUARTER = `${BASELINE_YEAR}-Q${Math.ceil(BASELINE_MONTH / 3)}`;
const DATA_STAND_LABEL = BASELINE_DATE.split("-").reverse().join(".");
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
  done: "Abgeschlossen",
  none: "Keine Tätigkeit"
};
const STORE_KEY = "bgr-bauradar-v10";
const PREVIOUS_STORE_KEY = "bgr-bauradar-v9";
const OLDER_STORE_KEY = "bgr-bauradar-v8";
const LEGACY_STORE_KEY = "bgr-bauradar-v7";
const OLDEST_STORE_KEY = "bgr-bauradar-v5";
const VERY_OLD_STORE_KEY = "bgr-bauradar-v4";
const ANCIENT_STORE_KEY = "bgr-portfolio-cockpit-v3";
const HISTORY_KEY = "bgr-bauradar-v10-history";

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
  if (/41|51|52/.test(text)) return "ausfuehrung";
  if (text.includes("53")) return "abschluss";
  if (text.includes("U")) return "ausfuehrung";
  return "anlass";
}
function inferKind(project) {
  const text = `${project.measure} ${project.object}`.toLowerCase();
  const simpleOfficeProject = project.currentOwner === "Geschäftsstelle"
    && /küchengeräte|fernwärmeanschluss|einfache badsanierung|kurzfristige unterhalt|werterhaltung/.test(text);
  return project.phase?.includes("U") || simpleOfficeProject ? "Unterhaltsprojekt" : "Bauprojekt";
}
function inferRoles(project) {
  return {
    gs: canonicalResourceName(project.roles?.gs || (project.currentOwner === "Geschäftsstelle" ? "Geschäftsstelle" : "")) || "offen",
    bk: canonicalResourceName(project.roles?.bk || (project.bgrResponsibility === "Baukommission" ? (project.currentOwner || "BK") : "")) || "offen",
    vs: canonicalResourceName(project.roles?.vs || "") || "nach Bedarf",
    bhb: canonicalResourceName(project.roles?.bhb || (["Büro 8", "Tresto", "TRESTO", "andere externe Partner"].includes(project.projectManagement) ? project.projectManagement : "")) || "offen"
  };
}
function emptyCloseReview(review = {}) {
  return {
    goal: review.goal || "",
    result: review.result || "",
    organization: review.organization || "",
    resources: review.resources || "",
    changes: review.changes || "",
    date: review.date || "",
    note: review.note || ""
  };
}
function defaultPhasePlan(currentKey) {
  const current = phaseIndex(canonicalPhaseKey(currentKey));
  return PHASES.map((phase, index) => ({
    phaseKey: phase.key,
    status: index < current ? "done" : index === current ? "current" : "open",
    startQuarter: "",
    endQuarter: "",
    closeReview: emptyCloseReview()
  }));
}
function rawMotherCost(project) {
  const known = (project.cashflow || []).filter(item => item.status === "bekannt").reduce((sum, item) => sum + num(item.amount), 0);
  return known || num(project.cost);
}
function derivedStartYear(project) {
  const direct = Number(project.horizonStartYear || project.startYear);
  if (Number.isInteger(direct)) return direct;
  const phaseYears = (project.phasePlan || [])
    .map(row => Number(String(row.startQuarter || "").slice(0,4)))
    .filter(Number.isInteger);
  return phaseYears.length ? Math.min(...phaseYears) : CURRENT_YEAR;
}
function derivedDurationYears(project, startYear) {
  const direct = Number(project.horizonDurationYears);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const endYear = Number(project.endYear);
  if (Number.isInteger(endYear) && Number.isInteger(startYear)) return Math.max(1, endYear - startYear + 1);
  return 1;
}
function normalizeProject(project) {
  const migrated = migrateState({ projects: [project] }).projects[0];
  const motherPhaseKey = canonicalPhaseKey(migrated.motherPhaseKey || project.motherPhaseKey || phaseFromLegacy(project.phase));
  const currentPhaseKey = canonicalPhaseKey(migrated.currentPhaseKey || project.currentPhaseKey || project.phaseKey || motherPhaseKey);
  const fallback = defaultPhasePlan(currentPhaseKey);
  const sourceRows = migrated.phasePlan?.length ? migrated.phasePlan : fallback;
  const phasePlan = PHASES.map((phase, index) => {
    const source = sourceRows.find(row => canonicalPhaseKey(row.phaseKey) === phase.key) || fallback[index];
    let status = ["open", "planned", "current", "done", "none"].includes(source?.status) ? source.status : fallback[index].status;
    if (phase.key === currentPhaseKey && status === "none") status = "current";
    return {
      phaseKey: phase.key,
      status,
      startQuarter: status === "none" ? "" : (source?.startQuarter || ""),
      endQuarter: status === "none" ? "" : (source?.endQuarter || ""),
      closeReview: emptyCloseReview(source?.closeReview)
    };
  });
  const roles = inferRoles({ ...project, roles: project.roles || migrated.roles });
  const horizonStartYear = derivedStartYear({ ...project, phasePlan });
  const horizonDurationYears = derivedDurationYears(project, horizonStartYear);
  const planningDepth = planningHorizon(horizonStartYear, CURRENT_YEAR);
  const rawKind = migrated.kind || project.kind;
  const kind = rawKind === "Kleinprojekt" ? "Unterhaltsprojekt"
    : ["Unterhaltsprojekt", "Bauprojekt"].includes(rawKind) ? rawKind
    : project.category === "Bauprojekt" ? "Bauprojekt" : inferKind(project);
  return {
    ...clone(project),
    ...migrated,
    kind,
    motherPhaseKey,
    currentPhaseKey,
    currentAssignee: "",
    motherQuarter: project.motherQuarter || BASELINE_QUARTER,
    roles,
    phasePlan,
    horizonStartYear,
    horizonDurationYears,
    planningDepth,
    roughFinanceK: project.roughFinanceK ?? (planningDepth !== "detail" && rawMotherCost(project) ? String(rawMotherCost(project) / 1000) : ""),
    projectOrderStatus: project.projectOrderStatus || (kind === "Bauprojekt" ? "offen" : "nicht erforderlich"),
    finances: Array.isArray(migrated.finances) ? migrated.finances : [],
    gateHistory: Array.isArray(migrated.gateHistory) ? migrated.gateHistory : []
  };
}
const BASELINE = BASELINE_PROJECTS.map(normalizeProject);

function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    baselineVersion: BASELINE_VERSION,
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
function reconcileBaselineProjects(savedProjects, deletedIds = []) {
  const savedById = new Map(savedProjects.map(project => [project.id, normalizeProject(project)]));
  const deleted = new Set(deletedIds);
  const refreshed = BASELINE.filter(project => !deleted.has(project.id)).map(base => {
    const saved = savedById.get(base.id);
    if (!saved) return clone(base);
    return normalizeProject({
      ...clone(base),
      kind: saved.kind,
      currentPhaseKey: saved.currentPhaseKey,
      roles: clone(saved.roles),
      phasePlan: clone(saved.phasePlan),
      demands: clone(saved.demands),
      horizonStartYear: saved.horizonStartYear || saved.startYear,
      horizonDurationYears: saved.horizonDurationYears,
      roughFinanceK: saved.roughFinanceK,
      projectOrderStatus: saved.projectOrderStatus,
      finances: clone(saved.finances),
      gateHistory: clone(saved.gateHistory),
      nextDecision: saved.nextDecision
    });
  });
  const localOnly = savedProjects.filter(project => !BASELINE.some(base => base.id === project.id)).map(normalizeProject);
  return [...refreshed, ...localOnly];
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(PREVIOUS_STORE_KEY) || localStorage.getItem(OLDER_STORE_KEY) || localStorage.getItem(LEGACY_STORE_KEY) || localStorage.getItem(OLDEST_STORE_KEY) || localStorage.getItem(VERY_OLD_STORE_KEY) || localStorage.getItem(ANCIENT_STORE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    const migrated = migrateState(parsed, BASELINE);
    const baselineChanged = parsed.baselineVersion !== BASELINE_VERSION;
    return {
      ...migrated,
      baselineVersion: BASELINE_VERSION,
      projects: baselineChanged ? reconcileBaselineProjects(migrated.projects, migrated.deletedIds) : migrated.projects.map(normalizeProject),
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
function storeLocal(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error("Lokale Speicherung fehlgeschlagen", error);
    return false;
  }
}
function save(label = "") {
  state.schemaVersion = SCHEMA_VERSION;
  state.baselineVersion = BASELINE_VERSION;
  if (!storeLocal(STORE_KEY, JSON.stringify(state))) {
    history = [];
    localStorage.removeItem(HISTORY_KEY);
    if (!storeLocal(STORE_KEY, JSON.stringify(state))) {
      toast("Lokaler Speicher ist voll. Bitte Vollsicherung erstellen und Browserdaten bereinigen.", "gap", 10000);
      return false;
    }
  }
  if (label) addAudit(label);
  renderAll();
  return true;
}
function addAudit(action, detail = "") {
  activeWorkspace().auditLog.push({
    id: uuid("audit"),
    at: new Date().toISOString(),
    action,
    detail
  });
  storeLocal(STORE_KEY, JSON.stringify(state));
}
function snapshot(label) {
  history.push({ label, state: clone(state) });
  history = history.slice(-12);
  if (!storeLocal(HISTORY_KEY, JSON.stringify(history))) {
    history = history.slice(-3);
    storeLocal(HISTORY_KEY, JSON.stringify(history));
  }
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
let editFinances = [];
let editGateHistory = [];
let resourceOverviewMode = "project";

function projects() { return activeWorkspace().projects; }
function capacities() { return activeWorkspace().capacities; }
function plannedPhases(project) { return project.phasePlan.filter(row => row.status !== "none" && row.startQuarter && row.endQuarter); }
function plansAt(project, quarter) {
  return project.phasePlan.filter(row => row.status !== "none" && row.startQuarter && row.endQuarter && qIndex(quarter) >= qIndex(row.startQuarter) && qIndex(quarter) <= qIndex(row.endQuarter));
}
function phasePlanIssues(project) {
  const issues = [];
  let previousEnd = null;
  project.phasePlan.forEach(row => {
    if (row.status === "none") return;
    if (Boolean(row.startQuarter) !== Boolean(row.endQuarter)) issues.push(`${phaseInfo(row.phaseKey).short}: Start oder Ende fehlt`);
    if (row.startQuarter && row.endQuarter && qIndex(row.endQuarter) < qIndex(row.startQuarter)) issues.push(`${phaseInfo(row.phaseKey).short}: Ende vor Start`);
    if (previousEnd != null && row.startQuarter && qIndex(row.startQuarter) < previousEnd) issues.push(`${phaseInfo(row.phaseKey).short}: überschneidet vorherige Phase`);
    if (row.endQuarter) previousEnd = Math.max(previousEnd ?? 0, qIndex(row.endQuarter));
  });
  if (project.currentPhaseKey) {
    const currentRows = project.phasePlan.filter(row => row.status === "current");
    const selected = project.phasePlan.find(row => row.phaseKey === project.currentPhaseKey);
    if (currentRows.length > 1) issues.push("Mehr als eine Phase ist als aktuell markiert");
    if (selected?.status === "none") issues.push(`${phaseInfo(project.currentPhaseKey).short}: aktuelle Phase kann nicht «Keine Tätigkeit» sein`);
    else if (selected && selected.status !== "current") issues.push(`${phaseInfo(project.currentPhaseKey).short}: aktuelle Phase muss Status «Aktuell» haben`);
  }
  return issues;
}
function phaseCloseState(row) {
  const review = row?.closeReview || {};
  const values = PHASE_CLOSE_FIELDS.map(field => review[field.key] || "");
  if (values.some(value => value === "clarify")) return "clarify";
  if (values.every(value => value === "ok")) return "ready";
  return "open";
}
function projectIssues(project) {
  const issues = [];
  const detail = effectivePlanningDepth(project) === "detail";
  const isBuildProject = project.kind === "Bauprojekt";
  if (project.uncertain) issues.push("Mutterdaten als unsicher markiert");

  if (isBuildProject && (!project.roles?.bk || String(project.roles.bk).toLowerCase() === "offen")) {
    issues.push("Vertretung Allgemeine Baukommission offen");
  }
  if (isBuildProject && detail && project.projectOrderStatus !== "vorhanden") {
    issues.push("Schriftlicher Projektauftrag noch nicht vorhanden");
  }

  if (detail && isBuildProject) {
    project.phasePlan.forEach(row => {
      if (row.status === "none") return;
      if (row.startQuarter && row.endQuarter) {
        const phaseDemands = project.demands.filter(demand => demand.phaseKey === row.phaseKey);
        if (!phaseDemands.length) issues.push(`${phaseInfo(row.phaseKey).short}: Ressourcenbedarf noch nicht erfasst`);
      }
      if (row.status === "done") {
        const closeState = phaseCloseState(row);
        if (closeState === "open") issues.push(`${phaseInfo(row.phaseKey).short}: Phasenabschluss noch nicht vollständig geprüft`);
        if (closeState === "clarify") issues.push(`${phaseInfo(row.phaseKey).short}: Phasenabschluss mit Klärungsbedarf`);
      }
    });
    if (!plannedPhases(project).length) issues.push("Phasenplan offen");
    if (phaseIndex(project.currentPhaseKey) >= 1 && (!project.roles.bhb || String(project.roles.bhb).toLowerCase() === "offen")) issues.push("Bauherrenbegleitung offen");
  }

  if (detail) {
    for (const demand of project.demands) {
      const phase = project.phasePlan.find(row => row.phaseKey === demand.phaseKey);
      if (phase?.status === "none") continue;
      const item = allPhaseDemands().find(entry => entry.id === demand.id);
      if (item?.past && nullableNumberValue(demand.remainingPt) > 0) {
        issues.push(`${phaseInfo(demand.phaseKey).short}: Phase abgelaufen, aber ${demand.remainingPt} PT Restbedarf offen`);
        continue;
      }
      if (item?.past) continue;
      if (isOfficeUnassigned(demand.name)) {
        issues.push(`${phaseInfo(demand.phaseKey).short}: ${demand.remainingPt || "offene"} PT der Geschäftsstelle noch nicht namentlich zugeteilt`);
        if (nullableNumberValue(demand.remainingPt) == null) issues.push("Geschäftsstelle: Restbedarf noch nicht erfasst");
        continue;
      }
      if (nullableNumberValue(demand.remainingPt) == null) issues.push(`${demand.name || "Ressource"}: Restbedarf noch nicht erfasst`);
      else if (!item?.startMonth) issues.push(`${demand.name}: ${phaseInfo(demand.phaseKey).short} zeitlich noch nicht beurteilbar`);
      else {
        const status = demandStatus(item);
        if (status === "gap") issues.push(`${phaseInfo(demand.phaseKey).short}: ${demand.name} nicht gemeinsam tragbar`);
        if (status === "watch") issues.push(`${phaseInfo(demand.phaseKey).short}: ${demand.name} Kapazität knapp`);
        if (status === "open") issues.push(`${phaseInfo(demand.phaseKey).short}: ${demand.name} Verfügbarkeit ungeklärt`);
      }
      if (nullableNumberValue(demand.remainingPt) != null && !isOfficeUnassigned(demand.name) && nullableNumberValue(demand.hourlyRate) == null) {
        issues.push(`${demand.name}: Stundensatz für Ressourcenkosten fehlt`);
      }
    }
    project.finances.forEach(finance => {
      if (validateFinanceEntry(finance).length) issues.push(`Finanzen ${finance.year || "Jahr offen"}: Angaben unvollständig`);
    });
  } else {
    if (nullableNumberValue(project.roughFinanceK) == null) {
      issues.push(`${planningDepthInfo(project).short}: grobe Kosten noch offen`);
    }
  }

  if (detail && isBuildProject) {
    validatePhaseTransitions({ phasePlan: project.phasePlan, gateHistory: project.gateHistory, currentPhaseKey: project.currentPhaseKey }).forEach(issue => {
      const gate = FORMAL_GATES.find(item => item.key === issue.gateKey);
      if (issue.type === "wrongAuthority") issues.push(`${gate?.label || "Phasentor"}: Entscheid des Gesamtvorstands erforderlich`);
      else issues.push(`${gate?.label || "Phasentor"}: Vorstandsentscheid nicht freigegeben`);
    });
    issues.push(...phasePlanIssues(project));
  }
  return [...new Set(issues)];
}
function securedCost(project) {
  return project.finances.filter(item => ["approved", "bound"].includes(item.status)).reduce((sum, item) => sum + num(item.amount), 0);
}
const PLANNING_DEPTHS = {
  detail: { label: "Planung · nächste 1–3 Jahre", short: "1–3 Jahre", accuracy: "±15 %", description: "Handbuch: Phasen und Phasentore festlegen, Rollen und Verantwortlichkeiten zuweisen, Personalbedarf und Kosten detailliert planen." },
  medium: { label: "Vorausschau · Jahre 4–10", short: "4–10 Jahre", accuracy: "±25 %", description: "Handbuch: Vorbereitung, Planung und Ausführung zeitlich grob einordnen. Keine detaillierte Ressourcen- oder Phasentorplanung." },
  light: { label: "Perspektive · Jahre 11–30", short: "11–30 Jahre", accuracy: "±50 %", description: "Handbuch: möglichen Projektstart, voraussichtliche Projektdauer und grobe Kosten abschätzen." }
};
function planningDepthInfo(project) {
  const depth = planningHorizon(project?.horizonStartYear || project?.startYear, CURRENT_YEAR);
  return PLANNING_DEPTHS[depth] || PLANNING_DEPTHS.detail;
}
function demandHours(demand) {
  const pt = nullableNumberValue(demand?.remainingPt);
  const hoursPerPt = nullableNumberValue(demand?.hoursPerPt);
  return pt == null || hoursPerPt == null ? null : pt * hoursPerPt;
}
function demandResourceCost(demand) {
  if (!demand || isOfficeUnassigned(demand.name)) return null;
  const hours = demandHours(demand);
  const hourlyRate = nullableNumberValue(demand.hourlyRate);
  return hours == null || hourlyRate == null ? null : hours * hourlyRate;
}
function projectResourceCost(project, demands = project?.demands || []) {
  return demands.reduce((sum, demand) => {
    const phase = project?.phasePlan?.find(row => row.phaseKey === demand.phaseKey);
    if (phase?.status === "none") return sum;
    return sum + (demandResourceCost(demand) ?? 0);
  }, 0);
}
function projectResourceCostMeta(project, demands = project?.demands || []) {
  const relevant = demands.filter(demand => project?.phasePlan?.find(row => row.phaseKey === demand.phaseKey)?.status !== "none" && !isOfficeUnassigned(demand.name));
  const priced = relevant.filter(demand => demandResourceCost(demand) != null);
  const totalPt = relevant.reduce((sum, demand) => sum + (nullableNumberValue(demand.remainingPt) ?? 0), 0);
  return { total: projectResourceCost(project, demands), resources: new Set(relevant.map(demand => resourceKey(demand.name))).size, totalPt, priced: priced.length, unpriced: relevant.length - priced.length };
}
function changedProject(project) {
  const baseline = BASELINE.find(item => item.id === project.id);
  return !baseline || JSON.stringify(project) !== JSON.stringify(baseline);
}

function resourceGroups() {
  // Unzugeteilter Gruppenbedarf gehört NICHT in die verfügbare Personen-Kapazität.
  const map = new Map();
  capacities().forEach(item => {
    const key = resourceKey(item.name);
    if (key && !isOfficeUnassigned(item.name) && !map.has(key)) map.set(key, { key, name: item.name });
  });
  projects().flatMap(project => project.demands).forEach(item => {
    const key = resourceKey(item.name);
    if (key && !isOfficeUnassigned(item.name) && !map.has(key)) map.set(key, { key, name: item.name });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}
function allPhaseDemands() {
  return projects().flatMap(project => {
    if (effectivePlanningDepth(project) !== "detail") return [];
    return project.demands.flatMap(demand => {
    const phase = project.phasePlan.find(item => item.phaseKey === demand.phaseKey);
    if (phase?.status === "none") return [];
    const window = phaseMonthWindow(phase, CURRENT_MONTH);
    return [{
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
    }];
  });
  });
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
  const candidates = [...new Set(project.demands.map(demand => canonicalResourceName(demand.name)).filter(name => name && !isOfficeUnassigned(name)))].map(name => {
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
  // Die Geschäftsstelle als Gruppe hat nie eine eigene verfügbare Kapazität:
  // Solange PT nicht namentlich zugeteilt sind, bleibt die Phase offen.
  if (isOfficeUnassigned(item.name)) return "open";
  if (item.pt == null || item.pt <= 0 || !item.startMonth || !item.endMonth) return "open";
  const assessment = assessmentForResource(item.resourceKey);
  if (assessment.bottleneck?.utilization > 1 && assessment.bottleneck.involvedIds.includes(item.id)) return "gap";
  if (assessment.bottleneck?.utilization > 0.8 && assessment.bottleneck.involvedIds.includes(item.id)) return "watch";
  if (assessment.unknownMonths.some(month => month >= item.startMonth && month <= item.endMonth)) return "open";
  return "ok";
}
function phaseResourceStatus(project, phaseKey) {
  const phase = project.phasePlan.find(row => row.phaseKey === phaseKey);
  if (phase?.status === "none") return "ok";
  const items = allPhaseDemands().filter(item => item.project.id === project.id && item.demand.phaseKey === phaseKey);
  if (!items.length) return "open";
  const severity = { ok: 0, watch: 1, open: 2, gap: 3 };
  return items.map(demandStatus).sort((a, b) => severity[b] - severity[a])[0];
}
const RESOURCE_SEVERITY = { ok: 0, watch: 1, open: 2, gap: 3 };
function strongestResourceStatus(statuses = []) {
  return statuses.length ? statuses.slice().sort((a, b) => RESOURCE_SEVERITY[b] - RESOURCE_SEVERITY[a])[0] : "ok";
}
function overviewStatusLabel(status) {
  return status === "gap" ? "Nicht tragbar" : status === "open" ? "Nicht gesichert" : status === "watch" ? "Knapp" : "Gesichert";
}
function relevantResourcePhases(project) {
  const demanded = new Set(project.demands.map(demand => demand.phaseKey));
  return project.phasePlan.filter(row =>
    row.status !== "none" &&
    (row.phaseKey === project.currentPhaseKey || row.status === "planned" || row.status === "current" || demanded.has(row.phaseKey))
  );
}
function projectResourceOverview(project) {
  const phases = relevantResourcePhases(project).map(row => ({ row, status: phaseResourceStatus(project, row.phaseKey) }));
  const relevantDemands = project.demands.filter(demand => project.phasePlan.find(row => row.phaseKey === demand.phaseKey)?.status !== "none");
  const meta = projectResourceCostMeta(project, relevantDemands);
  const openGroupPt = relevantDemands.filter(demand => isOfficeUnassigned(demand.name)).reduce((sum, demand) => sum + (nullableNumberValue(demand.remainingPt) ?? 0), 0);
  return {
    project,
    phases,
    status: strongestResourceStatus(phases.map(item => item.status)),
    totalPt: relevantDemands.reduce((sum, demand) => sum + (nullableNumberValue(demand.remainingPt) ?? 0), 0),
    resourceCount: new Set(relevantDemands.filter(demand => !isOfficeUnassigned(demand.name)).map(demand => resourceKey(demand.name))).size,
    resourceCost: meta.total,
    unpriced: meta.unpriced,
    openGroupPt
  };
}
function renderResourceOverview() {
  const container = $("#resource-matrix");
  const actionOnly = $("#resource-action-only")?.checked ?? true;
  $$("[data-resource-overview]").forEach(button => button.classList.toggle("active", button.dataset.resourceOverview === resourceOverviewMode));

  if (resourceOverviewMode === "resource") {
    const officeItems = allPhaseDemands().filter(item => !item.past && isOfficeUnassigned(item.name));
    const entries = resourceGroups().map(group => {
      const assessment = assessmentForResource(group.key);
      const demands = allPhaseDemands().filter(item => item.resourceKey === group.key && !item.past);
      const byProject = new Map();
      demands.forEach(item => {
        if (!byProject.has(item.project.id)) byProject.set(item.project.id, { project: item.project, pt: 0, statuses: [] });
        const row = byProject.get(item.project.id);
        row.pt += item.pt ?? 0;
        row.statuses.push(demandStatus(item));
      });
      return { name: group.name, status: assessment.status, demands, byProject: [...byProject.values()] };
    });
    if (officeItems.length) {
      const byProject = new Map();
      officeItems.forEach(item => {
        if (!byProject.has(item.project.id)) byProject.set(item.project.id, { project: item.project, pt: 0, statuses: [] });
        const row = byProject.get(item.project.id);
        row.pt += item.pt ?? 0;
        row.statuses.push("open");
      });
      entries.push({ name: OFFICE_UNASSIGNED, status: "open", demands: officeItems, byProject: [...byProject.values()] });
    }
    const visible = entries
      .filter(entry => !actionOnly || entry.status !== "ok")
      .sort((a,b) => RESOURCE_SEVERITY[b.status] - RESOURCE_SEVERITY[a.status] || a.name.localeCompare(b.name,"de"));
    container.innerHTML = visible.length ? `<div class="resource-overview-list">${visible.map(entry => {
      const totalPt = entry.demands.reduce((sum, item) => sum + (item.pt ?? 0), 0);
      return `<article class="resource-overview-row resource-summary ${entry.status}">
        <div class="overview-main"><span class="status-dot"></span><div><strong>${esc(entry.name)}</strong><small>${entry.byProject.length} Projekte · ${totalPt} PT Restbedarf</small></div></div>
        <span class="resource-status ${entry.status}">${esc(overviewStatusLabel(entry.status))}</span>
        <div class="overview-details project-pills">${entry.byProject.slice(0,6).map(item => `<button type="button" data-edit-project="${esc(item.project.id)}"><strong>${esc(item.project.object)}</strong><span>${item.pt} PT · ${esc(overviewStatusLabel(strongestResourceStatus(item.statuses)))}</span></button>`).join("") || '<span class="overview-ok">Kein Projektbedarf.</span>'}</div>
      </article>`;
    }).join("")}</div>` : '<div class="empty-note">Aktuell gibt es in dieser Sicht keinen Handlungsbedarf.</div>';
    return;
  }

  const entries = projects().filter(project => effectivePlanningDepth(project) === "detail").map(projectResourceOverview)
    .filter(entry => !actionOnly || entry.status !== "ok")
    .sort((a,b) => RESOURCE_SEVERITY[b.status] - RESOURCE_SEVERITY[a.status] || a.project.object.localeCompare(b.project.object,"de"));
  container.innerHTML = entries.length ? `<div class="resource-overview-list">${entries.map(entry => `<article class="resource-overview-row project-summary ${entry.status}" data-edit-project="${esc(entry.project.id)}">
      <div class="overview-main"><span class="status-dot"></span><div><strong>${esc(entry.project.object)}</strong><small>${esc(planningDepthInfo(entry.project).short)} · aktueller Stand: ${esc(phaseInfo(entry.project.currentPhaseKey).label)}</small></div></div>
      <span class="resource-status ${entry.status}">${esc(overviewStatusLabel(entry.status))}</span>
      <div class="project-resource-totals">
        <span><b>${entry.resourceCount}</b> Ressourcen</span>
        <span><b>${entry.totalPt}</b> PT Restbedarf</span>
        <span><b>${chf(entry.resourceCost, true)}</b> Ressourcenkosten</span>
        ${entry.unpriced ? `<span class="open"><b>${entry.unpriced}</b> Ansätze offen</span>` : ""}
        ${entry.openGroupPt ? `<span class="open"><b>${entry.openGroupPt}</b> PT Geschäftsstelle offen</span>` : ""}
      </div>
    </article>`).join("")}</div>` : '<div class="empty-note">Aktuell gibt es in dieser Sicht keinen Handlungsbedarf.</div>';
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
  const applicable = projects().reduce((sum, project) => sum + project.phasePlan.filter(row => row.status !== "none").length, 0);
  const assessments = allResourceAssessments();
  const gaps = assessments.filter(item => item.status === "gap").length;
  const approved = allFinanceEntries().filter(item => item.status === "approved").reduce((sum, item) => sum + num(item.amount), 0);
  const bound = allFinanceEntries().filter(item => item.status === "bound").reduce((sum, item) => sum + num(item.amount), 0);
  const changes = projects().filter(changedProject).length + workspace.deletedIds.length + capacities().length;
  $("#data-state").textContent = state.mode === "scenario"
    ? `Szenario: ${workspace.name} · Basis Mutterstand ${DATA_STAND_LABEL}`
    : (changes ? `${changes} lokale Planungsänderungen · Mutterstand ${DATA_STAND_LABEL}` : `Mutterstand ${DATA_STAND_LABEL}`);
  $("#mode-pill").innerHTML = `<i></i>${state.mode === "scenario" ? `Szenario: ${esc(workspace.name)}` : "Scharfer Stand"}`;
  $("#mode-pill").classList.toggle("scenario", state.mode === "scenario");
  $("#workspace-select").innerHTML = `<option value="sharp">Scharfer Stand</option>${state.scenarios.map(scenario => `<option value="${esc(scenario.id)}">${esc(scenario.name)}</option>`).join("")}`;
  $("#workspace-select").value = state.mode === "scenario" ? state.activeScenarioId : "sharp";
  $("#delete-scenario").classList.toggle("hidden", state.mode !== "scenario");
  $("#kpis").innerHTML = [
    ["Vorhaben", projects().length, "im Portfolio"],
    ["Geplante Phasen", planned, `von ${applicable} relevanten Phasen`],
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
  $("#phase-legend").innerHTML = PHASES.map(phase => `<span><i class="${phase.className}"></i>${esc(phase.label)}</span>`).join("");
  const header = `<div class="timeline-header"><div>${list.length} Projekte</div>${DISPLAY_QUARTERS.map(quarter => `<div>${qLabel(quarter)}</div>`).join("")}</div>`;
  const rows = list.map(project => {
    const issues = projectIssues(project);
    return `<div class="timeline-row ${project.id === selectedId ? "selected" : ""}" data-select="${esc(project.id)}">
      <div class="project-label"><strong>${esc(project.object)}</strong><span>${esc(project.measure)} · ${esc(project.kind)} · <b class="project-current-phase ${phaseInfo(project.currentPhaseKey).className}">${esc(phaseInfo(project.currentPhaseKey).short)}</b></span>${issues.length ? '<i class="pressure-dot" title="Klärungsbedarf"></i>' : ""}</div>
      ${DISPLAY_QUARTERS.map(quarter => {
        const phases = plansAt(project, quarter);
        const mother = project.motherQuarter === quarter;
        return `<div class="qcell">${phases.length
          ? `<div class="phase-stack">${phases.map(phase => `<div class="phase-block ${phaseInfo(phase.phaseKey).className}" title="${esc(phaseInfo(phase.phaseKey).label)}">${phaseInfo(phase.phaseKey).short}</div>`).join("")}</div>`
          : mother
            ? `<div class="mother-marker ${phaseInfo(project.motherPhaseKey).className}" title="Mutterstand ${DATA_STAND_LABEL}: ${esc(phaseInfo(project.motherPhaseKey).label)}"></div>`
            : '<i class="empty-cell"></i>'}</div>`;
      }).join("")}
    </div>`;
  }).join("");
  $("#timeline").innerHTML = header + (rows || '<div class="empty-note">Keine Projekte entsprechen dem Filter.</div>');
  renderLongHorizon();
}
function projectFirstPlannedYear(project) {
  const direct = Number(project.horizonStartYear || project.startYear);
  if (Number.isInteger(direct)) return direct;
  const years = project.phasePlan
    .filter(row => row.status !== "none" && row.startQuarter)
    .map(row => Number(String(row.startQuarter).slice(0, 4)))
    .filter(Number.isFinite);
  return years.length ? Math.min(...years) : null;
}
function effectivePlanningDepth(project) {
  return planningHorizon(projectFirstPlannedYear(project), CURRENT_YEAR);
}
function renderLongHorizon() {
  $("#long-horizon").classList.toggle("hidden", !longOpen);
  $("#expand-long").textContent = longOpen ? "Vorausschau und Perspektive ausblenden" : "Vorausschau und Perspektive einblenden";
  const medium = projects().filter(project => effectivePlanningDepth(project) === "medium");
  const light = projects().filter(project => effectivePlanningDepth(project) === "light");

  const mediumCards = medium.map(project => {
    const start = projectFirstPlannedYear(project);
    const duration = Number(project.horizonDurationYears) || 1;
    const end = start ? start + duration - 1 : null;
    const finance = nullableNumberValue(project.roughFinanceK) != null
      ? num(project.roughFinanceK) * 1000
      : rawMotherCost(project);
    return `<article class="horizon-project medium" data-select="${esc(project.id)}">
      <span>Vorausschau · Jahre 4–10</span>
      <strong>${esc(project.object)}</strong>
      <small>${esc(project.measure || "Vorhaben zeitlich einordnen")}</small>
      <div><b>${start ? `${start}${end && end !== start ? `–${end}` : ""}` : "Zeitraum offen"}</b><em>${finance ? `Kosten ca. ${chf(finance, true)} · ±25 %` : "Kosten offen · Ziel ±25 %"}</em></div>
    </article>`;
  }).join("");

  const lightCards = light.map(project => {
    const start = projectFirstPlannedYear(project);
    const duration = Number(project.horizonDurationYears) || 1;
    const finance = nullableNumberValue(project.roughFinanceK) != null
      ? num(project.roughFinanceK) * 1000
      : rawMotherCost(project);
    return `<article class="horizon-project light" data-select="${esc(project.id)}">
      <span>Perspektive · Jahre 11–30</span>
      <strong>${esc(project.object)}</strong>
      <small>${esc(project.measure || "Vorhaben im Blick behalten")}</small>
      <div><b>${start ? `Start ca. ${start} · ${duration} J.` : "Projektstart offen"}</b><em>${finance ? `Kosten ca. ${chf(finance, true)} · ±50 %` : "Kosten offen · Ziel ±50 %"}${project.nextDecision ? ` · ${esc(project.nextDecision)}` : ""}</em></div>
    </article>`;
  }).join("");

  $("#long-horizon").innerHTML = `<div class="long-title"><strong>Rollende Planung gemäss Bauhandbuch</strong><span>Nächste 1–3 Jahre detailliert. Jahre 4–10 als Vorausschau. Jahre 11–30 als Perspektive.</span></div>
    <div class="horizon-section"><div class="horizon-heading"><strong>Vorausschau · 4–10 Jahre</strong><span>${medium.length} Vorhaben</span></div><div class="horizon-projects">${mediumCards || '<div class="empty-note">Noch keine Vorhaben in der Vorausschau.</div>'}</div></div>
    <div class="horizon-section"><div class="horizon-heading"><strong>Perspektive · 11–30 Jahre</strong><span>${light.length} Vorhaben</span></div><div class="horizon-projects light-grid">${lightCards || '<div class="empty-note">Noch keine langfristigen Perspektiven erfasst.</div>'}</div></div>`;
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
  const depthKey = effectivePlanningDepth(project);
  const depth = planningDepthInfo(project);
  const isBuildProject = project.kind === "Bauprojekt";
  const bk = project.roles?.bk && String(project.roles.bk).toLowerCase() !== "offen" ? project.roles.bk : "";
  const start = projectFirstPlannedYear(project);
  const duration = Number(project.horizonDurationYears) || 1;
  const end = start ? start + duration - 1 : null;
  const roughFinance = nullableNumberValue(project.roughFinanceK) != null ? num(project.roughFinanceK) * 1000 : rawMotherCost(project);

  if (depthKey !== "detail") {
    $("#project-detail").innerHTML = `<div class="project-cover"><div class="meta"><span>${esc(project.kind)} · ${esc(depth.label)} · ${state.mode === "scenario" ? "Szenario" : "scharfer Stand"}</span><span class="status-chip">${issues.length ? `${issues.length} Punkte offen` : "im Blick"}</span></div><h3>${esc(project.object)}</h3><p>${esc(project.measure)}</p></div>
      <div class="project-body">
        <div class="horizon-focus ${depthKey}"><span>${depthKey === "medium" ? "Vorausschau · 4–10 Jahre" : "Perspektive · 11–30 Jahre"}</span><strong>${start ? `${start}${end && end !== start ? `–${end}` : ""}` : "Zeitraum offen"}</strong><small>${esc(depth.description)}</small></div>
        <div class="perspectives"><div class="perspective"><span>Projektstart</span><strong>${start || "offen"}</strong></div><div class="perspective"><span>Dauer</span><strong>${duration} J.</strong></div><div class="perspective"><span>Grobe Kosten</span><strong>${roughFinance ? chf(roughFinance, true) : "offen"}</strong></div><div class="perspective"><span>Zielgenauigkeit</span><strong>${esc(depth.accuracy)}</strong></div></div>
        <div class="next-box"><span>Nächster Prüfpunkt</span><strong>${esc(project.nextDecision || "noch offen")}</strong><small>Detailplanung startet automatisch, sobald das Vorhaben in das rollende 3 Jahres Fenster rückt.</small></div>
        ${issues.length ? `<div class="issue-list">${issues.slice(0, 5).map(issue => `<span>${esc(issue)}</span>`).join("")}</div>` : ""}
        <div class="project-actions"><button class="button primary" data-edit-project="${esc(project.id)}">Vorausschau bearbeiten</button></div>
        ${changedProject(project) && state.mode === "sharp" ? `<button class="restore-link" data-restore="${esc(project.id)}">Planung auf Stand Mutterliste zurücksetzen</button>` : ""}
      </div>`;
    return;
  }

  const planned = plannedPhases(project);
  const latestGate = project.gateHistory.filter(gate => gate.gateKey && !gate.legacyGate).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const resources = project.demands.filter(demand => project.phasePlan.find(row => row.phaseKey === demand.phaseKey)?.status !== "none").slice(0, 4);
  const resourceCost = projectResourceCostMeta(project);

  $("#project-detail").innerHTML = `<div class="project-cover"><div class="meta"><span>${esc(project.kind)} · Planung 1–3 Jahre · ${state.mode === "scenario" ? "Szenario" : "scharfer Stand"}</span><span class="status-chip">${issues.length ? `${issues.length} Punkte offen` : "Plan prüfbar"}</span></div><h3>${esc(project.object)}</h3><p>${esc(project.measure)}</p></div>
    <div class="project-body">
      <div class="mother-current"><span>Mutterstand ${DATA_STAND_LABEL}</span><strong>${esc(phaseInfo(project.motherPhaseKey).label)}</strong><small>${project.uncertain ? "Quelle als unsicher markiert · " : ""}${isBuildProject ? (bk ? `Vertretung Allgemeine Baukommission: ${esc(bk)}` : "Vertretung Allgemeine Baukommission offen") : "Operative Verantwortung: Geschäftsstelle"}</small></div>
      ${isBuildProject ? `<div class="next-box"><span>Formelles Phasentor</span><strong>${esc(latestGate?.status || "noch kein Vorstandsentscheid erfasst")}</strong><small>${latestGate ? `${esc(gateDefinition(latestGate.gateKey).label)} · Gesamtvorstand · ${esc(latestGate.date)}` : "Drei formelle Tore gemäss Bauhandbuch"}</small></div>
      <span class="section-label">Sechs Bauphasen gemäss Bauhandbuch</span>
      <div class="phase-steps">${PHASES.map(phase => {
        const row = project.phasePlan.find(item => item.phaseKey === phase.key);
        if (row?.status === "none") return `<button class="phase-step ${phase.className} no-activity" title="${esc(phase.label)} · Keine Tätigkeit" aria-label="${esc(phase.label)}: Keine Tätigkeit"></button>`;
        const resourceStatus = row?.startQuarter ? phaseResourceStatus(project, phase.key) : "open";
        const hasDemand = project.demands.some(demand => demand.phaseKey === phase.key);
        const statusText = hasDemand ? RESOURCE_STATUS[resourceStatus].label : "Ressourcenbedarf offen";
        const closeState = phaseCloseState(row);
        return `<button class="phase-step ${phase.className} resource-${resourceStatus} close-${closeState} ${row?.startQuarter ? "done" : ""} ${phase.key === project.currentPhaseKey ? "current" : ""}" title="${esc(phase.label)} · ${row?.startQuarter ? `${qLabel(row.startQuarter)} bis ${qLabel(row.endQuarter)} · ${statusText}` : "noch nicht geplant"}" aria-label="${esc(phase.label)}: ${esc(statusText)}"></button>`;
      }).join("")}</div>` : `<div class="next-box"><span>Unterhaltsprojekt</span><strong>Operative Führung durch die Geschäftsstelle</strong><small>Keine formellen Vorstandstore gemäss Bauhandbuch.</small></div>`}
      <div class="perspectives"><div class="perspective"><span>${isBuildProject ? "Phasen geplant" : "Planungshorizont"}</span><strong>${isBuildProject ? `${planned.length} von ${project.phasePlan.filter(row => row.status !== "none").length}` : "1–3 Jahre"}</strong></div><div class="perspective"><span>Ressourcenkosten</span><strong>${resourceCost.total ? chf(resourceCost.total, true) : "offen"}</strong></div><div class="perspective"><span>Freigegeben / gebunden</span><strong>${chf(securedCost(project), true)}</strong></div><div class="perspective"><span>Offene Punkte</span><strong>${issues.length}</strong></div></div>
      <div class="finance-project-note ${project.finances.length ? "" : "open"}"><strong>${project.finances.length ? "Finanzplanung erfasst" : "Finanzen noch nicht erfasst"}</strong><span>${project.finances.length ? "Die Jahressicht ist im Bereich Finanzen sichtbar." : "Detailplanung im 3 Jahres Fenster noch offen."}</span></div>
      <span class="section-label">Ressourcen dieses Projekts</span>
      <div class="mini-resources">${resources.length ? resources.map(demand => {
        const item = allPhaseDemands().find(entry => entry.id === demand.id);
        const status = item ? demandStatus(item) : "open";
        const statusLabel = item?.past && nullableNumberValue(demand.remainingPt) > 0 ? "Phase abgelaufen, Restbedarf offen" : item?.past ? "Vergangene Phase" : RESOURCE_STATUS[status].label;
        return `<div class="mini-resource ${status}"><div><strong>${esc(demand.name)}</strong><span>${phaseInfo(demand.phaseKey).label} · ${esc(statusLabel)}</span></div><b>${nullableNumberValue(demand.remainingPt) == null ? "offen" : `${num(demand.remainingPt)} PT`}</b></div>`;
      }).join("") : '<div class="empty-note">Noch kein Ressourcenbedarf eingetragen.</div>'}</div>
      ${issues.length ? `<div class="issue-list">${issues.slice(0, 5).map(issue => `<span>${esc(issue)}</span>`).join("")}</div>` : ""}
      <div class="project-actions"><button class="button primary" data-edit-project="${esc(project.id)}">Projekt planen</button><button class="button ghost" data-focus-resource="${esc(resourceKey(resources.find(item => !isOfficeUnassigned(item.name))?.name || ""))}" data-focus-office="${resources.some(item => isOfficeUnassigned(item.name)) ? "true" : ""}">Ressourcenwirkung</button></div>
      ${changedProject(project) && state.mode === "sharp" ? `<button class="restore-link" data-restore="${esc(project.id)}">Planung auf Stand Mutterliste zurücksetzen</button>` : ""}
    </div>`;
}
function renderResources() {
  const officeOpen = allPhaseDemands().filter(item => !item.past && isOfficeUnassigned(item.name));
  const officePt = officeOpen.reduce((total, item) => total + (item.pt ?? 0), 0);
  $("#office-open-work").innerHTML = `<div><span>Geschäftsstelle · noch nicht zugeteilt</span><strong>${officePt} PT offen</strong><small>${officeOpen.length} Projektphasen mit offenem Zuteilungsbedarf. Diese PT sind keine zusätzliche Kapazität.</small></div><div class="office-open-projects">${officeOpen.length ? officeOpen.map(item => `<button type="button" data-edit-project="${esc(item.project.id)}"><strong>${esc(item.project.object)}</strong><span>${esc(phaseInfo(item.demand.phaseKey).label)} · ${item.pt == null ? "PT offen" : `${item.pt} PT`}</span></button>`).join("") : '<span>Aktuell kein unzugeteilter Bedarf der Geschäftsstelle erfasst.</span>'}</div>`;
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

  renderResourceOverview();
}
function allFinanceEntries() {
  return projects()
    .filter(project => effectivePlanningDepth(project) === "detail")
    .flatMap(project => project.finances.map(item => ({ ...item, projectId: project.id, object: project.object })));
}
function costForYears(years, statuses = null) {
  return allFinanceEntries().filter(item => years.includes(Number(item.year)) && (!statuses || statuses.includes(item.status))).reduce((sum, item) => sum + num(item.amount), 0);
}
function roughCostForDepth(depth) {
  return projects()
    .filter(project => effectivePlanningDepth(project) === depth)
    .reduce((sum, project) => {
      const rough = nullableNumberValue(project.roughFinanceK);
      return sum + (rough == null ? rawMotherCost(project) : rough * 1000);
    }, 0);
}
function renderFinance() {
  const detailedProjects = projects().filter(project => effectivePlanningDepth(project) === "detail");
  const withFinance = detailedProjects.filter(project => project.finances.length > 0).length;
  const withoutFinance = detailedProjects.length - withFinance;
  $("#finance-coverage").innerHTML = `<strong>${withFinance} von ${detailedProjects.length} Projekten im 3 Jahres Fenster mit Finanzplanung</strong><span>${withoutFinance} Detailprojekte ohne Finanzplanung · Vorausschau und Perspektive werden nur mit groben Kosten geführt.</span>`;
  $("#finance-coverage").classList.toggle("complete", withoutFinance === 0);

  const detailYears = Array.from({ length: 4 }, (_, index) => CURRENT_YEAR + index);
  const secured = costForYears(detailYears, ["approved", "bound"]);
  const bound = costForYears(detailYears, ["bound"]);
  const planning = costForYears(detailYears, ["estimate", "budgeted"]);
  const mediumRough = roughCostForDepth("medium");
  const lightRough = roughCostForDepth("light");

  $("#finance-horizons").innerHTML = [
    `<article><span>Planung · 1–3 Jahre</span><strong>${chf(secured, true)}</strong><small>freigegeben und gebunden · Zielgenauigkeit ±15 %</small><div><b>${chf(bound, true)}</b> gebunden · <b>${chf(planning, true)}</b> Planung</div></article>`,
    `<article><span>Vorausschau · 4–10 Jahre</span><strong>${mediumRough ? chf(mediumRough, true) : "–"}</strong><small>grobe Kostenordnung · Zielgenauigkeit ±25 %</small><div>Keine Detailfinanzplanung</div></article>`,
    `<article><span>Perspektive · 11–30 Jahre</span><strong>${lightRough ? chf(lightRough, true) : "–"}</strong><small>grobe Kostenordnung · Zielgenauigkeit ±50 %</small><div>Keine Detailfinanzplanung</div></article>`
  ].join("");

  const chartYears = detailYears;
  const totals = chartYears.map(year => Object.fromEntries(COST_STATUSES.map(status => [status.key, costForYears([year], [status.key])])));
  const max = Math.max(1, ...totals.map(total => Object.values(total).reduce((a, b) => a + b, 0)));
  $("#finance-chart").innerHTML = chartYears.map((year, index) => {
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
function capacityResourceOptions(selected = "") {
  const value = canonicalResourceName(selected);
  return `<option value="">Ressource wählen</option>${options(CAPACITY_RESOURCES, value)}`;
}
function demandResourceOptions(selected = "") {
  const value = canonicalResourceName(selected);
  return `<option value="">Ressource wählen</option>${options(DEMAND_RESOURCES, value)}`;
}
function setRoleSelect(selector, value, emptyLabel) {
  const normalized = canonicalResourceName(value);
  const isEmpty = ["offen", "nach bedarf", "noch nicht definiert"].includes(normalized.toLowerCase());
  $(selector).innerHTML = roleOptions(isEmpty ? "" : normalized, emptyLabel);
}
function formalGateAfterPhase(phaseKey) {
  return FORMAL_GATES.find(gate => gate.afterPhase === phaseKey);
}
function renderPhasePlanEditor() {
  $("#phase-plan-editor").innerHTML = editPhasePlan.map((row, index) => {
    const noActivity = row.status === "none";
    const formalGate = formalGateAfterPhase(row.phaseKey);
    const decisionNote = formalGate
      ? `${formalGate.label}: Vorstand nach dieser Phase`
      : "Phasenabschluss: Allgemeine Baukommission";
    return `<div class="phase-plan-row ${phaseInfo(row.phaseKey).className} ${noActivity ? "no-activity" : ""}" data-phase-plan="${index}">
      <div><i></i><strong>${phaseInfo(row.phaseKey).label}</strong><span>${noActivity ? "Für die BGR ist in dieser Phase keine Tätigkeit vorgesehen." : decisionNote}</span></div>
      <label><span>Status</span><select class="pp-status">${phaseStatusOptions(row.status)}</select></label>
      ${noActivity ? '<div class="no-activity-note"><strong>Keine Tätigkeit</strong><span>Die Phase bleibt sichtbar. Zeitraum und Ressourcen sind hier nicht erforderlich.</span></div>' : `<label><span>Start</span><select class="pp-start">${quarterOptions(row.startQuarter)}</select></label><label><span>Ende</span><select class="pp-end">${quarterOptions(row.endQuarter)}</select></label>`}
    </div>`;
  }).join("");
  renderPhaseCloseEditor();
}
function closeReviewOptions(selected = "") {
  return `<option value="" ${selected === "" ? "selected" : ""}>offen</option><option value="ok" ${selected === "ok" ? "selected" : ""}>erfüllt</option><option value="clarify" ${selected === "clarify" ? "selected" : ""}>Klärung nötig</option>`;
}
function renderPhaseCloseEditor() {
  const relevant = editPhasePlan
    .map((row, index) => ({ row, index }))
    .filter(item => item.row.status === "done" || item.row.status === "current");
  $("#phase-close-editor").innerHTML = relevant.length ? relevant.map(({ row, index }) => {
    const review = row.closeReview || emptyCloseReview();
    const state = phaseCloseState(row);
    const stateLabel = state === "ready" ? "bereit für nächste Phase" : state === "clarify" ? "Klärung nötig" : "Prüfung offen";
    return `<article class="phase-close-card ${state}" data-phase-close="${index}">
      <div class="phase-close-head"><div><strong>${esc(phaseInfo(row.phaseKey).label)}</strong><span>${row.status === "done" ? "Phasenabschluss" : "Aktuelle Phase · Prüfung vorbereiten"}</span></div><b>${esc(stateLabel)}</b></div>
      <div class="phase-close-grid">${PHASE_CLOSE_FIELDS.map(field => `<label title="${esc(field.question)}"><span>${esc(field.label)}</span><select data-close-field="${field.key}">${closeReviewOptions(review[field.key] || "")}</select><small>${esc(field.question)}</small></label>`).join("")}</div>
      <div class="form-grid two"><label><span>Prüfdatum</span><input class="close-date" type="date" value="${esc(review.date || "")}"></label><label><span>Bemerkung</span><input class="close-note" value="${esc(review.note || "")}" placeholder="nur falls nötig"></label></div>
    </article>`;
  }).join("") : '<div class="empty-note">Noch keine aktuelle oder abgeschlossene Phase für die Abschlussprüfung.</div>';
}
function renderBKSummary() {
  const summary = $("#f-bk-summary");
  if (!summary) return;
  const value = canonicalResourceName($("#f-bk")?.value || "");
  summary.textContent = value || "noch offen";
  summary.classList.toggle("open", !value);
}
function renderDemandEditor() {
  $("#demand-editor").innerHTML = editDemands.length ? editDemands.map((demand, index) => {
    const phase = editPhasePlan.find(item => item.phaseKey === demand.phaseKey);
    const noActivity = phase?.status === "none";
    const groupOpen = isOfficeUnassigned(demand.name);
    const window = noActivity ? {} : phaseMonthWindow(phase, CURRENT_MONTH);
    const statusText = noActivity ? "Phase: Keine Tätigkeit" : window.startMonth ? `${monthLabel(window.startMonth)} bis ${monthLabel(window.endMonth)}` : "Phasenzeitraum noch offen";
    const hoursPerPt = nullableNumberValue(demand.hoursPerPt) ?? 8;
    const resourceCost = demandResourceCost({ ...demand, hoursPerPt });
    return `<div class="demand-card ${noActivity ? "no-activity-demand" : ""}" data-demand="${index}">
      <div class="demand-summary cost-aware">
        <label><span>Projektphase</span><select class="d-phase">${phaseOptions(demand.phaseKey)}</select></label>
        <label><span>Person oder Firma</span><select class="d-name">${demandResourceOptions(demand.name)}</select></label>
        <label><span>Noch benötigte PT</span><input class="d-remaining" type="number" min="0.5" step=".5" value="${esc(demand.remainingPt)}" placeholder="z. B. 18"></label>
        <label><span>Stunden pro PT</span><input class="d-hours" type="number" min="0.5" step=".25" value="${esc(hoursPerPt)}" placeholder="8"></label>
        <label><span>Stundensatz CHF</span><input class="d-rate" type="number" min="0" step="5" value="${esc(demand.hourlyRate ?? "")}" placeholder="${groupOpen ? "nach Zuteilung" : "z. B. 140"}" ${groupOpen ? "disabled" : ""}></label>
        <div class="demand-cost-preview"><span>Ressourcenkosten</span><strong data-demand-cost>${groupOpen ? "nach Zuteilung" : resourceCost == null ? "Stundensatz offen" : chf(resourceCost)}</strong></div>
        <button type="button" class="remove" data-remove-demand="${index}" aria-label="Ressourcenbedarf löschen">×</button>
      </div>
      <div class="planning-state"><strong>${esc(statusText)}</strong><span>${noActivity ? "Dieser Bedarf wird nicht in die Kapazitätsprüfung und Kostenberechnung einbezogen, solange die Phase auf «Keine Tätigkeit» steht." : groupOpen ? "Offener Aufwand der Geschäftsstelle: noch keiner Person zugeteilt. Erst nach der Zuteilung entsteht ein personeller Kostenansatz." : "PT × Stunden pro PT × Stundensatz = Ressourcenkosten dieses Projekts. Die Kosten werden im Bereich Finanzen separat ausgewiesen."}</span>${demand.migrationNote ? `<small>${esc(demand.migrationNote)}</small>` : ""}</div>
      ${!noActivity && groupOpen ? `<div class="office-assign"><div><strong>Personentage zuordnen</strong><small>Die gewählten PT werden hier abgezogen und bei der Person in derselben Phase hinzugefügt – kein doppelter Bedarf.</small></div><label><span>Person</span><select class="d-assign-person">${options(OFFICE_PEOPLE, "", "Person wählen")}</select></label><label><span>PT</span><input class="d-assign-pt" type="number" min="0.5" step=".5" max="${esc(demand.remainingPt)}" placeholder="z. B. 4"></label><button type="button" class="button primary" data-allocate-office="${index}">PT zuteilen</button></div>` : ""}
    </div>`;
  }).join("") : '<div class="empty-note">Noch kein Ressourcenbedarf eingetragen.</div>';
}
function updateDemandCostPreviews() {
  $$("[data-demand]").forEach(row => {
    const name = canonicalResourceName(row.querySelector(".d-name")?.value || "");
    const pt = nullableNumberValue(row.querySelector(".d-remaining")?.value);
    const hoursPerPt = nullableNumberValue(row.querySelector(".d-hours")?.value);
    const rate = nullableNumberValue(row.querySelector(".d-rate")?.value);
    const target = row.querySelector("[data-demand-cost]");
    if (!target) return;
    if (isOfficeUnassigned(name)) target.textContent = "nach Zuteilung";
    else if (pt == null || hoursPerPt == null || rate == null) target.textContent = "Stundensatz offen";
    else target.textContent = chf(pt * hoursPerPt * rate);
  });
}
function renderResourceCostSummary() {
  const container = $("#resource-cost-summary");
  if (!container) return;
  const tempProject = { phasePlan: editPhasePlan, demands: editDemands };
  const relevant = editDemands.filter(demand => editPhasePlan.find(row => row.phaseKey === demand.phaseKey)?.status !== "none" && !isOfficeUnassigned(demand.name));
  const rows = relevant.map(demand => ({
    ...demand,
    hours: demandHours(demand),
    cost: demandResourceCost(demand)
  }));
  const total = rows.reduce((sum, row) => sum + (row.cost ?? 0), 0);
  const unpriced = rows.filter(row => row.cost == null).length;
  const groupPt = editDemands.filter(demand => editPhasePlan.find(row => row.phaseKey === demand.phaseKey)?.status !== "none" && isOfficeUnassigned(demand.name)).reduce((sum, demand) => sum + (nullableNumberValue(demand.remainingPt) ?? 0), 0);
  container.innerHTML = `<div class="resource-cost-head"><div><span>Ressourcenkosten aus der Projektplanung</span><strong>${chf(total)}</strong><small>Automatisch aus PT × Stunden/PT × Stundensatz berechnet.</small></div><div class="resource-cost-meta"><span>${rows.length} Ressourcenpositionen</span><span>${unpriced ? `${unpriced} ohne Stundensatz` : "alle Ansätze hinterlegt"}</span></div></div>
    ${rows.length ? `<div class="resource-cost-lines">${rows.map(row => `<div><span><strong>${esc(row.name)}</strong> · ${nullableNumberValue(row.remainingPt) ?? "–"} PT × ${nullableNumberValue(row.hoursPerPt) ?? "–"} h × ${nullableNumberValue(row.hourlyRate) == null ? "Ansatz offen" : chf(row.hourlyRate) + "/h"}</span><b>${row.cost == null ? "offen" : chf(row.cost)}</b></div>`).join("")}</div>` : '<div class="empty-note">Noch keine namentlich zugeteilten Ressourcen mit Kostenbezug.</div>'}
    ${groupPt ? `<p class="resource-cost-open">${groupPt} PT der Geschäftsstelle sind noch nicht namentlich zugeteilt und deshalb noch nicht bewertet.</p>` : ""}`;
}
function renderFinanceEditor() {
  renderResourceCostSummary();
  $("#finance-editor").innerHTML = editFinances.length ? editFinances.map((item, index) => {
    const thousands = nullableNumberValue(item.amount) == null ? "" : num(item.amount) / 1000;
    const fullAmount = thousands === "" ? null : num(thousands) * 1000;
    return `<div class="edit-row cost" data-finance="${index}"><label><span>Jahr</span><select class="pc-year">${YEARS.map(year => `<option ${Number(item.year) === year ? "selected" : ""}>${year}</option>`).join("")}</select></label><label class="finance-amount-field"><span>Betrag in Tsd. CHF</span><input class="pc-amount" type="number" min="1" step="1" value="${esc(thousands)}" placeholder="50"><small class="finance-amount-preview">${fullAmount == null ? "z. B. 50 = CHF 50’000" : `= ${chf(fullAmount)}`}</small></label><label><span>Qualität</span><select class="pc-status">${COST_STATUSES.map(status => `<option value="${status.key}" ${item.status === status.key ? "selected" : ""}>${status.label}</option>`).join("")}</select></label><label><span>Quelle</span><input class="pc-source" value="${esc(item.source || "")}" placeholder="z. B. BGR Schätzung, Budget, Offerte"></label><label><span>Informationsdatum</span><input class="pc-date" type="date" value="${esc(item.informationDate || "")}"></label><button type="button" class="remove" data-remove-finance="${index}">×</button></div>`;
  }).join("") : '<div class="empty-note">Noch keine Finanzen erfasst. Das ist zulässig und blockiert keine Freigabe.</div>';
}
function updateFinanceAmountPreviews() {
  $$("[data-finance]").forEach(row => {
    const value = nullableNumberValue(row.querySelector(".pc-amount")?.value);
    const target = row.querySelector(".finance-amount-preview");
    if (!target) return;
    target.textContent = value == null ? "z. B. 50 = CHF 50’000" : `= ${chf(value * 1000)}`;
  });
}
function gateDefinition(key) {
  return FORMAL_GATES.find(gate => gate.key === key) || FORMAL_GATES[0];
}
function renderFormalGatesOverview() {
  const target = $("#formal-gates-overview");
  if (!target) return;
  target.innerHTML = FORMAL_GATES.map(definition => {
    const latest = editGateHistory
      .filter(gate => gate.gateKey === definition.key && !gate.legacyGate)
      .slice()
      .sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
    const status = latest?.status || "offen";
    return `<article class="formal-gate ${esc(status.replace(/\s+/g,"-"))}"><span>${esc(definition.label)}</span><strong>${esc(definition.timing)}</strong><small>${esc(definition.decision)}</small><b>${esc(status)}</b></article>`;
  }).join("");
}
function renderGateEditor() {
  renderFormalGatesOverview();
  const formalEntries = editGateHistory.map((gate,index)=>({gate,index})).filter(item => item.gate.gateKey && !item.gate.legacyGate);
  $("#gate-editor").innerHTML = formalEntries.length ? formalEntries.map(({ gate, index }) => {
    const locked = gate.persisted ? "disabled" : "";
    const definition = gateDefinition(gate.gateKey);
    return `<div class="gate-history-row handbook-gate" data-gate="${index}">
      <label><span>Phasentor</span><select class="g-key" ${locked}>${FORMAL_GATES.map(item => `<option value="${item.key}" ${item.key === gate.gateKey ? "selected" : ""}>${item.label} · ${item.timing}</option>`).join("")}</select></label>
      <div class="gate-decision-text"><span>Entscheid Gesamtvorstand</span><strong>${esc(definition.decision)}</strong></div>
      <label><span>Entscheid</span><select class="g-status" ${locked}>${options(GATE_STATUSES, gate.status)}</select></label>
      <label><span>Datum</span><input class="g-date" type="date" value="${esc(gate.date || "")}" ${locked}></label>
      <label><span>Kurzbegründung</span><input class="g-reason" value="${esc(gate.reason || "")}" ${locked}></label>
      <label><span>Auflagen</span><input class="g-conditions" value="${esc(gate.conditions || "")}" ${locked}></label>
      ${gate.persisted ? '<span class="history-lock">protokolliert</span>' : `<button type="button" class="remove" data-remove-gate="${index}">×</button>`}
    </div>`;
  }).join("") : '<div class="empty-note">Noch kein formeller Vorstandsentscheid protokolliert.</div>';
}
function syncEditors() {
  editPhasePlan = $$("[data-phase-plan]").map((row, index) => {
    const status = row.querySelector(".pp-status").value;
    return {
      ...editPhasePlan[index],
      status,
      startQuarter: status === "none" ? "" : (row.querySelector(".pp-start")?.value || ""),
      endQuarter: status === "none" ? "" : (row.querySelector(".pp-end")?.value || ""),
      closeReview: editPhasePlan[index]?.closeReview || emptyCloseReview()
    };
  });
  $$("[data-phase-close]").forEach(card => {
    const index = Number(card.dataset.phaseClose);
    if (!Number.isFinite(index) || !editPhasePlan[index]) return;
    const review = { ...(editPhasePlan[index].closeReview || emptyCloseReview()) };
    PHASE_CLOSE_FIELDS.forEach(field => {
      review[field.key] = card.querySelector(`[data-close-field="${field.key}"]`)?.value || "";
    });
    review.date = card.querySelector(".close-date")?.value || "";
    review.note = card.querySelector(".close-note")?.value.trim() || "";
    editPhasePlan[index].closeReview = review;
  });
  editDemands = $$("[data-demand]").map((row, index) => ({
    ...editDemands[index],
    id: editDemands[index]?.id || uuid("d"),
    name: canonicalResourceName(row.querySelector(".d-name").value),
    phaseKey: canonicalPhaseKey(row.querySelector(".d-phase").value),
    remainingPt: row.querySelector(".d-remaining").value,
    hoursPerPt: row.querySelector(".d-hours")?.value || "8",
    hourlyRate: row.querySelector(".d-rate")?.value || ""
  }));
  editFinances = $$("[data-finance]").map((row, index) => {
    const thousands = row.querySelector(".pc-amount").value;
    return {
      id: editFinances[index]?.id || uuid("finance"),
      year: Number(row.querySelector(".pc-year").value),
      amount: thousands === "" ? "" : String(numberValue(thousands) * 1000),
      status: row.querySelector(".pc-status").value,
      source: row.querySelector(".pc-source").value.trim(),
      informationDate: row.querySelector(".pc-date").value
    };
  });
  $$("[data-gate]").forEach(row => {
    const index = Number(row.dataset.gate);
    if (!Number.isFinite(index) || !editGateHistory[index] || editGateHistory[index].persisted) return;
    const gateKey = row.querySelector(".g-key").value;
    const definition = gateDefinition(gateKey);
    editGateHistory[index] = {
      ...editGateHistory[index],
      id: editGateHistory[index]?.id || uuid("gate"),
      gateKey,
      phaseKey: definition.afterPhase,
      status: row.querySelector(".g-status").value,
      authority: "Gesamtvorstand",
      date: row.querySelector(".g-date").value,
      reason: row.querySelector(".g-reason").value.trim(),
      conditions: row.querySelector(".g-conditions").value.trim(),
      legacyGate: false
    };
  });
}
function currentEditorDepth() {
  return planningHorizon($("#f-horizon-start")?.value, CURRENT_YEAR);
}
function validateProjectEditors() {
  const errors = [];
  const detailed = currentEditorDepth() === "detail";
  const isBuildProject = $("#f-kind").value === "Bauprojekt";
  if (!detailed) return errors;

  for (const demand of editDemands) {
    const phase = editPhasePlan.find(item => item.phaseKey === demand.phaseKey);
    if (phase?.status === "none") continue;
    errors.push(...validateDemand(demand).map(error => `${demand.name || "Ressource"}: ${error}`));
    if (!isOfficeUnassigned(demand.name)) {
      const hoursPerPt = nullableNumberValue(demand.hoursPerPt);
      const hourlyRate = nullableNumberValue(demand.hourlyRate);
      if (hoursPerPt == null || hoursPerPt <= 0) errors.push(`${demand.name || "Ressource"}: Stunden pro PT fehlen`);
      if (hourlyRate == null) errors.push(`${demand.name || "Ressource"}: Stundensatz fehlt`);
    }
  }
  const demandKeys = editDemands
    .filter(demand => editPhasePlan.find(item => item.phaseKey === demand.phaseKey)?.status !== "none")
    .map(demand => `${resourceKey(demand.name)}:${demand.phaseKey}`)
    .filter(key => !key.startsWith(":"));
  if (new Set(demandKeys).size !== demandKeys.length) errors.push("Dieselbe Ressource darf je Projektphase nur einmal erfasst werden");

  for (const finance of editFinances) {
    errors.push(...validateFinanceEntry(finance).map(error => `Finanzen ${finance.year || ""}: ${error}`));
  }

  if (isBuildProject) {
    for (const gate of editGateHistory.filter(item => !item.persisted && item.gateKey && !item.legacyGate)) {
      if (!gate.date) errors.push("Phasentor: Datum ist Pflicht");
      if (gate.status !== "geplant" && !gate.reason) errors.push("Phasentor: Kurzbegründung ist bei einem erfolgten Entscheid Pflicht");
    }
    validatePhaseTransitions({ phasePlan: editPhasePlan, gateHistory: editGateHistory, currentPhaseKey: $("#f-phase").value }).forEach(issue => {
      const definition = gateDefinition(issue.gateKey);
      errors.push(`${definition.label}: ${issue.type === "wrongAuthority" ? "Entscheid des Gesamtvorstands erforderlich" : "Vorstandsfreigabe fehlt"}`);
    });
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
    motherQuarter: START_QUARTER,
    roles: { gs: "offen", bk: "offen", vs: "nach Bedarf", bhb: "offen" },
    cashflow: [],
    cost: "",
    horizonStartYear: CURRENT_YEAR,
    horizonDurationYears: 1,
    roughFinanceK: "",
    projectOrderStatus: "offen",
    nextDecision: ""
  });
  if (!project) return;
  $("#project-id").value = project.id;
  $("#project-dialog-title").textContent = newProject ? "Neues Projekt" : project.object;
  $("#mother-state").textContent = phaseInfo(project.motherPhaseKey).label;
  $("#f-object").value = project.object;
  $("#f-measure").value = project.measure;
  $("#f-kind").value = project.kind;
  $("#f-horizon-start").value = project.horizonStartYear || project.startYear || CURRENT_YEAR;
  $("#f-horizon-duration").value = project.horizonDurationYears || 1;
  $("#f-rough-finance").value = project.roughFinanceK ?? "";
  $("#f-project-order").value = project.projectOrderStatus || (project.kind === "Bauprojekt" ? "offen" : "nicht erforderlich");
  $("#f-phase").value = project.currentPhaseKey;
  $("#f-next").value = project.nextDecision || "";
  setRoleSelect("#f-gs", project.roles.gs, "offen");
  setRoleSelect("#f-bk", project.roles.bk, "offen");
  setRoleSelect("#f-vs", project.roles.vs, "nach Bedarf");
  setRoleSelect("#f-bhb", project.roles.bhb, "offen");
  editPhasePlan = clone(project.phasePlan);
  editDemands = clone(project.demands);
  editFinances = clone(project.finances || []);
  editGateHistory = clone(project.gateHistory || []).map(gate => ({ ...gate, persisted: true }));
  renderProjectTypeGuidance();
  renderPlanningDepthGuidance();
  renderBKSummary();
  $("#mother-cost-note").innerHTML = rawMotherCost(project)
    ? `<strong>Referenz ImmoTool / Excel: ${chf(rawMotherCost(project))}</strong><span>Dieser Referenzwert wird nie automatisch mit der Finanzplanung im BauRadar summiert.</span>`
    : "<strong>Kein Referenzwert</strong><span>Im 1–3-Jahres-Fenster werden Finanzen detailliert geführt.</span>";
  renderPhasePlanEditor();
  renderDemandEditor();
  renderFinanceEditor();
  renderGateEditor();
  $("#delete-project").classList.toggle("hidden", newProject);
  setFormTab("base");
  $("#project-dialog").showModal();
}
function setFormTab(name) {
  const button = $$("[data-form-tab]").find(item => item.dataset.formTab === name);
  if (button?.classList.contains("hidden")) name = "base";
  $$("[data-form-tab]").forEach(item => item.classList.toggle("active", item.dataset.formTab === name));
  $$("[data-panel]").forEach(panel => panel.classList.toggle("hidden", panel.dataset.panel !== name));
}
function renderProjectTypeGuidance() {
  const selected = $("#f-kind").value;
  const isBuildProject = selected === "Bauprojekt";
  $$('[data-project-type]').forEach(card => card.classList.toggle("active", card.dataset.projectType === selected));
  $("#project-order-field").classList.toggle("hidden", !isBuildProject);
  $("#f-owner-structure").textContent = isBuildProject ? "Projekt-Baukommission" : "Geschäftsstelle";
  $("#f-owner-structure-note").textContent = isBuildProject
    ? "Die Bauherrenverantwortung liegt gemäss Bauhandbuch bei der Projekt-Baukommission."
    : "Bei Unterhaltsprojekten liegt die operative Verantwortung bei der Geschäftsstelle.";
  renderPlanningDepthGuidance();
}
function renderPlanningDepthGuidance() {
  const key = currentEditorDepth();
  const info = PLANNING_DEPTHS[key] || PLANNING_DEPTHS.detail;
  const isBuildProject = $("#f-kind")?.value === "Bauprojekt";
  $("#planning-depth-title").textContent = info.label;
  $("#planning-depth-description").textContent = info.description;
  $("#f-detail-level").textContent = key === "detail" ? "vollständig · " + info.accuracy : key === "medium" ? "Vorausschau · " + info.accuracy : "Perspektive · " + info.accuracy;
  $("#rough-finance-accuracy").textContent = `Handbuch: erwartete Kostengenauigkeit ${info.accuracy}.`;
  $("#rough-finance-field").classList.toggle("hidden", key === "detail");
  $("#detail-current-phase").classList.toggle("hidden", key !== "detail" || !isBuildProject);
  $("#project-dialog").classList.toggle("planning-medium", key === "medium");
  $("#project-dialog").classList.toggle("planning-light", key === "light");

  $$("[data-detail-tab]").forEach(button => {
    const tab = button.dataset.formTab;
    const allowed = key === "detail" && (isBuildProject || ["resources", "money"].includes(tab));
    button.classList.toggle("hidden", !allowed);
  });
  const active = $("[data-form-tab].active");
  if (active?.classList.contains("hidden")) setFormTab("base");
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
function updatePhaseFilterColor() {
  const value = $("#phase-filter").value;
  const phase = PHASES.find(item => item.key === value);
  $("#phase-filter-dot").className = `phase-filter-dot ${phase?.className || "all"}`;
}
[$("#search"), $("#kind-filter"), $("#only-pressure")].forEach(element => element.addEventListener("input", renderTimeline));
$("#phase-filter").addEventListener("input", () => { updatePhaseFilterColor(); renderTimeline(); });
updatePhaseFilterColor();

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
$("#delete-scenario").addEventListener("click", () => {
  if (state.mode !== "scenario") return;
  const scenario = activeWorkspace();
  if (!confirm(`Szenario «${scenario.name}» löschen? Der scharfe Stand bleibt unverändert.`)) return;
  snapshot("Szenario gelöscht");
  state.scenarios = state.scenarios.filter(item => item.id !== scenario.id);
  state.mode = "sharp";
  state.activeScenarioId = null;
  selectedId = state.projects[0]?.id;
  save("Szenario gelöscht");
  toast("Szenario gelöscht");
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
$("#long-horizon").addEventListener("click", event => {
  const row = event.target.closest("[data-select]");
  if (!row) return;
  selectedId = row.dataset.select;
  renderTimeline();
  renderDetail();
  $("#portfolio").scrollIntoView({ behavior: "smooth", block: "start" });
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
  } else if (focus?.dataset.focusOffice) {
    $("#office-open-work").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
$("#edit-selected").addEventListener("click", () => openProject(selectedId));
$("#new-project").addEventListener("click", () => openProject(null, true));
$("#f-kind").addEventListener("change", renderProjectTypeGuidance);
[$("#f-horizon-start"), $("#f-horizon-duration")].forEach(input => input.addEventListener("input", renderPlanningDepthGuidance));
$("#f-phase").addEventListener("change", () => {
  syncEditors();
  const selected = $("#f-phase").value;
  editPhasePlan = editPhasePlan.map(row => ({
    ...row,
    status: row.phaseKey === selected ? "current" : (row.status === "current" ? "planned" : row.status)
  }));
  renderPhasePlanEditor();
});
$("#f-bk").addEventListener("change", renderBKSummary);
$("#phase-plan-editor").addEventListener("change", event => {
  if (!event.target.closest(".pp-status")) return;
  syncEditors();
  const row = event.target.closest("[data-phase-plan]");
  const index = Number(row?.dataset.phasePlan);
  if (!Number.isFinite(index)) return;
  if (editPhasePlan[index].status === "none" && editPhasePlan[index].phaseKey === $("#f-phase").value) {
    editPhasePlan[index].status = "current";
    toast("Die aktuelle Projektphase kann nicht «Keine Tätigkeit» sein.");
  }
  renderPhasePlanEditor();
});
$("#phase-close-editor").addEventListener("change", () => {
  syncEditors();
  renderPhaseCloseEditor();
});
$("#expand-long").addEventListener("click", () => { longOpen = !longOpen; renderLongHorizon(); });
$$("[data-form-tab]").forEach(button => button.addEventListener("click", () => {
  syncEditors();
  if (button.dataset.formTab === "resources") renderDemandEditor();
  setFormTab(button.dataset.formTab);
}));

$("#add-demand").addEventListener("click", () => {
  syncEditors();
  editDemands.push({ id: uuid("d"), name: "", phaseKey: $("#f-phase").value, remainingPt: "", hoursPerPt: "8", hourlyRate: "" });
  renderDemandEditor();
});
$("#demand-editor").addEventListener("click", event => {
  const allocate = event.target.closest("[data-allocate-office]");
  if (allocate) {
    const row = allocate.closest("[data-demand]");
    const groupId = editDemands[Number(allocate.dataset.allocateOffice)]?.id;
    const person = row.querySelector(".d-assign-person")?.value;
    const pt = row.querySelector(".d-assign-pt")?.value;
    syncEditors();
    try {
      editDemands = allocateOfficeDemand(editDemands, { groupId, person, pt, newId: uuid("d") });
      renderDemandEditor();
      toast(`${pt} PT von der Geschäftsstelle an ${person} zugeteilt`);
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const removeDemand = event.target.closest("[data-remove-demand]");
  if (removeDemand) {
    syncEditors();
    editDemands.splice(Number(removeDemand.dataset.removeDemand), 1);
    renderDemandEditor();
  }
});
$("#demand-editor").addEventListener("input", event => {
  if (event.target.matches(".d-remaining, .d-hours, .d-rate")) updateDemandCostPreviews();
});
$("#demand-editor").addEventListener("change", () => {
  syncEditors();
  renderDemandEditor();
});
$("#add-finance").addEventListener("click", () => {
  syncEditors();
  editFinances.push({ id: uuid("finance"), year: CURRENT_YEAR, amount: "", status: "estimate", source: "", informationDate: "" });
  renderFinanceEditor();
});
$("#finance-editor").addEventListener("input", event => {
  if (event.target.matches(".pc-amount")) updateFinanceAmountPreviews();
});
$("#finance-editor").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-finance]");
  if (button) {
    syncEditors();
    editFinances.splice(Number(button.dataset.removeFinance), 1);
    renderFinanceEditor();
  }
});
$("#add-gate").addEventListener("click", () => {
  syncEditors();
  const currentIndex = phaseIndex($("#f-phase").value);
  const gateKey = currentIndex <= phaseIndex("machbarkeit") ? "tor1" : currentIndex <= phaseIndex("planung") ? "tor2" : "tor3";
  const definition = gateDefinition(gateKey);
  editGateHistory.push({ id: uuid("gate"), gateKey, phaseKey: definition.afterPhase, status: "geplant", authority: "Gesamtvorstand", date: "", reason: "", conditions: "", legacyGate: false });
  renderGateEditor();
});
$("#gate-editor").addEventListener("change", event => {
  if (!event.target.matches(".g-key")) return;
  syncEditors();
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
  const currentPhaseKey = canonicalPhaseKey($("#f-phase").value || "anlass");
  const planningDepth = currentEditorDepth();
  const isBuildProject = $("#f-kind").value === "Bauprojekt";
  const phaseErrors = planningDepth === "detail" && isBuildProject
    ? phasePlanIssues({ phasePlan: editPhasePlan, currentPhaseKey })
    : [];
  const editorErrors = validateProjectEditors();
  if (phaseErrors.length || editorErrors.length) {
    const message = phaseErrors[0] || editorErrors[0];
    toast(message);
    const targetTab = phaseErrors.length
      ? "phases"
      : message.startsWith("Finanzen")
        ? "money"
        : (message.startsWith("Tor ") || message.startsWith("Phasentor"))
          ? "gates"
          : message.includes("Ressource")
            ? "resources"
            : "base";
    setFormTab(targetTab);
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
    horizonStartYear: Number($("#f-horizon-start").value) || CURRENT_YEAR,
    horizonDurationYears: Number($("#f-horizon-duration").value) || 1,
    planningDepth,
    roughFinanceK: $("#f-rough-finance").value,
    projectOrderStatus: isBuildProject ? $("#f-project-order").value : "nicht erforderlich",
    currentPhaseKey,
    currentAssignee: "",
    nextDecision: $("#f-next").value.trim(),
    roles: {
      gs: $("#f-gs").value || "offen",
      bk: $("#f-bk").value || "offen",
      vs: $("#f-vs").value || "nach Bedarf",
      bhb: $("#f-bhb").value || "offen"
    },
    phasePlan: editPhasePlan,
    demands: editDemands,
    finances: editFinances,
    gateHistory: [...oldGates, ...newGates],
    category: $("#f-kind").value
  });
  snapshot(existing ? "Projektplanung geändert" : "Projekt erstellt");
  if (existing) activeWorkspace().projects[projects().findIndex(item => item.id === id)] = project;
  else activeWorkspace().projects.push(project);
  selectedId = id;
  save(existing ? "Projektplanung geändert" : "Projekt erstellt");
  $("#project-dialog").close();
  const warningShown = effectivePlanningDepth(project) === "detail" ? focusProjectResourceWarning(project) : false;
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
$("#resource-overview-controls").addEventListener("click", event => {
  const button = event.target.closest("[data-resource-overview]");
  if (!button) return;
  resourceOverviewMode = button.dataset.resourceOverview;
  renderResourceOverview();
});
$("#resource-action-only").addEventListener("change", renderResourceOverview);
[$("#resource-chart"), $("#resource-matrix"), $("#office-open-work")].forEach(element => element.addEventListener("click", event => {
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
  storeLocal(HISTORY_KEY, JSON.stringify(history));
  storeLocal(STORE_KEY, JSON.stringify(state));
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
  ["Arbeitsstand", "Projekt ID", "Objekt", "Projektkategorie", "Mutterstand", "Aktueller Stand", "Vertretung Allgemeine Baukommission", "Projektphase", "Status", "Start", "Ende"],
  ...projects().flatMap(project => project.phasePlan.map(row => [state.mode === "scenario" ? activeWorkspace().name : "Scharfer Stand", project.id, project.object, project.kind, phaseInfo(project.motherPhaseKey).label, phaseInfo(project.currentPhaseKey).label, project.roles?.bk || "", phaseInfo(row.phaseKey).label, PHASE_STATUS[row.status] || row.status, row.startQuarter, row.endQuarter]))
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
$("#export-money").addEventListener("click", () => csv("BGR_BauRadar_Finanzen_nach_Jahr.csv", [
  ["Arbeitsstand", "Projekt ID", "Objekt", "Jahr", "Betrag CHF", "Qualität", "Quelle", "Informationsdatum"],
  ...projects().flatMap(project => project.finances.map(item => [state.mode === "scenario" ? activeWorkspace().name : "Scharfer Stand", project.id, project.object, item.year, item.amount, COST_STATUSES.find(status => status.key === item.status)?.label || item.status, item.source || "", item.informationDate || ""]))
]));
$("#export-changes").addEventListener("click", () => csv("BGR_BauRadar_Arbeitsprotokoll.csv", [
  ["Zeitpunkt", "Arbeitsstand", "Aktion", "Detail"],
  ...activeWorkspace().auditLog.map(item => [item.at, state.mode === "scenario" ? activeWorkspace().name : "Scharfer Stand", item.action, item.detail])
]));

$$('.dialog [value="cancel"]').forEach(button => button.addEventListener("click", () => button.closest("dialog")?.close()));
window.addEventListener("storage", event => {
  if (event.key !== STORE_KEY || !event.newValue) return;
  alert("Der BauRadar wurde in einem anderen Tab geändert. Dieser Tab wird neu geladen, damit keine Daten überschrieben werden.");
  location.reload();
});

renderAll();

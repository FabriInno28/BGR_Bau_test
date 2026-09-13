export const SCHEMA_VERSION = 4;

export const CAPACITY_RESOURCES = [
  "Iris",
  "Alex",
  "Fabri",
  "TRESTO",
  "Büro 8",
  "externer Partner"
];

export const ROLE_OPTIONS = [...CAPACITY_RESOURCES, "BK", "BHB"];

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function numberValue(value) {
  const parsed = Number(String(value ?? "").replace(/[’'\s]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resourceKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function canonicalResourceName(value) {
  const raw = String(value || "").trim();
  const aliases = {
    iris: "Iris",
    irisammann: "Iris",
    alex: "Alex",
    fabri: "Fabri",
    tresto: "TRESTO",
    buro8: "Büro 8",
    externerpartner: "externer Partner",
    andereexternepartner: "externer Partner",
    bk: "BK",
    baukommission: "BK",
    bhb: "BHB",
    bauherrenbegleitung: "BHB"
  };
  return aliases[resourceKey(raw)] || raw;
}

export function monthIndex(month) {
  const match = String(month || "").match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : Number.NaN;
}

export function monthToQuarter(month) {
  const index = monthIndex(month);
  if (!Number.isFinite(index)) return "";
  const year = Math.floor(index / 12);
  const monthNumber = index % 12 + 1;
  return `${year}-Q${Math.ceil(monthNumber / 3)}`;
}

export function quarterIndex(quarter) {
  const match = String(quarter || "").match(/^(\d{4})-Q([1-4])$/);
  return match ? Number(match[1]) * 4 + Number(match[2]) - 1 : Number.NaN;
}

export function monthInsidePhase(month, phase) {
  if (!month || !phase?.startQuarter || !phase?.endQuarter) return false;
  const quarter = quarterIndex(monthToQuarter(month));
  return quarter >= quarterIndex(phase.startQuarter) && quarter <= quarterIndex(phase.endQuarter);
}

export function allocationTotals(demand) {
  return (demand.allocations || []).reduce(
    (sum, allocation) => ({
      min: sum.min + numberValue(allocation.min),
      max: sum.max + numberValue(allocation.max)
    }),
    { min: 0, max: 0 }
  );
}

export function demandPlanningState(demand) {
  const totalMin = demand.totalMin === "" || demand.totalMin == null ? null : numberValue(demand.totalMin);
  const totalMax = demand.totalMax === "" || demand.totalMax == null ? null : numberValue(demand.totalMax);
  if (totalMin == null || totalMax == null) return { key: "unestimated", label: "Gesamtbedarf noch nicht geschätzt", restMin: null, restMax: null };
  const allocated = allocationTotals(demand);
  const restMin = totalMin - allocated.min;
  const restMax = totalMax - allocated.max;
  if (restMin < 0 || restMax < 0) return { key: "overplanned", label: "Überplant – Eingaben prüfen", restMin, restMax };
  if (!allocated.max && (totalMin || totalMax)) return { key: "unplanned", label: "Zeitlich noch nicht geplant", restMin, restMax };
  if (restMin || restMax) return { key: "partial", label: "Teilweise geplant", restMin, restMax };
  return { key: "planned", label: "Vollständig geplant", restMin: 0, restMax: 0 };
}

export function resourceState(demand, capacity) {
  if (!numberValue(demand.max)) return "ok";
  if (!numberValue(capacity.max)) return "open";
  if (numberValue(demand.max) <= numberValue(capacity.min)) return "ok";
  if (numberValue(demand.min) > numberValue(capacity.max)) return "gap";
  return "watch";
}

export function resourceGap(demand, capacity, state = resourceState(demand, capacity)) {
  if (state === "gap") {
    return {
      min: Math.max(0, numberValue(demand.min) - numberValue(capacity.max)),
      max: Math.max(0, numberValue(demand.max) - numberValue(capacity.min))
    };
  }
  if (state === "watch") return { min: 0, max: Math.max(0, numberValue(demand.max) - numberValue(capacity.min)) };
  return { min: 0, max: 0 };
}

export function csvSafe(value) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function uuid(prefix = "id") {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

function migrateLegacyDemand(demand) {
  if (Array.isArray(demand.allocations)) {
    return {
      ...demand,
      id: demand.id || uuid("d"),
      name: canonicalResourceName(demand.name),
      totalMin: demand.totalMin ?? "",
      totalMax: demand.totalMax ?? "",
      allocations: demand.allocations.map(item => ({ ...item, id: item.id || uuid("a") }))
    };
  }
  return {
    id: demand.id || uuid("d"),
    name: canonicalResourceName(demand.name),
    function: demand.function || "",
    phaseKey: demand.phaseKey || "anlass",
    totalMin: demand.min ?? "",
    totalMax: demand.max ?? "",
    allocations: [],
    migrationNote: demand.quarter
      ? `Früher ${demand.quarter} zugeordnet; bewusst als zeitlich noch nicht geplant übernommen.`
      : ""
  };
}

export function migrateState(saved, baselineProjects = []) {
  const source = saved && typeof saved === "object" ? clone(saved) : {};
  const projects = Array.isArray(source.projects) ? source.projects : clone(baselineProjects);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: source.mode === "scenario" ? "scenario" : "sharp",
    activeScenarioId: source.activeScenarioId || null,
    scenarios: Array.isArray(source.scenarios) ? source.scenarios : [],
    projects: projects.map(project => ({
      ...project,
      demands: Array.isArray(project.demands) ? project.demands.map(migrateLegacyDemand) : [],
      phaseCosts: Array.isArray(project.phaseCosts) ? project.phaseCosts : [],
      gateHistory: Array.isArray(project.gateHistory) ? project.gateHistory : []
    })),
    capacities: (Array.isArray(source.capacities) ? source.capacities : []).map(capacity => ({
      ...capacity,
      id: capacity.id || uuid("cap"),
      name: canonicalResourceName(capacity.name),
      month: capacity.month || "",
      legacyQuarter: capacity.month ? "" : (capacity.quarter || "")
    })),
    deletedIds: Array.isArray(source.deletedIds) ? source.deletedIds : [],
    auditLog: Array.isArray(source.auditLog) ? source.auditLog : []
  };
}

export function validateDemand(demand, phase) {
  const errors = [];
  if (!demand.name) errors.push("Ressource fehlt");
  if (!CAPACITY_RESOURCES.includes(canonicalResourceName(demand.name))) errors.push("BK und BHB sind Rollen, keine Kapazitätsressourcen");
  if (!demand.function?.trim()) errors.push("Funktion fehlt");
  const state = demandPlanningState(demand);
  if (state.key === "overplanned") errors.push("Monatsplanung ist grösser als der Gesamtbedarf");
  for (const allocation of demand.allocations || []) {
    if (!allocation.month) errors.push("Monat fehlt");
    else if (!monthInsidePhase(allocation.month, phase)) errors.push(`${allocation.month} liegt ausserhalb der Projektphase`);
    if (numberValue(allocation.max) < numberValue(allocation.min)) errors.push(`${allocation.month}: PT Maximum ist kleiner als PT Minimum`);
  }
  return errors;
}

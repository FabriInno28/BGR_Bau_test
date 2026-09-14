export const SCHEMA_VERSION = 6;

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

export function nullableNumberValue(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(String(value).replace(/[’'\s]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function resourceKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function migratePhaseResponsibilities(project = {}) {
  const currentPhaseKey = project.currentPhaseKey || project.phaseKey || "";
  const formerCurrentAssignee = canonicalResourceName(
    project.currentAssignee || project.currentOwner || project.bgrResponsibility || ""
  );
  const phasePlan = Array.isArray(project.phasePlan) ? project.phasePlan : [];

  return phasePlan.map(row => {
    const migratedAssignee = canonicalResourceName(
      row.assignee || (row.phaseKey === currentPhaseKey ? formerCurrentAssignee : "")
    );
    return {
      ...row,
      assignee: ROLE_OPTIONS.includes(migratedAssignee) ? migratedAssignee : ""
    };
  });
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

export function monthFromIndex(index) {
  return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`;
}

export function monthsBetween(startMonth, endMonth) {
  const start = monthIndex(startMonth);
  const end = monthIndex(endMonth);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, offset) => monthFromIndex(start + offset));
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

export function phaseMonthWindow(phase, currentMonth = "") {
  if (!phase?.startQuarter || !phase?.endQuarter) return { startMonth: "", endMonth: "" };
  const startMatch = String(phase.startQuarter).match(/^(\d{4})-Q([1-4])$/);
  const endMatch = String(phase.endQuarter).match(/^(\d{4})-Q([1-4])$/);
  if (!startMatch || !endMatch) return { startMonth: "", endMonth: "" };
  const startMonthNumber = (Number(startMatch[2]) - 1) * 3 + 1;
  const endMonthNumber = Number(endMatch[2]) * 3;
  let startMonth = `${startMatch[1]}-${String(startMonthNumber).padStart(2, "0")}`;
  const endMonth = `${endMatch[1]}-${String(endMonthNumber).padStart(2, "0")}`;
  if (currentMonth && monthIndex(endMonth) < monthIndex(currentMonth)) return { startMonth, endMonth, past: true };
  if (currentMonth && monthIndex(startMonth) < monthIndex(currentMonth) && monthIndex(endMonth) >= monthIndex(currentMonth)) startMonth = currentMonth;
  return monthIndex(endMonth) < monthIndex(startMonth) ? { startMonth: "", endMonth: "" } : { startMonth, endMonth };
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
  const hasCurrentValue = Object.prototype.hasOwnProperty.call(demand, "remainingPt") || Object.prototype.hasOwnProperty.call(demand, "pt");
  if (hasCurrentValue) {
    return {
      ...demand,
      id: demand.id || uuid("d"),
      name: canonicalResourceName(demand.name),
      phaseKey: demand.phaseKey || "anlass",
      remainingPt: demand.remainingPt ?? demand.pt ?? ""
    };
  }
  const legacyMin = demand.totalMin ?? demand.min ?? "";
  const legacyMax = demand.totalMax ?? demand.max ?? "";
  const legacyAllocations = Array.isArray(demand.allocations) ? demand.allocations : [];
  const hasLegacyValue = legacyMin !== "" || legacyMax !== "" || legacyAllocations.length > 0;
  return {
    id: demand.id || uuid("d"),
    name: canonicalResourceName(demand.name),
    phaseKey: demand.phaseKey || "anlass",
    remainingPt: "",
    legacyDemand: hasLegacyValue ? { minimum: legacyMin, maximum: legacyMax, allocations: clone(legacyAllocations) } : null,
    migrationNote: hasLegacyValue
      ? `Frühere Bandbreite ${legacyMin || "offen"} bis ${legacyMax || "offen"} PT gesichert. Restbedarf bewusst neu beurteilen.`
      : ""
  };
}

function migrateCapacity(capacity) {
  const hasCurrentValue = Object.prototype.hasOwnProperty.call(capacity, "pt");
  const legacyMin = capacity.min ?? "";
  const legacyMax = capacity.max ?? "";
  return {
    id: capacity.id || uuid("cap"),
    name: canonicalResourceName(capacity.name),
    month: capacity.month || "",
    pt: hasCurrentValue ? nullableNumberValue(capacity.pt) : null,
    confirmed: hasCurrentValue ? Boolean(capacity.confirmed) : false,
    confirmedAt: capacity.confirmedAt || "",
    legacyQuarter: capacity.month ? "" : (capacity.quarter || capacity.legacyQuarter || ""),
    legacyCapacity: !hasCurrentValue && (legacyMin !== "" || legacyMax !== "") ? { minimum: legacyMin, maximum: legacyMax } : null,
    requiresReview: !hasCurrentValue && (legacyMin !== "" || legacyMax !== "" || Boolean(capacity.quarter || capacity.legacyQuarter))
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
    projects: projects.map(project => {
      const phasePlan = migratePhaseResponsibilities(project);
      const currentPhaseKey = project.currentPhaseKey || project.phaseKey || "";
      const currentAssignee = phasePlan.find(row => row.phaseKey === currentPhaseKey)?.assignee || "";
      return {
        ...project,
        currentAssignee,
        phasePlan,
        demands: Array.isArray(project.demands) ? project.demands.map(migrateLegacyDemand) : [],
        phaseCosts: Array.isArray(project.phaseCosts) ? project.phaseCosts : [],
        gateHistory: Array.isArray(project.gateHistory) ? project.gateHistory : []
      };
    }),
    capacities: (Array.isArray(source.capacities) ? source.capacities : []).map(migrateCapacity),
    deletedIds: Array.isArray(source.deletedIds) ? source.deletedIds : [],
    auditLog: Array.isArray(source.auditLog) ? source.auditLog : []
  };
}

export function validateDemand(demand) {
  const errors = [];
  const name = canonicalResourceName(demand.name);
  if (!name) errors.push("Ressource fehlt");
  if (name && !CAPACITY_RESOURCES.includes(name)) errors.push("BK und BHB sind Rollen, keine Kapazitätsressourcen");
  const pt = nullableNumberValue(demand.remainingPt);
  if (pt == null) errors.push("Noch benötigte PT fehlen");
  else if (pt <= 0) errors.push("Noch benötigte PT müssen grösser als 0 sein");
  return errors;
}

function betterBottleneck(candidate, current) {
  if (!current) return true;
  if (candidate.utilization !== current.utilization) return candidate.utilization > current.utilization;
  return candidate.shortfall > current.shortfall;
}

function betterConfirmation(candidate, current) {
  if (!current) return true;
  if (candidate.unconfirmedNeeded !== current.unconfirmedNeeded) return candidate.unconfirmedNeeded > current.unconfirmedNeeded;
  if (candidate.demand !== current.demand) return candidate.demand > current.demand;
  return candidate.unknownMonths.length < current.unknownMonths.length;
}

export function assessResourceCapacity({ demands = [], capacities = [], threshold = 0.8 } = {}) {
  const normalizedDemands = demands.map(demand => ({
    ...demand,
    pt: nullableNumberValue(demand.pt ?? demand.remainingPt),
    startMonth: demand.startMonth || "",
    endMonth: demand.endMonth || ""
  })).filter(demand => demand.pt != null && demand.pt > 0);
  const dated = normalizedDemands.filter(demand => {
    const start = monthIndex(demand.startMonth);
    const end = monthIndex(demand.endMonth);
    return Number.isFinite(start) && Number.isFinite(end) && end >= start;
  });
  const datedIds = new Set(dated.map(demand => demand.id));
  const undated = normalizedDemands.filter(demand => !datedIds.has(demand.id));
  if (!normalizedDemands.length) {
    return { status: "ok", bottleneck: null, confirmation: null, undatedPt: 0, unknownMonths: [], demandCount: 0 };
  }

  const capacityMap = new Map(capacities.map(item => [item.month, nullableNumberValue(item.pt)]));
  const relevantMonths = new Set(dated.flatMap(demand => monthsBetween(demand.startMonth, demand.endMonth)));
  const unknownMonths = [...relevantMonths].filter(month => !capacityMap.has(month) || capacityMap.get(month) == null).sort();
  let bottleneck = null;
  let confirmation = null;

  if (dated.length) {
    const first = Math.min(...dated.map(demand => monthIndex(demand.startMonth)));
    const last = Math.max(...dated.map(demand => monthIndex(demand.endMonth)));
    for (let start = first; start <= last; start += 1) {
      for (let end = start; end <= last; end += 1) {
        const contained = dated.filter(demand => monthIndex(demand.startMonth) >= start && monthIndex(demand.endMonth) <= end);
        if (!contained.length) continue;
        const months = monthsBetween(monthFromIndex(start), monthFromIndex(end));
        const periodUnknownMonths = months.filter(month => !capacityMap.has(month) || capacityMap.get(month) == null);
        const capacity = months.reduce((sum, month) => sum + (capacityMap.get(month) ?? 0), 0);
        const demand = contained.reduce((sum, item) => sum + item.pt, 0);
        if (periodUnknownMonths.length) {
          const candidate = {
            startMonth: monthFromIndex(start),
            endMonth: monthFromIndex(end),
            demand,
            capacity,
            unconfirmedNeeded: Math.max(0, demand - capacity),
            unknownMonths: periodUnknownMonths,
            involvedIds: contained.map(item => item.id)
          };
          if (betterConfirmation(candidate, confirmation)) confirmation = candidate;
          continue;
        }
        const utilization = capacity > 0 ? demand / capacity : Number.POSITIVE_INFINITY;
        const candidate = {
          startMonth: monthFromIndex(start),
          endMonth: monthFromIndex(end),
          demand,
          capacity,
          utilization,
          shortfall: Math.max(0, demand - capacity),
          involvedIds: contained.map(item => item.id)
        };
        if (betterBottleneck(candidate, bottleneck)) bottleneck = candidate;
      }
    }
  }

  const undatedPt = undated.reduce((sum, demand) => sum + demand.pt, 0);
  let status = "ok";
  if (bottleneck?.utilization > 1) status = "gap";
  else if (undated.length || unknownMonths.length) status = "open";
  else if (bottleneck?.utilization > threshold) status = "watch";
  return {
    status,
    bottleneck,
    confirmation,
    undatedPt,
    undatedIds: undated.map(item => item.id),
    unknownMonths,
    demandCount: normalizedDemands.length
  };
}

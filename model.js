export const SCHEMA_VERSION = 7;

// Personen erhalten bestätigte Projektkapazitäten; die Gruppe ist nur offener Bedarf.
export const OFFICE_PEOPLE = ["Roli", "Mark", "Stefan"];
export const OFFICE_UNASSIGNED = "Geschäftsstelle (noch nicht zugeteilt)";

export const CAPACITY_RESOURCES = [
  "Iris",
  "Alex",
  "Fabri",
  ...OFFICE_PEOPLE,
  "TRESTO",
  "Büro 8",
  "externer Partner"
];

export const DEMAND_RESOURCES = [...CAPACITY_RESOURCES, OFFICE_UNASSIGNED];
// Verantwortung ist von der verfügbaren Kapazität getrennt.
export const ROLE_OPTIONS = [...CAPACITY_RESOURCES, "Geschäftsstelle", "BK", "BHB"];

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
    roli: "Roli",
    rolandpeter: "Roli",
    mark: "Mark",
    markfischer: "Mark",
    stefan: "Stefan",
    stefanlotscher: "Stefan",
    geschaftsstellenochnichtzugeteilt: OFFICE_UNASSIGNED,
    tresto: "TRESTO",
    buro8: "Büro 8",
    externerpartner: "externer Partner",
    andereexternepartner: "externer Partner",
    geschaftsstelle: "Geschäftsstelle",
    bk: "BK",
    baukommission: "BK",
    bhb: "BHB",
    bauherrenbegleitung: "BHB"
  };
  return aliases[resourceKey(raw)] || raw;
}

export function isOfficeUnassigned(value) {
  return canonicalResourceName(value) === OFFICE_UNASSIGNED;
}

export function canonicalDemandName(value) {
  const name = canonicalResourceName(value);
  // Eine ältere Bedarfszeile "Geschäftsstelle" meint die Gruppe, nicht eine Person.
  return name === "Geschäftsstelle" ? OFFICE_UNASSIGNED : name;
}

/** Bereits eingeplante PT der Geschäftsstelle innerhalb derselben Phase zuteilen.
 * Die Gruppensumme sinkt um exakt den zugewiesenen Wert. Keine Verdoppelung.
 */
export function allocateOfficeDemand(demands, { groupId, person, pt, newId }) {
  const target = canonicalResourceName(person);
  const allocation = nullableNumberValue(pt);
  if (!OFFICE_PEOPLE.includes(target)) throw new Error("Bitte Roli, Mark oder Stefan wählen");
  if (allocation == null || allocation <= 0) throw new Error("Bitte positive Personentage zuweisen");
  const rows = clone(demands);
  const index = rows.findIndex(row => row.id === groupId && isOfficeUnassigned(row.name));
  if (index < 0) throw new Error("Offener Bedarf der Geschäftsstelle nicht gefunden");
  const group = rows[index];
  const remaining = nullableNumberValue(group.remainingPt);
  if (remaining == null || allocation > remaining) throw new Error("Zuteilung übersteigt den offenen Bedarf");
  const assigned = rows.find(row => row.phaseKey === group.phaseKey && canonicalResourceName(row.name) === target);
  if (assigned) {
    const previous = nullableNumberValue(assigned.remainingPt);
    if (previous == null) throw new Error("Bereits erfasste Personentage zuerst klären");
    assigned.remainingPt = String(previous + allocation);
  } else {
    if (!newId || rows.some(row => row.id === newId)) throw new Error("Neue Ressourcen-ID fehlt oder ist bereits vergeben");
    rows.push({ id: newId, name: target, phaseKey: group.phaseKey, remainingPt: String(allocation) });
  }
  if (remaining === allocation) rows.splice(index, 1);
  else group.remainingPt = String(remaining - allocation);
  return rows;
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
      name: canonicalDemandName(demand.name),
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
    name: canonicalDemandName(demand.name),
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
        finances: Array.isArray(project.finances)
          ? project.finances
          : (Array.isArray(project.phaseCosts)
            ? project.phaseCosts.map(({ phaseKey, ...entry }) => ({ ...entry, legacyPhaseKey: phaseKey || "" }))
            : []),
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
  if (name && !DEMAND_RESOURCES.includes(name)) errors.push("Diese Auswahl gehört zu den Rollen und ist keine Kapazitätsressource");
  const pt = nullableNumberValue(demand.remainingPt);
  if (pt == null) errors.push("Noch benötigte PT fehlen");
  else if (pt <= 0) errors.push("Noch benötigte PT müssen grösser als 0 sein");
  return errors;
}

export function validateFinanceEntry(entry) {
  const errors = [];
  const amount = nullableNumberValue(entry.amount);
  const year = Number(entry.year);
  if (amount == null) errors.push("Betrag fehlt oder ist ungültig");
  else if (amount <= 0) errors.push("Betrag muss grösser als 0 sein");
  if (!Number.isInteger(year) || year < 2000 || year > 2200) errors.push("Jahr ist ungültig");
  if (!String(entry.source || "").trim()) errors.push("Quelle fehlt");
  if (!String(entry.informationDate || "").trim()) errors.push("Informationsdatum fehlt");
  return errors;
}

export function validatePhaseTransitions({ phasePlan = [], gateHistory = [], currentPhaseKey = "" } = {}) {
  const issues = [];
  for (let index = 0; index < phasePlan.length - 1; index += 1) {
    const phase = phasePlan[index];
    const next = phasePlan[index + 1];
    const transitionRelevant = phase?.status === "done"
      && phase.startQuarter
      && phase.endQuarter
      && (next?.startQuarter || next?.phaseKey === currentPhaseKey);
    if (!transitionRelevant) continue;

    const latest = gateHistory
      .filter(gate => gate.phaseKey === phase.phaseKey)
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];

    if (!latest || !["freigegeben", "mit Auflagen"].includes(latest.status)) {
      issues.push({ phaseKey: phase.phaseKey, type: "notApproved" });
      continue;
    }
    if (["machbarkeit", "planung"].includes(phase.phaseKey) && latest.authority !== "Gesamtvorstand") {
      issues.push({ phaseKey: phase.phaseKey, type: "wrongAuthority", authority: latest.authority });
    }
  }
  return issues;
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

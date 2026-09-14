import test from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION,
  assessResourceCapacity,
  csvSafe,
  migratePhaseResponsibilities,
  migrateState,
  nullableNumberValue,
  phaseMonthWindow,
  validateDemand
} from "./model.js";

function capacities(values) {
  return Object.entries(values).map(([month, pt]) => ({ month, pt }));
}

test("zwei einzeln tragbare Phasen werden gemeinsam als Lücke erkannt", () => {
  const result = assessResourceCapacity({
    demands: [
      { id: "a", pt: 30, startMonth: "2027-03", endMonth: "2027-06" },
      { id: "b", pt: 25, startMonth: "2027-04", endMonth: "2027-07" }
    ],
    capacities: capacities({ "2027-03": 10, "2027-04": 10, "2027-05": 10, "2027-06": 10, "2027-07": 10 })
  });
  assert.equal(result.status, "gap");
  assert.equal(result.bottleneck.demand, 55);
  assert.equal(result.bottleneck.capacity, 50);
  assert.equal(result.bottleneck.shortfall, 5);
  assert.deepEqual(new Set(result.bottleneck.involvedIds), new Set(["a", "b"]));
});

test("ein kürzeres Phasenfenster wird strenger beurteilt", () => {
  const result = assessResourceCapacity({
    demands: [
      { id: "lang", pt: 20, startMonth: "2027-01", endMonth: "2027-04" },
      { id: "kurz", pt: 20, startMonth: "2027-02", endMonth: "2027-03" }
    ],
    capacities: capacities({ "2027-01": 10, "2027-02": 8, "2027-03": 8, "2027-04": 10 })
  });
  assert.equal(result.status, "gap");
  assert.equal(result.bottleneck.startMonth, "2027-02");
  assert.equal(result.bottleneck.endMonth, "2027-03");
  assert.equal(result.bottleneck.shortfall, 4);
  assert.deepEqual(result.bottleneck.involvedIds, ["kurz"]);
});

test("Bedarf ohne Phasenfenster kann nie grün werden", () => {
  const result = assessResourceCapacity({ demands: [{ id: "offen", pt: 12, startMonth: "", endMonth: "" }] });
  assert.equal(result.status, "open");
  assert.equal(result.undatedPt, 12);
});

test("leere Kapazität und bestätigte Null bleiben verschieden", () => {
  assert.equal(nullableNumberValue(""), null);
  assert.equal(nullableNumberValue(0), 0);
  const unknown = assessResourceCapacity({
    demands: [{ id: "a", pt: 1, startMonth: "2027-01", endMonth: "2027-01" }],
    capacities: [{ month: "2027-01", pt: null }]
  });
  const unavailable = assessResourceCapacity({
    demands: [{ id: "a", pt: 1, startMonth: "2027-01", endMonth: "2027-01" }],
    capacities: [{ month: "2027-01", pt: 0 }]
  });
  assert.equal(unknown.status, "open");
  assert.equal(unavailable.status, "gap");
});

test("fehlende Kapazität im Folgejahr ergibt ungeklärt", () => {
  const result = assessResourceCapacity({
    demands: [{ id: "a", pt: 15, startMonth: "2027-12", endMonth: "2028-02" }],
    capacities: [{ month: "2027-12", pt: 10 }]
  });
  assert.equal(result.status, "open");
  assert.deepEqual(result.unknownMonths, ["2028-01", "2028-02"]);
});

test("die engste bindende Periode wird benannt", () => {
  const result = assessResourceCapacity({
    demands: [
      { id: "a", pt: 18, startMonth: "2027-01", endMonth: "2027-03" },
      { id: "b", pt: 18, startMonth: "2027-02", endMonth: "2027-04" }
    ],
    capacities: capacities({ "2027-01": 10, "2027-02": 10, "2027-03": 10, "2027-04": 10 })
  });
  assert.equal(result.status, "watch");
  assert.equal(result.bottleneck.startMonth, "2027-01");
  assert.equal(result.bottleneck.endMonth, "2027-04");
  assert.equal(result.bottleneck.utilization, 0.9);
});

test("Fabri mit 9 PT Verfügbarkeit gegen 24 PT Restbedarf wird klar rot", () => {
  const result = assessResourceCapacity({
    demands: [{ id: "fabri-umbau", pt: 24, startMonth: "2026-09", endMonth: "2026-12" }],
    capacities: capacities({ "2026-09": 9, "2026-10": 0, "2026-11": 0, "2026-12": 0 })
  });
  assert.equal(result.status, "gap");
  assert.equal(result.bottleneck.demand, 24);
  assert.equal(result.bottleneck.capacity, 9);
  assert.equal(result.bottleneck.shortfall, 15);
});

test("Fabri mit erst 9 bestätigten PT erhält trotz offener Monate eine starke Warnung", () => {
  const result = assessResourceCapacity({
    demands: [{ id: "fabri-umbau", pt: 24, startMonth: "2026-09", endMonth: "2026-12" }],
    capacities: capacities({ "2026-09": 9 })
  });
  assert.equal(result.status, "open");
  assert.equal(result.confirmation.demand, 24);
  assert.equal(result.confirmation.capacity, 9);
  assert.equal(result.confirmation.unconfirmedNeeded, 15);
  assert.deepEqual(result.confirmation.unknownMonths, ["2026-10", "2026-11", "2026-12"]);
});

test("laufende Phase beginnt für den Restbedarf im aktuellen Monat", () => {
  assert.deepEqual(
    phaseMonthWindow({ startQuarter: "2026-Q1", endQuarter: "2026-Q4" }, "2026-09"),
    { startMonth: "2026-09", endMonth: "2026-12" }
  );
});

test("vollständig vergangene Phase wird als vergangen erkannt", () => {
  assert.deepEqual(
    phaseMonthWindow({ startQuarter: "2025-Q1", endQuarter: "2025-Q2" }, "2026-09"),
    { startMonth: "2025-01", endMonth: "2025-06", past: true }
  );
});

test("alte Werte bleiben als Hinweis erhalten und werden nicht umgerechnet", () => {
  const migrated = migrateState({
    projects: [{ id: "p1", demands: [{ id: "d1", name: "Tresto", phaseKey: "planung", totalMin: 5, totalMax: 7, allocations: [{ month: "2027-01", min: 2, max: 3 }] }] }],
    capacities: [{ id: "c1", name: "Iris", month: "2027-01", min: 4, max: 8 }]
  });
  assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
  assert.equal(migrated.projects[0].demands[0].name, "TRESTO");
  assert.equal(migrated.projects[0].demands[0].remainingPt, "");
  assert.equal(migrated.projects[0].demands[0].legacyDemand.maximum, 7);
  assert.equal(migrated.capacities[0].pt, null);
  assert.equal(migrated.capacities[0].requiresReview, true);
});

test("Bedarf verlangt Ressource und einen einzigen positiven Restwert", () => {
  assert.deepEqual(validateDemand({ name: "Iris", remainingPt: 12 }), []);
  assert.match(validateDemand({ name: "BK", remainingPt: 12 })[0], /Rollen/);
  assert.match(validateDemand({ name: "Iris", remainingPt: "" })[0], /fehlen/);
});

test("CSV Formeln werden für Excel neutralisiert", () => {
  assert.equal(csvSafe("=1+1"), "'=1+1");
  assert.equal(csvSafe("Normale Eingabe"), "Normale Eingabe");
});

test("bisherige aktuelle Verantwortung wird der aktuellen Phase zugeordnet", () => {
  const phasePlan = migratePhaseResponsibilities({
    currentPhaseKey: "machbarkeit",
    currentAssignee: "Iris Ammann",
    phasePlan: [
      { phaseKey: "anlass", status: "done", startQuarter: "2026-Q1", endQuarter: "2026-Q1" },
      { phaseKey: "machbarkeit", status: "current", startQuarter: "2026-Q2", endQuarter: "2026-Q3" },
      { phaseKey: "planung", status: "open", startQuarter: "", endQuarter: "" }
    ]
  });
  assert.equal(phasePlan[0].assignee, "");
  assert.equal(phasePlan[1].assignee, "Iris");
  assert.equal(phasePlan[2].assignee, "");
});

test("bereits phasenweise erfasste Verantwortung bleibt erhalten", () => {
  const phasePlan = migratePhaseResponsibilities({
    currentPhaseKey: "machbarkeit",
    currentAssignee: "Iris",
    phasePlan: [
      { phaseKey: "machbarkeit", assignee: "Alex" },
      { phaseKey: "realisierung", assignee: "Tresto" }
    ]
  });
  assert.equal(phasePlan[0].assignee, "Alex");
  assert.equal(phasePlan[1].assignee, "TRESTO");
});

test("Schemamigration leitet die aktuelle Verantwortung aus dem Phasenplan ab", () => {
  const migrated = migrateState({
    schemaVersion: 5,
    projects: [{
      id: "p1",
      currentPhaseKey: "planung",
      currentAssignee: "Iris",
      phasePlan: [
        { phaseKey: "machbarkeit", assignee: "Alex" },
        { phaseKey: "planung" }
      ]
    }]
  });
  assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
  assert.equal(migrated.projects[0].phasePlan[1].assignee, "Iris");
  assert.equal(migrated.projects[0].currentAssignee, "Iris");
});

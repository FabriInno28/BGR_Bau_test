import test from "node:test";
import assert from "node:assert/strict";
import {
  allocationTotals,
  csvSafe,
  demandPlanningState,
  migrateState,
  monthInsidePhase,
  resourceGap,
  resourceState,
  validateDemand
} from "./model.js";

test("Ressourcenbandbreiten unterscheiden tragbar, möglich und sicher", () => {
  assert.equal(resourceState({min: 25, max: 30}, {min: 15, max: 20}), "gap");
  assert.deepEqual(resourceGap({min: 25, max: 30}, {min: 15, max: 20}), {min: 5, max: 15});
  assert.equal(resourceState({min: 15, max: 20}, {min: 20, max: 25}), "ok");
  assert.equal(resourceState({min: 15, max: 25}, {min: 20, max: 30}), "watch");
});

test("Ungeplanter Rest bleibt sichtbar und wird nie linear verteilt", () => {
  const demand = {totalMin: 25, totalMax: 30, allocations: [{month: "2027-01", min: 10, max: 12}]};
  assert.deepEqual(allocationTotals(demand), {min: 10, max: 12});
  assert.deepEqual(demandPlanningState(demand), {key: "partial", label: "Teilweise geplant", restMin: 15, restMax: 18});
});

test("Bedarf kennt ungeschätzt, ungeplant, vollständig und überplant", () => {
  assert.equal(demandPlanningState({totalMin: "", totalMax: "", allocations: []}).key, "unestimated");
  assert.equal(demandPlanningState({totalMin: 4, totalMax: 6, allocations: []}).key, "unplanned");
  assert.equal(demandPlanningState({totalMin: 4, totalMax: 6, allocations: [{min: 4, max: 6}]}).key, "planned");
  assert.equal(demandPlanningState({totalMin: 4, totalMax: 6, allocations: [{min: 5, max: 7}]}).key, "overplanned");
});

test("Monatsbedarf muss im Phasenfenster liegen", () => {
  const phase = {startQuarter: "2027-Q1", endQuarter: "2027-Q2"};
  assert.equal(monthInsidePhase("2027-03", phase), true);
  assert.equal(monthInsidePhase("2027-07", phase), false);
  assert.match(validateDemand({name: "Iris", function: "GS", totalMin: 2, totalMax: 3, allocations: [{month: "2027-07", min: 2, max: 3}]}, phase)[0], /ausserhalb/);
});

test("Alte Quartalsbedarfe werden als ungeplanter Gesamtbedarf erhalten", () => {
  const migrated = migrateState({projects: [{id: "p1", demands: [{name: "Tresto", quarter: "2027-Q1", min: 5, max: 7}]}]});
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.projects[0].demands[0].name, "TRESTO");
  assert.equal(migrated.projects[0].demands[0].totalMax, 7);
  assert.deepEqual(migrated.projects[0].demands[0].allocations, []);
  assert.equal(demandPlanningState(migrated.projects[0].demands[0]).key, "unplanned");
  assert.deepEqual(migrated.deletedIds, []);
});

test("CSV-Formeln werden für Excel neutralisiert", () => {
  assert.equal(csvSafe("=1+1"), "'=1+1");
  assert.equal(csvSafe("Normale Eingabe"), "Normale Eingabe");
});

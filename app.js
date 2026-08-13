const actors = ["Gesamtvorstand", "Baukommission", "Geschäftsstelle", "BGR Projektverantwortung offen", "Iris persönlich", "Alex persönlich", "Büro 8", "Tresto", "andere externe Partner", "offen"];
const resources = ["Gesamtvorstand", "Baukommission", "Geschäftsstelle", "Iris persönlich", "Alex persönlich", "Büro 8", "Tresto", "andere externe Partner", "Offene Zuweisung"];
const horizons = ["0–12 Monate", "13–36 Monate", "3–10 Jahre", "> 10 Jahre"];
const years = Array.from({length: 32}, (_, index) => 2024 + index);
const quarters = years.flatMap(year => [1,2,3,4].map(quarter => `${year}-Q${quarter}`));
const emptyProject = {
  id: "draft", object: "", measure: "", category: "Umbauprojekt", strategy: "zu definieren", phase: "-", horizon: "0–12 Monate",
  startYear: "2026", endYear: "", cost: "", accuracy: "(+/- 50%)", currentOwner: "noch nicht definiert",
  bgrResponsibility: "offen", projectManagement: "offen", provider: "offen", control: "offen",
  nextDecision: "", note: "", uncertain: false, archived: false, cashflow: [], resources: []
};

function p(id, object, measure, values = {}) {
  return {...emptyProject, id, object, measure, ...values, cashflow: values.cashflow || [], resources: values.resources || []};
}
const open = (...yearsOpen) => yearsOpen.map(year => ({year: String(year), amount: "", status: "offen"}));
const known = entries => Object.entries(entries).map(([year, amount]) => ({year, amount: String(amount), status: "bekannt"}));

const seedProjects = [
  p("tg-ruopigenring", "Tiefgarage Ruopigenring 37–57", "Statische Ertüchtigung und Sanierung Tiefgarage", {category:"Bauprojekt", strategy:"Werterhaltung", phase:"33 - Baubewilligungsphase", startYear:"2024", endYear:"2027", cost:"1850000", accuracy:"offen", currentOwner:"Iris Ammann", bgrResponsibility:"Baukommission", projectManagement:"Iris persönlich", cashflow:known({2024:12500,2025:136500,2026:701000,2027:1000000}), nextDecision:"Verfügbarkeit und Ausführungsorganisation absichern"}),
  p("staffelnhof-1", "Staffelnhofstrasse 1", "Fernwärmeanschluss", {category:"Umbauprojekt", strategy:"Werterhaltung", phase:"-", startYear:"2026", endYear:"2027", currentOwner:"Geschäftsstelle", bgrResponsibility:"Geschäftsstelle", projectManagement:"Geschäftsstelle", cashflow:open(2026,2027), nextDecision:"Umfang und Ressourcen für den Anschluss bestätigen"}),
  p("staffelnhof-3-5", "Staffelnhofstrasse 3 + 5", "Neubau", {category:"Umbauprojekt", strategy:"Ersatzneubau", phase:"32 - Bauprojekt", startYear:"2026", endYear:"2029", cost:"9119850", accuracy:"offen", currentOwner:"Iris Ammann", bgrResponsibility:"Baukommission", cashflow:open(2026,2027,2028,2029), nextDecision:"Projektleitung und benötigte Leistungen je Phase zuweisen", note:"Projektkategorie in den bestehenden Tabellen nicht einheitlich. Hier gemäss Projektübersicht als Umbauprojekt geführt."}),
  p("eichenstrasse-21", "Eichenstrasse 21", "Dachaufstockung und Gebäudehüllensanierung", {strategy:"Umfassende Erneuerung", startYear:"2027", endYear:"2030", horizon:"13–36 Monate", currentOwner:"Iris Ammann", bgrResponsibility:"Baukommission", cashflow:[...known({2027:5000}),...open(2028,2029,2030)], nextDecision:"Machbarkeit und interne Auftraggeberrolle klären"}),
  p("obermaettli-5-dach", "Obermättlistrasse 5", "Dachaufstockung inklusive Gebäudehüllensanierung", {strategy:"Umfassende Erneuerung", startYear:"2027", endYear:"2030", horizon:"13–36 Monate", accuracy:"(+/- 10%)", currentOwner:"Iris Ammann", bgrResponsibility:"Baukommission", cashflow:[...known({2027:5000}),...open(2028,2029,2030)], nextDecision:"Machbarkeitsstudie beauftragen und Umbaupotential klären"}),
  p("ruopigenplatz-28", "Ruopigenplatz 28", "Ersatz Küchen, Sanierung Vordach und Eingangstreppe", {strategy:"Werterhaltung", startYear:"2027", endYear:"2027", currentOwner:"Geschäftsstelle", bgrResponsibility:"Geschäftsstelle", projectManagement:"Geschäftsstelle", cashflow:open(2027), nextDecision:"Abgrenzung Unterhalt und Projektpass sowie Ressourcen klären"}),
  p("hauptstrasse-54", "Hauptstrasse 54", "Gebäudehülle", {category:"Bauprojekt", strategy:"Umfassende Erneuerung", phase:"33 - Baubewilligungsphase", startYear:"2026", endYear:"offen", currentOwner:"Iris Ammann", bgrResponsibility:"Baukommission", cashflow:known({2026:10000}), nextDecision:"Weiteres Vorgehen und Zieltermin bestimmen"}),
  p("taeschmattstrasse-7", "Täschmattstrasse 7", "Dachaufstockung und Gebäudehüllensanierung", {strategy:"Umfassende Erneuerung", startYear:"2026", endYear:"2030", currentOwner:"Iris Ammann", bgrResponsibility:"Baukommission", cashflow:open(2026,2027,2028,2029,2030), nextDecision:"Phasen und Ressourcen zuweisen", note:"Projektkategorie in den bestehenden Tabellen nicht einheitlich."}),
  p("reusszopf", "Neubau Reusszopf", "Neubau", {category:"Grossprojekt", strategy:"Ersatzneubau", phase:"52 - Ausführung", startYear:"2025", endYear:"2028", cost:"20000000", accuracy:"offen", currentOwner:"Andreas Stirnimann", bgrResponsibility:"Baukommission", projectManagement:"andere externe Partner", provider:"andere externe Partner", nextDecision:"Interne Auftraggeberrolle für Abschlussphase bestätigen"}),
  p("ruopigenhoehe-14-15", "Ruopigenhöhe 14 + 15", "Flachdach, Küchen, Elektroverteilung und Holzfenster sanieren", {strategy:"Werterhaltung", horizon:"3–10 Jahre", startYear:"2028", endYear:"2031", currentOwner:"Iris Ammann", bgrResponsibility:"Baukommission", nextDecision:"Vorhaben bündeln und zeitlich einordnen"}),
  p("ruopigenring-39-57", "Ruopigenring 39–57", "Küchensanierung", {category:"Bauprojekt", strategy:"Werterhaltung", horizon:"3–10 Jahre", startYear:"2028", endYear:"2030", currentOwner:"Iris Ammann", bgrResponsibility:"Baukommission", cashflow:open(2028,2029,2030), nextDecision:"Objektumfang und Planungstakt bestätigen", note:"In der Zeitachse als Ruopigenring 39–51 bezeichnet."}),
  p("staldenhoehe-26", "Staldenhöhe 26", "Einfache Badsanierung", {strategy:"Werterhaltung", phase:"33 - Baubewilligungsphase", horizon:"3–10 Jahre", startYear:"2028", endYear:"2028", currentOwner:"Iris Ammann", bgrResponsibility:"Baukommission", cashflow:open(2028), nextDecision:"Zuständigkeit und Ausführungsressourcen bestimmen"}),
  p("hauptstrasse-38", "Hauptstrasse 38", "Ersatzneubau", {category:"Grossprojekt", strategy:"Ersatzneubau", horizon:"3–10 Jahre", startYear:"2030", endYear:"2035", cost:"9000000", accuracy:"Erste Schätzung", cashflow:open(2030,2031,2032,2033,2034), nextDecision:"Erste Auftraggeber und Ressourcenlogik bestimmen"}),
  p("obermaettli-23-34", "Obermättlistrasse 23–34", "Umstellung Wärmeerzeugung, Photovoltaik und Flachdach", {category:"Grossprojekt", strategy:"Umfassende Erneuerung", phase:"21 - Machbarkeitsstudie", startYear:"2025", endYear:"2027", currentOwner:"Andreas Stirnimann", bgrResponsibility:"Baukommission", nextDecision:"Projektkategorie und nächste Phase bestätigen", note:"Projektkategorie in Strategie und Zeitachse nicht einheitlich."}),
  p("obermaettli-5-unterhalt", "Obermättlistrasse 5", "Dachuntersicht, Balkonkosmetik und Küchengeräte", {category:"Umbauprojekt", strategy:"Werterhaltung", phase:"U - Unterhalt", startYear:"2026", endYear:"2026", currentOwner:"Geschäftsstelle", bgrResponsibility:"Geschäftsstelle", projectManagement:"Geschäftsstelle", nextDecision:"Als Unterhalt abschliessen oder mit Dachprojekt bündeln"}),
  p("vorder-ruopigen", "Vorder Ruopigen", "Neubau und Arealentwicklung", {category:"Grossprojekt", strategy:"Ersatzneubau", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", cost:"150000000", accuracy:"Erste Schätzung", bgrResponsibility:"Baukommission", projectManagement:"andere externe Partner", nextDecision:"Interne Auftraggeberrolle und externe Mandatierung bestimmen", note:"Zeitraum ist eine erste Einordnung aus der mittelfristigen Strategie."}),
  p("ckw-areal", "CKW Areal", "Neubau und Arealentwicklung", {category:"Grossprojekt", strategy:"Ersatzneubau", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", cost:"35000000", accuracy:"Erste Schätzung", bgrResponsibility:"Baukommission", projectManagement:"andere externe Partner", nextDecision:"Partnerschaft, Einfluss und BGR Ressourcen klären", note:"Zeitraum ist eine erste Einordnung aus der mittelfristigen Strategie."}),
  p("obermaettliweg-1-5-4", "Obermättliweg 1 + 3 + 5 + 4", "Ersatz Wärmeerzeugung, Balkone, Fenster, Dach und Fassade", {category:"Bauprojekt", strategy:"Umfassende Erneuerung", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", nextDecision:"Massnahmen bündeln und erste Machbarkeit bestimmen"}),
  p("rothenhalde-1-3", "Rothenhalde 1–3", "Küchen und Bäder", {category:"offen", strategy:"Werterhaltung", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", cost:"500000", accuracy:"Erste Schätzung", nextDecision:"Projektart, Zustand und Zieljahr bestätigen"}),
  p("ruopigenring-37-brandschutz", "Ruopigenring 37", "Brandschutz und Fassade", {category:"offen", strategy:"Umfassende Erneuerung", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", nextDecision:"Abgrenzung zur Tiefgarage und Projektumfang klären"}),
  p("strassenbaugenossenschaft", "Strassenbaugenossenschaft", "Pfisternweg bis Restaurant Reusszopf", {category:"offen", strategy:"zu definieren", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", nextDecision:"Rolle der BGR und Abhängigkeiten zu Partnern klären"}),
  p("obermaettli-16", "Obermättlistrasse 16", "Gebäudehülle", {category:"offen", strategy:"Umfassende Erneuerung", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", nextDecision:"Zustand und Priorität bestätigen"}),
  p("staffelnweg-3", "Staffelnweg 3", "Gebäudehülle", {category:"offen", strategy:"Umfassende Erneuerung", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", nextDecision:"Zustand und Priorität bestätigen"}),
  p("ruopigenring-107-113-huelle", "Ruopigenring 107–113", "Gebäudehülle", {category:"offen", strategy:"Umfassende Erneuerung", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", nextDecision:"Mittelfristige Massnahme und kurzfristigen Unterhalt abgrenzen"}),
  p("obermaettli-23-kuechen", "Obermättlistrasse 23", "Küchen, Bäder und Gebäudehülle", {category:"offen", strategy:"Umfassende Erneuerung", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", nextDecision:"Abgrenzung zum Bündel Obermättlistrasse 23–34 klären"}),
  p("obermaettli-25", "Obermättlistrasse 25", "Gebäudehülle", {category:"offen", strategy:"Umfassende Erneuerung", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", nextDecision:"Abgrenzung zum Bündel Obermättlistrasse 23–34 klären"}),
  p("fluhmuehle-11-13", "Fluhmühle 11 + 13", "Mögliches Vorhaben gemäss Zeitachse", {category:"offen", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", uncertain:true, nextDecision:"Bestätigen, ob und mit welchem Umfang das Vorhaben ins Portfolio gehört"}),
  p("hauptstrasse-36", "Hauptstrasse 36", "Mögliches Vorhaben gemäss Zeitachse", {category:"offen", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", uncertain:true, nextDecision:"Bestätigen, ob und mit welchem Umfang das Vorhaben ins Portfolio gehört"}),
  p("sandeggstrasse-1-mittel", "Sandeggstrasse 1", "Mögliches Vorhaben gemäss mittelfristiger Zeitachse", {category:"offen", horizon:"3–10 Jahre", startYear:"2029", endYear:"2036", uncertain:true, nextDecision:"Mittelfristige Massnahme bestätigen oder mit langfristigem Ersatzneubau zusammenführen"}),
  p("ruopigenring-107-113-unterhalt", "Ruopigenring 107–113", "Kurzfristige Unterhaltsmassnahme gemäss Zeitachse", {category:"Umbauprojekt", strategy:"Werterhaltung", phase:"U - Unterhalt", startYear:"2026", endYear:"2026", bgrResponsibility:"Geschäftsstelle", projectManagement:"Geschäftsstelle", nextDecision:"Massnahme und Abschluss bestätigen"}),
  p("sandeggstrasse-1-lang", "Sandeggstrasse 1", "Ersatzneubau oder Erweiterung", {category:"Grossprojekt", strategy:"Ersatzneubau", horizon:"> 10 Jahre", startYear:"2037", endYear:"offen", accuracy:"Erste Schätzung", nextDecision:"Langfristige Option und Zeithorizont bestätigen"}),
  p("obermaettli-5-lang", "Obermättlistrasse 5", "Ersatzneubau oder Erweiterung", {category:"Grossprojekt", strategy:"Ersatzneubau", horizon:"> 10 Jahre", startYear:"2036", endYear:"2036", cost:"2800000", accuracy:"Erste Schätzung", nextDecision:"Langfristige Option gegenüber heutigen Erneuerungsprojekten einordnen"}),
  p("obermaettli-34-lang", "Obermättlistrasse 34", "Ersatzneubau", {category:"Grossprojekt", strategy:"Ersatzneubau", horizon:"> 10 Jahre", startYear:"2040", endYear:"2040", cost:"5000000", accuracy:"Erste Schätzung", nextDecision:"Erste Annahme im rollenden Portfolio führen"}),
  p("staldenhoehe-lang", "Staldenhöhe", "Ersatzneubau", {category:"Grossprojekt", strategy:"Ersatzneubau", horizon:"> 10 Jahre", startYear:"2047", endYear:"2047", cost:"40000000", accuracy:"Erste Schätzung", nextDecision:"Erste Annahme im rollenden Portfolio führen"}),
  p("obermaettliweg-lang", "Obermättliweg 1 + 3 + 5", "Ersatzneubau", {category:"Grossprojekt", strategy:"Ersatzneubau", horizon:"> 10 Jahre", startYear:"2051", endYear:"2051", cost:"9630000", accuracy:"Erste Schätzung", nextDecision:"Erste Annahme im rollenden Portfolio führen"}),
  p("obermaettli-18", "Obermättlistrasse 18", "Laufen lassen", {category:"offen", strategy:"zu definieren", horizon:"> 10 Jahre", startYear:"2051", endYear:"offen", uncertain:true, nextDecision:"Bedeutung von «Laufen lassen» und nächsten Prüfzeitpunkt definieren"})
];

const fieldIds = ["object","measure","category","strategy","phase","horizon","startYear","endYear","cost","accuracy","currentOwner","bgrResponsibility","projectManagement","provider","control","nextDecision","note"];
const required = ["object","measure","category","horizon","bgrResponsibility","projectManagement","nextDecision"];
let projects = loadProjects();
let current = normalizeProject(emptyProject);
let currentCashflow = [];
let currentResources = [];
let horizonFilter = "Alle";
let currentView = "list";

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}
function number(value) {
  const normalized = String(value ?? "").replace(/['’\s]/g,"").replace(",",".");
  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
}
function money(value, short = false) {
  const amount = number(value);
  if (!amount && amount !== 0) return "offen";
  if (short && Math.abs(amount) >= 1000000) return `CHF ${(amount/1000000).toLocaleString("de-CH",{maximumFractionDigits:1})} Mio.`;
  if (short && Math.abs(amount) >= 1000) return `CHF ${(amount/1000).toLocaleString("de-CH",{maximumFractionDigits:0})} Tsd.`;
  return new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF",maximumFractionDigits:0}).format(amount);
}
function qIndex(value) {
  const match = String(value).match(/(\d{4})-Q([1-4])/);
  return match ? Number(match[1]) * 4 + Number(match[2]) - 1 : 0;
}
function quarterLabel(value) {
  const [year, quarter] = String(value).split("-Q");
  return `Q${quarter} ${year}`;
}
function normalizeProject(project) {
  const normalized = {...emptyProject, ...project};
  normalized.cashflow = Array.isArray(project.cashflow) ? project.cashflow : (project.annualYear ? [{year:String(project.annualYear),amount:String(project.annualCost||""),status:project.annualCost && number(project.annualCost)!==1 ? "bekannt":"offen"}] : []);
  normalized.resources = Array.isArray(project.resources) ? project.resources : [];
  if (!normalized.resources.length) {
    const map = {"Iris Ammann":"Iris persönlich","Geschäftsstelle":"Geschäftsstelle","Andreas Stirnimann":"Baukommission"};
    const resource = map[normalized.currentOwner];
    const start = Number.parseInt(normalized.startYear,10);
    const end = Number.parseInt(normalized.endYear,10);
    if (resource && Number.isFinite(start) && start <= 2036) normalized.resources = [{id:`r-${normalized.id}`,resource,from:`${start}-Q1`,to:`${Number.isFinite(end)?Math.min(end,2036):start}-Q4`,min:"",max:"",status:"abzuklären",source:"Bestehende Zuständigkeit"}];
  }
  return normalized;
}
function loadProjects() {
  try {
    const currentStore = localStorage.getItem("bgr-bauportfolio-v2");
    const legacyStore = localStorage.getItem("bgr-bauportfolio-prototyp");
    const stored = JSON.parse(currentStore || legacyStore || "null");
    if (!Array.isArray(stored)) return seedProjects.map(normalizeProject);
    const merged = stored.map(item => {
      if (currentStore) return normalizeProject(item);
      const base = seedProjects.find(seed => seed.id === item.id);
      return normalizeProject(base ? {...base,...item,cashflow:base.cashflow,resources:base.resources} : item);
    });
    const ids = new Set(merged.map(item => item.id));
    seedProjects.forEach(item => { if (!ids.has(item.id)) merged.push(normalizeProject(item)); });
    return merged;
  } catch {
    return seedProjects.map(normalizeProject);
  }
}
function saveProjects() {
  localStorage.setItem("bgr-bauportfolio-v2", JSON.stringify(projects));
}
function actorSelect(id, label, hint = "") {
  return `<label class="field"><span>${label}</span><select id="${id}">${actors.map(actor => `<option>${esc(actor)}</option>`).join("")}</select>${hint ? `<small>${hint}</small>` : ""}</label>`;
}
document.querySelector("#role-fields").innerHTML =
  actorSelect("bgrResponsibility","Wer hält auf BGR Seite Ziel, Auftrag und Entscheide zusammen?","Projektverantwortung BGR, nicht automatisch operative Leitung.") +
  actorSelect("projectManagement","Wer führt die aktuelle Phase operativ?","Kann in einer späteren Phase wechseln.") +
  actorSelect("provider","Wer erbringt die zentrale Fachleistung?") +
  actorSelect("control","Wer kontrolliert unabhängig, falls nötig?");

function setTab(name) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.add("hidden"));
  document.querySelector(`#${name}-panel`).classList.remove("hidden");
  document.querySelectorAll(".workflow button").forEach(button => button.classList.toggle("active", button.dataset.tab === name));
  if (name === "pass") renderPass();
  if (name === "portfolio") renderPortfolio();
  window.scrollTo({top: Math.max(0,document.querySelector(".workflow").offsetTop-70),behavior:"smooth"});
}
document.addEventListener("click", event => {
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) setTab(tabButton.dataset.tab);
});

function cashflowRow(item = {year:"2026",amount:"",status:"bekannt"}, index) {
  return `<div class="repeat-row cashflow-row" data-cashflow="${index}">
    <label><span>Jahr</span><input class="cf-year" inputmode="numeric" value="${esc(item.year)}"></label>
    <label><span>Betrag CHF</span><input class="cf-amount" inputmode="decimal" value="${esc(item.amount)}" ${item.status==="offen"?"disabled":""} placeholder="Betrag"></label>
    <label><span>Status</span><select class="cf-status"><option ${item.status==="bekannt"?"selected":""}>bekannt</option><option ${item.status==="offen"?"selected":""}>offen</option></select></label>
    <button type="button" class="remove-row" data-remove-cashflow="${index}" aria-label="Jahresbetrag entfernen">×</button>
  </div>`;
}
function resourceRow(item = {resource:"Offene Zuweisung",from:"2026-Q3",to:"2026-Q4",min:"",max:"",status:"abzuklären"}, index) {
  return `<div class="repeat-row resource-row" data-resource-row="${index}">
    <label><span>Ressource</span><select class="res-name">${resources.map(resource => `<option ${item.resource===resource?"selected":""}>${esc(resource)}</option>`).join("")}</select></label>
    <label><span>Von</span><select class="res-from">${quarters.map(quarter => `<option value="${quarter}" ${item.from===quarter?"selected":""}>${quarterLabel(quarter)}</option>`).join("")}</select></label>
    <label><span>Bis</span><select class="res-to">${quarters.map(quarter => `<option value="${quarter}" ${item.to===quarter?"selected":""}>${quarterLabel(quarter)}</option>`).join("")}</select></label>
    <label><span>PT min.</span><input class="res-min" inputmode="decimal" value="${esc(item.min)}" placeholder="offen"></label>
    <label><span>PT max.</span><input class="res-max" inputmode="decimal" value="${esc(item.max)}" placeholder="offen"></label>
    <label><span>Verfügbarkeit</span><select class="res-status"><option ${item.status==="gesichert"?"selected":""}>gesichert</option><option ${item.status==="abzuklären"?"selected":""}>abzuklären</option><option ${item.status==="nicht gesichert"?"selected":""}>nicht gesichert</option></select></label>
    <button type="button" class="remove-row" data-remove-resource="${index}" aria-label="Ressource entfernen">×</button>
  </div>`;
}
function renderRepeaters() {
  document.querySelector("#cashflow-list").innerHTML = currentCashflow.length ? currentCashflow.map(cashflowRow).join("") : '<p class="repeat-empty">Noch keine Jahresbeträge erfasst.</p>';
  document.querySelector("#resource-list").innerHTML = currentResources.length ? currentResources.map(resourceRow).join("") : '<p class="repeat-empty">Noch keine Ressource zugewiesen.</p>';
}
function readCashflow() {
  return [...document.querySelectorAll("[data-cashflow]")].map(row => ({
    year: row.querySelector(".cf-year").value.trim(),
    amount: row.querySelector(".cf-status").value === "offen" ? "" : row.querySelector(".cf-amount").value.trim(),
    status: row.querySelector(".cf-status").value
  })).filter(item => item.year);
}
function readResources() {
  return [...document.querySelectorAll("[data-resource-row]")].map((row,index) => ({
    id: currentResources[index]?.id || `r-${Date.now()}-${index}`,
    resource: row.querySelector(".res-name").value,
    from: row.querySelector(".res-from").value,
    to: row.querySelector(".res-to").value,
    min: row.querySelector(".res-min").value.trim(),
    max: row.querySelector(".res-max").value.trim(),
    status: row.querySelector(".res-status").value,
    source: currentResources[index]?.source || "Manuelle Eingabe"
  }));
}
function syncRepeaters() {
  currentCashflow = readCashflow();
  currentResources = readResources();
}
document.querySelector("#add-cashflow").addEventListener("click", () => { syncRepeaters(); currentCashflow.push({year:String(new Date().getFullYear()),amount:"",status:"bekannt"}); renderRepeaters(); });
document.querySelector("#add-resource").addEventListener("click", () => { syncRepeaters(); currentResources.push({id:`r-${Date.now()}`,resource:"Offene Zuweisung",from:"2026-Q3",to:"2026-Q4",min:"",max:"",status:"abzuklären",source:"Manuelle Eingabe"}); renderRepeaters(); });
document.querySelector("#cashflow-list").addEventListener("click", event => { const button=event.target.closest("[data-remove-cashflow]"); if(!button)return; syncRepeaters(); currentCashflow.splice(Number(button.dataset.removeCashflow),1); renderRepeaters(); });
document.querySelector("#resource-list").addEventListener("click", event => { const button=event.target.closest("[data-remove-resource]"); if(!button)return; syncRepeaters(); currentResources.splice(Number(button.dataset.removeResource),1); renderRepeaters(); });
document.querySelector("#cashflow-list").addEventListener("change", event => { if(!event.target.classList.contains("cf-status"))return; const row=event.target.closest("[data-cashflow]"); row.querySelector(".cf-amount").disabled=event.target.value==="offen"; if(event.target.value==="offen")row.querySelector(".cf-amount").value=""; });

function readForm() {
  const result = {id:document.querySelector("#project-id").value};
  fieldIds.forEach(id => result[id] = document.querySelector(`#${id}`).value.trim());
  result.cashflow = readCashflow();
  result.resources = readResources();
  result.uncertain = current.uncertain || false;
  result.archived = current.archived || false;
  return result;
}
function fillForm(project) {
  current = normalizeProject(project);
  currentCashflow = structuredClone(current.cashflow);
  currentResources = structuredClone(current.resources);
  document.querySelector("#project-id").value = current.id;
  fieldIds.forEach(id => { const field=document.querySelector(`#${id}`); if(field) field.value=current[id] ?? ""; });
  renderRepeaters();
  const isSaved = current.id !== "draft";
  document.querySelector("#record-actions").classList.toggle("hidden", !isSaved);
  document.querySelector("#archive-project").textContent = current.archived ? "Aus Archiv holen" : "Archivieren";
  updateProgress();
}
function resetForm() { fillForm(structuredClone(emptyProject)); setTab("capture"); }
function updateProgress() {
  const values = {};
  fieldIds.forEach(id => values[id]=document.querySelector(`#${id}`)?.value.trim() || "");
  const missing = required.filter(key => !values[key] || values[key] === "offen" || values[key] === "BGR Projektverantwortung offen");
  const percent = Math.round((required.length-missing.length)/required.length*100);
  document.querySelector("#progress-bar").style.width = `${percent}%`;
  document.querySelector("#progress-text").textContent = `${percent}% Kernfragen geklärt`;
}
document.querySelector("#project-form").addEventListener("input",updateProgress);
document.querySelector("#project-form").addEventListener("change",updateProgress);
document.querySelector("#project-form").addEventListener("submit", event => {
  event.preventDefault();
  const project = readForm();
  if (!project.object || !project.measure) return;
  if (project.id === "draft") project.id = `p-${Date.now()}`;
  const index = projects.findIndex(item => item.id === project.id);
  if (index >= 0) projects[index] = normalizeProject(project); else projects.unshift(normalizeProject(project));
  saveProjects(); fillForm(project); setTab("pass");
});
document.querySelector("#new-project").addEventListener("click",resetForm);
document.querySelector("#portfolio-new").addEventListener("click",resetForm);
document.querySelector("#archive-project").addEventListener("click", () => {
  if (current.id === "draft") return;
  const project = projects.find(item => item.id === current.id);
  if (!project) return;
  project.archived = !project.archived;
  saveProjects();
  fillForm(project);
});
document.querySelector("#delete-project").addEventListener("click", () => {
  if (current.id === "draft") return;
  if (!window.confirm(`«${current.object}» endgültig aus diesem Browser löschen? Die Excel Datei wird nicht verändert.`)) return;
  projects = projects.filter(item => item.id !== current.id);
  saveProjects();
  current = normalizeProject(emptyProject);
  setTab("portfolio");
});

function capacityStatus(project) {
  if (!project.resources.length) return "abzuklären";
  if (project.resources.some(item => item.status === "nicht gesichert")) return "nicht gesichert";
  if (project.resources.some(item => item.status === "abzuklären")) return "abzuklären";
  return "gesichert";
}
function periodText(project) {
  return project.resources.length ? `${quarterLabel(project.resources[0].from)} bis ${quarterLabel(project.resources[0].to)}` : "keine Ressource erfasst";
}
function renderPass() {
  if (!current.object) {
    document.querySelector("#project-pass").innerHTML='<div class="empty-state"><h3>Noch kein Vorhaben gewählt.</h3><p>Erfasse ein Vorhaben oder öffne eines aus dem Portfolio.</p><button class="primary-button" data-tab="portfolio">Portfolio öffnen</button></div>';
    return;
  }
  const status = capacityStatus(current);
  const cashRows = current.cashflow.length ? current.cashflow.map(item => `<div><dt>${esc(item.year)}</dt><dd>${item.status==="offen"?"offen":money(item.amount)}</dd></div>`).join("") : "<div><dt>Jahreswerte</dt><dd>offen</dd></div>";
  const resourceRows = current.resources.length ? current.resources.map(item => `<tr><td>${esc(item.resource)}</td><td>${quarterLabel(item.from)} bis ${quarterLabel(item.to)}</td><td>${item.min||item.max ? `${esc(item.min||"?")}–${esc(item.max||"?")} PT` : "PT offen"}</td><td><span class="status-text ${item.status.replaceAll(" ","-")}">${esc(item.status)}</span></td></tr>`).join("") : '<tr><td colspan="4">Noch keine Ressource zugewiesen.</td></tr>';
  document.querySelector("#project-pass").innerHTML=`<article class="project-pass">
    <div class="pass-title"><div><p>${esc(current.category)} · ${esc(current.phase)}${current.uncertain?" · unbestätigter Eintrag":""}</p><h3>${esc(current.object)}</h3><span>${esc(current.measure)}</span></div><div class="status-badge ${status.replaceAll(" ","-")}"><small>Ressourcen</small><strong>${esc(status)}</strong></div></div>
    <div class="pass-grid">
      <section><small>Planung</small><dl><div><dt>Horizont</dt><dd>${esc(current.horizon)}</dd></div><div><dt>Zeitraum</dt><dd>${esc(current.startYear)}–${esc(current.endYear||"offen")}</dd></div><div><dt>Strategie</dt><dd>${esc(current.strategy)}</dd></div></dl></section>
      <section><small>Finanzen</small><dl><div><dt>Kosten total</dt><dd>${current.cost?money(current.cost):"offen"}</dd></div><div><dt>Genauigkeit</dt><dd>${esc(current.accuracy)}</dd></div>${cashRows}</dl></section>
      <section class="wide"><small>Rollenkette</small><div class="role-chain"><div><span>01</span><b>Projektverantwortung BGR</b><strong>${esc(current.bgrResponsibility)}</strong></div><i>→</i><div><span>02</span><b>Operative Projektleitung</b><strong>${esc(current.projectManagement)}</strong></div><i>→</i><div><span>03</span><b>Fachleistung und Partner</b><strong>${esc(current.provider)}</strong></div><i>→</i><div><span>04</span><b>Unabhängige Kontrolle</b><strong>${esc(current.control)}</strong></div></div></section>
      <section class="wide"><small>Ressourceneinsätze</small><div class="table-scroll"><table class="pass-resources"><thead><tr><th>Ressource</th><th>Zeitraum</th><th>Bedarf</th><th>Verfügbarkeit</th></tr></thead><tbody>${resourceRows}</tbody></table></div></section>
      <section class="wide"><small>Nächster Entscheid</small><p class="decision">${esc(current.nextDecision||"offen")}</p>${current.note?`<p class="note">${esc(current.note)}</p>`:""}</section>
    </div>
    <div class="pass-footer"><div><b>Prüffrage</b><span>Welchen Entscheid können wir mit dieser Information besser treffen?</span></div><button class="secondary-button" id="copy-row">Excel Zeile kopieren</button></div>
  </article>`;
  document.querySelector("#copy-row").addEventListener("click", async event => {
    const row = coreRows(current)[0];
    await navigator.clipboard.writeText(row.join("\t"));
    event.target.textContent="Kopiert ✓"; setTimeout(()=>event.target.textContent="Excel Zeile kopieren",1600);
  });
}

function setupFilters() {
  const from = document.querySelector("#filter-from");
  const to = document.querySelector("#filter-to");
  from.innerHTML = quarters.map(q => `<option value="${q}">${quarterLabel(q)}</option>`).join("");
  to.innerHTML = from.innerHTML;
  from.value = "2026-Q3";
  to.value = "2030-Q4";
  document.querySelector("#filter-resource").innerHTML = `<option value="Alle">Alle</option>${resources.map(resource => `<option>${esc(resource)}</option>`).join("")}`;
}
function filterState() {
  return {
    search: document.querySelector("#filter-search").value.trim().toLowerCase(),
    category: document.querySelector("#filter-category").value,
    from: document.querySelector("#filter-from").value,
    to: document.querySelector("#filter-to").value,
    resource: document.querySelector("#filter-resource").value,
    archived: document.querySelector("#show-archived").checked
  };
}
function projectRange(project) {
  const start = Number.parseInt(project.startYear,10) || 2026;
  const end = Number.parseInt(project.endYear,10) || start;
  return {from:`${start}-Q1`,to:`${end}-Q4`};
}
function filteredProjects(includeHorizon = true) {
  const state = filterState();
  return projects.filter(project => {
    if (!state.archived && project.archived) return false;
    if (state.archived && !project.archived) return false;
    if (includeHorizon && horizonFilter !== "Alle" && project.horizon !== horizonFilter) return false;
    if (state.search && !`${project.object} ${project.measure}`.toLowerCase().includes(state.search)) return false;
    if (state.category !== "Alle" && project.category !== state.category) return false;
    const range = projectRange(project);
    if (qIndex(range.to) < qIndex(state.from) || qIndex(range.from) > qIndex(state.to)) return false;
    if (state.resource !== "Alle" && !project.resources.some(item => item.resource === state.resource)) return false;
    return true;
  });
}
function renderKpis() {
  const visible = filteredProjects(false);
  const activeTotal = projects.filter(project => !project.archived).length;
  const knownMoney = visible.flatMap(project => project.cashflow).filter(item => item.status === "bekannt").reduce((sum,item)=>sum+number(item.amount),0);
  const openPT = visible.filter(project => !project.resources.length || project.resources.some(item => !item.min || !item.max)).length;
  const unsecured = visible.filter(project => capacityStatus(project)==="nicht gesichert").length;
  document.querySelector("#cockpit-kpis").innerHTML = `
    <article><small>Portfolio total</small><strong>${activeTotal}</strong><span>${visible.length} in der aktuellen Auswahl</span></article>
    <article><small>Bekannte Jahresbeträge</small><strong>${money(knownMoney,true)}</strong><span>im gewählten Zeitraum</span></article>
    <article><small>PT noch offen</small><strong>${openPT}</strong><span>Vorhaben</span></article>
    <article><small>Nicht gesichert</small><strong>${unsecured}</strong><span>Ressourcenentscheid nötig</span></article>`;
}
function renderPortfolio() {
  renderKpis();
  document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active",button.dataset.view===currentView));
  ["list","timeline","resources"].forEach(view => document.querySelector(`#${view}-view`).classList.toggle("hidden",view!==currentView));
  renderList();
  renderTimeline();
  renderResources();
}
function renderList() {
  const visibleBase = filteredProjects(false);
  document.querySelector("#horizon-grid").innerHTML=horizons.map((horizon,index)=>`<button data-horizon="${esc(horizon)}" class="${horizonFilter===horizon?"selected":""}"><span>0${index+1}</span><b>${esc(horizon)}</b><strong>${visibleBase.filter(project=>project.horizon===horizon).length}</strong><small>${["hohe Genauigkeit","vollständig, rollend schärfen","Jahressicht und Bandbreiten","erste Schätzung"][index]}</small></button>`).join("");
  const visible=filteredProjects(true).sort((a,b)=>(Number.parseInt(a.startYear)||9999)-(Number.parseInt(b.startYear)||9999)||a.object.localeCompare(b.object,"de"));
  document.querySelector("#portfolio-count").innerHTML=`<strong>${visible.length} Vorhaben</strong> · ${horizonFilter==="Alle"?(filterState().archived?"Archiv":"alle Horizonte"):esc(horizonFilter)}`;
  document.querySelector("#clear-filter").classList.toggle("hidden",horizonFilter==="Alle");
  document.querySelector("#project-list").innerHTML=visible.length ? visible.map(project => {
    const status=capacityStatus(project);
    return `<article class="${project.archived?"archived":""}"><div class="project-year"><strong>${esc(project.startYear)}</strong><span>bis ${esc(project.endYear||"offen")}</span></div><div class="project-main"><small>${esc(project.category)} · ${esc(project.phase)} ${project.uncertain?'<mark>unbestätigt</mark>':""}</small><h3>${esc(project.object)}</h3><p>${esc(project.measure)}</p></div><div class="project-roles"><small>Verantwortung und Leitung</small><b>${esc(project.bgrResponsibility)}</b><span>${esc(project.projectManagement)}</span></div><div class="project-capacity"><span class="dot ${status.replaceAll(" ","-")}"></span><b>${esc(status)}</b><small>${esc(periodText(project))}</small></div><button class="edit-button" data-edit="${esc(project.id)}" aria-label="${esc(project.object)} bearbeiten">→</button></article>`;
  }).join("") : '<div class="empty-state compact"><h3>Keine Vorhaben in dieser Auswahl.</h3><p>Filter anpassen oder Archiv wechseln.</p></div>';
  document.querySelectorAll("[data-horizon]").forEach(button=>button.addEventListener("click",()=>{horizonFilter=horizonFilter===button.dataset.horizon?"Alle":button.dataset.horizon;renderPortfolio();}));
  document.querySelectorAll("[data-edit]").forEach(button=>button.addEventListener("click",()=>{const project=projects.find(item=>item.id===button.dataset.edit);fillForm(project);setTab("capture");}));
}
function renderTimeline() {
  const state=filterState();
  const startYear=Number(state.from.slice(0,4));
  const endYear=Number(state.to.slice(0,4));
  const shownYears=years.filter(year=>year>=startYear&&year<=endYear);
  const visible=filteredProjects(false).sort((a,b)=>(Number(a.startYear)||9999)-(Number(b.startYear)||9999)).slice(0,60);
  if (!visible.length || !shownYears.length) { document.querySelector("#timeline-chart").innerHTML='<div class="empty-state compact"><p>Keine Vorhaben in dieser Auswahl.</p></div>'; renderMoney([]); return; }
  const cols=shownYears.length;
  const header=`<div class="timeline-head"><span>Vorhaben</span><div class="timeline-years" style="grid-template-columns:repeat(${cols},minmax(76px,1fr))">${shownYears.map(year=>`<b>${year}</b>`).join("")}</div></div>`;
  const rows=visible.map(project=>{
    const start=Math.max(startYear,Number.parseInt(project.startYear)||startYear);
    const rawEnd=Number.parseInt(project.endYear);
    const end=Math.min(endYear,Number.isFinite(rawEnd)?rawEnd:start);
    const gridStart=Math.max(1,start-startYear+1);
    const gridEnd=Math.max(gridStart+1,end-startYear+2);
    return `<div class="timeline-row"><button data-edit="${esc(project.id)}"><strong>${esc(project.object)}</strong><small>${esc(project.measure)}</small></button><div class="timeline-lane" style="--cols:${cols};grid-template-columns:repeat(${cols},minmax(76px,1fr))"><span class="timeline-bar ${project.uncertain?"uncertain":""} ${project.category.toLowerCase().replaceAll(" ","-")}" style="grid-column:${gridStart}/${gridEnd}" title="${esc(project.object)}: ${start} bis ${end}"><b>${esc(project.category)}</b></span></div></div>`;
  }).join("");
  document.querySelector("#timeline-chart").innerHTML=`<div class="timeline-inner" style="min-width:${260+cols*82}px">${header}${rows}</div>`;
  document.querySelectorAll("#timeline-chart [data-edit]").forEach(button=>button.addEventListener("click",()=>{fillForm(projects.find(item=>item.id===button.dataset.edit));setTab("capture");}));
  renderMoney(visible);
}
function renderMoney(visible) {
  const state=filterState();
  const startYear=Number(state.from.slice(0,4));
  const endYear=Number(state.to.slice(0,4));
  const shownYears=years.filter(year=>year>=startYear&&year<=endYear);
  const sums=shownYears.map(year=>visible.flatMap(project=>project.cashflow).filter(item=>Number(item.year)===year&&item.status==="bekannt").reduce((sum,item)=>sum+number(item.amount),0));
  const max=Math.max(...sums,1);
  const totalCost=visible.reduce((sum,project)=>sum+number(project.cost),0);
  const distributed=visible.flatMap(project=>project.cashflow).filter(item=>item.status==="bekannt").reduce((sum,item)=>sum+number(item.amount),0);
  const unallocated=Math.max(0,totalCost-distributed);
  const openYears=visible.flatMap(project=>project.cashflow).filter(item=>item.status==="offen").length;
  document.querySelector("#money-chart").innerHTML=`<div class="money-summary"><article><small>Bekannt verteilt</small><strong>${money(distributed,true)}</strong></article><article><small>Projektvolumen noch nicht auf Jahre verteilt</small><strong>${money(unallocated,true)}</strong></article><article><small>Offene Jahresfelder</small><strong>${openYears}</strong></article></div><div class="bars-scroll"><div class="bars" style="min-width:${Math.max(620,shownYears.length*76)}px">${shownYears.map((year,index)=>`<div class="bar-column"><span class="bar-value">${sums[index]?money(sums[index],true):"–"}</span><div class="bar-track"><i style="height:${Math.max(0,sums[index]/max*100)}%"></i></div><b>${year}</b></div>`).join("")}</div></div>`;
}
function statusRank(status) { return {"gesichert":0,"abzuklären":1,"nicht gesichert":2}[status] ?? 1; }
function renderResources() {
  const state=filterState();
  const visible=filteredProjects(false);
  const shownQuarters=quarters.filter(quarter=>qIndex(quarter)>=qIndex(state.from)&&qIndex(quarter)<=qIndex(state.to));
  const shownResources=(state.resource==="Alle"?resources:resources.filter(resource=>resource===state.resource)).filter(resource=>visible.some(project=>project.resources.some(item=>item.resource===resource)));
  if (!shownResources.length) { document.querySelector("#resource-matrix").innerHTML='<div class="empty-state compact"><h3>Noch keine passenden Ressourceneinsätze.</h3><p>Im Projektpass eine Ressource mit Zeitraum und PT Bandbreite erfassen.</p></div>'; return; }
  const head=`<div class="matrix-head"><span>Ressource</span>${shownQuarters.map(q=>`<b>${q.replace("-"," ")}</b>`).join("")}</div>`;
  const rows=shownResources.map(resource=>{
    const cells=shownQuarters.map(quarter=>{
      const matches=visible.flatMap(project=>project.resources.filter(item=>item.resource===resource&&qIndex(item.from)<=qIndex(quarter)&&qIndex(item.to)>=qIndex(quarter)).map(item=>({project,item})));
      if(!matches.length)return "<span class=\"matrix-cell empty\"></span>";
      const withDays=matches.filter(match=>match.item.min||match.item.max);
      const min=withDays.reduce((sum,match)=>sum+number(match.item.min),0);
      const max=withDays.reduce((sum,match)=>sum+number(match.item.max),0);
      const status=matches.sort((a,b)=>statusRank(b.item.status)-statusRank(a.item.status))[0].item.status;
      const title=matches.map(match=>`${match.project.object}: ${match.item.min||"?"}–${match.item.max||"?"} PT, ${match.item.status}`).join("\n");
      return `<span class="matrix-cell ${status.replaceAll(" ","-")}" title="${esc(title)}"><strong>${withDays.length?`${min||"?"}–${max||"?"}`:"offen"}</strong><small>${matches.length} ${matches.length===1?"Vorhaben":"Vorhaben"}</small></span>`;
    }).join("");
    return `<div class="matrix-row"><strong>${esc(resource)}</strong>${cells}</div>`;
  }).join("");
  const width=Math.max(900,210+shownQuarters.length*92);
  document.querySelector("#resource-matrix").innerHTML=`<div class="matrix" style="min-width:${width}px;grid-template-columns:210px repeat(${shownQuarters.length},minmax(92px,1fr))">${head}${rows}</div>`;
}

document.querySelectorAll("[data-view]").forEach(button=>button.addEventListener("click",()=>{currentView=button.dataset.view;renderPortfolio();}));
["filter-search","filter-category","filter-from","filter-to","filter-resource","show-archived"].forEach(id=>document.querySelector(`#${id}`).addEventListener(id==="filter-search"?"input":"change",()=>{horizonFilter="Alle";renderPortfolio();}));
document.querySelector("#reset-filters").addEventListener("click",()=>{document.querySelector("#filter-search").value="";document.querySelector("#filter-category").value="Alle";document.querySelector("#filter-from").value="2026-Q3";document.querySelector("#filter-to").value="2030-Q4";document.querySelector("#filter-resource").value="Alle";document.querySelector("#show-archived").checked=false;horizonFilter="Alle";renderPortfolio();});
document.querySelector("#clear-filter").addEventListener("click",()=>{horizonFilter="Alle";renderPortfolio();});

function csvEscape(value) { return `"${String(value??"").replaceAll('"','""')}"`; }
function coreRows(project) {
  const flows=project.cashflow.length?project.cashflow:[{year:project.startYear,amount:"",status:"offen"}];
  return flows.map(flow=>[flow.year,project.object,project.measure,project.category,project.cost,flow.status==="bekannt"?flow.amount:"offen",project.accuracy,project.currentOwner,project.phase,project.endYear,project.horizon,project.archived?"archiviert":"aktiv"]);
}
function resourceRows(project) {
  const rows=project.resources.length?project.resources:[{resource:"",from:"",to:"",min:"",max:"",status:"abzuklären"}];
  return rows.map(item=>[project.object,project.measure,project.horizon,project.bgrResponsibility,project.projectManagement,project.provider,project.control,item.resource,item.from,item.to,item.min,item.max,item.status,project.nextDecision,project.note,project.archived?"archiviert":"aktiv"]);
}
function download(filename,rows) {
  const content="\uFEFF"+rows.map(row=>row.map(csvEscape).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}
document.querySelector("#export-core").addEventListener("click",()=>download("BGR_Projektuebersicht_Excel.csv",[["Jahr","Objekt","Massnahmen","Projektkategorie","Kosten Total","Jährliche Kosten","Kostengenauigkeit","Zuständigkeit","Projektstatus","Fertigstellung","Planungshorizont","Datensatz"],...projects.flatMap(coreRows)]));
document.querySelector("#export-roles").addEventListener("click",()=>download("BGR_Rollen_und_Ressourcen.csv",[["Objekt","Massnahme","Planungshorizont","Projektverantwortung BGR","Operative Projektleitung","Fachleistung / Partner","Unabhängige Kontrolle","Ressource","Von Quartal","Bis Quartal","PT min","PT max","Verfügbarkeit","Nächster Entscheid","Anmerkung","Datensatz"],...projects.flatMap(resourceRows)]));

setupFilters();
fillForm(emptyProject);
renderPortfolio();

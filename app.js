const actors = ["Gesamtvorstand", "Baukommission", "Geschäftsstelle", "BGR Projektverantwortung offen", "Iris persönlich", "Alex persönlich", "Büro 8", "Tresto", "andere externe Partner", "offen"];
const resources = ["Gesamtvorstand", "Baukommission", "Geschäftsstelle", "Iris persönlich", "Alex persönlich", "Büro 8", "Tresto", "andere externe Partner", "Offene Zuweisung"];
const horizons = ["0–12 Monate", "13–36 Monate", "3–10 Jahre", "> 10 Jahre"];
const years = Array.from({length: 32}, (_, index) => 2024 + index);
const quarters = years.flatMap(year => [1,2,3,4].map(quarter => `${year}-Q${quarter}`));
const emptyProject = {
  id: "draft", object: "", measure: "", category: "Umbauprojekt", strategy: "zu definieren", phase: "-", horizon: "0–12 Monate",
  startYear: "2026", endYear: "", cost: "", accuracy: "(+/- 50%)", currentOwner: "noch nicht definiert",
  bgrResponsibility: "offen", projectManagement: "offen", provider: "offen", control: "offen",
  deputy: "offen", handover: "", decisionOwner: "offen", decisionDue: "", exceptionAction: "offen",
  financeStatus: "in Klärung", nextDecision: "", note: "", uncertain: false, archived: false, cashflow: [], resources: []
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

const fieldIds = ["object","measure","category","strategy","phase","horizon","startYear","endYear","cost","accuracy","financeStatus","currentOwner","bgrResponsibility","projectManagement","provider","control","deputy","handover","decisionOwner","decisionDue","exceptionAction","nextDecision","note"];
const required = ["object","measure","category","horizon","bgrResponsibility","projectManagement","decisionOwner","nextDecision"];
const STORE_KEY = "bgr-bauportfolio-frozen-v4";
const HISTORY_KEY = "bgr-bauportfolio-history-v4";
const SESSION_KEY = "bgr-mini-klausur-2026-08-14-v1";
const BASELINE_LABEL = "Excel Stand 13.08.2026";
const fieldLabels={object:"Objekt",measure:"Massnahme",category:"Projektart",strategy:"Strategie",phase:"Projektphase",horizon:"Planungshorizont",startYear:"Startjahr",endYear:"Fertigstellung",cost:"Gesamtkosten",accuracy:"Kostengenauigkeit",financeStatus:"Finanzierung",currentOwner:"Zuständigkeit im Excel",bgrResponsibility:"Projektverantwortung BGR",projectManagement:"Operative Projektleitung",provider:"Fachleistung und Partner",control:"Unabhängige Kontrolle",deputy:"Stellvertretung",handover:"Nächste Übergabe",decisionOwner:"Entscheidinstanz",decisionDue:"Entscheidtermin",exceptionAction:"Vorgehen bei Lücke",nextDecision:"Nächster Entscheid",note:"Anmerkung",archived:"Archivstatus",cashflow:"Jahresbeträge",resources:"Ressourceneinsätze"};
let baselineProjects;
let projects;
let capacityPlans = [];
let financePlans = [];
let deletedIds = [];
let history = [];
let scenario = {active:false,resource:"Iris persönlich",from:"2027-Q1",to:"2027-Q1"};
let current = normalizeProject(emptyProject);
let currentCashflow = [];
let currentResources = [];
let horizonFilter = "Alle";
let currentView = "overview";

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
baselineProjects = seedProjects.map(item => normalizeProject(clone(item)));

function mergeWithBaseline(items,deleted=[]) {
  const merged = (Array.isArray(items) ? items : []).map(item => normalizeProject(item));
  const ids = new Set(merged.map(item => item.id));
  baselineProjects.forEach(item => { if (!ids.has(item.id)&&!deleted.includes(item.id)) merged.push(clone(item)); });
  return merged;
}
function loadState() {
  try {
    const frozenStore = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (frozenStore?.projects) return {
      projects: mergeWithBaseline(frozenStore.projects,frozenStore.deletedIds||[]),
      capacityPlans: Array.isArray(frozenStore.capacityPlans) ? frozenStore.capacityPlans : [],
      financePlans: Array.isArray(frozenStore.financePlans) ? frozenStore.financePlans : [],
      deletedIds:Array.isArray(frozenStore.deletedIds)?frozenStore.deletedIds:[]
    };
    return {projects:clone(baselineProjects),capacityPlans:[],financePlans:[],deletedIds:[]};
  } catch {
    return {projects:clone(baselineProjects),capacityPlans:[],financePlans:[],deletedIds:[]};
  }
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify({projects,capacityPlans,financePlans,deletedIds,updatedAt:new Date().toISOString()}));
  renderDataStatus();
}
function pushHistory(label) {
  history.push({label,at:new Date().toISOString(),projects:clone(projects),capacityPlans:clone(capacityPlans),financePlans:clone(financePlans),deletedIds:clone(deletedIds)});
  history = history.slice(-10);
  localStorage.setItem(HISTORY_KEY,JSON.stringify(history));
  renderUndo();
}
function undoLast() {
  const snapshot=history.pop();
  if(!snapshot)return;
  projects=snapshot.projects.map(normalizeProject);
  capacityPlans=snapshot.capacityPlans||[];
  financePlans=snapshot.financePlans||[];
  deletedIds=snapshot.deletedIds||[];
  localStorage.setItem(HISTORY_KEY,JSON.stringify(history));
  saveState();
  fillForm(projects.find(item=>item.id===current.id)||emptyProject);
  renderPortfolio();
  renderUndo();
  toast(`Rückgängig: ${snapshot.label}`);
}
function comparable(project) {
  const copy=clone(normalizeProject(project));
  delete copy.archived;
  return copy;
}
function baselineFor(id) { return baselineProjects.find(item=>item.id===id); }
function projectChanges(project) {
  const baseline=baselineFor(project.id);
  if(!baseline)return ["neu"];
  const keys=["object","measure","category","strategy","phase","horizon","startYear","endYear","cost","accuracy","financeStatus","currentOwner","bgrResponsibility","projectManagement","provider","control","deputy","handover","decisionOwner","decisionDue","exceptionAction","nextDecision","note","archived","cashflow","resources"];
  return keys.filter(key=>JSON.stringify(project[key]??"")!==JSON.stringify(baseline[key]??""));
}
function changeEntries() {
  const entries=[];
  projects.forEach(project=>{const fields=projectChanges(project);if(fields.length)entries.push({id:project.id,object:project.object,type:baselineFor(project.id)?"geändert":"neu",fields:fields.map(field=>fieldLabels[field]||field)});});
  baselineProjects.forEach(project=>{if(!projects.some(item=>item.id===project.id))entries.push({id:project.id,object:project.object,type:"gelöscht",fields:["Datensatz"]});});
  if(capacityPlans.length)entries.push({id:"KAPAZITAET",object:"Verfügbare Kapazitäten",type:"ergänzt",fields:[`${capacityPlans.length} Angaben`]});
  if(financePlans.length)entries.push({id:"FINANZEN",object:"Finanzrahmen",type:"ergänzt",fields:[`${financePlans.length} Angaben`]});
  return entries;
}
const loadedState=loadState();
projects=loadedState.projects;
capacityPlans=loadedState.capacityPlans;
financePlans=loadedState.financePlans;
deletedIds=loadedState.deletedIds||[];
history=loadHistory();
function actorSelect(id, label, hint = "") {
  return `<label class="field"><span>${label}</span><select id="${id}">${actors.map(actor => `<option>${esc(actor)}</option>`).join("")}</select>${hint ? `<small>${hint}</small>` : ""}</label>`;
}
document.querySelector("#role-fields").innerHTML =
  actorSelect("bgrResponsibility","Wer hält auf BGR Seite Ziel, Auftrag und Entscheide zusammen?","Projektverantwortung BGR, nicht automatisch operative Leitung.") +
  actorSelect("projectManagement","Wer führt die aktuelle Phase operativ?","Kann in einer späteren Phase wechseln.") +
  actorSelect("provider","Wer erbringt die zentrale Fachleistung?") +
  actorSelect("control","Wer kontrolliert unabhängig, falls nötig?");
document.querySelector("#deputy").innerHTML=actors.map(actor=>`<option>${esc(actor)}</option>`).join("");
document.querySelector("#decisionOwner").innerHTML=["Gesamtvorstand","Baukommission","Geschäftsstelle","offen"].map(actor=>`<option>${esc(actor)}</option>`).join("");

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
function toast(message) {
  const node=document.querySelector("#toast");
  node.textContent=message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>node.classList.remove("show"),2200);
}
function renderUndo() {
  const button=document.querySelector("#undo-action");
  button.disabled=!history.length;
  button.title=history.length?`Rückgängig: ${history.at(-1).label}`:"Keine Änderung zum Rückgängigmachen";
}
function renderDataStatus() {
  const entries=changeEntries();
  const projectCount=entries.filter(item=>!["KAPAZITAET","FINANZEN"].includes(item.id)).length;
  const planningCount=entries.length-projectCount;
  document.querySelector("#working-status").textContent=entries.length
    ? [projectCount?`${projectCount} Vorhaben`:"",planningCount?`${planningCount} Planungsgrundlagen`:""].filter(Boolean).join(" und ")+" geändert"
    :"entspricht dem Excel Ausgangsstand";
  renderUndo();
  renderChangeLog();
}

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
    <label><span>PT min. pro Quartal</span><input class="res-min" inputmode="decimal" value="${esc(item.min)}" placeholder="offen"></label>
    <label><span>PT max. pro Quartal</span><input class="res-max" inputmode="decimal" value="${esc(item.max)}" placeholder="offen"></label>
    <label><span>Zuweisung</span><select class="res-status"><option ${item.status==="gesichert"?"selected":""}>gesichert</option><option ${item.status==="abzuklären"?"selected":""}>abzuklären</option><option ${item.status==="nicht gesichert"?"selected":""}>nicht gesichert</option></select></label>
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
  currentCashflow = clone(current.cashflow);
  currentResources = clone(current.resources);
  document.querySelector("#project-id").value = current.id;
  fieldIds.forEach(id => { const field=document.querySelector(`#${id}`); if(field) field.value=current[id] ?? ""; });
  renderRepeaters();
  const isSaved = current.id !== "draft";
  document.querySelector("#record-actions").classList.toggle("hidden", !isSaved);
  document.querySelector("#archive-project").textContent = current.archived ? "Aus Archiv holen" : "Archivieren";
  const baseline=baselineFor(current.id);
  const changes=isSaved?projectChanges(current):[];
  document.querySelector("#baseline-banner").innerHTML=isSaved
    ? `<div><span class="eyebrow">${baseline?BASELINE_LABEL:"Neues Vorhaben"}</span><strong>${baseline?(changes.length?`${changes.length} Abweichungen im Arbeitsstand`:"Arbeitsstand entspricht Excel"):"Noch nicht im Excel Ausgangsstand"}</strong></div><span class="change-chip ${changes.length?"changed":"clean"}">${changes.length?"geändert":"unverändert"}</span>`
    : '<div><span class="eyebrow">Neuer Arbeitsstand</span><strong>Dieses Vorhaben existiert noch nicht in der Excel Mutter.</strong></div>';
  document.querySelector("#restore-project").textContent=baseline?"Excel Stand wiederherstellen":"Neues Vorhaben verwerfen";
  updateProgress();
}
function resetForm() { fillForm(clone(emptyProject)); setTab("capture"); }
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
  pushHistory(index>=0?`${project.object} geändert`:`${project.object} neu erfasst`);
  if (index >= 0) projects[index] = normalizeProject(project); else projects.unshift(normalizeProject(project));
  saveState(); fillForm(project); renderPortfolio(); setTab("pass"); toast("Arbeitsstand gespeichert");
});
document.querySelector("#new-project").addEventListener("click",resetForm);
document.querySelector("#portfolio-new").addEventListener("click",resetForm);
document.querySelector("#archive-project").addEventListener("click", () => {
  if (current.id === "draft") return;
  const project = projects.find(item => item.id === current.id);
  if (!project) return;
  pushHistory(project.archived?`${project.object} aus Archiv geholt`:`${project.object} archiviert`);
  project.archived = !project.archived;
  saveState();
  fillForm(project);
  renderPortfolio();
  toast(project.archived?"Vorhaben archiviert":"Vorhaben wieder aktiviert");
});
document.querySelector("#delete-project").addEventListener("click", () => {
  if (current.id === "draft") return;
  if (!window.confirm(`«${current.object}» endgültig aus diesem Browser löschen? Die Excel Datei wird nicht verändert.`)) return;
  pushHistory(`${current.object} gelöscht`);
  if(baselineFor(current.id)&&!deletedIds.includes(current.id))deletedIds.push(current.id);
  projects = projects.filter(item => item.id !== current.id);
  saveState();
  current = normalizeProject(emptyProject);
  renderPortfolio();
  setTab("portfolio");
  toast("Lokaler Datensatz gelöscht");
});
document.querySelector("#discard-project").addEventListener("click",()=>{
  const saved=projects.find(item=>item.id===current.id);
  if(saved){fillForm(saved);toast("Ungespeicherte Änderungen verworfen");}
});
document.querySelector("#restore-project").addEventListener("click",()=>{
  if(current.id==="draft")return;
  const baseline=baselineFor(current.id);
  if(!window.confirm(baseline?`«${current.object}» auf den unveränderten Excel Ausgangsstand zurücksetzen?`:`Das neue Vorhaben «${current.object}» verwerfen?`))return;
  pushHistory(baseline?`${current.object} auf Excel Stand zurückgesetzt`:`${current.object} verworfen`);
  if(baseline){
    const index=projects.findIndex(item=>item.id===current.id);
    projects[index]=clone(baseline);
    saveState();fillForm(projects[index]);
  }else{
    projects=projects.filter(item=>item.id!==current.id);
    saveState();resetForm();
  }
  renderPortfolio();toast(baseline?"Excel Stand wiederhergestellt":"Neues Vorhaben verworfen");
});
document.querySelector("#undo-action").addEventListener("click",undoLast);

function quarterSpan(from,to) {
  return quarters.filter(quarter=>qIndex(quarter)>=qIndex(from)&&qIndex(quarter)<=qIndex(to));
}
function demandFor(resource,quarter,sourceProjects=projects) {
  const matches=sourceProjects.flatMap(project=>project.resources.filter(item=>item.resource===resource&&qIndex(item.from)<=qIndex(quarter)&&qIndex(item.to)>=qIndex(quarter)).map(item=>({project,item})));
  const complete=matches.filter(match=>match.item.min!==""&&match.item.max!=="");
  return {
    matches,
    min:complete.reduce((sum,match)=>sum+number(match.item.min),0),
    max:complete.reduce((sum,match)=>sum+number(match.item.max),0),
    complete:matches.length>0&&complete.length===matches.length
  };
}
function availabilityFor(resource,quarter) {
  if(scenario.active&&scenario.resource===resource&&qIndex(quarter)>=qIndex(scenario.from)&&qIndex(quarter)<=qIndex(scenario.to))return {min:0,max:0,quality:"Simulation",simulated:true};
  const plan=[...capacityPlans].reverse().find(item=>item.resource===resource&&qIndex(item.from)<=qIndex(quarter)&&qIndex(item.to)>=qIndex(quarter));
  return plan?{min:number(plan.min),max:number(plan.max),quality:plan.quality,simulated:false}:null;
}
function assessResource(resource,quarter,sourceProjects=projects) {
  const demand=demandFor(resource,quarter,sourceProjects);
  const available=availabilityFor(resource,quarter);
  if(!demand.matches.length)return {state:"none",label:"kein Bedarf",demand,available};
  if(!demand.complete||!available||available.min===""||available.max==="")return {state:"open",label:"offen",demand,available};
  if(available.max<demand.min)return {state:"gap",label:"Lücke",demand,available};
  if(available.min>=demand.max)return {state:"secured",label:"tragbar",demand,available};
  return {state:"uncertain",label:"unsicher",demand,available};
}
function projectReadiness(project) {
  const hard=[];const open=[];
  const near=["0–12 Monate","13–36 Monate"].includes(project.horizon);
  if(["offen","BGR Projektverantwortung offen"].includes(project.bgrResponsibility)){
    if(near)hard.push("BGR Projektverantwortung offen");else open.push("BGR Projektverantwortung noch offen");
  }
  if(near&&project.projectManagement==="offen")hard.push("Operative Leitung offen");
  if(near&&project.financeStatus==="nicht gesichert")hard.push("Finanzierung nicht gesichert");
  if(project.resources.some(item=>item.status==="nicht gesichert"))hard.push("Ressourcenzuweisung nicht gesichert");
  project.resources.forEach(item=>quarterSpan(item.from,item.to).forEach(quarter=>{if(assessResource(item.resource,quarter,projects.filter(item=>!item.archived)).state==="gap"&&!hard.includes("Kapazitätslücke"))hard.push("Kapazitätslücke");}));
  if(!project.resources.length)open.push("Ressourcenbedarf fehlt");
  else if(project.resources.some(item=>item.min===""||item.max===""))open.push("Personentage offen");
  if(near&&project.financeStatus==="in Klärung")open.push("Finanzierung in Klärung");
  if(near&&["offen",""].includes(project.deputy))open.push("Stellvertretung offen");
  if(!project.handover)open.push("Nächste Übergabe offen");
  if(["offen",""].includes(project.decisionOwner))open.push("Entscheidinstanz offen");
  if(project.control==="offen"&&project.category==="Grossprojekt")open.push("Unabhängige Kontrolle offen");
  const state=hard.length?"not-secured":open.length?"clarify":"secured";
  return {state,label:state==="not-secured"?"nicht abgesichert":state==="clarify"?"zu klären":"abgesichert",hard,open,reasons:[...hard,...open]};
}
function periodText(project) {
  return project.resources.length ? `${quarterLabel(project.resources[0].from)} bis ${quarterLabel(project.resources[0].to)}` : "keine Ressource erfasst";
}
function worstAssessmentForItem(item) {
  const order={gap:4,open:3,uncertain:2,secured:1,none:0};
  return quarterSpan(item.from,item.to).map(quarter=>assessResource(item.resource,quarter,projects.filter(project=>!project.archived))).sort((a,b)=>order[b.state]-order[a.state])[0]||{state:"open",label:"offen",demand:{min:0,max:0},available:null};
}
function renderPass() {
  if (!current.object) {
    document.querySelector("#project-pass").innerHTML='<div class="empty-state"><h3>Noch kein Vorhaben gewählt.</h3><p>Erfasse ein Vorhaben oder öffne eines aus dem Portfolio.</p><button class="primary-button" data-tab="portfolio">Portfolio öffnen</button></div>';
    return;
  }
  const readiness=projectReadiness(current);
  const cashRows = current.cashflow.length ? current.cashflow.map(item => `<div><dt>${esc(item.year)}</dt><dd>${item.status==="offen"?"offen":money(item.amount)}</dd></div>`).join("") : "<div><dt>Jahreswerte</dt><dd>offen</dd></div>";
  const resourceRows = current.resources.length ? current.resources.map(item => {
    const assessment=worstAssessmentForItem(item);
    const available=assessment.available?`${assessment.available.min}–${assessment.available.max} PT`:"offen";
    return `<tr><td>${esc(item.resource)}</td><td>${quarterLabel(item.from)} bis ${quarterLabel(item.to)}</td><td>${item.min||item.max ? `${esc(item.min||"?")}–${esc(item.max||"?")} PT` : "PT offen"}</td><td>${available}</td><td><span class="status-text ${assessment.state}">${esc(assessment.label)}</span></td></tr>`;
  }).join("") : '<tr><td colspan="5">Noch keine Ressource zugewiesen.</td></tr>';
  const issues=readiness.reasons.length?`<div class="pass-issues">${readiness.reasons.map(reason=>`<span>${esc(reason)}</span>`).join("")}</div>`:'<div class="pass-issues clean"><span>Keine harte Lücke im aktuellen Arbeitsstand</span></div>';
  document.querySelector("#project-pass").innerHTML=`<article class="project-pass">
    <div class="pass-title"><div><p>Projekt ID ${esc(current.id)} · ${esc(current.category)} · ${esc(current.phase)}${current.uncertain?" · unbestätigter Eintrag":""}</p><h3>${esc(current.object)}</h3><span>${esc(current.measure)}</span></div><div class="status-badge ${readiness.state}"><small>Absicherung</small><strong>${esc(readiness.label)}</strong></div></div>
    ${issues}
    <div class="pass-grid">
      <section><small>Planung</small><dl><div><dt>Horizont</dt><dd>${esc(current.horizon)}</dd></div><div><dt>Zeitraum</dt><dd>${esc(current.startYear)}–${esc(current.endYear||"offen")}</dd></div><div><dt>Strategie</dt><dd>${esc(current.strategy)}</dd></div></dl></section>
      <section><small>Finanzen</small><dl><div><dt>Kosten total</dt><dd>${current.cost?money(current.cost):"offen"}</dd></div><div><dt>Finanzierung</dt><dd>${esc(current.financeStatus)}</dd></div><div><dt>Genauigkeit</dt><dd>${esc(current.accuracy)}</dd></div>${cashRows}</dl></section>
      <section class="wide"><small>Rollenkette</small><div class="role-chain"><div><span>01</span><b>Projektverantwortung BGR</b><strong>${esc(current.bgrResponsibility)}</strong></div><i>→</i><div><span>02</span><b>Operative Projektleitung</b><strong>${esc(current.projectManagement)}</strong></div><i>→</i><div><span>03</span><b>Fachleistung und Partner</b><strong>${esc(current.provider)}</strong></div><i>→</i><div><span>04</span><b>Unabhängige Kontrolle</b><strong>${esc(current.control)}</strong></div></div></section>
      <section class="wide"><small>Nächste Schnittstelle</small><div class="handover-card"><div><span>Übergabeergebnis</span><strong>${esc(current.handover||"offen")}</strong></div><div><span>Entscheid durch</span><strong>${esc(current.decisionOwner)}</strong></div><div><span>Termin</span><strong>${esc(current.decisionDue||"offen")}</strong></div><div><span>Stellvertretung</span><strong>${esc(current.deputy)}</strong></div></div></section>
      <section class="wide"><small>Ressourceneinsätze</small><div class="table-scroll"><table class="pass-resources"><thead><tr><th>Ressource</th><th>Zeitraum</th><th>Bedarf</th><th>Verfügbar</th><th>Aussage</th></tr></thead><tbody>${resourceRows}</tbody></table></div></section>
      <section class="wide"><small>Nächster Entscheid</small><p class="decision">${esc(current.nextDecision||"offen")}</p><p class="decision-action"><b>Falls nicht abgesichert:</b> ${esc(current.exceptionAction)}</p>${current.note?`<p class="note">${esc(current.note)}</p>`:""}</section>
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
  ["capacity-from","capacity-to","scenario-from","scenario-to"].forEach(id=>document.querySelector(`#${id}`).innerHTML=from.innerHTML);
  ["capacity-resource","scenario-resource"].forEach(id=>document.querySelector(`#${id}`).innerHTML=resources.filter(resource=>resource!=="Offene Zuweisung").map(resource=>`<option>${esc(resource)}</option>`).join(""));
  document.querySelector("#capacity-from").value="2026-Q3";
  document.querySelector("#capacity-to").value="2027-Q2";
  document.querySelector("#scenario-resource").value=scenario.resource;
  document.querySelector("#scenario-from").value=scenario.from;
  document.querySelector("#scenario-to").value=scenario.to;
  document.querySelector("#finance-year").innerHTML=years.map(year=>`<option>${year}</option>`).join("");
  document.querySelector("#finance-year").value="2027";
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
  const openPT = visible.filter(project => !project.resources.length || project.resources.some(item => item.min==="" || item.max==="")).length;
  const unsecured = visible.filter(project => projectReadiness(project).state==="not-secured").length;
  const state=filterState();
  const resourceGaps=resources.filter(resource=>resource!=="Offene Zuweisung").flatMap(resource=>quarterSpan(state.from,state.to).map(quarter=>assessResource(resource,quarter,visible))).filter(item=>item.state==="gap").length;
  document.querySelector("#cockpit-kpis").innerHTML = `
    <article class="kpi-primary"><small>Portfolio</small><strong>${activeTotal}</strong><span>${visible.length} Vorhaben in der Auswahl</span></article>
    <article class="${unsecured?"kpi-alert":""}"><small>Nicht abgesichert</small><strong>${unsecured}</strong><span>Vorhaben mit harter Lücke</span></article>
    <article class="${resourceGaps?"kpi-alert":""}"><small>Kapazitätslücken</small><strong>${resourceGaps}</strong><span>Ressource und Quartal</span></article>
    <article><small>Bekanntes Investitionsvolumen</small><strong>${money(knownMoney,true)}</strong><span>${openPT} Vorhaben mit offenen PT</span></article>`;
}
function renderPortfolio() {
  renderHero();
  renderDataStatus();
  renderKpis();
  document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active",button.dataset.view===currentView));
  ["overview","list","timeline","resources"].forEach(view => document.querySelector(`#${view}-view`).classList.toggle("hidden",view!==currentView));
  renderOverview();
  renderList();
  renderTimeline();
  renderResources();
  renderPlans();
}
function renderHero() {
  const active=projects.filter(project=>!project.archived);
  const changes=changeEntries().filter(item=>!["KAPAZITAET","FINANZEN"].includes(item.id)).length;
  const notSecured=active.filter(project=>projectReadiness(project).state==="not-secured").length;
  const known=active.flatMap(project=>project.cashflow).filter(item=>item.status==="bekannt").reduce((sum,item)=>sum+number(item.amount),0);
  document.querySelector("#hero-dashboard").innerHTML=`<div class="hero-dash-head"><span>Portfolio Puls</span><small>Arbeitsstand 14.08.2026</small></div><div class="hero-number"><strong>${active.length}</strong><span>aktive Vorhaben</span></div><div class="hero-dash-grid"><div><small>Abweichungen</small><b>${changes}</b></div><div class="${notSecured?"alert":""}"><small>Nicht abgesichert</small><b>${notSecured}</b></div><div><small>Bekannte Jahreswerte</small><b>${money(known,true)}</b></div></div><p><i></i>Excel Ausgangsstand bleibt unverändert</p>`;
}
function renderOverview() {
  const visible=filteredProjects(false);
  const readiness=visible.map(project=>({project,...projectReadiness(project)}));
  const notSecured=readiness.filter(item=>item.state==="not-secured");
  const clarify=readiness.filter(item=>item.state==="clarify");
  const roleOpen=visible.filter(project=>["offen","BGR Projektverantwortung offen"].includes(project.bgrResponsibility)||project.projectManagement==="offen").length;
  const handoverOpen=visible.filter(project=>!project.handover||project.decisionOwner==="offen").length;
  const moneyOpen=visible.filter(project=>project.financeStatus==="in Klärung"||project.financeStatus==="nicht gesichert").length;
  const ptOpen=visible.filter(project=>!project.resources.length||project.resources.some(item=>item.min===""||item.max==="")).length;
  const state=filterState();
  const resourceAssessments=resources.filter(resource=>resource!=="Offene Zuweisung").flatMap(resource=>quarterSpan(state.from,state.to).map(quarter=>assessResource(resource,quarter,visible)));
  const gaps=resourceAssessments.filter(item=>item.state==="gap").length;
  const unknown=resourceAssessments.filter(item=>item.state==="open").length;
  const peopleHeadline=gaps?gaps+" Kapazitätslücken":ptOpen+" Bedarfe offen";
  document.querySelector("#decision-summary").innerHTML=`
    <article class="${gaps?"alert":""}"><span class="decision-icon people">M</span><div><small>Menschen und Partner</small><strong>${peopleHeadline}</strong><p>${unknown} Kombinationen aus Ressource und Quartal sind noch nicht belastbar.</p></div><button data-view="resources">prüfen →</button></article>
    <article class="${roleOpen?"warn":""}"><span class="decision-icon roles">S</span><div><small>Rollen und Schnittstellen</small><strong>${roleOpen} Rollenzuweisungen offen</strong><p>${handoverOpen} Vorhaben ohne klare nächste Übergabe oder Entscheidinstanz.</p></div><button data-view="list">prüfen →</button></article>
    <article class="${moneyOpen?"warn":""}"><span class="decision-icon money">CHF</span><div><small>Finanzielle Absicherung</small><strong>${moneyOpen} Finanzierungen offen</strong><p>Jahresbeträge und Finanzrahmen werden getrennt gezeigt.</p></div><button data-view="timeline">prüfen →</button></article>`;
  const secured=readiness.filter(item=>item.state==="secured").length;
  const total=Math.max(visible.length,1);
  document.querySelector("#portfolio-pulse").innerHTML=`
    <div class="pulse-ring" style="--secured:${secured/total*360}deg;--clarify:${(secured+clarify.length)/total*360}deg"><div><strong>${secured}</strong><span>abgesichert</span></div></div>
    <div class="pulse-legend"><div><i class="secured"></i><span>Abgesichert</span><b>${secured}</b></div><div><i class="clarify"></i><span>Zu klären</span><b>${clarify.length}</b></div><div><i class="gap"></i><span>Nicht abgesichert</span><b>${notSecured.length}</b></div></div>
    <p>Die Einstufung ist eine Absicherungsprüfung. Sie ersetzt keine Priorisierung durch den Vorstand.</p>`;
  const order={"not-secured":0,"clarify":1,"secured":2};
  const focus=readiness.sort((a,b)=>order[a.state]-order[b.state]||a.project.object.localeCompare(b.project.object,"de")).slice(0,8);
  document.querySelector("#focus-list").innerHTML=focus.map(item=>`<button data-edit="${esc(item.project.id)}"><span class="focus-state ${item.state}"></span><div><small>${esc(item.project.category)} · ${esc(item.project.horizon)}</small><strong>${esc(item.project.object)}</strong><p>${esc(item.reasons.slice(0,2).join(" · ")||"Keine offene Absicherung")}</p></div><b>→</b></button>`).join("");
  document.querySelectorAll("#focus-list [data-edit]").forEach(button=>button.addEventListener("click",()=>{fillForm(projects.find(item=>item.id===button.dataset.edit));setTab("capture");}));
}
function renderList() {
  const visibleBase = filteredProjects(false);
  document.querySelector("#horizon-grid").innerHTML=horizons.map((horizon,index)=>`<button data-horizon="${esc(horizon)}" class="${horizonFilter===horizon?"selected":""}"><span>0${index+1}</span><b>${esc(horizon)}</b><strong>${visibleBase.filter(project=>project.horizon===horizon).length}</strong><small>${["hohe Genauigkeit","vollständig, rollend schärfen","Jahressicht und Bandbreiten","erste Schätzung"][index]}</small></button>`).join("");
  const visible=filteredProjects(true).sort((a,b)=>(Number.parseInt(a.startYear)||9999)-(Number.parseInt(b.startYear)||9999)||a.object.localeCompare(b.object,"de"));
  document.querySelector("#portfolio-count").innerHTML=`<strong>${visible.length} Vorhaben</strong> · ${horizonFilter==="Alle"?(filterState().archived?"Archiv":"alle Horizonte"):esc(horizonFilter)}`;
  document.querySelector("#clear-filter").classList.toggle("hidden",horizonFilter==="Alle");
  document.querySelector("#project-list").innerHTML=visible.length ? visible.map(project => {
    const readiness=projectReadiness(project);
    const changed=projectChanges(project).length;
    return `<article class="${project.archived?"archived":""}"><div class="project-year"><strong>${esc(project.startYear)}</strong><span>bis ${esc(project.endYear||"offen")}</span></div><div class="project-main"><small>Projekt ID ${esc(project.id)} · ${esc(project.category)} · ${esc(project.phase)} ${project.uncertain?'<mark>unbestätigt</mark>':""} ${changed?'<mark class="changed-mark">Arbeitsstand</mark>':""}</small><h3>${esc(project.object)}</h3><p>${esc(project.measure)}</p></div><div class="project-roles"><small>Verantwortung und Leitung</small><b>${esc(project.bgrResponsibility)}</b><span>${esc(project.projectManagement)}</span></div><div class="project-capacity"><span class="dot ${readiness.state}"></span><b>${esc(readiness.label)}</b><small>${esc(readiness.reasons[0]||periodText(project))}</small></div><button class="edit-button" data-edit="${esc(project.id)}" aria-label="${esc(project.object)} bearbeiten">→</button></article>`;
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
function financeForYear(year) {
  return [...financePlans].reverse().find(item=>Number(item.year)===Number(year))||null;
}
function assessMoneyYear(year,visible) {
  const flows=visible.flatMap(project=>project.cashflow.map(item=>({project,...item}))).filter(item=>Number(item.year)===Number(year));
  const known=flows.filter(item=>item.status==="bekannt").reduce((sum,item)=>sum+number(item.amount),0);
  const openCount=flows.filter(item=>item.status==="offen").length;
  const plan=financeForYear(year);
  if(!plan||plan.min===""||plan.max==="")return {state:"open",known,openCount,plan,label:"Finanzrahmen offen"};
  const min=number(plan.min);const max=number(plan.max);
  if(known>max)return {state:"gap",known,openCount,plan,label:"Finanzierungslücke"};
  if(openCount)return {state:"uncertain",known,openCount,plan,label:"noch unvollständig"};
  if(known<=min)return {state:"secured",known,openCount,plan,label:"im Finanzrahmen"};
  return {state:"uncertain",known,openCount,plan,label:"im Bandbereich"};
}
function renderMoney(visible) {
  const state=filterState();
  const startYear=Number(state.from.slice(0,4));
  const endYear=Number(state.to.slice(0,4));
  const shownYears=years.filter(year=>year>=startYear&&year<=endYear);
  const assessments=shownYears.map(year=>assessMoneyYear(year,visible));
  const max=Math.max(...assessments.flatMap(item=>[item.known,item.plan?number(item.plan.max):0]),1);
  const totalCost=visible.reduce((sum,project)=>sum+number(project.cost),0);
  const distributed=visible.flatMap(project=>project.cashflow).filter(item=>item.status==="bekannt").reduce((sum,item)=>sum+number(item.amount),0);
  const unallocated=Math.max(0,totalCost-distributed);
  const openYears=visible.flatMap(project=>project.cashflow).filter(item=>item.status==="offen").length;
  const gaps=assessments.filter(item=>item.state==="gap").length;
  document.querySelector("#money-chart").innerHTML=`<div class="money-summary"><article><small>Bekannt verteilt</small><strong>${money(distributed,true)}</strong></article><article><small>Noch nicht auf Jahre verteilt</small><strong>${money(unallocated,true)}</strong></article><article class="${gaps?"alert":""}"><small>Finanzielle Lücken</small><strong>${gaps}</strong><span>${openYears} offene Jahresfelder</span></article></div><div class="bars-scroll"><div class="bars" style="min-width:${Math.max(680,shownYears.length*92)}px">${shownYears.map((year,index)=>{
    const item=assessments[index];
    const demandHeight=Math.max(0,item.known/max*100);
    const capHeight=item.plan?Math.max(0,number(item.plan.max)/max*100):0;
    const capMin=item.plan?Math.max(0,number(item.plan.min)/max*100):0;
    return `<div class="bar-column ${item.state}" title="${esc(item.label)}"><span class="bar-value">${item.known?money(item.known,true):"–"}</span><div class="bar-track"><i class="demand" style="height:${demandHeight}%"></i>${item.plan?`<span class="cap-band" style="bottom:${capMin}%;height:${Math.max(2,capHeight-capMin)}%"></span>`:""}</div><b>${year}</b><small>${esc(item.label)}</small></div>`;
  }).join("")}</div></div><div class="chart-key"><span><i class="demand"></i>bekannte Belastung</span><span><i class="capacity"></i>verfügbarer Finanzrahmen</span></div>`;
}
function renderResources() {
  const state=filterState();
  const visible=filteredProjects(false);
  const shownQuarters=quarters.filter(quarter=>qIndex(quarter)>=qIndex(state.from)&&qIndex(quarter)<=qIndex(state.to));
  const shownResources=(state.resource==="Alle"?resources:resources.filter(resource=>resource===state.resource)).filter(resource=>resource!=="Offene Zuweisung"&&(visible.some(project=>project.resources.some(item=>item.resource===resource))||capacityPlans.some(item=>item.resource===resource)));
  if (!shownResources.length) { document.querySelector("#resource-matrix").innerHTML='<div class="empty-state compact"><h3>Noch keine passenden Ressourceneinsätze.</h3><p>Im Projektpass eine Ressource mit Zeitraum und PT Bandbreite erfassen.</p></div>'; return; }
  const head=`<div class="matrix-head"><span>Ressource</span>${shownQuarters.map(q=>`<b>${q.replace("-"," ")}</b>`).join("")}</div>`;
  const rows=shownResources.map(resource=>{
    const cells=shownQuarters.map(quarter=>{
      const assessment=assessResource(resource,quarter,visible);
      if(assessment.state==="none"&&!assessment.available)return "<span class=\"matrix-cell empty\"></span>";
      const demand=assessment.demand.matches.length?(assessment.demand.complete?`${assessment.demand.min}–${assessment.demand.max}`:"offen"):"0";
      const available=assessment.available?`${assessment.available.min}–${assessment.available.max}`:"offen";
      const title=assessment.demand.matches.map(match=>`${match.project.object}: ${match.item.min||"?"}–${match.item.max||"?"} PT`).join("\n");
      return `<span class="matrix-cell ${assessment.state}" title="${esc(title)}"><b>${esc(assessment.label)}</b><strong>${demand}</strong><small>Bedarf · verfügbar ${available}</small></span>`;
    }).join("");
    return `<div class="matrix-row"><strong>${esc(resource)}</strong>${cells}</div>`;
  }).join("");
  const width=Math.max(900,210+shownQuarters.length*92);
  document.querySelector("#resource-matrix").innerHTML=`<div class="matrix" style="min-width:${width}px;grid-template-columns:210px repeat(${shownQuarters.length},minmax(92px,1fr))">${head}${rows}</div>`;
  const all=shownResources.flatMap(resource=>shownQuarters.map(quarter=>({resource,quarter,...assessResource(resource,quarter,visible)})));
  const gaps=all.filter(item=>item.state==="gap");
  const uncertain=all.filter(item=>item.state==="uncertain");
  const openItems=all.filter(item=>item.state==="open");
  document.querySelector("#resource-summary").innerHTML=`<article class="${gaps.length?"alert":""}"><small>Klare Lücken</small><strong>${gaps.length}</strong><span>${gaps[0]?`${esc(gaps[0].resource)} · ${esc(quarterLabel(gaps[0].quarter))}`:"keine erkannt"}</span></article><article><small>Unsichere Bandbreiten</small><strong>${uncertain.length}</strong><span>Bedarf und Verfügbarkeit überschneiden sich</span></article><article><small>Grundlage offen</small><strong>${openItems.length}</strong><span>Bedarf oder Verfügbarkeit fehlt</span></article>`;
}

function renderPlans() {
  const capacityNode=document.querySelector("#capacity-plan-list");
  capacityNode.innerHTML=capacityPlans.length?capacityPlans.map((item,index)=>`<div><span><b>${esc(item.resource)}</b><small>${quarterLabel(item.from)} bis ${quarterLabel(item.to)} · ${esc(item.quality)}</small></span><strong>${esc(item.min||"?")}–${esc(item.max||"?")} PT</strong><button data-remove-capacity="${index}">×</button></div>`).join(""):'<p class="repeat-empty">Noch keine verfügbare Kapazität erfasst.</p>';
  const financeNode=document.querySelector("#finance-plan-list");
  financeNode.innerHTML=financePlans.length?financePlans.sort((a,b)=>Number(a.year)-Number(b.year)).map((item,index)=>`<div><span><b>${esc(item.year)}</b><small>${esc(item.quality)}</small></span><strong>${money(item.min,true)} bis ${money(item.max,true)}</strong><button data-remove-finance="${index}">×</button></div>`).join(""):'<p class="repeat-empty">Noch kein jährlicher Finanzrahmen erfasst.</p>';
  document.querySelector("#scenario-active").classList.toggle("hidden",!scenario.active);
  document.querySelector("#scenario-active").innerHTML=scenario.active?`<div><span class="eyebrow">Simulation aktiv</span><strong>${esc(scenario.resource)} fällt von ${quarterLabel(scenario.from)} bis ${quarterLabel(scenario.to)} vollständig aus.</strong></div><button id="clear-scenario">Simulation beenden</button>`:"";
  document.querySelector("#toggle-scenario").textContent=scenario.active?"Simulation aktualisieren":"Ausfall simulieren";
  document.querySelectorAll("[data-remove-capacity]").forEach(button=>button.addEventListener("click",()=>{pushHistory("Kapazitätsangabe entfernt");capacityPlans.splice(Number(button.dataset.removeCapacity),1);saveState();renderPortfolio();toast("Kapazitätsangabe entfernt");}));
  document.querySelectorAll("[data-remove-finance]").forEach(button=>button.addEventListener("click",()=>{pushHistory("Finanzrahmen entfernt");financePlans.splice(Number(button.dataset.removeFinance),1);saveState();renderPortfolio();toast("Finanzrahmen entfernt");}));
  document.querySelector("#clear-scenario")?.addEventListener("click",()=>{scenario.active=false;renderPortfolio();toast("Simulation beendet");});
}
document.querySelector("#add-capacity-plan").addEventListener("click",()=>{
  const item={resource:document.querySelector("#capacity-resource").value,from:document.querySelector("#capacity-from").value,to:document.querySelector("#capacity-to").value,min:document.querySelector("#capacity-min").value.trim(),max:document.querySelector("#capacity-max").value.trim(),quality:document.querySelector("#capacity-quality").value};
  if(!item.min||!item.max){toast("Bitte beide PT Bandbreiten erfassen");return;}
  pushHistory("Verfügbare Kapazität ergänzt");
  capacityPlans=capacityPlans.filter(plan=>!(plan.resource===item.resource&&plan.from===item.from&&plan.to===item.to));
  capacityPlans.push(item);saveState();renderPortfolio();toast("Verfügbarkeit übernommen");
});
document.querySelector("#add-finance-plan").addEventListener("click",()=>{
  const item={year:document.querySelector("#finance-year").value,min:document.querySelector("#finance-min").value.trim(),max:document.querySelector("#finance-max").value.trim(),quality:document.querySelector("#finance-quality").value};
  if(!item.min||!item.max){toast("Bitte beide Finanzbandbreiten erfassen");return;}
  pushHistory("Finanzrahmen ergänzt");
  financePlans=financePlans.filter(plan=>plan.year!==item.year);financePlans.push(item);saveState();renderPortfolio();toast("Finanzrahmen übernommen");
});
document.querySelector("#toggle-scenario").addEventListener("click",()=>{
  scenario={active:true,resource:document.querySelector("#scenario-resource").value,from:document.querySelector("#scenario-from").value,to:document.querySelector("#scenario-to").value};
  renderPortfolio();toast("Ausfallsimulation aktiviert");
});

document.addEventListener("click",event=>{const button=event.target.closest("[data-view]");if(!button)return;currentView=button.dataset.view;renderPortfolio();});
["filter-search","filter-category","filter-from","filter-to","filter-resource","show-archived"].forEach(id=>document.querySelector(`#${id}`).addEventListener(id==="filter-search"?"input":"change",()=>{horizonFilter="Alle";renderPortfolio();}));
document.querySelector("#reset-filters").addEventListener("click",()=>{document.querySelector("#filter-search").value="";document.querySelector("#filter-category").value="Alle";document.querySelector("#filter-from").value="2026-Q3";document.querySelector("#filter-to").value="2030-Q4";document.querySelector("#filter-resource").value="Alle";document.querySelector("#show-archived").checked=false;horizonFilter="Alle";renderPortfolio();});
document.querySelector("#clear-filter").addEventListener("click",()=>{horizonFilter="Alle";renderPortfolio();});
document.querySelector("#show-changes").addEventListener("click",()=>{setTab("export");document.querySelector("#change-log").scrollIntoView({behavior:"smooth",block:"center"});});
document.querySelector("#restore-all").addEventListener("click",()=>{
  if(!window.confirm("Gesamten lokalen Arbeitsstand verwerfen und den unveränderten Excel Ausgangsstand wiederherstellen?"))return;
  pushHistory("Gesamter Arbeitsstand zurückgesetzt");
  projects=clone(baselineProjects);capacityPlans=[];financePlans=[];deletedIds=[];saveState();fillForm(emptyProject);renderPortfolio();toast("Excel Ausgangsstand vollständig wiederhergestellt");
});

function csvEscape(value) { return `"${String(value??"").replaceAll('"','""')}"`; }
function coreRows(project) {
  const flows=project.cashflow.length?project.cashflow:[{year:project.startYear,amount:"",status:"offen"}];
  return flows.map(flow=>[project.id,flow.year,project.object,project.measure,project.category,project.cost,flow.status==="bekannt"?flow.amount:"offen",project.accuracy,project.financeStatus,project.currentOwner,project.phase,project.endYear,project.horizon,project.archived?"archiviert":"aktiv"]);
}
function resourceRows(project) {
  const rows=project.resources.length?project.resources:[{resource:"",from:"",to:"",min:"",max:"",status:"abzuklären"}];
  return rows.map(item=>[project.id,project.object,project.measure,project.horizon,project.bgrResponsibility,project.projectManagement,project.provider,project.control,project.deputy,item.resource,item.from,item.to,item.min,item.max,item.status,project.handover,project.decisionOwner,project.decisionDue,project.exceptionAction,project.nextDecision,project.note,project.archived?"archiviert":"aktiv"]);
}
function download(filename,rows) {
  const content="\uFEFF"+rows.map(row=>row.map(csvEscape).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}
document.querySelector("#export-core").addEventListener("click",()=>download("BGR_Projektuebersicht_Arbeitsstand.csv",[["Projekt ID","Jahr","Objekt","Massnahmen","Projektkategorie","Kosten Total","Jährliche Kosten","Kostengenauigkeit","Finanzierung","Zuständigkeit Excel","Projektstatus","Fertigstellung","Planungshorizont","Datensatz"],...projects.flatMap(coreRows)]));
document.querySelector("#export-roles").addEventListener("click",()=>download("BGR_Rollen_Ressourcen_Schnittstellen.csv",[["Projekt ID","Objekt","Massnahme","Planungshorizont","Projektverantwortung BGR","Operative Projektleitung","Fachleistung / Partner","Unabhängige Kontrolle","Stellvertretung","Ressource","Von Quartal","Bis Quartal","PT min","PT max","Zuweisung","Nächste Übergabe","Entscheidinstanz","Entscheidtermin","Falls nicht abgesichert","Nächster Entscheid","Anmerkung","Datensatz"],...projects.flatMap(resourceRows)]));
document.querySelector("#export-changes").addEventListener("click",()=>download("BGR_Aenderungsprotokoll.csv",[["Projekt ID","Objekt","Art","Geänderte Felder"],...changeEntries().map(item=>[item.id,item.object,item.type,item.fields.join(", ")])]));
function renderChangeLog() {
  const node=document.querySelector("#change-log");if(!node)return;
  const entries=changeEntries();
  node.innerHTML=`<div class="visual-heading"><div><p class="eyebrow">Differenz zum Excel Ausgangsstand</p><h3>${entries.length} Änderungen im lokalen Arbeitsstand</h3></div></div>${entries.length?`<div class="change-table">${entries.map(item=>`<div><span class="change-type ${item.type}">${esc(item.type)}</span><strong>${esc(item.object)}</strong><small>${esc(item.fields.join(" · "))}</small></div>`).join("")}</div>`:'<div class="empty-state compact"><p>Der lokale Arbeitsstand entspricht dem Excel Ausgangsstand.</p></div>'}`;
}

const sessionBlocks = [
  {id:"zielbild",time:"09.00 bis 09.20 Uhr",title:"Gemeinsames Zielbild"},
  {id:"grundlagen",time:"09.20 bis 09.45 Uhr",title:"Bestehende Entscheidungen und Grundlagen"},
  {id:"rollen",time:"09.45 bis 10.35 Uhr",title:"BGR Organe, Geschäftsstelle, BGR nah extern und unabhängig extern"},
  {id:"planung",time:"10.45 bis 11.20 Uhr",title:"Planungslogik und Projektpass"},
  {id:"portfolio",time:"11.20 bis 12.00 Uhr",title:"Portfolio, Menschen und Geld"},
  {id:"faelle",time:"13.00 bis 13.45 Uhr",title:"Drei Realitätstests"},
  {id:"belastungstest",time:"13.45 bis 14.20 Uhr",title:"Portfolio Belastungstest"},
  {id:"fazit",time:"14.30 bis 14.50 Uhr",title:"Schlussfolgerungen"},
  {id:"abschluss",time:"14.50 bis 15.00 Uhr",title:"Verbindlicher Abschluss"}
];
function loadSessionState(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"{}");}
  catch{return {};}
}
function readSessionState(){
  return Object.fromEntries(sessionBlocks.map(block=>{
    const note=document.querySelector(`[data-session-note="${block.id}"]`)?.value||"";
    const status=document.querySelector(`[data-session-status="${block.id}"]`)?.value||"offen";
    return [block.id,{note,status}];
  }));
}
function paintSessionStatus(id,status){
  const block=document.querySelector(`[data-session="${id}"]`);
  if(!block)return;
  block.dataset.workStatus=status;
}
function hydrateSession(){
  const state=loadSessionState();
  sessionBlocks.forEach(block=>{
    const note=document.querySelector(`[data-session-note="${block.id}"]`);
    const status=document.querySelector(`[data-session-status="${block.id}"]`);
    if(note)note.value=state[block.id]?.note||"";
    if(status)status.value=state[block.id]?.status||"offen";
    paintSessionStatus(block.id,status?.value||"offen");
  });
}
function saveSessionState(){
  localStorage.setItem(SESSION_KEY,JSON.stringify({...readSessionState(),updatedAt:new Date().toISOString()}));
}
function downloadText(filename,content,type="text/plain;charset=utf-8"){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement("a");link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}
document.querySelector("#klausur-panel").addEventListener("input",event=>{
  if(!event.target.matches("[data-session-note]"))return;
  saveSessionState();
});
document.querySelector("#klausur-panel").addEventListener("change",event=>{
  if(!event.target.matches("[data-session-status]"))return;
  saveSessionState();paintSessionStatus(event.target.dataset.sessionStatus,event.target.value);
});
document.querySelectorAll("[data-klausur-project]").forEach(button=>button.addEventListener("click",()=>{
  const project=projects.find(item=>item.id===button.dataset.klausurProject);
  if(!project)return;
  fillForm(project);setTab("capture");
}));
document.querySelector("[data-open-resources]")?.addEventListener("click",()=>{
  currentView="resources";renderPortfolio();
});
document.querySelector("#export-session-text").addEventListener("click",()=>{
  const state=readSessionState();
  const parts=["BGR MINI KLAUSUR BAUKOMMISSION","14. August 2026 · 09.00 bis 15.00 Uhr","Iris Ammann · Alex Tschuppert · Fabrizio Laneve",""];
  sessionBlocks.forEach((block,index)=>{
    parts.push(`${index+1}. ${block.title}`,block.time,`Status: ${state[block.id].status}`,state[block.id].note||"Noch kein Ergebnis festgehalten","","");
  });
  parts.push("Grundlage: Die definitive zeitliche Priorisierung erfolgt nach der Mini Klausur.");
  downloadText("BGR_Mini_Klausur_Protokoll_2026-08-14.txt",parts.join("\r\n"));
  toast("Klausurprotokoll geladen");
});
document.querySelector("#export-session-csv").addEventListener("click",()=>{
  const state=readSessionState();
  download("BGR_Mini_Klausur_Ergebnisse_2026-08-14.csv",[["Zeit","Arbeitsblock","Status","Ergebnis und nächste Schritte"],...sessionBlocks.map(block=>[block.time,block.title,state[block.id].status,state[block.id].note])]);
  toast("Klausurergebnisse geladen");
});
document.querySelector("#reset-session").addEventListener("click",()=>{
  if(!window.confirm("Alle lokal gespeicherten Klausurnotizen und Status zurücksetzen? Das Bauportfolio bleibt unverändert."))return;
  localStorage.removeItem(SESSION_KEY);hydrateSession();toast("Klausurnotizen zurückgesetzt");
});
document.querySelector("#download-guide").addEventListener("click",()=>{
  const guide=document.querySelector("#guide-panel").innerText.replace("Anleitung laden ↓","").trim();
  downloadText("BGR_Bauportfolio_Anleitung.txt",`BGR BAUPORTFOLIO\r\nANLEITUNG ZUM KLAUSURPROTOTYP\r\n\r\n${guide}`);
  toast("Anleitung geladen");
});

setupFilters();
fillForm(emptyProject);
hydrateSession();
renderDataStatus();
renderUndo();
renderPortfolio();
setTab("portfolio");

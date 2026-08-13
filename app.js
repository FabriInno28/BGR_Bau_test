const actors = ["Gesamtvorstand", "Baukommission", "Geschäftsstelle", "Iris persönlich", "Alex persönlich", "Büro 8", "Tresto", "andere externe Partner", "offen"];
const horizons = ["0–12 Monate", "13–36 Monate", "3–10 Jahre", "> 10 Jahre"];
const emptyProject = {
  id:"draft", object:"", measure:"", category:"Umbauprojekt", strategy:"zu definieren", phase:"-", horizon:"0–12 Monate",
  startYear:"2026", endYear:"", cost:"", accuracy:"(+/- 50%)", annualCost:"", annualYear:"2026", currentOwner:"noch nicht definiert",
  bgrResponsibility:"offen", projectManagement:"offen", provider:"offen", control:"offen", capacity:"abzuklären", capacityPeriod:"Q3 / 2026",
  minDays:"", maxDays:"", nextDecision:"", note:""
};
const seedProjects = [
  {...emptyProject,id:"tg-ruopigenring",object:"Tiefgarage Ruopigenring 37–57",measure:"Statische Ertüchtigung und Sanierung Tiefgarage",category:"Bauprojekt",phase:"33 - Baubewilligungsphase",startYear:"2024",endYear:"2027",cost:"1850000",accuracy:"offen",annualCost:"1000000",annualYear:"2027",currentOwner:"Iris Ammann",bgrResponsibility:"Baukommission",projectManagement:"Iris persönlich",nextDecision:"Verfügbarkeit und Ausführungsorganisation absichern"},
  {...emptyProject,id:"staffelnhof",object:"Staffelnhofstrasse 3 + 5",measure:"Neubau",strategy:"Ersatzneubau",phase:"32 - Bauprojekt",startYear:"2026",endYear:"2029",cost:"9119850",accuracy:"offen",currentOwner:"Iris Ammann",bgrResponsibility:"Baukommission",nextDecision:"Projektleitung und benötigte Leistungen je Phase zuweisen"},
  {...emptyProject,id:"reusszopf",object:"Neubau Reusszopf",measure:"Neubau",category:"Grossprojekt",strategy:"Ersatzneubau",phase:"52 - Ausführung",startYear:"2027",endYear:"2027",cost:"20000000",accuracy:"offen",currentOwner:"Andreas Stirnimann",bgrResponsibility:"Baukommission",projectManagement:"andere externe Partner",provider:"andere externe Partner",nextDecision:"Interne Auftraggeberrolle für Abschlussphase bestätigen"},
  {...emptyProject,id:"ruopigenplatz",object:"Ruopigenplatz 28",measure:"Ersatz Küchen, Sanierung Vordach und Eingangstreppe",strategy:"Werterhaltung",startYear:"2027",endYear:"2027",currentOwner:"Geschäftsstelle",bgrResponsibility:"Geschäftsstelle",projectManagement:"Geschäftsstelle",nextDecision:"Abgrenzung Unterhalt und Projektpass sowie Ressourcen klären"},
  {...emptyProject,id:"obermaettli-5",object:"Obermättlistrasse 5",measure:"Dachaufstockung inkl. Gebäudehüllensanierung",strategy:"Umfassende Erneuerung",horizon:"13–36 Monate",startYear:"2027",endYear:"2030",accuracy:"(+/- 10%)",annualCost:"5000",annualYear:"2027",currentOwner:"Iris Ammann",bgrResponsibility:"Baukommission",nextDecision:"Machbarkeitsstudie beauftragen und Umbaupotential klären",note:"Heizungsersatz und PV Prüfung im bestehenden Projektblatt vorgesehen."},
  {...emptyProject,id:"ruopigenhoehe",object:"Ruopigenhöhe 14 + 15",measure:"Flachdach, Küchen, Elektroverteilung und Holzfenster sanieren",strategy:"Werterhaltung",horizon:"3–10 Jahre",startYear:"2028",endYear:"2031",currentOwner:"Iris Ammann",nextDecision:"Vorhaben bündeln und zeitlich einordnen"},
  {...emptyProject,id:"hauptstrasse-38",object:"Hauptstrasse 38",measure:"Ersatzneubau",category:"Grossprojekt",strategy:"Ersatzneubau",horizon:"3–10 Jahre",startYear:"2030",endYear:"offen",nextDecision:"Erste Auftraggeber und Ressourcenlogik bestimmen"}
];

const fieldIds = Object.keys(emptyProject).filter(key => key !== "id");
const required = ["object","measure","category","horizon","bgrResponsibility","projectManagement","capacity","nextDecision"];
const requiredLabels = {object:"Objekt",measure:"Massnahme",category:"Projektkategorie",horizon:"Planungshorizont",bgrResponsibility:"Projektverantwortung BGR",projectManagement:"Operative Projektleitung",capacity:"Verfügbarkeit",nextDecision:"Nächster Entscheid"};
let projects = loadProjects();
let current = {...emptyProject};
let horizonFilter = "Alle";

function e(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}
function loadProjects() {
  try { return JSON.parse(localStorage.getItem("bgr-bauportfolio-prototyp") || "null") || seedProjects; }
  catch { return seedProjects; }
}
function saveProjects() { localStorage.setItem("bgr-bauportfolio-prototyp", JSON.stringify(projects)); }
function actorSelect(id,label,hint="") {
  return `<label class="field"><span>${label}</span><select id="${id}">${actors.map(actor=>`<option>${actor}</option>`).join("")}</select>${hint?`<small>${hint}</small>`:""}</label>`;
}
document.querySelector("#role-fields").innerHTML = actorSelect("bgrResponsibility","Wer hält auf BGR Seite Ziel, Auftrag und Entscheide zusammen?","Projektverantwortung BGR, nicht automatisch operative Leitung.") + actorSelect("projectManagement","Wer führt die aktuelle Phase operativ?","Kann in einer späteren Phase wechseln.") + actorSelect("provider","Wer erbringt die zentrale Fachleistung?") + actorSelect("control","Wer kontrolliert unabhängig, falls nötig?");

function setTab(name) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.add("hidden"));
  document.querySelector(`#${name}-panel`).classList.remove("hidden");
  document.querySelectorAll(".workflow button").forEach(button => button.classList.toggle("active",button.dataset.tab===name));
  if(name==="pass") renderPass();
  if(name==="portfolio") renderPortfolio();
  window.scrollTo({top:document.querySelector(".workflow").offsetTop-70,behavior:"smooth"});
}
document.addEventListener("click", event => {
  const tabButton = event.target.closest("[data-tab]");
  if(tabButton) setTab(tabButton.dataset.tab);
});

function readForm() {
  const result = {id:document.querySelector("#project-id").value};
  fieldIds.forEach(id => result[id] = document.querySelector(`#${id}`).value.trim());
  return result;
}
function fillForm(project) {
  current = {...emptyProject,...project};
  document.querySelector("#project-id").value = current.id;
  fieldIds.forEach(id => { const field=document.querySelector(`#${id}`); if(field) field.value=current[id] ?? ""; });
  updateProgress();
}
function resetForm() { document.querySelector("#project-form").reset(); fillForm({...emptyProject}); setTab("capture"); }
function updateProgress() {
  current = readForm();
  const missing = required.filter(key => !current[key] || current[key]==="offen" || current[key]==="abzuklären");
  const percent = Math.round((required.length-missing.length)/required.length*100);
  document.querySelector("#progress-bar").style.width = `${percent}%`;
  document.querySelector("#progress-text").textContent = `${percent}% Kernfragen geklärt`;
}
document.querySelector("#project-form").addEventListener("input",updateProgress);
document.querySelector("#project-form").addEventListener("change",updateProgress);
document.querySelector("#project-form").addEventListener("submit",event=>{
  event.preventDefault();
  const project=readForm();
  if(!project.object || !project.measure) return;
  if(project.id==="draft") project.id=String(Date.now());
  const index=projects.findIndex(item=>item.id===project.id);
  if(index>=0) projects[index]=project; else projects.unshift(project);
  saveProjects(); current=project; fillForm(project); setTab("pass");
});
document.querySelector("#new-project").addEventListener("click",resetForm);
document.querySelector("#portfolio-new").addEventListener("click",resetForm);

function money(value) {
  const number=Number(value);
  return value && Number.isFinite(number) ? new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF",maximumFractionDigits:0}).format(number) : "offen";
}
function renderPass() {
  if(!current.object) {
    document.querySelector("#project-pass").innerHTML='<div class="empty-state"><h3>Noch kein Vorhaben gewählt.</h3><p>Erfasse ein Vorhaben oder öffne eines aus dem Portfolio.</p><button class="primary-button" data-tab="portfolio">Portfolio öffnen</button></div>';
    return;
  }
  const missing=required.filter(key=>!current[key]||current[key]==="offen"||current[key]==="abzuklären");
  document.querySelector("#project-pass").innerHTML=`<article class="project-pass">
    <div class="pass-title"><div><p>${e(current.category)} · ${e(current.phase)}</p><h3>${e(current.object)}</h3><span>${e(current.measure)}</span></div><div class="status-badge ${e(current.capacity.replace(/\s/g,"-"))}"><small>Verfügbarkeit</small><strong>${e(current.capacity)}</strong></div></div>
    <div class="pass-grid">
      <section><small>Planung</small><dl><div><dt>Horizont</dt><dd>${e(current.horizon)}</dd></div><div><dt>Zeitraum</dt><dd>${e(current.startYear)}–${e(current.endYear||"offen")}</dd></div><div><dt>Strategie</dt><dd>${e(current.strategy)}</dd></div></dl></section>
      <section><small>Finanzen</small><dl><div><dt>Kosten total</dt><dd>${money(current.cost)}</dd></div><div><dt>Genauigkeit</dt><dd>${e(current.accuracy)}</dd></div><div><dt>Jahreswert</dt><dd>${e(current.annualYear)}: ${money(current.annualCost)}</dd></div></dl></section>
      <section class="wide"><small>Rollen und Leistungen</small><div class="role-chain"><div><span>01</span><b>Projektverantwortung BGR</b><strong>${e(current.bgrResponsibility)}</strong></div><i>→</i><div><span>02</span><b>Operative Projektleitung</b><strong>${e(current.projectManagement)}</strong></div><i>→</i><div><span>03</span><b>Fachleistung</b><strong>${e(current.provider)}</strong></div><i>→</i><div><span>04</span><b>Kontrolle</b><strong>${e(current.control)}</strong></div></div></section>
      <section><small>Ressourcen</small><dl><div><dt>Zeitraum</dt><dd>${e(current.capacityPeriod)}</dd></div><div><dt>Bandbreite</dt><dd>${e(current.minDays||"?")}–${e(current.maxDays||"?")} PT</dd></div><div><dt>Status</dt><dd>${e(current.capacity)}</dd></div></dl></section>
      <section><small>Nächster Entscheid</small><p class="decision">${e(current.nextDecision||"Noch zu formulieren")}</p>${current.note?`<p class="note">Annahme: ${e(current.note)}</p>`:""}</section>
    </div>
    <div class="pass-footer"><div><strong>${missing.length?`${missing.length} Punkte offen`:"Kernfragen geklärt"}</strong><span>${missing.length?missing.map(key=>requiredLabels[key]).join(" · "):"Bereit für die gemeinsame Beurteilung, keine automatische Freigabe."}</span></div><button class="secondary-button" id="copy-row">Excel Zeile kopieren</button></div>
  </article>`;
  document.querySelector("#copy-row").addEventListener("click",async event=>{
    await navigator.clipboard.writeText(coreRow(current).join("\t")); event.target.textContent="Kopiert ✓"; setTimeout(()=>event.target.textContent="Excel Zeile kopieren",1600);
  });
}

function renderPortfolio() {
  document.querySelector("#horizon-grid").innerHTML=horizons.map((horizon,index)=>`<button data-horizon="${e(horizon)}" class="${horizonFilter===horizon?"selected":""}"><span>0${index+1}</span><b>${e(horizon)}</b><strong>${projects.filter(project=>project.horizon===horizon).length}</strong><small>${["hohe Genauigkeit","vollständig, rollend schärfen","Jahressicht und Bandbreiten","erste Schätzung"][index]}</small></button>`).join("");
  const filtered=horizonFilter==="Alle"?projects:projects.filter(project=>project.horizon===horizonFilter);
  document.querySelector("#portfolio-count").innerHTML=`<strong>${filtered.length} Vorhaben</strong> · ${horizonFilter==="Alle"?"alle Horizonte":e(horizonFilter)}`;
  document.querySelector("#clear-filter").classList.toggle("hidden",horizonFilter==="Alle");
  document.querySelector("#project-list").innerHTML=filtered.map(project=>`<article><div class="project-year"><strong>${e(project.startYear)}</strong><span>bis ${e(project.endYear||"offen")}</span></div><div class="project-main"><small>${e(project.category)} · ${e(project.phase)}</small><h3>${e(project.object)}</h3><p>${e(project.measure)}</p></div><div class="project-roles"><small>Verantwortung und Leitung</small><b>${e(project.bgrResponsibility)}</b><span>${e(project.projectManagement)}</span></div><div class="project-capacity"><span class="dot ${e(project.capacity.replace(/\s/g,"-"))}"></span><b>${e(project.capacity)}</b><small>${e(project.capacityPeriod)}</small></div><button class="edit-button" data-edit="${e(project.id)}" aria-label="${e(project.object)} bearbeiten">→</button></article>`).join("");
  document.querySelectorAll("[data-horizon]").forEach(button=>button.addEventListener("click",()=>{horizonFilter=horizonFilter===button.dataset.horizon?"Alle":button.dataset.horizon;renderPortfolio();}));
  document.querySelectorAll("[data-edit]").forEach(button=>button.addEventListener("click",()=>{const project=projects.find(item=>item.id===button.dataset.edit);fillForm(project);setTab("capture");}));
}
document.querySelector("#clear-filter").addEventListener("click",()=>{horizonFilter="Alle";renderPortfolio();});

function csvEscape(value) { return `"${String(value??"").replaceAll('"','""')}"`; }
function coreRow(project) { return [project.annualYear||project.startYear,project.object,project.measure,project.category,project.cost,project.annualCost,project.accuracy,project.currentOwner,project.phase,project.endYear]; }
function download(filename,rows) {
  const content="\uFEFF"+rows.map(row=>row.map(csvEscape).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}
document.querySelector("#export-core").addEventListener("click",()=>download("BGR_Projektuebersicht_Excel.csv",[["Jahr","Objekt","Massnahmen","Projektkategorie","Kosten Total","Jährliche Kosten","Kostengenauigkeit","Zuständigkeit","Projektstatus","Fertigstellung"],...projects.map(coreRow)]));
document.querySelector("#export-roles").addEventListener("click",()=>download("BGR_Rollen_und_Ressourcen.csv",[["Objekt","Planungshorizont","Projektverantwortung BGR","Operative Projektleitung","Fachleistung / Partner","Unabhängige Kontrolle","Verfügbarkeit","Zeitraum","PT min","PT max","Nächster Entscheid","Anmerkung"],...projects.map(project=>[project.object,project.horizon,project.bgrResponsibility,project.projectManagement,project.provider,project.control,project.capacity,project.capacityPeriod,project.minDays,project.maxDays,project.nextDecision,project.note]) ]));

fillForm(emptyProject);
renderPortfolio();

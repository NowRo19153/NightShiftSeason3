const STORAGE_KEY = 'fischerAppState_v2';

const i18n = {
  en: {
    nav: { dashboard: "Dashboard", work: "Work", people: "People", settings: "Settings" },
    dashboard: { title:"Dashboard", pre:"Before 00:00", post:"After 00:00", high:"HIGH priority", addLog:"Add shift note", closeShift:"Close shift", empty:"Nothing here yet." },
    work: { title:"Work items", subtitle:"Categories are managed in Settings.", addItem:"Add work item", filters:"Filters", category:"Category", people:"People", priority:"Priority", status:"Status", section:"Time section", pre:"Before 00:00", post:"After 00:00", all:"All", none:"None" },
    people: { title:"People", subtitle:"What each person did (notes + linked items).", addNote:"Add note", empty:"No notes yet." },
    settings: { title:"Settings", appName:"App name", theme:"Theme", language:"Language", categories:"Categories", people:"People", backup:"Backup", export:"Export data", import:"Import data", reset:"Reset data", warnReset:"Warning: this deletes all local data on this device." },
    common: { save:"Save", cancel:"Cancel", delete:"Delete", edit:"Edit", markDone:"Done", notes:"Operational note", title:"Title", optional:"optional", confirmDelete:"Delete?", confirmReset:"Are you sure you want to delete all local data?" },
    enums: { priority:{normal:"normal", high:"high", critical:"critical"}, status:{pending:"pending", ongoing:"ongoing", done:"done"} },
    modals: { newItem:"New work item", editItem:"Edit work item", shiftNote:"Shift note", closeShift:"Close shift", personNote:"Person note", editCategory:"Edit category", newCategory:"New category", editPerson:"Edit person", newPerson:"New person" },
    tips: { multiAssign:"Tip: You can assign multiple people to the same item (e.g., pallets)." }
  },
  pl: {
    nav: { dashboard:"Dashboard", work:"Praca", people:"Osoby", settings:"Ustawienia" },
    dashboard: { title:"Dashboard", pre:"Do godziny 0:00", post:"After 0:00", high:"Priorytet HIGH", addLog:"Dodaj notatkę zmiany", closeShift:"Zamknij zmianę", empty:"Na razie nic tutaj nie ma." },
    work: { title:"Elementy pracy", subtitle:"Kategorie edytujesz tylko w Ustawieniach.", addItem:"Dodaj element", filters:"Filtry", category:"Kategoria", people:"Osoby", priority:"Priorytet", status:"Status", section:"Czas", pre:"Do 0:00", post:"Po 0:00", all:"Wszystko", none:"Brak" },
    people: { title:"Osoby", subtitle:"Co dokładnie robiła dana osoba (notatki + powiązane elementy).", addNote:"Dodaj notatkę", empty:"Brak notatek." },
    settings: { title:"Ustawienia", appName:"Nazwa aplikacji", theme:"Motyw", language:"Język", categories:"Kategorie", people:"Osoby", backup:"Kopia", export:"Eksport danych", import:"Import danych", reset:"Reset danych", warnReset:"Uwaga: usuwa wszystkie dane na tym urządzeniu." },
    common: { save:"Zapisz", cancel:"Anuluj", delete:"Usuń", edit:"Edytuj", markDone:"Zrobione", notes:"Notatka operacyjna", title:"Tytuł", optional:"opcjonalnie", confirmDelete:"Usunąć?", confirmReset:"Na pewno usunąć wszystkie dane?" },
    enums: { priority:{normal:"normal", high:"high", critical:"critical"}, status:{pending:"pending", ongoing:"ongoing", done:"done"} },
    modals: { newItem:"Nowy element", editItem:"Edytuj element", shiftNote:"Notatka zmiany", closeShift:"Zamknij zmianę", personNote:"Notatka osoby", editCategory:"Edytuj kategorię", newCategory:"Nowa kategoria", editPerson:"Edytuj osobę", newPerson:"Nowa osoba" },
    tips: { multiAssign:"Tip: Możesz przypisać kilka osób do jednego elementu (np. palety)." }
  }
};

let state = {
  settings: { appName:"Fischer", theme:"dark", lang:"en", workFilters:{categoryId:"all", personId:"all", priority:"all", status:"all", section:"all"} },
  categories: [],
  people: [],
  workItems: [],
  shiftNotes: [],
  personNotes: [],
  lastShiftClose: null
};

function t(path){
  const dict = i18n[state.settings?.lang] || i18n.en;
  return path.split(".").reduce((a,k)=> (a && a[k]!=null)?a[k]:null, dict) ?? path;
}

function nowISO(){ return new Date().toISOString(); }
function todayISO(){ return new Date().toISOString().slice(0,10); }

function escapeHtml(s){
  if(s==null) return "";
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,"&quot;"); }
function slug(name){ return name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,""); }

function formatTime(iso){
  try{
    const d=new Date(iso);
    return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
  }catch{return iso;}
}

function renderMultiline(text){
  // preserve Enter/new lines
  return escapeHtml(text).replace(/\n/g,"<br>");
}

function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw) state = Object.assign({}, state, JSON.parse(raw));
  }catch(e){ console.log(e); }
  ensureDefaults();
  migrateIfNeeded();
}

function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.log(e); }
}

function ensureDefaults(){
  if(!state.settings) state.settings={appName:"Fischer",theme:"dark",lang:"en",workFilters:{categoryId:"all",personId:"all",priority:"all",status:"all",section:"all"}};
  if(!state.settings.workFilters) state.settings.workFilters={categoryId:"all",personId:"all",priority:"all",status:"all",section:"all"};
  if(!Array.isArray(state.categories)||!state.categories.length){
    state.categories=[{id:"palety",name:"Palety NO/FI"},{id:"parcel",name:"Parcel NO/SE/FI"},{id:"replenish",name:"Replenish"},{id:"inbound",name:"Inbound"},{id:"it",name:"Problemy / IT"},{id:"kaizen",name:"Usprawnienia"},{id:"inne",name:"Inne"}];
  }
  if(!Array.isArray(state.people)||!state.people.length){
    state.people=[{id:"fabian",name:"Fabian",role:""},{id:"johnny",name:"Johnny",role:""},{id:"stanley",name:"Stanley",role:""},{id:"roman",name:"Roman",role:""},{id:"lars",name:"Lars",role:"Vikar"}];
  }
  if(!Array.isArray(state.workItems)) state.workItems=[];
  if(!Array.isArray(state.shiftNotes)) state.shiftNotes=[];
  if(!Array.isArray(state.personNotes)) state.personNotes=[];
}

function migrateIfNeeded(){
  // migrate from single personId to multi assigneeIds
  let changed=false;
  for(const w of state.workItems){
    if(!Array.isArray(w.assigneeIds)){
      if(w.personId) w.assigneeIds=[w.personId];
      else w.assigneeIds=[];
      changed=true;
    }
    if(!w.createdAt){ w.createdAt = w.updatedAt || nowISO(); changed=true; }
    if(!w.updatedAt){ w.updatedAt = nowISO(); changed=true; }
  }
  if(changed) saveState();
}

function applyTheme(){
  document.body.classList.remove("theme-dark","theme-light","theme-slate");
  const th=state.settings.theme||"dark";
  document.body.classList.add("theme-"+th);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", th==="light"?"#f4f4f5":"#020617");
}

function applyNavLabels(){
  const map={dashboard:"nav.dashboard",work:"nav.work",people:"nav.people",settings:"nav.settings"};
  document.querySelectorAll(".nav-tab").forEach(b=>{
    const v=b.getAttribute("data-view");
    if(map[v]) b.textContent=t(map[v]);
  });
}

function initApp(){
  loadState();
  applyTheme();
  document.getElementById("appTitle").textContent=state.settings.appName||"Fischer";
  document.title=state.settings.appName||"Fischer";
  applyNavLabels();
  renderDashboard();
}

function switchView(view,btn){
  document.querySelectorAll(".nav-tab").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");
  if(view==="dashboard") renderDashboard();
  if(view==="work") renderWork();
  if(view==="people") renderPeople();
  if(view==="settings") renderSettings();
}

function badgePriority(p){
  if(p==="critical") return `<span class="badge badge-danger">${escapeHtml(t("enums.priority.critical"))}</span>`;
  if(p==="high") return `<span class="badge badge-warn">${escapeHtml(t("enums.priority.high"))}</span>`;
  return `<span class="badge">${escapeHtml(t("enums.priority.normal"))}</span>`;
}
function badgeStatus(s){
  if(s==="done") return `<span class="badge badge-accent">${escapeHtml(t("enums.status.done"))}</span>`;
  if(s==="ongoing") return `<span class="badge badge-warn">${escapeHtml(t("enums.status.ongoing"))}</span>`;
  return `<span class="badge">${escapeHtml(t("enums.status.pending"))}</span>`;
}
function sectionLabel(sec){ return sec==="post"?t("dashboard.post"):t("dashboard.pre"); }

function peopleBadges(assigneeIds){
  const ids = Array.isArray(assigneeIds) ? assigneeIds : [];
  if(!ids.length) return "";
  const names = ids.map(id=>state.people.find(p=>p.id===id)).filter(Boolean)
    .map(p=>`${p.name}${p.role?` (${p.role})`:""}`);
  return names.map(n=>`<span class="badge">${escapeHtml(n)}</span>`).join("");
}

function renderDashboard(){
  const main=document.getElementById("mainView");
  const pre=state.shiftNotes.filter(n=>n.section==="pre").sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const post=state.shiftNotes.filter(n=>n.section==="post").sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const high=state.workItems.filter(w=>(w.priority==="high"||w.priority==="critical")&&w.status!=="done").sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const kpi={pending:state.workItems.filter(w=>w.status==="pending").length,ongoing:state.workItems.filter(w=>w.status==="ongoing").length,done:state.workItems.filter(w=>w.status==="done").length};

  main.innerHTML=`
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">${escapeHtml(t("dashboard.title"))}</div>
          <div class="card-subtitle">${escapeHtml(todayISO())}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-secondary" onclick="openShiftNoteModal()">${escapeHtml(t("dashboard.addLog"))}</button>
          <button class="btn-primary" onclick="openCloseShiftModal()">${escapeHtml(t("dashboard.closeShift"))}</button>
        </div>
      </div>
      <div class="kpi">
        <span class="badge badge-warn">pending: ${kpi.pending}</span>
        <span class="badge badge-warn">ongoing: ${kpi.ongoing}</span>
        <span class="badge badge-accent">done: ${kpi.done}</span>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div><div class="card-title">${escapeHtml(t("dashboard.pre"))}</div><div class="card-subtitle">${escapeHtml(t("dashboard.addLog"))}</div></div></div>
        ${renderNoteList(pre)}
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">${escapeHtml(t("dashboard.post"))}</div><div class="card-subtitle">${escapeHtml(t("dashboard.addLog"))}</div></div></div>
        ${renderNoteList(post)}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div><div class="card-title">${escapeHtml(t("dashboard.high"))}</div><div class="card-subtitle">${escapeHtml(t("tips.multiAssign"))}</div></div>
        <button class="btn-secondary" onclick="switchView('work', document.querySelector('[data-view=\\'work\\']'))">${escapeHtml(t("nav.work"))}</button>
      </div>
      ${renderWorkList(high, t("dashboard.empty"))}
    </div>`;
}

function renderNoteList(list){
  if(!list.length) return `<p class="small-text">${escapeHtml(t("dashboard.empty"))}</p>`;
  return `<div class="task-list">`+list.slice(0,12).map(n=>`
    <div class="task-item">
      <div class="task-main">
        <div class="task-title" style="white-space:pre-wrap;">${renderMultiline(n.text)}</div>
        <div class="task-meta"><span class="badge">${escapeHtml(sectionLabel(n.section))}</span><span class="badge">${escapeHtml(formatTime(n.createdAt))}</span></div>
      </div>
      <div class="task-actions">
        <button class="btn-small" onclick="openShiftNoteModal('${escapeAttr(n.id)}')">${escapeHtml(t("common.edit"))}</button>
        <button class="btn-small btn-small-danger" onclick="deleteShiftNote('${escapeAttr(n.id)}')">${escapeHtml(t("common.delete"))}</button>
      </div>
    </div>`).join("")+`</div>`;
}

function renderWork(){
  const main=document.getElementById("mainView");
  const f=state.settings.workFilters;

  const list=state.workItems.filter(w=>{
    if(f.categoryId!=="all" && (w.categoryId||"")!==f.categoryId) return false;
    if(f.personId!=="all"){
      const ids = Array.isArray(w.assigneeIds)?w.assigneeIds:[];
      if(!ids.includes(f.personId)) return false;
    }
    if(f.priority!=="all" && (w.priority||"normal")!==f.priority) return false;
    if(f.status!=="all" && (w.status||"pending")!==f.status) return false;
    if(f.section!=="all" && (w.section||"pre")!==f.section) return false;
    return true;
  }).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));

  main.innerHTML=`
    <div class="card">
      <div class="card-header">
        <div><div class="card-title">${escapeHtml(t("work.title"))}</div><div class="card-subtitle">${escapeHtml(t("work.subtitle"))}</div></div>
        <button class="btn-primary" onclick="openWorkItemModal()">${escapeHtml(t("work.addItem"))}</button>
      </div>
      <div class="section-label">${escapeHtml(t("work.filters"))}</div>
      <div class="grid-2">
        <div class="form-row"><label class="form-label">${escapeHtml(t("work.category"))}</label>
          <select class="form-select" onchange="setWorkFilter('categoryId', this.value)">
            <option value="all">${escapeHtml(t("work.all"))}</option>
            ${state.categories.map(c=>`<option value="${escapeAttr(c.id)}" ${f.categoryId===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-row"><label class="form-label">${escapeHtml(t("work.people"))}</label>
          <select class="form-select" onchange="setWorkFilter('personId', this.value)">
            <option value="all">${escapeHtml(t("work.all"))}</option>
            ${state.people.map(p=>`<option value="${escapeAttr(p.id)}" ${f.personId===p.id?'selected':''}>${escapeHtml(p.name)}${p.role?` (${escapeHtml(p.role)})`:''}</option>`).join("")}
          </select>
        </div>
        <div class="form-row"><label class="form-label">${escapeHtml(t("work.priority"))}</label>
          <select class="form-select" onchange="setWorkFilter('priority', this.value)">
            <option value="all">${escapeHtml(t("work.all"))}</option>
            <option value="normal" ${f.priority==='normal'?'selected':''}>${escapeHtml(t("enums.priority.normal"))}</option>
            <option value="high" ${f.priority==='high'?'selected':''}>${escapeHtml(t("enums.priority.high"))}</option>
            <option value="critical" ${f.priority==='critical'?'selected':''}>${escapeHtml(t("enums.priority.critical"))}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">${escapeHtml(t("work.status"))}</label>
          <select class="form-select" onchange="setWorkFilter('status', this.value)">
            <option value="all">${escapeHtml(t("work.all"))}</option>
            <option value="pending" ${f.status==='pending'?'selected':''}>${escapeHtml(t("enums.status.pending"))}</option>
            <option value="ongoing" ${f.status==='ongoing'?'selected':''}>${escapeHtml(t("enums.status.ongoing"))}</option>
            <option value="done" ${f.status==='done'?'selected':''}>${escapeHtml(t("enums.status.done"))}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">${escapeHtml(t("work.section"))}</label>
          <select class="form-select" onchange="setWorkFilter('section', this.value)">
            <option value="all">${escapeHtml(t("work.all"))}</option>
            <option value="pre" ${f.section==='pre'?'selected':''}>${escapeHtml(t("work.pre"))}</option>
            <option value="post" ${f.section==='post'?'selected':''}>${escapeHtml(t("work.post"))}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">&nbsp;</label>
          <button class="btn-secondary" onclick="clearWorkFilters()">${escapeHtml(t("work.all"))}</button>
        </div>
      </div>
    </div>
    <div class="card"><div class="card-header"><div class="card-title">${escapeHtml(t("work.title"))}</div></div>
      ${renderWorkList(list, t("dashboard.empty"))}
    </div>`;
}

function setWorkFilter(k,v){ state.settings.workFilters[k]=v; saveState(); renderWork(); }
function clearWorkFilters(){ state.settings.workFilters={categoryId:"all",personId:"all",priority:"all",status:"all",section:"all"}; saveState(); renderWork(); }

function renderWorkList(list, emptyText){
  if(!list.length) return `<p class="small-text">${escapeHtml(emptyText)}</p>`;
  return `<div class="task-list">`+list.map(w=>{
    const cat=state.categories.find(c=>c.id===w.categoryId);
    return `<div class="task-item">
      <div class="task-main">
        <div class="task-title">${escapeHtml(w.title)}</div>
        <div class="task-meta">
          <span class="badge">${escapeHtml(cat?cat.name:t("work.none"))}</span>
          <span class="badge">${escapeHtml(sectionLabel(w.section||"pre"))}</span>
          ${badgePriority(w.priority||"normal")}
          ${badgeStatus(w.status||"pending")}
          ${peopleBadges(w.assigneeIds)}
        </div>
        ${w.notes?`<div class="small-text" style="margin-top:4px;white-space:pre-wrap;">${renderMultiline(w.notes)}</div>`:""}
      </div>
      <div class="task-actions">
        <button class="btn-small btn-small-accent" onclick="setWorkStatus('${escapeAttr(w.id)}','done')">${escapeHtml(t("common.markDone"))}</button>
        <button class="btn-small" onclick="openWorkItemModal('${escapeAttr(w.id)}')">${escapeHtml(t("common.edit"))}</button>
        <button class="btn-small btn-small-danger" onclick="deleteWorkItem('${escapeAttr(w.id)}')">${escapeHtml(t("common.delete"))}</button>
      </div>
    </div>`;
  }).join("")+`</div>`;
}

function openWorkItemModal(id=""){
  const ex=id?state.workItems.find(w=>w.id===id):null;
  const selected = new Set(Array.isArray(ex?.assigneeIds)?ex.assigneeIds:[]);
  showModal(ex?t("modals.editItem"):t("modals.newItem"),`
    <form id="workItemForm">
      <div class="form-row"><label class="form-label">${escapeHtml(t("common.title"))}</label>
        <input class="form-input" name="title" value="${ex?escapeAttr(ex.title):""}" required>
      </div>

      <div class="grid-2">
        <div class="form-row"><label class="form-label">${escapeHtml(t("work.category"))}</label>
          <select class="form-select" name="categoryId">
            <option value="">${escapeHtml(t("work.none"))}</option>
            ${state.categories.map(c=>`<option value="${escapeAttr(c.id)}" ${(ex?.categoryId===c.id)?'selected':''}>${escapeHtml(c.name)}</option>`).join("")}
          </select>
        </div>

        <div class="form-row"><label class="form-label">${escapeHtml(t("work.people"))}</label>
          <div class="card" style="padding:8px 10px;">
            ${state.people.map(p=>`
              <label style="display:flex;align-items:center;gap:8px;margin:6px 0;">
                <input type="checkbox" name="assignees" value="${escapeAttr(p.id)}" ${selected.has(p.id)?"checked":""}>
                <span>${escapeHtml(p.name)}${p.role?` <span class="badge">${escapeHtml(p.role)}</span>`:""}</span>
              </label>
            `).join("")}
            <div class="small-text">${escapeHtml(t("tips.multiAssign"))}</div>
          </div>
        </div>

        <div class="form-row"><label class="form-label">${escapeHtml(t("work.priority"))}</label>
          <select class="form-select" name="priority">
            <option value="normal" ${(ex?.priority||"normal")==="normal"?'selected':''}>${escapeHtml(t("enums.priority.normal"))}</option>
            <option value="high" ${ex?.priority==="high"?'selected':''}>${escapeHtml(t("enums.priority.high"))}</option>
            <option value="critical" ${ex?.priority==="critical"?'selected':''}>${escapeHtml(t("enums.priority.critical"))}</option>
          </select>
        </div>

        <div class="form-row"><label class="form-label">${escapeHtml(t("work.status"))}</label>
          <select class="form-select" name="status">
            <option value="pending" ${(ex?.status||"pending")==="pending"?'selected':''}>${escapeHtml(t("enums.status.pending"))}</option>
            <option value="ongoing" ${ex?.status==="ongoing"?'selected':''}>${escapeHtml(t("enums.status.ongoing"))}</option>
            <option value="done" ${ex?.status==="done"?'selected':''}>${escapeHtml(t("enums.status.done"))}</option>
          </select>
        </div>

        <div class="form-row"><label class="form-label">${escapeHtml(t("work.section"))}</label>
          <select class="form-select" name="section">
            <option value="pre" ${(ex?.section||"pre")==="pre"?'selected':''}>${escapeHtml(t("work.pre"))}</option>
            <option value="post" ${ex?.section==="post"?'selected':''}>${escapeHtml(t("work.post"))}</option>
          </select>
        </div>
      </div>

      <div class="form-row"><label class="form-label">${escapeHtml(t("common.notes"))} (${escapeHtml(t("common.optional"))})</label>
        <textarea class="form-textarea" name="notes" placeholder="...">${ex?escapeHtml(ex.notes||""):""}</textarea>
      </div>
    </form>`,`
    <button class="btn-secondary" onclick="hideModal()">${escapeHtml(t("common.cancel"))}</button>
    <button class="btn-primary" onclick="submitWorkItem('${escapeAttr(id)}')">${escapeHtml(t("common.save"))}</button>`);
}

function submitWorkItem(id=""){
  const f=document.getElementById("workItemForm"); if(!f) return;
  const title=f.title.value.trim(); if(!title) return;
  const assigneeIds = Array.from(f.querySelectorAll('input[name="assignees"]:checked')).map(x=>x.value);

  const payload={title,categoryId:f.categoryId.value||"",assigneeIds,priority:f.priority.value||"normal",status:f.status.value||"pending",section:f.section.value||"pre",notes:(f.notes.value||"")};

  if(id){
    const w=state.workItems.find(x=>x.id===id); if(!w) return;
    Object.assign(w,payload); w.updatedAt=nowISO();
  }else{
    state.workItems.push({id:"w_"+Date.now()+"_"+Math.random().toString(36).slice(2),...payload,createdAt:nowISO(),updatedAt:nowISO()});
  }
  saveState(); hideModal(); renderWork();
}

function setWorkStatus(id,status){
  const w=state.workItems.find(x=>x.id===id); if(!w) return;
  w.status=status; w.updatedAt=nowISO(); saveState();
  const active=document.querySelector(".nav-tab.active")?.getAttribute("data-view")||"dashboard";
  if(active==="dashboard") renderDashboard(); else if(active==="work") renderWork(); else if(active==="people") renderPeople();
}

function deleteWorkItem(id){ if(!confirm(t("common.confirmDelete"))) return; state.workItems=state.workItems.filter(x=>x.id!==id); saveState(); renderWork(); }

function openShiftNoteModal(editId=""){
  const ex=editId?state.shiftNotes.find(n=>n.id===editId):null;
  showModal(t("modals.shiftNote"),`
    <form id="shiftNoteForm">
      <div class="form-row"><label class="form-label">${escapeHtml(t("work.section"))}</label>
        <select class="form-select" name="section">
          <option value="pre" ${(ex?.section||"pre")==="pre"?'selected':''}>${escapeHtml(t("work.pre"))}</option>
          <option value="post" ${ex?.section==="post"?'selected':''}>${escapeHtml(t("work.post"))}</option>
        </select>
      </div>
      <div class="form-row"><label class="form-label">${escapeHtml(t("common.notes"))}</label>
        <textarea class="form-textarea" name="text" required placeholder="...">${ex?escapeHtml(ex.text):""}</textarea>
      </div>
    </form>`,`
    <button class="btn-secondary" onclick="hideModal()">${escapeHtml(t("common.cancel"))}</button>
    <button class="btn-primary" onclick="submitShiftNote('${escapeAttr(editId)}')">${escapeHtml(t("common.save"))}</button>`);
}

function submitShiftNote(editId=""){
  const f=document.getElementById("shiftNoteForm"); if(!f) return;
  const text=f.text.value.trim(); if(!text) return; const section=f.section.value||"pre";
  if(editId){
    const n=state.shiftNotes.find(x=>x.id===editId); if(!n) return;
    n.text=text; n.section=section; n.updatedAt=nowISO();
  }else{
    state.shiftNotes.push({id:"n_"+Date.now()+"_"+Math.random().toString(36).slice(2),text,section,createdAt:nowISO(),updatedAt:nowISO()});
  }
  saveState(); hideModal(); renderDashboard();
}
function deleteShiftNote(id){ if(!confirm(t("common.confirmDelete"))) return; state.shiftNotes=state.shiftNotes.filter(x=>x.id!==id); saveState(); renderDashboard(); }

function openCloseShiftModal(){
  showModal(t("modals.closeShift"),`
    <div class="small-text" style="margin-bottom:8px;">${escapeHtml(t("dashboard.closeShift"))}: ${escapeHtml(todayISO())}</div>
    <form id="closeShiftForm">
      <div class="form-row"><label class="form-label">${escapeHtml(t("common.notes"))} (${escapeHtml(t("common.optional"))})</label>
        <textarea class="form-textarea" name="text" placeholder="Summary, handover, blockers..."></textarea>
      </div>
    </form>
    <div class="small-text">This generates a .txt report.</div>`,`
    <button class="btn-secondary" onclick="hideModal()">${escapeHtml(t("common.cancel"))}</button>
    <button class="btn-primary" onclick="closeShiftNow()">${escapeHtml(t("dashboard.closeShift"))}</button>`);
}

function closeShiftNow(){
  const extra=document.getElementById("closeShiftForm")?.text?.value||"";
  const stamp=nowISO(); state.lastShiftClose=stamp; saveState(); hideModal();

  const lines=[];
  lines.push(`${state.settings.appName} - Shift report`);
  lines.push(`Date: ${todayISO()}`);
  lines.push(`Closed at: ${stamp}`);
  lines.push("");

  lines.push("=== Before 00:00 notes ===");
  state.shiftNotes.filter(n=>n.section==="pre").sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).forEach(n=>{
    n.text.split("\n").forEach((ln,i)=>lines.push(i===0?`- [${formatTime(n.createdAt)}] ${ln}`:`  ${ln}`));
  });

  lines.push("");
  lines.push("=== After 00:00 notes ===");
  state.shiftNotes.filter(n=>n.section==="post").sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).forEach(n=>{
    n.text.split("\n").forEach((ln,i)=>lines.push(i===0?`- [${formatTime(n.createdAt)}] ${ln}`:`  ${ln}`));
  });

  lines.push("");
  lines.push("=== Work items (open) ===");
  state.workItems.filter(w=>w.status!=="done").sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt)).forEach(w=>{
    const cat=state.categories.find(c=>c.id===w.categoryId)?.name||"";
    const names=(Array.isArray(w.assigneeIds)?w.assigneeIds:[]).map(id=>state.people.find(p=>p.id===id)?.name).filter(Boolean).join(", ");
    lines.push(`- ${w.title} | ${cat} | ${w.priority} | ${w.status} | ${w.section}${names?(" | "+names):""}`);
    if(w.notes){
      w.notes.split("\n").forEach((ln,i)=>lines.push(i===0?`  note: ${ln}`:`        ${ln}`));
    }
  });

  lines.push("");
  lines.push("=== People notes ===");
  state.people.forEach(p=>{
    const notes=state.personNotes.filter(n=>n.personId===p.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    if(!notes.length) return;
    lines.push(`-- ${p.name}${p.role?(" ("+p.role+")"):""} --`);
    notes.forEach(n=>{
      n.text.split("\n").forEach((ln,i)=>lines.push(i===0?`  - [${formatTime(n.createdAt)}] ${ln}`:`               ${ln}`));
    });
  });

  if(extra && extra.trim()){
    lines.push("");
    lines.push("=== Extra summary ===");
    extra.split("\n").forEach(ln=>lines.push(ln));
  }

  downloadText(lines.join("\n"), `shift_report_${todayISO()}.txt`);
  renderDashboard();
}

function downloadText(text, filename){
  const blob=new Blob([text],{type:"text/plain"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

function renderPeople(){
  const main=document.getElementById("mainView");
  const cards=state.people.map(p=>{
    const notes=state.personNotes.filter(n=>n.personId===p.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const linked=state.workItems.filter(w=>(Array.isArray(w.assigneeIds)?w.assigneeIds:[]).includes(p.id)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    return `<div class="card">
      <div class="card-header">
        <div><div class="card-title">${escapeHtml(p.name)}${p.role?` <span class="badge">${escapeHtml(p.role)}</span>`:""}</div>
          <div class="card-subtitle">${escapeHtml(t("people.subtitle"))}</div></div>
        <button class="btn-secondary" onclick="openPersonNoteModal('${escapeAttr(p.id)}')">${escapeHtml(t("people.addNote"))}</button>
      </div>
      <div class="section-label">Notes</div>
      ${renderPersonNoteList(notes,p.id)}
      <div class="section-label">Linked items</div>
      ${renderWorkList(linked.slice(0,8), t("people.empty"))}
    </div>`;
  }).join("");
  main.innerHTML=`<div class="card"><div class="card-header"><div><div class="card-title">${escapeHtml(t("people.title"))}</div><div class="card-subtitle">${escapeHtml(t("people.subtitle"))}</div></div></div>
    <p class="small-text">${escapeHtml(t("tips.multiAssign"))}</p></div>${cards}`;
}

function renderPersonNoteList(list, personId){
  if(!list.length) return `<p class="small-text">${escapeHtml(t("people.empty"))}</p>`;
  return `<div class="task-list">`+list.slice(0,10).map(n=>`
    <div class="task-item">
      <div class="task-main">
        <div class="task-title" style="white-space:pre-wrap;">${renderMultiline(n.text)}</div>
        <div class="task-meta"><span class="badge">${escapeHtml(formatTime(n.createdAt))}</span></div>
      </div>
      <div class="task-actions">
        <button class="btn-small" onclick="openPersonNoteModal('${escapeAttr(personId)}','${escapeAttr(n.id)}')">${escapeHtml(t("common.edit"))}</button>
        <button class="btn-small btn-small-danger" onclick="deletePersonNote('${escapeAttr(n.id)}')">${escapeHtml(t("common.delete"))}</button>
      </div>
    </div>`).join("")+`</div>`;
}

function openPersonNoteModal(personId, noteId=""){
  const person=state.people.find(p=>p.id===personId);
  const ex=noteId?state.personNotes.find(n=>n.id===noteId):null;
  showModal(t("modals.personNote"),`
    <div class="small-text" style="margin-bottom:6px;">${escapeHtml(person?person.name:"")}</div>
    <form id="personNoteForm">
      <div class="form-row"><label class="form-label">${escapeHtml(t("common.notes"))}</label>
        <textarea class="form-textarea" name="text" required>${ex?escapeHtml(ex.text):""}</textarea>
      </div>
    </form>`,`
    <button class="btn-secondary" onclick="hideModal()">${escapeHtml(t("common.cancel"))}</button>
    <button class="btn-primary" onclick="submitPersonNote('${escapeAttr(personId)}','${escapeAttr(noteId)}')">${escapeHtml(t("common.save"))}</button>`);
}

function submitPersonNote(personId, noteId=""){
  const f=document.getElementById("personNoteForm"); if(!f) return;
  const text=f.text.value.trim(); if(!text) return;
  if(noteId){
    const n=state.personNotes.find(x=>x.id===noteId); if(!n) return;
    n.text=text; n.updatedAt=nowISO();
  }else{
    state.personNotes.push({id:"pn_"+Date.now()+"_"+Math.random().toString(36).slice(2),personId,text,createdAt:nowISO(),updatedAt:nowISO()});
  }
  saveState(); hideModal(); renderPeople();
}
function deletePersonNote(noteId){ if(!confirm(t("common.confirmDelete"))) return; state.personNotes=state.personNotes.filter(n=>n.id!==noteId); saveState(); renderPeople(); }

function renderSettings(){
  const main=document.getElementById("mainView");
  main.innerHTML=`
    <div class="card"><div class="card-header"><div class="card-title">${escapeHtml(t("settings.title"))}</div></div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">${escapeHtml(t("settings.appName"))}</div></div>
          <form onsubmit="updateAppName(event)">
            <div class="form-row"><label class="form-label">${escapeHtml(t("settings.appName"))}</label>
              <input class="form-input" name="appName" value="${escapeAttr(state.settings.appName)}" required>
            </div>
            <button class="btn-primary" type="submit">${escapeHtml(t("common.save"))}</button>
          </form>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">${escapeHtml(t("settings.language"))}</div></div>
          <form onsubmit="updateLanguage(event)">
            <div class="form-row"><label class="form-label">${escapeHtml(t("settings.language"))}</label>
              <select class="form-select" name="lang">
                <option value="en" ${state.settings.lang==='en'?'selected':''}>English</option>
                <option value="pl" ${state.settings.lang==='pl'?'selected':''}>Polski</option>
              </select>
            </div>
            <button class="btn-primary" type="submit">${escapeHtml(t("common.save"))}</button>
          </form>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">${escapeHtml(t("settings.theme"))}</div></div>
          <form onsubmit="updateTheme(event)">
            <div class="form-row"><label class="form-label">${escapeHtml(t("settings.theme"))}</label>
              <select class="form-select" name="theme">
                <option value="dark" ${state.settings.theme==='dark'?'selected':''}>Dark</option>
                <option value="light" ${state.settings.theme==='light'?'selected':''}>Light</option>
                <option value="slate" ${state.settings.theme==='slate'?'selected':''}>Slate</option>
              </select>
            </div>
            <button class="btn-primary" type="submit">${escapeHtml(t("common.save"))}</button>
          </form>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">${escapeHtml(t("settings.backup"))}</div></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
            <button class="btn-primary" onclick="exportData()">${escapeHtml(t("settings.export"))}</button>
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
              ${escapeHtml(t("settings.import"))}
              <input type="file" id="importFile" accept="application/json" style="display:none;" onchange="importData(event)">
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div><div class="card-title">${escapeHtml(t("settings.categories"))}</div></div>
        <button class="btn-secondary" onclick="openCategoryModal()">${escapeHtml("Add")}</button>
      </div>
      ${renderCategoryManager()}
    </div>

    <div class="card">
      <div class="card-header"><div><div class="card-title">${escapeHtml(t("settings.people"))}</div></div>
        <button class="btn-secondary" onclick="openPersonManagerModal()">${escapeHtml("Add")}</button>
      </div>
      ${renderPeopleManager()}
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">${escapeHtml(t("settings.reset"))}</div></div>
      <p class="small-text">${escapeHtml(t("settings.warnReset"))}</p>
      <button class="btn-small btn-small-danger" onclick="resetAll()">${escapeHtml(t("settings.reset"))}</button>
    </div>`;
}

function renderCategoryManager(){
  return `<div class="task-list">`+state.categories.map(c=>`
    <div class="task-item">
      <div class="task-main"><div class="task-title">${escapeHtml(c.name)}</div><div class="task-meta"><span class="badge">${escapeHtml(c.id)}</span></div></div>
      <div class="task-actions">
        <button class="btn-small" onclick="openCategoryModal('${escapeAttr(c.id)}')">${escapeHtml(t("common.edit"))}</button>
        <button class="btn-small btn-small-danger" onclick="deleteCategory('${escapeAttr(c.id)}')">${escapeHtml(t("common.delete"))}</button>
      </div>
    </div>`).join("")+`</div>`;
}

function openCategoryModal(catId=""){
  const ex=catId?state.categories.find(c=>c.id===catId):null;
  showModal(ex?t("modals.editCategory"):t("modals.newCategory"),`
    <form id="catForm">
      <div class="form-row"><label class="form-label">${escapeHtml(t("common.title"))}</label>
        <input class="form-input" name="name" value="${ex?escapeAttr(ex.name):""}" required>
      </div>
    </form>`,`
    <button class="btn-secondary" onclick="hideModal()">${escapeHtml(t("common.cancel"))}</button>
    <button class="btn-primary" onclick="submitCategory('${escapeAttr(catId)}')">${escapeHtml(t("common.save"))}</button>`);
}
function submitCategory(catId=""){
  const f=document.getElementById("catForm"); const name=f?.name?.value?.trim(); if(!name) return;
  if(catId){ const c=state.categories.find(x=>x.id===catId); if(c) c.name=name; }
  else{ const id=slug(name)+"_"+Math.random().toString(36).slice(2,6); state.categories.push({id,name}); }
  saveState(); hideModal(); renderSettings();
}
function deleteCategory(catId){
  const c=state.categories.find(x=>x.id===catId); if(!c) return;
  if(!confirm(t("common.confirmDelete")+" "+c.name)) return;
  state.categories=state.categories.filter(x=>x.id!==catId);
  state.workItems.forEach(w=>{ if(w.categoryId===catId) w.categoryId=""; });
  saveState(); renderSettings();
}

function renderPeopleManager(){
  return `<div class="task-list">`+state.people.map(p=>`
    <div class="task-item">
      <div class="task-main"><div class="task-title">${escapeHtml(p.name)}${p.role?` <span class="badge">${escapeHtml(p.role)}</span>`:""}</div><div class="task-meta"><span class="badge">${escapeHtml(p.id)}</span></div></div>
      <div class="task-actions">
        <button class="btn-small" onclick="openPersonManagerModal('${escapeAttr(p.id)}')">${escapeHtml(t("common.edit"))}</button>
        <button class="btn-small btn-small-danger" onclick="deletePerson('${escapeAttr(p.id)}')">${escapeHtml(t("common.delete"))}</button>
      </div>
    </div>`).join("")+`</div>`;
}
function openPersonManagerModal(personId=""){
  const ex=personId?state.people.find(p=>p.id===personId):null;
  showModal(ex?t("modals.editPerson"):t("modals.newPerson"),`
    <form id="personForm">
      <div class="form-row"><label class="form-label">Name</label><input class="form-input" name="name" value="${ex?escapeAttr(ex.name):""}" required></div>
      <div class="form-row"><label class="form-label">Role (${escapeHtml(t("common.optional"))})</label><input class="form-input" name="role" value="${ex?escapeAttr(ex.role||""):""}></div>
    </form>`,`
    <button class="btn-secondary" onclick="hideModal()">${escapeHtml(t("common.cancel"))}</button>
    <button class="btn-primary" onclick="submitPerson('${escapeAttr(personId)}')">${escapeHtml(t("common.save"))}</button>`);
}
function submitPerson(personId=""){
  const f=document.getElementById("personForm"); const name=f?.name?.value?.trim(); const role=f?.role?.value?.trim()||""; if(!name) return;
  if(personId){ const p=state.people.find(x=>x.id===personId); if(p){p.name=name;p.role=role;} }
  else{ const id=slug(name)+"_"+Math.random().toString(36).slice(2,6); state.people.push({id,name,role}); }
  saveState(); hideModal(); renderSettings();
}
function deletePerson(personId){
  const p=state.people.find(x=>x.id===personId); if(!p) return;
  if(!confirm(t("common.confirmDelete")+" "+p.name)) return;
  state.people=state.people.filter(x=>x.id!==personId);
  state.workItems.forEach(w=>{ w.assigneeIds=(Array.isArray(w.assigneeIds)?w.assigneeIds:[]).filter(id=>id!==personId); });
  state.personNotes=state.personNotes.filter(n=>n.personId!==personId);
  saveState(); renderSettings();
}

function updateAppName(e){ e.preventDefault(); const name=e.target.appName.value.trim(); if(!name) return;
  state.settings.appName=name; saveState();
  document.getElementById("appTitle").textContent=name; document.title=name;
  alert("Saved.");
}
function updateTheme(e){ e.preventDefault(); state.settings.theme=e.target.theme.value; saveState(); applyTheme(); alert("Saved."); }
function updateLanguage(e){
  e.preventDefault();
  state.settings.lang=e.target.lang.value; saveState();
  applyNavLabels();
  const active=document.querySelector(".nav-tab.active")?.getAttribute("data-view")||"dashboard";
  if(active==="dashboard") renderDashboard();
  else if(active==="work") renderWork();
  else if(active==="people") renderPeople();
  else renderSettings();
}

function exportData(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="fischer_backup.json"; a.click(); URL.revokeObjectURL(url); }
function importData(evt){
  const file=evt.target.files[0]; if(!file) return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const loaded=JSON.parse(e.target.result);
      if(!confirm("Replace current data with imported data?")) return;
      state=Object.assign({}, state, loaded);
      ensureDefaults(); migrateIfNeeded(); saveState(); applyTheme(); applyNavLabels();
      document.getElementById("appTitle").textContent=state.settings.appName||"Fischer"; document.title=state.settings.appName||"Fischer";
      renderDashboard();
    }catch(err){ alert("Import failed."); }
    evt.target.value="";
  };
  r.readAsText(file);
}
function resetAll(){
  if(!confirm(t("common.confirmReset"))) return;
  localStorage.removeItem(STORAGE_KEY);
  state={settings:{appName:"Fischer",theme:"dark",lang:"en",workFilters:{categoryId:"all",personId:"all",priority:"all",status:"all",section:"all"}},categories:[],people:[],workItems:[],shiftNotes:[],personNotes:[],lastShiftClose:null};
  ensureDefaults(); saveState(); applyTheme(); applyNavLabels();
  document.getElementById("appTitle").textContent=state.settings.appName; document.title=state.settings.appName;
  renderDashboard();
}

function showModal(title, body, footer){
  document.getElementById("modalTitle").textContent=title;
  document.getElementById("modalBody").innerHTML=body;
  document.getElementById("modalFooter").innerHTML=footer;
  document.getElementById("modalBackdrop").classList.remove("hidden");
}
function hideModal(){ document.getElementById("modalBackdrop").classList.add("hidden"); }
function closeModal(e){ if(e.target.id==="modalBackdrop") hideModal(); }

document.addEventListener("DOMContentLoaded", initApp);

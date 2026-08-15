const STORAGE_KEY = "control-electrodomesticos-v1";
const DEFAULT_TYPES = ["Lavadora","Lavavajillas","Frigorífico","Placa","Horno","Secadora","TV"];

let records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let categories = JSON.parse(localStorage.getItem("control-electrodomesticos-categories") || "null") || DEFAULT_TYPES;
let editingId = null;

const $ = id => document.getElementById(id);
const agendaView = $("agendaView"), formView = $("formView"), appliancesEl = $("appliances");

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function saveCategories(){ localStorage.setItem("control-electrodomesticos-categories", JSON.stringify(categories)); }

function euro(v){
  const n = Number(v || 0);
  return n.toLocaleString("es-ES",{style:"currency",currency:"EUR"});
}

function typeOptions(select, selected=""){
  select.innerHTML = "";
  categories.forEach(t=>{
    const o=document.createElement("option"); o.value=t; o.textContent=t; o.selected=t===selected; select.appendChild(o);
  });
}

function addAppliance(data={}){
  const node = $("applianceTemplate").content.firstElementChild.cloneNode(true);
  node.querySelector(".a-code").value = data.code || "";
  node.querySelector(".a-brand").value = data.brand || "";
  node.querySelector(".a-price").value = data.price ?? "";
  typeOptions(node.querySelector(".a-type"), data.type || categories[0]);
  const door = node.querySelector(".door-change");
  const type = node.querySelector(".a-type");
  const doorCheck = node.querySelector(".a-door");
  doorCheck.checked = !!data.doorChange;
  const updateDoor = ()=>door.classList.toggle("hidden", type.value !== "Frigorífico");
  type.addEventListener("change", updateDoor);
  updateDoor();
  node.querySelector(".remove-appliance").addEventListener("click", ()=>{ node.remove(); renumber(); });
  appliancesEl.appendChild(node);
  renumber();
}

function renumber(){ [...appliancesEl.querySelectorAll(".appliance-number")].forEach((e,i)=>e.textContent=i+1); }

function resetForm(){
  $("recordForm").reset();
  appliancesEl.innerHTML="";
  addAppliance();
  editingId=null;
  $("formTitle").textContent="Nuevo registro";
}

function openNew(){ resetForm(); agendaView.classList.add("hidden"); formView.classList.remove("hidden"); window.scrollTo(0,0); }
function openEdit(id){
  const r=records.find(x=>x.id===id); if(!r)return;
  editingId=id;
  $("formTitle").textContent="Editar registro";
  $("client").value=r.client||"";
  $("controlNumber").value=r.controlNumber||"";
  $("phone").value=r.phone||"";
  $("address").value=r.address||"";
  $("placementDate").value=r.placementDate||"";
  $("placementTime").value=r.placementTime||"";
  $("placed").checked=!!r.placed; $("paid").checked=!!r.paid; $("invoiced").checked=!!r.invoiced;
  appliancesEl.innerHTML="";
  (r.appliances||[]).forEach(addAppliance);
  if(!r.appliances?.length) addAppliance();
  agendaView.classList.add("hidden"); formView.classList.remove("hidden"); window.scrollTo(0,0);
}

function closeForm(){ formView.classList.add("hidden"); agendaView.classList.remove("hidden"); render(); }

function collect(){
  const appliances=[...appliancesEl.querySelectorAll(".appliance")].map(n=>({
    code:n.querySelector(".a-code").value.trim(),
    type:n.querySelector(".a-type").value,
    brand:n.querySelector(".a-brand").value.trim(),
    price:n.querySelector(".a-price").value,
    doorChange:n.querySelector(".a-door").checked
  }));
  return {
    id: editingId || crypto.randomUUID(),
    client:$("client").value.trim(),
    controlNumber:$("controlNumber").value.trim(),
    phone:$("phone").value.trim(),
    address:$("address").value.trim(),
    appliances,
    placementDate:$("placementDate").value,
    placementTime:$("placementTime").value,
    placed:$("placed").checked,
    paid:$("paid").checked,
    invoiced:$("invoiced").checked,
    updatedAt:new Date().toISOString()
  };
}

$("recordForm").addEventListener("submit",e=>{
  e.preventDefault();
  const r=collect();
  if(editingId) records=records.map(x=>x.id===editingId?r:x); else records.unshift(r);
  save(); closeForm();
});

function matches(r,q){
  if(!q)return true;
  const hay=[r.client,r.controlNumber,r.phone,r.address,...(r.appliances||[]).flatMap(a=>[a.code,a.type,a.brand])].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}
function filterMatch(r,f){
  if(f==="paid")return r.paid;
  if(f==="unpaid")return !r.paid;
  if(f==="placed")return r.placed;
  if(f==="pending")return !r.placed;
  if(f==="invoiced")return r.invoiced;
  if(f==="notInvoiced")return !r.invoiced;
  return true;
}

function render(){
  const q=$("searchInput").value.trim(), f=$("statusFilter").value;
  const list=records.filter(r=>matches(r,q)&&filterMatch(r,f));
  $("records").innerHTML="";
  $("empty").classList.toggle("hidden", list.length!==0);
  list.forEach(r=>{
    const card=document.createElement("article");
    card.className="record "+(r.paid?"paid":"");
    const total=(r.appliances||[]).reduce((s,a)=>s+Number(a.price||0),0);
    card.innerHTML=`
      <div class="record-head">
        <div>
          <h3>${esc(r.client||"Sin cliente")}</h3>
          <div class="meta">${esc(r.phone||"")}${r.controlNumber?" · Cliente CI "+esc(r.controlNumber):""}</div>
          ${r.address?`<div class="meta">${esc(r.address)}</div>`:""}
        </div>
        <div>
          <span class="badge ${r.paid?"green":"red"}">${r.paid?"PAGADO":"NO PAGADO"}</span>
        </div>
      </div>
      <div class="appliance-list">
        ${(r.appliances||[]).map(a=>`<div class="appliance-row">
          <strong>${esc(a.type||"Electrodoméstico")} ${a.brand?"· "+esc(a.brand):""} ${a.doorChange?'<span class="door">Cambio de puerta</span>':""}</strong>
          <div class="meta">${a.code?"Código: "+esc(a.code)+" · ":""}<span class="price">${euro(a.price)}</span></div>
        </div>`).join("")}
      </div>
      <div class="meta">
        ${r.placementDate?`<span class="record-date">Colocación: ${formatDate(r.placementDate)}${r.placementTime?" · "+esc(r.placementTime):""}</span>`:""}
        ${r.placed?" · <span class='badge green'>COLOCADO</span>":" · <span class='badge gray'>PENDIENTE</span>"}
        ${r.invoiced?" · <span class='badge green'>FACTURADO</span>":" · <span class='badge gray'>NO FACTURADO</span>"}
        ${total?` · Total: <strong>${euro(total)}</strong>`:""}
      </div>
      <div class="record-actions">
        <button data-edit="${r.id}">Editar</button>
        <button data-delete="${r.id}">Eliminar</button>
      </div>`;
    $("records").appendChild(card);
  });
  $("records").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEdit(b.dataset.edit));
  $("records").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{
    if(confirm("¿Eliminar este registro?")){records=records.filter(x=>x.id!==b.dataset.delete);save();render();}
  });
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function formatDate(d){return new Date(d+"T00:00:00").toLocaleDateString("es-ES");}

$("newBtn").onclick=openNew;
$("backBtn").onclick=closeForm; $("cancelBtn").onclick=closeForm;
$("addApplianceBtn").onclick=()=>addAppliance();
$("searchInput").oninput=render; $("statusFilter").onchange=render;
render();

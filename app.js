const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;

const DEFAULT_TYPES = [
  "Lavadora",
  "Lavavajillas",
  "Frigorífico",
  "Placa",
  "Horno",
  "Secadora",
  "TV"
];

let records = [];
let categories = JSON.parse(
  localStorage.getItem("control-electrodomesticos-categories") || "null"
) || DEFAULT_TYPES;

let editingId = null;

const $ = id => document.getElementById(id);

const agendaView = $("agendaView");
const formView = $("formView");
const appliancesEl = $("appliances");

function showLogin() { $("authView").classList.remove("hidden"); $("agendaView").classList.add("hidden"); $("formView").classList.add("hidden"); $("newBtn").classList.add("hidden"); $("floatingAdd").classList.add("hidden"); $("sessionBar").classList.add("hidden"); }
function showApp(user) { currentUser = user; $("authView").classList.add("hidden"); $("agendaView").classList.remove("hidden"); $("newBtn").classList.remove("hidden"); $("floatingAdd").classList.remove("hidden"); $("sessionBar").classList.remove("hidden"); $("userName").textContent = user.email; }
function toast(message) { const el = document.createElement("div"); el.className = "toast"; el.textContent = message; document.body.appendChild(el); setTimeout(() => el.remove(), 4000); }
$("loginForm").onsubmit = async e => { e.preventDefault(); const { data, error } = await db.auth.signInWithPassword({ email: $("loginEmail").value.trim(), password: $("loginPassword").value }); if (error) { $("loginError").textContent = "No se ha podido iniciar sesión."; $("loginError").classList.remove("hidden"); return; } await start(data.user); };
$("logoutBtn").onclick = async () => { await db.auth.signOut(); currentUser = null; showLogin(); };

function euro(v) {
  const n = Number(v || 0);
  return n.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR"
  });
}

function typeOptions(select, selected = "") {
  select.innerHTML = "";

  categories.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    option.selected = type === selected;
    select.appendChild(option);
  });
}

function addAppliance(data = {}) {
  const node = $("applianceTemplate")
    .content
    .firstElementChild
    .cloneNode(true);

  node.querySelector(".a-code").value = data.code || "";
  node.querySelector(".a-brand").value = data.brand || "";
  node.querySelector(".a-price").value = data.price ?? "";

  const type = node.querySelector(".a-type");
  typeOptions(type, data.type || categories[0]);

  const door = node.querySelector(".door-change");
  const doorCheck = node.querySelector(".a-door");

  doorCheck.checked = !!data.doorChange;

  function updateDoor() {
    door.classList.toggle(
      "hidden",
      type.value !== "Frigorífico"
    );
  }

  type.addEventListener("change", updateDoor);
  updateDoor();

  node.querySelector(".remove-appliance").onclick = () => {
    node.remove();
    renumber();
  };

  appliancesEl.appendChild(node);
  renumber();
}

function renumber() {
  [
    ...appliancesEl.querySelectorAll(".appliance-number")
  ].forEach((element, index) => {
    element.textContent = index + 1;
  });
}

function resetForm() {
  $("recordForm").reset();
  appliancesEl.innerHTML = "";
  addAppliance();

  editingId = null;
  $("formTitle").textContent = "Nuevo registro";
}

function openNew() {
  resetForm();

  agendaView.classList.add("hidden");
  formView.classList.remove("hidden");

  window.scrollTo(0, 0);
}

function openEdit(id) {
  const r = records.find(x => x.id === id);

  if (!r) return;

  editingId = id;

  $("formTitle").textContent = "Editar registro";

  $("client").value = r.client || "";
  $("controlNumber").value = r.controlNumber || "";
  $("phone").value = r.phone || "";
  $("dni").value = r.dni || "";
  $("observations").value = r.observations || "";
  $("address").value = r.address || "";

  $("placementDate").value = r.placementDate || "";
  $("placementTime").value = r.placementTime || "";

  $("placed").checked = !!r.placed;
  $("paid").checked = !!r.paid;
  $("invoiced").checked = !!r.invoiced;

  appliancesEl.innerHTML = "";

  (r.appliances || []).forEach(addAppliance);

  if (!r.appliances?.length) {
    addAppliance();
  }

  agendaView.classList.add("hidden");
  formView.classList.remove("hidden");

  window.scrollTo(0, 0);
}

function closeForm() {
  formView.classList.add("hidden");
  agendaView.classList.remove("hidden");
  render();
}

function collect() {
  const appliances = [
    ...appliancesEl.querySelectorAll(".appliance")
  ].map(node => ({
    code: node.querySelector(".a-code").value.trim(),
    type: node.querySelector(".a-type").value,
    brand: node.querySelector(".a-brand").value.trim(),
    price: node.querySelector(".a-price").value,
    doorChange: node.querySelector(".a-door").checked
  }));

  return {
    id: editingId || crypto.randomUUID(),

    client: $("client").value.trim(),
    controlNumber: $("controlNumber").value.trim(),
    phone: $("phone").value.trim(),
    dni: $("dni").value.trim(),
    observations: $("observations").value.trim(),
    address: $("address").value.trim(),

    appliances,

    placementDate: $("placementDate").value,
    placementTime: $("placementTime").value,

    placed: $("placed").checked,
    paid: $("paid").checked,
    invoiced: $("invoiced").checked
  };
}

function toDatabase(r) {
  return {
    id: r.id,
    cliente: r.client,
    numero_cliente_control_integral: r.controlNumber,
    telefono: r.phone,
    dni: r.dni || null,
    observaciones: r.observations || null,
    direccion: r.address,
    dia_colocacion: r.placementDate || null,
    hora_colocacion: r.placementTime || null,
    colocado: r.placed,
    pagado: r.paid,
    facturado: r.invoiced,
    electrodomesticos: r.appliances || [],
    updated_at: new Date().toISOString()
  };
}

function fromDatabase(r) {
  return {
    id: r.id,
    client: r.cliente || "",
    controlNumber: r.numero_cliente_control_integral || "",
    phone: r.telefono || "",
    dni: r.dni || "",
    observations: r.observaciones || "",
    address: r.direccion || "",

    placementDate: r.dia_colocacion || "",
    placementTime: r.hora_colocacion || "",

    placed: !!r.colocado,
    paid: !!r.pagado,
    invoiced: !!r.facturado,

    appliances: r.electrodomesticos || []
  };
}

async function loadRecords() {
  const { data, error } = await db
    .from("encargos")
    .select("*")
    .order("dia_colocacion", {
      ascending: true,
      nullsFirst: false
    });

  if (error) {
    console.error(error);
    alert("No se han podido cargar los registros.");
    return;
  }

  records = data.map(fromDatabase);

  render();
}

async function saveRecord(record) {
  const row = toDatabase(record);

  const { error } = await db
    .from("encargos")
    .upsert(row);

  if (error) {
    console.error(error);
    alert("No se ha podido guardar el registro.");
    return false;
  }

  // ACTUALIZACIÓN INMEDIATA DEL ESTADO LOCAL
  // Ya no dependemos de Supabase Realtime para mostrar
  // el registro recién guardado.

  const savedRecord = fromDatabase(row);

  if (editingId) {
    records = records.map(r =>
      r.id === savedRecord.id
        ? savedRecord
        : r
    );
  } else {
    records = [
      savedRecord,
      ...records.filter(
        r => r.id !== savedRecord.id
      )
    ];
  }

  return true;
}

async function deleteRecord(id) {
  const { error } = await db
    .from("encargos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("No se ha podido eliminar el registro.");
    return false;
  }

  // Actualización inmediata del estado local
  records = records.filter(
    r => r.id !== id
  );

  render();

  return true;
}

$("recordForm").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    const record = collect();

    const ok = await saveRecord(record);

    if (!ok) return;

    closeForm();
  }
);

function matches(r, q) {
  if (!q) return true;

  const haystack = [
    r.client,
    r.controlNumber,
    r.phone,
    r.dni,
    r.address,
    r.observations,

    ...(r.appliances || []).flatMap(a => [
      a.code,
      a.type,
      a.brand
    ])
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(
    q.toLowerCase()
  );
}

function filterMatch(r, filter) {
  if (filter === "paid") return r.paid;
  if (filter === "unpaid") return !r.paid;

  if (filter === "placed") return r.placed;
  if (filter === "pending") return !r.placed;

  if (filter === "invoiced") return r.invoiced;
  if (filter === "notInvoiced") return !r.invoiced;

  return true;
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char])
  );
}

function formatDate(date) {
  return new Date(
    date + "T00:00:00"
  ).toLocaleDateString("es-ES");
}

function render() {
  const q = $("searchInput").value.trim();
  const filter = $("statusFilter").value;

  const list = records.filter(
    r =>
      matches(r, q) &&
      filterMatch(r, filter)
  );

  $("records").innerHTML = "";

  $("empty").classList.toggle(
    "hidden",
    list.length !== 0
  );

  list.forEach(r => {
    const card =
      document.createElement("article");

    const completed =
      r.paid &&
      r.invoiced &&
      r.placed;

    card.className =
      "record" +
      (completed
        ? " completed"
        : "");

    const total =
      (r.appliances || [])
        .reduce(
          (sum, a) =>
            sum +
            Number(a.price || 0),
          0
        );

    card.innerHTML = `
      <div class="record-head">

        <div>

          <h3>
            ${esc(
              r.client ||
              "Sin cliente"
            )}
          </h3>

          <div class="meta">

            ${esc(
              r.phone || ""
            )}

            ${
              r.dni ? " · DNI " + esc(r.dni) : ""
            }
            ${
              r.controlNumber
                ? " · Cliente CI " +
                  esc(
                    r.controlNumber
                  )
                : ""
            }

          </div>

          ${ r.observations ? `<div class="meta">Observaciones: ${esc(r.observations)}</div>` : "" }
          ${
            r.address
              ? `<div class="meta">
                   ${esc(
                     r.address
                   )}
                 </div>`
              : ""
          }

        </div>

        <span class="badge ${
          r.paid
            ? "green"
            : "red"
        }">

          ${
            r.paid
              ? "PAGADO"
              : "NO PAGADO"
          }

        </span>

      </div>

      <div class="appliance-list">

        ${(r.appliances || [])
          .map(
            a => `
              <div class="appliance-row">

                <strong>

                  ${esc(
                    a.type ||
                    "Electrodoméstico"
                  )}

                  ${
                    a.brand
                      ? " · " +
                        esc(
                          a.brand
                        )
                      : ""
                  }

                  ${
                    a.doorChange
                      ? `<span class="door">
                           Cambio de puerta
                         </span>`
                      : ""
                  }

                </strong>

                <div class="meta">

                  ${
                    a.code
                      ? "Código: " +
                        esc(
                          a.code
                        ) +
                        " · "
                      : ""
                  }

                  <span class="price">
                    ${euro(
                      a.price
                    )}
                  </span>

                </div>

              </div>
            `
          )
          .join("")}

      </div>

      <div class="meta">

        ${
          r.placementDate
            ? `<span class="record-date">

                 Colocación:
                 ${formatDate(
                   r.placementDate
                 )}

                 ${
                   r.placementTime
                     ? " · " +
                       esc(
                         r.placementTime
                       )
                     : ""
                 }

               </span>`
            : ""
        }

        ${
          r.placed
            ? ` · <span class="badge green">
                 COLOCADO
               </span>`
            : ` · <span class="badge gray">
                 PENDIENTE
               </span>`
        }

        ${
          r.invoiced
            ? ` · <span class="badge green">
                 FACTURADO
               </span>`
            : ` · <span class="badge gray">
                 NO FACTURADO
               </span>`
        }

        ${
          total
            ? ` · Total:
               <strong>
                 ${euro(
                   total
                 )}
               </strong>`
            : ""
        }

      </div>

      <div class="record-actions">

        <button data-edit="${r.id}">
          Editar
        </button>

        <button data-delete="${r.id}">
          Eliminar
        </button>

      </div>
    `;

    $("records")
      .appendChild(card);
  });

  $("records")
    .querySelectorAll(
      "[data-edit]"
    )
    .forEach(button => {

      button.onclick = () =>
        openEdit(
          button.dataset.edit
        );

    });

  $("records")
    .querySelectorAll(
      "[data-delete]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          if (
            !confirm(
              "¿Eliminar este registro?"
            )
          ) {
            return;
          }

          await deleteRecord(
            button.dataset.delete
          );

        };

    });
}

$("newBtn").onclick =
  openNew;

$("floatingAdd").onclick =
  openNew;

$("backBtn").onclick =
  closeForm;

$("cancelBtn").onclick =
  closeForm;

$("addApplianceBtn").onclick =
  () => addAppliance();

$("searchInput").oninput =
  render;

$("statusFilter").onchange =
  render;


async function start(user) {
  showApp(user);
  await loadRecords();
  db.removeAllChannels();
  db.channel("encargos-cambios").on("postgres_changes", { event: "*", schema: "public", table: "encargos" }, payload => {
    if (payload.eventType === "INSERT") { const record = fromDatabase(payload.new); records = [record, ...records.filter(r => r.id !== record.id)]; toast("Se ha creado un encargo."); }
    if (payload.eventType === "UPDATE") { const record = fromDatabase(payload.new); records = records.map(r => r.id === record.id ? record : r); toast("Se ha modificado un encargo."); }
    if (payload.eventType === "DELETE") { records = records.filter(r => r.id !== payload.old.id); toast("Se ha eliminado un encargo."); }
    render();
  }).subscribe();
}
(async () => { const { data: { session } } = await db.auth.getSession(); if (session) await start(session.user); else showLogin(); })();

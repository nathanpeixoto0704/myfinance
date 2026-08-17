// ============================================================
// App de controle de compras — Supabase CRUD
// ============================================================

let supabaseClient = null;
let editingId = null; // null = criando novo registro; caso contrário, id em edição
let allRecords = [];

const FIELDS = [
  "conta", "tipo", "data_compra", "forma_pagamento",
  "parcelas_total", "parcela_atual", "categoria", "sub_categoria",
  "descricao", "data_pagamento", "valor", "confirmacao"
];

function init() {
  const configOk =
    typeof SUPABASE_URL === "string" &&
    typeof SUPABASE_ANON_KEY === "string" &&
    !SUPABASE_URL.includes("SEU-PROJETO") &&
    !SUPABASE_ANON_KEY.includes("SUA-CHAVE");

  if (!configOk) {
    document.getElementById("config-alert").hidden = false;
    document.getElementById("app-content").hidden = true;
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  document.getElementById("record-form").addEventListener("submit", handleCreate);
  document.getElementById("edit-form").addEventListener("submit", handleUpdate);
  document.getElementById("cancel-edit").addEventListener("click", closeModal);
  document.getElementById("search-input").addEventListener("input", renderTable);

  loadRecords();
}

async function loadRecords() {
  setStatus("Carregando registros...");
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("*")
    .order("data_compra", { ascending: false });

  if (error) {
    setStatus("Erro ao carregar: " + error.message, true);
    return;
  }

  allRecords = data || [];
  setStatus("");
  renderTable();
  renderTotal();
}

function renderTotal() {
  const total = allRecords.reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
  document.getElementById("total-amount").textContent = formatMoney(total);
}

function renderTable() {
  const term = document.getElementById("search-input").value.trim().toLowerCase();
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  const filtered = !term
    ? allRecords
    : allRecords.filter((r) =>
        FIELDS.some((f) => String(r[f] ?? "").toLowerCase().includes(term))
      );

  if (filtered.length === 0) {
    document.getElementById("empty-state").hidden = false;
    return;
  }
  document.getElementById("empty-state").hidden = true;

  for (const r of filtered) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.conta ?? "")}</td>
      <td>${escapeHtml(r.tipo ?? "")}</td>
      <td>${formatDate(r.data_compra)}</td>
      <td>${escapeHtml(r.forma_pagamento ?? "")}</td>
      <td class="num">${r.parcela_atual ?? "-"}/${r.parcelas_total ?? "-"}</td>
      <td>${escapeHtml(r.categoria ?? "")}</td>
      <td>${escapeHtml(r.sub_categoria ?? "")}</td>
      <td>${escapeHtml(r.descricao ?? "")}</td>
      <td>${formatDate(r.data_pagamento)}</td>
      <td class="money">${formatMoney(r.valor)}</td>
      <td>${statusBadge(r.confirmacao)}</td>
      <td>
        <div class="row-actions">
          <button class="btn-edit" data-id="${r.id}">Editar</button>
          <button class="btn-danger" data-id="${r.id}">Excluir</button>
        </div>
      </td>
    `;
    tr.querySelector(".btn-edit").addEventListener("click", () => openEditModal(r));
    tr.querySelector(".btn-danger").addEventListener("click", () => handleDelete(r.id));
    tbody.appendChild(tr);
  }
}

function statusBadge(value) {
  const v = (value || "").toLowerCase();
  if (v.includes("confirm") || v.includes("pago")) {
    return `<span class="badge ok">${escapeHtml(value)}</span>`;
  }
  if (v.includes("pend")) {
    return `<span class="badge pending">${escapeHtml(value)}</span>`;
  }
  return `<span class="badge neutral">${escapeHtml(value || "-")}</span>`;
}

// ---------- CREATE ----------
async function handleCreate(e) {
  e.preventDefault();
  const payload = collectFormData("record-form");

  setStatus("Salvando...");
  const { error } = await supabaseClient.from(TABLE_NAME).insert([payload]);

  if (error) {
    setStatus("Erro ao salvar: " + error.message, true);
    return;
  }

  document.getElementById("record-form").reset();
  setStatus("Registro adicionado.");
  loadRecords();
}

// ---------- UPDATE ----------
function openEditModal(record) {
  editingId = record.id;
  const form = document.getElementById("edit-form");
  for (const f of FIELDS) {
    if (form.elements[f]) form.elements[f].value = record[f] ?? "";
  }
  document.getElementById("modal-overlay").hidden = false;
}

function closeModal() {
  editingId = null;
  document.getElementById("modal-overlay").hidden = true;
}

async function handleUpdate(e) {
  e.preventDefault();
  if (editingId == null) return;

  const payload = collectFormData("edit-form");
  setStatus("Atualizando...");

  const { error } = await supabaseClient
    .from(TABLE_NAME)
    .update(payload)
    .eq("id", editingId);

  if (error) {
    setStatus("Erro ao atualizar: " + error.message, true);
    return;
  }

  closeModal();
  setStatus("Registro atualizado.");
  loadRecords();
}

// ---------- DELETE ----------
async function handleDelete(id) {
  if (!confirm("Tem certeza que deseja excluir este registro? Essa ação não pode ser desfeita.")) {
    return;
  }
  setStatus("Excluindo...");
  const { error } = await supabaseClient.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    setStatus("Erro ao excluir: " + error.message, true);
    return;
  }
  setStatus("Registro excluído.");
  loadRecords();
}

// ---------- Helpers ----------
function collectFormData(formId) {
  const form = document.getElementById(formId);
  const payload = {};
  for (const f of FIELDS) {
    if (!form.elements[f]) continue;
    let val = form.elements[f].value;
    if (["parcelas_total", "parcela_atual"].includes(f)) {
      val = val === "" ? null : parseInt(val, 10);
    } else if (f === "valor") {
      val = val === "" ? null : parseFloat(val);
    } else if (val === "") {
      val = null;
    }
    payload[f] = val;
  }
  return payload;
}

function formatMoney(v) {
  const num = Number(v) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(v) {
  if (!v) return "-";
  const [y, m, d] = String(v).split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setStatus(msg, isError) {
  const el = document.getElementById("form-status");
  el.textContent = msg;
  el.style.color = isError ? "#A3402F" : "";
}

document.addEventListener("DOMContentLoaded", init);

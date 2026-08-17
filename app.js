// ============================================================
// App de controle de movimentacoes — Supabase CRUD
// ============================================================

let supabaseClient = null;
let editingId = null; // null = criando novo registro; caso contrário, id em edição
let allRecords = [];

const FIELDS = [
  "conta", "tipo", "data_compra", "forma_pagamento",
  "parcelas_total", "parcela_atual", "categoria", "sub_categoria",
  "descricao", "data_pagamento", "valor", "confirmacao"
];

// Valores aceitos para os campos com opções fixas
const ENUMS = {
  conta: ["Nubank", "Itaú", "Alelo", "Carteira"],
  tipo: ["Receita", "Despesa"],
  forma_pagamento: ["Crédito", "Pix", "Débito", "Transferência"],
  confirmacao: ["Confirmado", "Pendente"],
};

const REQUIRED_FIELDS = [
  "conta", "tipo", "data_compra", "forma_pagamento", "descricao", "valor", "confirmacao"
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
  document.getElementById("filter-tipo").addEventListener("change", renderTable);

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
  const total = allRecords.reduce((sum, r) => {
    const val = Number(r.valor) || 0;
    return sum + (r.tipo === "Despesa" ? -val : val);
  }, 0);
  document.getElementById("total-amount").textContent = formatMoney(total);
}

function renderTable() {
  const term = document.getElementById("search-input").value.trim().toLowerCase();
  const tipoFilter = document.getElementById("filter-tipo").value;
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  let filtered = allRecords;
  if (tipoFilter) {
    filtered = filtered.filter((r) => r.tipo === tipoFilter);
  }
  if (term) {
    filtered = filtered.filter((r) =>
      FIELDS.some((f) => String(r[f] ?? "").toLowerCase().includes(term))
    );
  }

  if (filtered.length === 0) {
    document.getElementById("empty-state").hidden = false;
    return;
  }
  document.getElementById("empty-state").hidden = true;

  for (const r of filtered) {
    const isExpense = r.tipo === "Despesa";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Conta">${escapeHtml(r.conta ?? "")}</td>
      <td data-label="Tipo">${tipoBadge(r.tipo)}</td>
      <td data-label="Data compra">${formatDate(r.data_compra)}</td>
      <td data-label="Pagamento">${escapeHtml(r.forma_pagamento ?? "")}</td>
      <td class="num" data-label="Parcela">${r.parcela_atual ?? "-"}/${r.parcelas_total ?? "-"}</td>
      <td data-label="Categoria">${escapeHtml(r.categoria ?? "")}</td>
      <td data-label="Subcategoria">${escapeHtml(r.sub_categoria ?? "")}</td>
      <td data-label="Descrição">${escapeHtml(r.descricao ?? "")}</td>
      <td data-label="Data pagto.">${formatDate(r.data_pagamento)}</td>
      <td class="money ${isExpense ? "expense" : "income"}" data-label="Valor">${isExpense ? "-" : ""}${formatMoney(r.valor)}</td>
      <td data-label="Confirmação">${statusBadge(r.confirmacao)}</td>
      <td data-label="Ações">
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
  if (v.includes("confirm")) {
    return `<span class="badge ok">${escapeHtml(value)}</span>`;
  }
  if (v.includes("pend")) {
    return `<span class="badge pending">${escapeHtml(value)}</span>`;
  }
  return `<span class="badge neutral">${escapeHtml(value || "-")}</span>`;
}

function tipoBadge(value) {
  if (value === "Receita") return `<span class="badge income">Receita</span>`;
  if (value === "Despesa") return `<span class="badge expense">Despesa</span>`;
  return `<span class="badge neutral">${escapeHtml(value || "-")}</span>`;
}

// ---------- VALIDATION ----------
function validateRecord(payload) {
  const errors = {};

  for (const field of REQUIRED_FIELDS) {
    const val = payload[field];
    if (val === null || val === undefined || val === "") {
      errors[field] = "Campo obrigatório.";
    }
  }

  for (const field of Object.keys(ENUMS)) {
    const val = payload[field];
    if (val && !ENUMS[field].includes(val)) {
      errors[field] = "Selecione uma opção válida.";
    }
  }

  if (payload.valor !== null && payload.valor !== undefined) {
    if (isNaN(payload.valor) || payload.valor <= 0) {
      errors.valor = "Informe um valor maior que zero.";
    }
  }

  if (payload.parcelas_total !== null && payload.parcelas_total !== undefined) {
    if (isNaN(payload.parcelas_total) || payload.parcelas_total < 1) {
      errors.parcelas_total = "Deve ser 1 ou mais.";
    }
  }

  if (payload.parcela_atual !== null && payload.parcela_atual !== undefined) {
    if (isNaN(payload.parcela_atual) || payload.parcela_atual < 1) {
      errors.parcela_atual = "Deve ser 1 ou mais.";
    }
  }

  if (
    payload.parcelas_total !== null && payload.parcelas_total !== undefined &&
    payload.parcela_atual !== null && payload.parcela_atual !== undefined &&
    payload.parcela_atual > payload.parcelas_total
  ) {
    errors.parcela_atual = "Não pode ser maior que o total de parcelas.";
  }

  return errors;
}

function clearErrors(formId) {
  const form = document.getElementById(formId);
  form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  form.querySelectorAll(".field.has-error").forEach((el) => el.classList.remove("has-error"));
}

function showErrors(formId, errors) {
  const form = document.getElementById(formId);
  let firstInvalid = null;
  for (const [field, message] of Object.entries(errors)) {
    const errorEl = form.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) errorEl.textContent = message;
    const fieldEl = form.elements[field];
    if (fieldEl) {
      fieldEl.closest(".field")?.classList.add("has-error");
      if (!firstInvalid) firstInvalid = fieldEl;
    }
  }
  if (firstInvalid) firstInvalid.focus();
}

// ---------- CREATE ----------
async function handleCreate(e) {
  e.preventDefault();
  clearErrors("record-form");

  const payload = collectFormData("record-form");
  const errors = validateRecord(payload);

  if (Object.keys(errors).length > 0) {
    showErrors("record-form", errors);
    setStatus("Verifique os campos destacados.", true);
    return;
  }

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
  clearErrors("edit-form");
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

  clearErrors("edit-form");
  const payload = collectFormData("edit-form");
  const errors = validateRecord(payload);

  if (Object.keys(errors).length > 0) {
    showErrors("edit-form", errors);
    setStatus("Verifique os campos destacados.", true);
    return;
  }

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
  el.classList.toggle("is-error", !!isError);
}

document.addEventListener("DOMContentLoaded", init);

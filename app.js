const STORAGE_KEY = "orcamentos-nomus-prototipo-v2";
const DEFAULT_PIS_COFINS = 0.0365;
const TAX_RULES = Array.isArray(window.TAX_RULES) ? window.TAX_RULES : [];

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const today = new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();
const currentYearShort = String(currentYear).slice(-2);

const defaultItem = (quote = {}) => {
  const item = {
    id: crypto.randomUUID(),
    code: nextItemCode(quote),
    description: "",
    quantity: 1,
    ncm: "",
    liquidPrice: 0,
    icmsBase: 1,
    icms: 0.195,
    ipi: 0,
    pisCofins: DEFAULT_PIS_COFINS,
  };
  applyTaxRule(item, quote);
  return item;
};

const seedQuote = () => {
  const quote = {
    id: crypto.randomUUID(),
    number: nextQuoteNumber([]),
    company: "EXTRAINOX",
    status: "rascunho",
    client: "FESTVAL",
    legalName: "FESTVAL",
    cnpj: "78116670/0035-04",
    state: "PR",
    city: "CURITIBA",
    address: "BISPO DOM JOSE",
    addressNumber: "2339",
    district: "BATEL",
    zipCode: "80440080",
    phone: "",
    email: "",
    requester: "Rafaela",
    paymentTerms: "30 DIAS",
    deliveryTime: "30 DIAS",
    proposalValidity: "10 DIAS",
    freightType: "CIF",
    includedBy: "PAULO HENRIQUE CZELUSNIAK",
    date: today,
    notes: "",
    freight: 0,
    items: [],
    updatedAt: new Date().toISOString(),
  };

  quote.items = [
    {
      id: crypto.randomUUID(),
      code: "1635.1",
      description:
        "COIFA 210X120X50CM COM FILTRO INERCIAL DE GORDURA. SEM DUTOS E SEM CHAPÉU. CONFECCIONADO EM AÇO INOXIDÁVEL AISI 304.",
      quantity: 1,
      ncm: "8419.89.19",
      liquidPrice: 5400,
      icmsBase: 0.4513,
      icms: 0.195,
      ipi: 0,
      pisCofins: DEFAULT_PIS_COFINS,
    },
  ];
  quote.items.forEach((item) => applyTaxRule(item, quote));
  return quote;
};

let state = loadState();

const elements = {
  quoteList: document.querySelector("#quoteList"),
  quoteTitle: document.querySelector("#quoteTitle"),
  quoteForm: document.querySelector("#quoteForm"),
  proposalScreen: document.querySelector("#proposalScreen"),
  proposalListScreen: document.querySelector("#proposalListScreen"),
  proposalOverview: document.querySelector("#proposalOverview"),
  proposalEditor: document.querySelector("#proposalEditor"),
  proposalOverviewBody: document.querySelector("#proposalOverviewBody"),
  itemsBody: document.querySelector("#itemsBody"),
  proposalRowsBody: document.querySelector("#proposalRowsBody"),
  itemTemplate: document.querySelector("#lineItemTemplate"),
  quoteTemplate: document.querySelector("#quoteItemTemplate"),
  searchInput: document.querySelector("#searchInput"),
  statusTabs: document.querySelectorAll(".status-tab"),
  moduleButtons: document.querySelectorAll(".module-button"),
  newQuoteButton: document.querySelector("#newQuoteButton"),
  newQuoteOverviewButton: document.querySelector("#newQuoteOverviewButton"),
  newQuoteListButton: document.querySelector("#newQuoteListButton"),
  openSelectedProposalButton: document.querySelector("#openSelectedProposalButton"),
  backToProposalsButton: document.querySelector("#backToProposalsButton"),
  duplicateButton: document.querySelector("#duplicateButton"),
  deleteButton: document.querySelector("#deleteButton"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  printButton: document.querySelector("#printButton"),
  addItemButton: document.querySelector("#addItemButton"),
  saveState: document.querySelector("#saveState"),
  statusPill: document.querySelector("#statusPill"),
  liquidTotal: document.querySelector("#liquidTotal"),
  icmsTotal: document.querySelector("#icmsTotal"),
  ipiTotal: document.querySelector("#ipiTotal"),
  pisCofinsTotal: document.querySelector("#pisCofinsTotal"),
  freightTotal: document.querySelector("#freightTotal"),
  grandTotal: document.querySelector("#grandTotal"),
  itemCount: document.querySelector("#itemCount"),
  listProposalCount: document.querySelector("#listProposalCount"),
  listItemCount: document.querySelector("#listItemCount"),
  listGrandTotal: document.querySelector("#listGrandTotal"),
  overviewProposalCount: document.querySelector("#overviewProposalCount"),
  overviewItemCount: document.querySelector("#overviewItemCount"),
  overviewGrandTotal: document.querySelector("#overviewGrandTotal"),
  overviewTotalValue: document.querySelector("#overviewTotalValue"),
  overviewDraftCount: document.querySelector("#overviewDraftCount"),
  overviewSentCount: document.querySelector("#overviewSentCount"),
  overviewApprovedCount: document.querySelector("#overviewApprovedCount"),
};

render();
bindEvents();

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const quote = seedQuote();
    return {
      budgets: [quote],
      selectedId: quote.id,
      filter: "todos",
      search: "",
      screen: "propostas",
      proposalView: "overview",
    };
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed.budgets) || parsed.budgets.length === 0) {
      throw new Error("Invalid budget storage");
    }
    parsed.budgets.forEach(normalizeQuoteInPlace);
    return {
      budgets: parsed.budgets,
      selectedId: parsed.selectedId || parsed.budgets[0].id,
      filter: parsed.filter || "todos",
      search: parsed.search || "",
      screen: parsed.screen || "propostas",
      proposalView: parsed.proposalView || "overview",
    };
  } catch {
    const quote = seedQuote();
    return {
      budgets: [quote],
      selectedId: quote.id,
      filter: "todos",
      search: "",
      screen: "propostas",
      proposalView: "overview",
    };
  }
}

function bindEvents() {
  elements.quoteForm.addEventListener("input", handleFormChange);
  elements.quoteForm.addEventListener("change", handleFormChange);

  elements.addItemButton.addEventListener("click", () => {
    const quote = selectedQuote();
    quote.items.push(defaultItem(quote));
    touchQuote(quote);
    persistAndRender();
  });

  elements.newQuoteButton.addEventListener("click", createNewQuote);
  elements.newQuoteOverviewButton.addEventListener("click", createNewQuote);
  elements.newQuoteListButton.addEventListener("click", createNewQuote);
  elements.openSelectedProposalButton.addEventListener("click", () => {
    state.screen = "propostas";
    state.proposalView = "editor";
    persistAndRender();
  });
  elements.backToProposalsButton.addEventListener("click", () => {
    state.proposalView = "overview";
    persistAndRender();
  });

  elements.duplicateButton.addEventListener("click", () => {
    const source = selectedQuote();
    const clone = structuredClone(source);
    clone.id = crypto.randomUUID();
    clone.number = nextQuoteNumber(state.budgets);
    clone.status = "rascunho";
    clone.client = `${source.client} - cópia`;
    clone.updatedAt = new Date().toISOString();
    clone.items = clone.items.map((item) => ({ ...item, id: crypto.randomUUID() }));
    state.budgets.unshift(clone);
    state.selectedId = clone.id;
    persistAndRender();
  });

  elements.deleteButton.addEventListener("click", () => {
    const quote = selectedQuote();
    const message = `Excluir o orçamento ${quote.number || ""} de ${quote.client || "cliente não informado"}?`;
    if (!confirm(message)) return;
    state.budgets = state.budgets.filter((current) => current.id !== quote.id);
    if (state.budgets.length === 0) {
      state.budgets.push(seedQuote());
    }
    state.selectedId = state.budgets[0].id;
    persistAndRender();
  });

  elements.exportButton.addEventListener("click", exportCurrentQuote);
  elements.importInput.addEventListener("change", importQuote);
  elements.printButton.addEventListener("click", () => window.print());

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderQuoteList();
    renderProposalOverview();
    renderProposalRows();
    saveState();
  });

  elements.statusTabs.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      renderQuoteList();
      renderProposalOverview();
      renderProposalRows();
      renderStatusTabs();
      saveState();
    });
  });

  elements.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.screen = button.dataset.screen;
      if (state.screen === "propostas") state.proposalView = "overview";
      renderScreen();
      saveState();
    });
  });
}

function createNewQuote() {
  const quote = {
    ...seedQuote(),
    id: crypto.randomUUID(),
    number: nextQuoteNumber(state.budgets),
    client: "Novo cliente",
    legalName: "",
    cnpj: "",
    items: [],
  };
  quote.items = [defaultItem(quote)];
  state.budgets.unshift(quote);
  state.selectedId = quote.id;
  state.screen = "propostas";
  state.proposalView = "editor";
  persistAndRender();
}

function openProposal(quoteId) {
  state.selectedId = quoteId;
  state.screen = "propostas";
  state.proposalView = "editor";
  persistAndRender();
}

function handleFormChange(event) {
  const quote = selectedQuote();
  const field = event.target.name;
  if (!field) return;

  quote[field] = field === "freight" ? parseNumber(event.target.value) : event.target.value;

  if (field === "state") {
    quote.state = String(quote.state || "").toUpperCase();
    quote.items.forEach((item) => {
      applyTaxRule(item, quote);
    });
  }

  if (field === "company") {
    quote.items.forEach((item) => applyTaxRule(item, quote));
  }

  touchQuote(quote);
  elements.saveState.textContent = "Salvando...";
  saveState();
  renderQuoteList();
  renderProposalOverview();
  renderProposalRows();
  renderSummary();
  renderTitle();
  if (field === "state" || field === "company") {
    renderItems();
  }
}

function render() {
  if (!selectedQuote()) {
    state.selectedId = state.budgets[0]?.id;
  }
  elements.searchInput.value = state.search;
  renderStatusTabs();
  renderQuoteList();
  renderProposalOverview();
  renderForm();
  renderItems();
  renderProposalRows();
  renderScreen();
  renderSummary();
  renderTitle();
}

function renderScreen() {
  const screen = state.screen === "lista" ? "lista" : "propostas";
  state.screen = screen;
  elements.moduleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === screen);
  });
  elements.proposalScreen.classList.toggle("is-hidden", screen !== "propostas");
  elements.proposalListScreen.classList.toggle("is-hidden", screen !== "lista");
  const proposalView = state.proposalView === "editor" ? "editor" : "overview";
  state.proposalView = proposalView;
  elements.proposalOverview.classList.toggle("is-hidden", screen !== "propostas" || proposalView !== "overview");
  elements.proposalEditor.classList.toggle("is-hidden", screen !== "propostas" || proposalView !== "editor");
}

function renderStatusTabs() {
  elements.statusTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });
}

function renderQuoteList() {
  elements.quoteList.innerHTML = "";
  const visible = state.budgets.filter((quote) => {
    const search = state.search.trim().toLowerCase();
    const matchesStatus = state.filter === "todos" || quote.status === state.filter;
    const searchable = [
      quote.number,
      quote.company,
      quote.client,
      quote.legalName,
      quote.cnpj,
      quote.requester,
      quote.status,
      ...quote.items.map((item) => `${item.code} ${item.description} ${item.ncm}`),
    ]
      .join(" ")
      .toLowerCase();
    return matchesStatus && (!search || searchable.includes(search));
  });

  if (visible.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum orçamento encontrado.";
    elements.quoteList.append(empty);
    return;
  }

  visible.forEach((quote) => {
    const card = elements.quoteTemplate.content.firstElementChild.cloneNode(true);
    const summary = calculateQuote(quote);
    card.classList.toggle("is-active", quote.id === state.selectedId);
    card.querySelector('[data-role="number"]').textContent = quote.number || "Sem número";
    card.querySelector('[data-role="status"]').textContent = statusLabel(quote.status);
    card.querySelector('[data-role="client"]').textContent = `${quote.company || ""} · ${quote.client || "Cliente não informado"}`;
    card.querySelector('[data-role="total"]').textContent = moneyFormatter.format(summary.total);
    card.addEventListener("click", () => {
      openProposal(quote.id);
    });
    elements.quoteList.append(card);
  });
}

function renderProposalOverview() {
  const visible = getVisibleQuotes();
  elements.proposalOverviewBody.innerHTML = "";

  if (visible.length === 0) {
    const empty = document.createElement("tr");
    empty.innerHTML = '<td colspan="9">Nenhum orçamento encontrado para o filtro atual.</td>';
    elements.proposalOverviewBody.append(empty);
  }

  visible.forEach((quote) => {
    const summary = calculateQuote(quote);
    const row = document.createElement("tr");
    row.classList.toggle("is-selected-row", quote.id === state.selectedId);
    row.innerHTML = `
      <td><button class="quote-number-link" type="button">${escapeHtml(quote.number || "Sem número")}</button></td>
      <td>${escapeHtml(quote.company)}</td>
      <td>${escapeHtml(quote.client || "Cliente não informado")}</td>
      <td>${escapeHtml(quote.cnpj)}</td>
      <td>${escapeHtml(quote.requester)}</td>
      <td>${quote.items.length}</td>
      <td class="money-cell">${moneyFormatter.format(summary.total)}</td>
      <td><span class="quote-pill">${escapeHtml(statusLabel(quote.status))}</span></td>
      <td>${formatDateTime(quote.updatedAt)}</td>
    `;
    row.querySelector(".quote-number-link").addEventListener("click", (event) => {
      event.stopPropagation();
      openProposal(quote.id);
    });
    row.addEventListener("click", () => {
      state.selectedId = quote.id;
      renderQuoteList();
      renderProposalOverview();
      saveState();
    });
    row.addEventListener("dblclick", () => openProposal(quote.id));
    elements.proposalOverviewBody.append(row);
  });

  const itemCount = visible.reduce((sum, quote) => sum + quote.items.length, 0);
  const grandTotal = visible.reduce((sum, quote) => sum + calculateQuote(quote).total, 0);
  const statusCounts = visible.reduce(
    (acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    },
    { rascunho: 0, enviado: 0, aprovado: 0 },
  );
  elements.overviewProposalCount.textContent = `${visible.length} propostas`;
  elements.overviewItemCount.textContent = `${itemCount} itens`;
  elements.overviewGrandTotal.textContent = moneyFormatter.format(grandTotal);
  elements.overviewTotalValue.textContent = moneyFormatter.format(grandTotal);
  elements.overviewDraftCount.textContent = String(statusCounts.rascunho || 0);
  elements.overviewSentCount.textContent = String(statusCounts.enviado || 0);
  elements.overviewApprovedCount.textContent = String(statusCounts.aprovado || 0);
}

function getVisibleQuotes() {
  const search = state.search.trim().toLowerCase();
  return state.budgets.filter((quote) => {
    const matchesStatus = state.filter === "todos" || quote.status === state.filter;
    const searchable = [
      quote.number,
      quote.company,
      quote.client,
      quote.legalName,
      quote.cnpj,
      quote.requester,
      quote.status,
      ...quote.items.map((item) => `${item.code} ${item.description} ${item.ncm}`),
    ]
      .join(" ")
      .toLowerCase();
    return matchesStatus && (!search || searchable.includes(search));
  });
}

function renderForm() {
  const quote = selectedQuote();
  const fields = new FormData(elements.quoteForm);
  for (const [name] of fields.entries()) {
    const input = elements.quoteForm.elements[name];
    if (!input) continue;
    input.value = quote[name] ?? "";
  }
}

function renderItems() {
  const quote = selectedQuote();
  elements.itemsBody.innerHTML = "";

  quote.items.forEach((item) => {
    const row = elements.itemTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.itemId = item.id;
    row.querySelectorAll("[data-field]").forEach((input) => {
      const field = input.dataset.field;
      input.value = isPercentField(field) ? formatPercentInput(item[field]) : (item[field] ?? "");
      input.addEventListener("input", () => {
        item[field] =
          isPercentField(field)
            ? parseNumber(input.value) / 100
            : input.type === "number"
              ? parseNumber(input.value)
              : input.value;
        if (field === "ncm") {
          applyTaxRule(item, quote);
          renderItems();
        }
        touchQuote(quote);
        saveState();
        updateRowTotals(row, item);
        renderProposalOverview();
        renderProposalRows();
        renderSummary();
        renderQuoteList();
      });
    });

    updateRowTotals(row, item);
    row.querySelector('[data-role="remove"]').addEventListener("click", () => {
      quote.items = quote.items.filter((current) => current.id !== item.id);
      touchQuote(quote);
      persistAndRender();
    });
    elements.itemsBody.append(row);
  });
}

function renderProposalRows() {
  const rows = getVisibleProposalRows();
  elements.proposalRowsBody.innerHTML = "";

  if (rows.length === 0) {
    const empty = document.createElement("tr");
    empty.innerHTML = '<td colspan="39">Nenhuma proposta encontrada para o filtro atual.</td>';
    elements.proposalRowsBody.append(empty);
  }

  rows.forEach(({ quote, item, itemTotals }) => {
    const row = document.createElement("tr");
    row.classList.toggle("is-selected-row", quote.id === state.selectedId);
    row.innerHTML = `
      <td>${escapeHtml(quote.company)}</td>
      <td>${escapeHtml(quote.number)}</td>
      <td>${escapeHtml(quote.client)}</td>
      <td>${escapeHtml(quote.cnpj)}</td>
      <td>${escapeHtml(item.code)}</td>
      <td>${escapeHtml(item.description)}</td>
      <td>${formatQuantity(itemTotals.quantity)}</td>
      <td>${escapeHtml(item.ncm)}</td>
      <td>${escapeHtml(quote.state)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.netPrice)}</td>
      <td class="money-cell">${moneyFormatter.format(parseNumber(item.liquidPrice))}</td>
      <td>${formatPercentDisplay(item.icmsBase)}</td>
      <td>${formatPercentDisplay(item.icms)}</td>
      <td>${formatPercentDisplay(item.ipi)}</td>
      <td>${formatDecimal(itemTotals.coefficient)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.productWithIcms)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.icmsAmount)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.productWithIcms)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.ipiAmount)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.icmsBaseAmount)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.unitTotal)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.icmsTotal)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.ipiTotal)}</td>
      <td class="money-cell">${moneyFormatter.format(itemTotals.lineTotal)}</td>
      <td>${escapeHtml(quote.legalName)}</td>
      <td>${escapeHtml(quote.address)}</td>
      <td>${escapeHtml(quote.addressNumber)}</td>
      <td>${escapeHtml(quote.district)}</td>
      <td>${escapeHtml(quote.city)}</td>
      <td>${escapeHtml(quote.state)}</td>
      <td>${escapeHtml(quote.zipCode)}</td>
      <td>${escapeHtml(quote.phone)}</td>
      <td>${escapeHtml(quote.email)}</td>
      <td>${escapeHtml(quote.requester)}</td>
      <td>${escapeHtml(quote.paymentTerms)}</td>
      <td>${escapeHtml(quote.deliveryTime)}</td>
      <td>${escapeHtml(quote.proposalValidity)}</td>
      <td>${escapeHtml(quote.freightType)}</td>
      <td>${escapeHtml(quote.includedBy)}</td>
    `;
    row.addEventListener("click", () => {
      state.selectedId = quote.id;
      renderQuoteList();
      renderProposalRows();
      saveState();
    });
    row.addEventListener("dblclick", () => {
      state.selectedId = quote.id;
      state.screen = "propostas";
      persistAndRender();
    });
    elements.proposalRowsBody.append(row);
  });

  const proposalIds = new Set(rows.map((row) => row.quote.id));
  const grandTotal = rows.reduce((sum, row) => sum + row.itemTotals.lineTotal, 0);
  elements.listProposalCount.textContent = `${proposalIds.size} propostas`;
  elements.listItemCount.textContent = `${rows.length} itens`;
  elements.listGrandTotal.textContent = moneyFormatter.format(grandTotal);
}

function getVisibleProposalRows() {
  const search = state.search.trim().toLowerCase();
  return state.budgets.flatMap((quote) => {
    if (state.filter !== "todos" && quote.status !== state.filter) return [];
    return quote.items
      .map((item) => ({ quote, item, itemTotals: calculateItem(item) }))
      .filter(({ quote, item }) => {
        if (!search) return true;
        const searchable = [
          quote.company,
          quote.number,
          quote.client,
          quote.legalName,
          quote.cnpj,
          quote.city,
          quote.state,
          quote.requester,
          item.code,
          item.description,
          item.ncm,
          quote.state,
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(search);
      });
  });
}

function aggregateItems(quote) {
  const groups = new Map();
  quote.items.forEach((item) => {
    const rule = findTaxRule(item, quote);
    const itemTotals = calculateItem(item);
    const ncm = item.ncm || "Sem NCM";
    const uf = quote.state || "";
    const description = rule?.description || "Sem grupo fiscal";
    const key = [normalizeKey(ncm), normalizeKey(uf), normalizeKey(description)].join("|");

    if (!groups.has(key)) {
      groups.set(key, {
        description,
        ncm,
        uf,
        itemCount: 0,
        quantity: 0,
        liquidTotal: 0,
        icmsTotal: 0,
        ipiTotal: 0,
        total: 0,
      });
    }

    const group = groups.get(key);
    group.itemCount += 1;
    group.quantity += itemTotals.quantity;
    group.liquidTotal += itemTotals.liquidSubtotal;
    group.icmsTotal += itemTotals.icmsTotal;
    group.ipiTotal += itemTotals.ipiTotal;
    group.total += itemTotals.lineTotal;
  });

  return [...groups.values()].sort((a, b) => {
    const descriptionCompare = a.description.localeCompare(b.description, "pt-BR");
    if (descriptionCompare !== 0) return descriptionCompare;
    return a.ncm.localeCompare(b.ncm, "pt-BR");
  });
}

function updateRowTotals(row, item) {
  const itemTotals = calculateItem(item);
  const unitTotal = row.querySelector('[data-role="unitTotal"]');
  const lineTotal = row.querySelector('[data-role="lineTotal"]');
  if (unitTotal) unitTotal.textContent = moneyFormatter.format(itemTotals.unitTotal);
  if (lineTotal) lineTotal.textContent = moneyFormatter.format(itemTotals.lineTotal);
}

function renderSummary() {
  const quote = selectedQuote();
  const summary = calculateQuote(quote);
  elements.statusPill.textContent = statusLabel(quote.status);
  elements.liquidTotal.textContent = moneyFormatter.format(summary.liquidTotal);
  elements.icmsTotal.textContent = moneyFormatter.format(summary.icmsTotal);
  elements.ipiTotal.textContent = moneyFormatter.format(summary.ipiTotal);
  elements.pisCofinsTotal.textContent = moneyFormatter.format(summary.pisCofinsTotal);
  elements.freightTotal.textContent = moneyFormatter.format(summary.freight);
  elements.grandTotal.textContent = moneyFormatter.format(summary.total);
  elements.itemCount.textContent = String(quote.items.length);
}

function renderTitle() {
  const quote = selectedQuote();
  const client = quote.client || "Cliente não informado";
  elements.quoteTitle.textContent = `${quote.number || "Sem número"} · ${client}`;
  document.title = `${quote.number || "Orçamento"} | ${client}`;
}

function calculateItem(item) {
  const quantity = parseNumber(item.quantity);
  const liquidPrice = parseNumber(item.liquidPrice);
  const pisCofins = parseNumber(item.pisCofins) || DEFAULT_PIS_COFINS;
  const icmsBaseRate = parseNumber(item.icmsBase);
  const icmsRate = parseNumber(item.icms);
  const ipiRate = parseNumber(item.ipi);
  const netPrice = liquidPrice / (1 + pisCofins);
  const pisCofinsAmount = liquidPrice - netPrice;
  const coefficientBase = 1 - icmsBaseRate * icmsRate * (1 + ipiRate);
  const coefficient = coefficientBase > 0 ? 1 / coefficientBase : 0;
  const productWithIcms = liquidPrice * coefficient;
  const ipiAmount = ipiRate * productWithIcms;
  const icmsBaseAmount = productWithIcms + ipiAmount;
  const icmsAmount = icmsBaseAmount * icmsRate;
  const unitTotal = icmsBaseAmount;
  const lineTotal = unitTotal * quantity;

  return {
    quantity,
    liquidSubtotal: liquidPrice * quantity,
    netPrice,
    pisCofinsTotal: pisCofinsAmount * quantity,
    coefficient,
    productWithIcms,
    icmsAmount,
    ipiAmount,
    icmsBaseAmount,
    unitTotal,
    lineTotal,
    icmsTotal: icmsAmount * quantity,
    ipiTotal: ipiAmount * quantity,
    pisCofins,
  };
}

function calculateQuote(quote) {
  const totals = quote.items.reduce(
    (acc, item) => {
      const itemTotals = calculateItem(item);
      acc.liquidTotal += itemTotals.liquidSubtotal;
      acc.icmsTotal += itemTotals.icmsTotal;
      acc.ipiTotal += itemTotals.ipiTotal;
      acc.pisCofinsTotal += itemTotals.pisCofinsTotal;
      acc.itemsTotal += itemTotals.lineTotal;
      return acc;
    },
    {
      liquidTotal: 0,
      icmsTotal: 0,
      ipiTotal: 0,
      pisCofinsTotal: 0,
      itemsTotal: 0,
    },
  );
  const freight = parseNumber(quote.freight);
  return {
    ...totals,
    freight,
    total: totals.itemsTotal + freight,
  };
}

function applyTaxRule(item, quote) {
  const rule = findTaxRule(item, quote);
  if (!rule) return;

  item.icmsBase = roundRuleNumber(rule.icmsBase);
  item.icms = roundRuleNumber(rule.icms);
  item.ipi = roundRuleNumber(rule.ipi);
  item.pisCofins = roundRuleNumber(rule.pisCofins || DEFAULT_PIS_COFINS);
}

function findTaxRule(item, quote) {
  const company = normalizeKey(quote.company || "EXTRAINOX");
  const uf = normalizeKey(quote.state || "");
  const ncm = normalizeKey(item.ncm || "");
  if (!ncm) return null;

  const exactRule = TAX_RULES.find(
    (rule) =>
      normalizeKey(rule.company) === company &&
      normalizeKey(rule.uf) === uf &&
      normalizeKey(rule.ncm) === ncm,
  );
  const fallbackRule = TAX_RULES.find(
    (rule) => normalizeKey(rule.company) === company && normalizeKey(rule.ncm) === ncm,
  );
  return exactRule || fallbackRule || null;
}

function selectedQuote() {
  return state.budgets.find((quote) => quote.id === state.selectedId);
}

function persistAndRender() {
  saveState();
  render();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  elements.saveState.textContent = "Salvo localmente";
}

function touchQuote(quote) {
  quote.updatedAt = new Date().toISOString();
}

function statusLabel(status) {
  const labels = {
    rascunho: "Rascunho",
    enviado: "Enviado",
    aprovado: "Aprovado",
    revisao: "Em revisão",
    recusado: "Recusado",
  };
  return labels[status] || "Rascunho";
}

function parseNumber(value) {
  if (typeof value === "string") {
    value = value.trim();
    if (value.includes(",")) {
      value = value.replace(/\./g, "").replace(",", ".");
    }
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatQuantity(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(parseNumber(value));
}

function formatDecimal(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  }).format(parseNumber(value));
}

function formatPercentInput(value) {
  const percent = parseNumber(value) * 100;
  return Number.isFinite(percent) ? String(Math.round(percent * 10000) / 10000) : "";
}

function isPercentField(field) {
  return ["icmsBase", "icms", "ipi"].includes(field);
}

function formatPercentDisplay(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }).format(parseNumber(value) * 100);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function roundRuleNumber(value) {
  return Math.round(parseNumber(value) * 10000) / 10000;
}

function normalizeKey(value) {
  return String(value || "").trim().toUpperCase();
}

function nextQuoteNumber(budgets) {
  const year = currentYearShort;
  const sequences = budgets
    .map((quote) => parseQuoteNumber(quote.number))
    .filter((parsed) => parsed.year === year)
    .map((parsed) => parsed.sequence)
    .filter((sequence) => Number.isFinite(sequence));
  if (sequences.length === 0) return `1776.${year}`;
  return `${Math.max(...sequences) + 1}.${year}`;
}

function parseQuoteNumber(value) {
  const text = String(value || "").trim();
  const [sequenceText, yearText] = text.split(".");
  const sequence = Number(sequenceText.replace(/\D/g, ""));
  const rawYear = (yearText || currentYearShort).replace(/\D/g, "") || currentYearShort;
  const year = rawYear.length === 4 ? rawYear.slice(-2) : rawYear.padStart(2, "0");
  return { sequence, year };
}

function nextItemCode(quote) {
  const quoteSequence = parseQuoteNumber(quote.number).sequence;
  const prefix = Number.isFinite(quoteSequence) ? String(quoteSequence) : String(quote.number || "").split(".")[0];
  const itemNumbers = (quote.items || [])
    .map((item) => String(item.code || ""))
    .filter((code) => code.startsWith(`${prefix}.`))
    .map((code) => Number(code.split(".")[1]))
    .filter((number) => Number.isFinite(number));
  const next = itemNumbers.length ? Math.max(...itemNumbers) + 1 : 1;
  return `${prefix}.${next}`;
}

function exportCurrentQuote() {
  const quote = selectedQuote();
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), quote }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${quote.number || "orcamento"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importQuote(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = parsed.quote || parsed;
    if (!imported.client || !Array.isArray(imported.items)) {
      throw new Error("Formato inválido");
    }
    const quote = normalizeImportedQuote(imported);
    state.budgets.unshift(quote);
    state.selectedId = quote.id;
    persistAndRender();
  } catch {
    alert("Não foi possível importar esse arquivo. Verifique se ele veio deste protótipo.");
  } finally {
    event.target.value = "";
  }
}

function normalizeImportedQuote(imported) {
  const quote = {
    id: crypto.randomUUID(),
    number: normalizeQuoteNumber(imported.number || nextQuoteNumber(state.budgets)),
    company: imported.company || "EXTRAINOX",
    status: imported.status || "rascunho",
    client: imported.client || "Cliente importado",
    legalName: imported.legalName || "",
    cnpj: imported.cnpj || "",
    state: imported.state || "PR",
    city: imported.city || "",
    address: imported.address || "",
    addressNumber: imported.addressNumber || "",
    district: imported.district || "",
    zipCode: imported.zipCode || "",
    phone: imported.phone || "",
    email: imported.email || "",
    requester: imported.requester || "",
    paymentTerms: imported.paymentTerms || "",
    deliveryTime: imported.deliveryTime || "",
    proposalValidity: imported.proposalValidity || "",
    freightType: imported.freightType || "",
    includedBy: imported.includedBy || "",
    date: imported.date || today,
    notes: imported.notes || "",
    freight: parseNumber(imported.freight),
    items: imported.items.map((item) => ({
      id: crypto.randomUUID(),
      code: item.code || "",
      description: item.description || "",
      quantity: parseNumber(item.quantity),
      ncm: item.ncm || "",
      liquidPrice: parseNumber(item.liquidPrice),
      icmsBase: parseNumber(item.icmsBase),
      icms: parseNumber(item.icms),
      ipi: parseNumber(item.ipi),
      pisCofins: parseNumber(item.pisCofins) || DEFAULT_PIS_COFINS,
    })),
    updatedAt: new Date().toISOString(),
  };
  quote.items.forEach((item) => applyTaxRule(item, quote));
  return quote;
}

function normalizeQuoteInPlace(quote) {
  quote.number = normalizeQuoteNumber(quote.number);
  quote.company ||= "EXTRAINOX";
  quote.legalName ||= "";
  quote.cnpj ||= "";
  quote.state ||= "PR";
  quote.city ||= "";
  quote.address ||= "";
  quote.addressNumber ||= "";
  quote.district ||= "";
  quote.zipCode ||= "";
  quote.phone ||= "";
  quote.email ||= "";
  quote.requester ||= "";
  quote.proposalValidity ||= quote.validUntil || "";
  quote.freightType ||= "";
  quote.includedBy ||= quote.owner || "";
  quote.freight = parseNumber(quote.freight);
  quote.items = Array.isArray(quote.items) ? quote.items : [];
  quote.items.forEach((item) => {
    item.id ||= crypto.randomUUID();
    item.ncm ||= "";
    item.quantity = parseNumber(item.quantity);
    item.liquidPrice = parseNumber(item.liquidPrice || item.unitCost || 0);
    item.icmsBase = parseNumber(item.icmsBase || 1);
    item.icms = parseNumber(item.icms || 0);
    item.ipi = parseNumber(item.ipi || item.tax || 0);
    item.pisCofins = parseNumber(item.pisCofins) || DEFAULT_PIS_COFINS;
  });
}

function normalizeQuoteNumber(value) {
  const text = String(value || "").trim();
  if (!text) return nextQuoteNumber([]);
  if (/^\d+\.\d{2}$/.test(text)) return text;
  const parsed = parseQuoteNumber(text);
  if (!Number.isFinite(parsed.sequence)) return text;
  return `${parsed.sequence}.${parsed.year || currentYearShort}`;
}

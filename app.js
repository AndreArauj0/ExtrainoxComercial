const STORAGE_KEY = "orcamentos-nomus-prototipo-v2";
const DEFAULT_PIS_COFINS = 0.0365;
const DEFAULT_TAX_RULES = Array.isArray(window.TAX_RULES) ? normalizeTaxRules(window.TAX_RULES) : [];
const DEFAULT_COMPANIES = defaultCompanies();
const DEFAULT_REPRESENTATIVES = [];
const DEFAULT_FREIGHT_RULES = defaultFreightRules();
const FREIGHT_ICMS_12_UFS = new Set(["PR", "SC", "RS", "SP", "MG", "RJ"]);
const PDF_PAGE_SIZES = {
  landscape: { width: 1123, height: 794, bottomMargin: 48, label: "Horizontal" },
  portrait: { width: 794, height: 1123, bottomMargin: 60, label: "Vertical" },
};
const RECEIPT_METHODS = {
  bank: "transferencia_pix",
  cielo: "link_cielo",
  cash: "especie",
  combine: "a_combinar",
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const today = new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();
const currentYearShort = String(currentYear).slice(-2);

let state;
let activeDescriptionItemId = "";
let activePdfUrl = "";
let activeCompanyId = "";
let activePaymentRatesAccountId = "";
let activeSaleSimulation = null;

const defaultItem = (quote = {}) => {
  const item = {
    id: crypto.randomUUID(),
    code: nextItemCode(quote),
    description: "",
    commercialDescription: "",
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
    revision: "R0",
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
    receiptMethod: RECEIPT_METHODS.bank,
    bankAccountId: "",
    paymentAccountId: "",
    includedBy: "PAULO HENRIQUE CZELUSNIAK",
    sentAt: "",
    nextContactAt: "",
    lastClientResponse: "",
    rejectionReason: "",
    followUpNotes: "",
    hasRepresentative: "nao",
    representativeId: "",
    date: today,
    notes: "",
    freight: 0,
    attachments: [],
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
  quote.items.forEach((item) => {
    normalizeItemDescriptionFields(item);
    applyTaxRule(item, quote);
  });
  quote.revisionHistory = [buildRevisionRecord(quote, "R0", { emittedAt: new Date().toISOString(), notes: "Proposta inicial." })];
  return quote;
};

state = loadState();

const elements = {
  quoteList: document.querySelector("#quoteList"),
  quoteTitle: document.querySelector("#quoteTitle"),
  quoteForm: document.querySelector("#quoteForm"),
  proposalScreen: document.querySelector("#proposalScreen"),
  proposalListScreen: document.querySelector("#proposalListScreen"),
  companiesScreen: document.querySelector("#companiesScreen"),
  representativesScreen: document.querySelector("#representativesScreen"),
  commissionsScreen: document.querySelector("#commissionsScreen"),
  freightScreen: document.querySelector("#freightScreen"),
  taxRulesScreen: document.querySelector("#taxRulesScreen"),
  pdfPreviewScreen: document.querySelector("#pdfPreviewScreen"),
  proposalOverview: document.querySelector("#proposalOverview"),
  proposalEditor: document.querySelector("#proposalEditor"),
  proposalOverviewBody: document.querySelector("#proposalOverviewBody"),
  activeProposalTitle: document.querySelector("#activeProposalTitle"),
  revisionTimeline: document.querySelector("#revisionTimeline"),
  sortOverviewNumberButton: document.querySelector("#sortOverviewNumberButton"),
  sortOverviewNumberIcon: document.querySelector("#sortOverviewNumberIcon"),
  itemsPanel: document.querySelector("#itemsPanel"),
  itemsPanelContent: document.querySelector("#itemsPanelContent"),
  itemsSummary: document.querySelector("#itemsSummary"),
  itemsBody: document.querySelector("#itemsBody"),
  proposalRowsBody: document.querySelector("#proposalRowsBody"),
  companiesBody: document.querySelector("#companiesBody"),
  companyDetailsModal: document.querySelector("#companyDetailsModal"),
  companyDetailsTitle: document.querySelector("#companyDetailsTitle"),
  companyBankAccountsBody: document.querySelector("#companyBankAccountsBody"),
  companyPaymentAccountsBody: document.querySelector("#companyPaymentAccountsBody"),
  representativesBody: document.querySelector("#representativesBody"),
  commissionsBody: document.querySelector("#commissionsBody"),
  freightBody: document.querySelector("#freightBody"),
  itemDescriptionModal: document.querySelector("#itemDescriptionModal"),
  itemDescriptionTitle: document.querySelector("#itemDescriptionTitle"),
  itemDescriptionSummary: document.querySelector("#itemDescriptionSummary"),
  itemCommercialDescription: document.querySelector("#itemCommercialDescription"),
  paymentRatesModal: document.querySelector("#paymentRatesModal"),
  paymentRatesTitle: document.querySelector("#paymentRatesTitle"),
  paymentRatesBody: document.querySelector("#paymentRatesBody"),
  saleSimulationModal: document.querySelector("#saleSimulationModal"),
  saleSimulationValue: document.querySelector("#saleSimulationValue"),
  saleSimulationModality: document.querySelector("#saleSimulationModality"),
  saleSimulationBrand: document.querySelector("#saleSimulationBrand"),
  saleSimulationType: document.querySelector("#saleSimulationType"),
  saleSimulationResult: document.querySelector("#saleSimulationResult"),
  selectedSaleSimulationSummary: document.querySelector("#selectedSaleSimulationSummary"),
  proposalAttachmentInput: document.querySelector("#proposalAttachmentInput"),
  proposalAttachmentsPanel: document.querySelector("#proposalAttachmentsPanel"),
  proposalAttachmentsContent: document.querySelector("#proposalAttachmentsContent"),
  proposalAttachmentsList: document.querySelector("#proposalAttachmentsList"),
  proposalAttachmentsSummary: document.querySelector("#proposalAttachmentsSummary"),
  toggleProposalAttachmentsButton: document.querySelector("#toggleProposalAttachmentsButton"),
  pdfResultModal: document.querySelector("#pdfResultModal"),
  pdfResultFilename: document.querySelector("#pdfResultFilename"),
  pdfResultOpenButton: document.querySelector("#pdfResultOpenButton"),
  pdfResultDownloadButton: document.querySelector("#pdfResultDownloadButton"),
  printProposal: document.querySelector("#printProposal"),
  pdfPreviewBody: document.querySelector("#pdfPreviewBody"),
  pdfOrientationSelect: document.querySelector("#pdfOrientationSelect"),
  itemTemplate: document.querySelector("#lineItemTemplate"),
  quoteTemplate: document.querySelector("#quoteItemTemplate"),
  taxRuleTemplate: document.querySelector("#taxRuleTemplate"),
  companyTemplate: document.querySelector("#companyTemplate"),
  representativeTemplate: document.querySelector("#representativeTemplate"),
  freightTemplate: document.querySelector("#freightTemplate"),
  freightSimulatorPanel: document.querySelector("#freightSimulatorPanel"),
  freightSimulatorContent: document.querySelector("#freightSimulatorContent"),
  searchInput: document.querySelector("#searchInput"),
  taxCompanyFilter: document.querySelector("#taxCompanyFilter"),
  taxUfFilter: document.querySelector("#taxUfFilter"),
  taxRuleSearch: document.querySelector("#taxRuleSearch"),
  commissionStatusFilter: document.querySelector("#commissionStatusFilter"),
  freightSimulatorFields: document.querySelectorAll("[data-freight-sim-field]"),
  taxRulesBody: document.querySelector("#taxRulesBody"),
  ncmOptions: document.querySelector("#ncmOptions"),
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
  exportBackupButton: document.querySelector("#exportBackupButton"),
  importInput: document.querySelector("#importInput"),
  importBackupInput: document.querySelector("#importBackupInput"),
  importTaxRulesInput: document.querySelector("#importTaxRulesInput"),
  lookupCnpjButton: document.querySelector("#lookupCnpjButton"),
  saveQuoteButton: document.querySelector("#saveQuoteButton"),
  createRevisionButton: document.querySelector("#createRevisionButton"),
  saleSimulationButton: document.querySelector("#saleSimulationButton"),
  closeCompanyDetailsButton: document.querySelector("#closeCompanyDetailsButton"),
  closeItemDescriptionButton: document.querySelector("#closeItemDescriptionButton"),
  closePdfResultButton: document.querySelector("#closePdfResultButton"),
  cancelItemDescriptionButton: document.querySelector("#cancelItemDescriptionButton"),
  saveItemDescriptionButton: document.querySelector("#saveItemDescriptionButton"),
  closePaymentRatesButton: document.querySelector("#closePaymentRatesButton"),
  addPaymentRateRowButton: document.querySelector("#addPaymentRateRowButton"),
  closePaymentRatesFooterButton: document.querySelector("#closePaymentRatesFooterButton"),
  closeSaleSimulationButton: document.querySelector("#closeSaleSimulationButton"),
  cancelSaleSimulationButton: document.querySelector("#cancelSaleSimulationButton"),
  selectSaleSimulationButton: document.querySelector("#selectSaleSimulationButton"),
  generateSaleSimulationButton: document.querySelector("#generateSaleSimulationButton"),
  previewPdfButton: document.querySelector("#previewPdfButton"),
  printButton: document.querySelector("#printButton"),
  printPreviewButton: document.querySelector("#printPreviewButton"),
  backFromPdfPreviewButton: document.querySelector("#backFromPdfPreviewButton"),
  addItemButton: document.querySelector("#addItemButton"),
  toggleItemsButton: document.querySelector("#toggleItemsButton"),
  addCompanyButton: document.querySelector("#addCompanyButton"),
  addCompanyBankAccountButton: document.querySelector("#addCompanyBankAccountButton"),
  addCompanyPaymentAccountButton: document.querySelector("#addCompanyPaymentAccountButton"),
  addRepresentativeButton: document.querySelector("#addRepresentativeButton"),
  addManualCommissionButton: document.querySelector("#addManualCommissionButton"),
  addFreightButton: document.querySelector("#addFreightButton"),
  toggleFreightSimulatorButton: document.querySelector("#toggleFreightSimulatorButton"),
  useSelectedQuoteFreightButton: document.querySelector("#useSelectedQuoteFreightButton"),
  applyFreightToQuoteButton: document.querySelector("#applyFreightToQuoteButton"),
  addTaxRuleButton: document.querySelector("#addTaxRuleButton"),
  exportTaxRulesButton: document.querySelector("#exportTaxRulesButton"),
  resetTaxRulesButton: document.querySelector("#resetTaxRulesButton"),
  saveState: document.querySelector("#saveState"),
  taxSaveState: document.querySelector("#taxSaveState"),
  companySaveState: document.querySelector("#companySaveState"),
  representativeSaveState: document.querySelector("#representativeSaveState"),
  commissionSaveState: document.querySelector("#commissionSaveState"),
  freightSaveState: document.querySelector("#freightSaveState"),
  cnpjLookupStatus: document.querySelector("#cnpjLookupStatus"),
  representativeField: document.querySelector("#representativeField"),
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
  taxRuleCount: document.querySelector("#taxRuleCount"),
  taxCompanyCount: document.querySelector("#taxCompanyCount"),
  taxUfCount: document.querySelector("#taxUfCount"),
  taxNcmCount: document.querySelector("#taxNcmCount"),
  companyCount: document.querySelector("#companyCount"),
  companyRegimeCount: document.querySelector("#companyRegimeCount"),
  companyBankCount: document.querySelector("#companyBankCount"),
  defaultCompanyName: document.querySelector("#defaultCompanyName"),
  representativeCount: document.querySelector("#representativeCount"),
  averageCommissionRate: document.querySelector("#averageCommissionRate"),
  representativeBankCount: document.querySelector("#representativeBankCount"),
  representedClientCount: document.querySelector("#representedClientCount"),
  commissionPendingTotal: document.querySelector("#commissionPendingTotal"),
  commissionPaidTotal: document.querySelector("#commissionPaidTotal"),
  commissionPendingCount: document.querySelector("#commissionPendingCount"),
  commissionPaidCount: document.querySelector("#commissionPaidCount"),
  freightRuleCount: document.querySelector("#freightRuleCount"),
  freightCarrierCount: document.querySelector("#freightCarrierCount"),
  freightMinDeadline: document.querySelector("#freightMinDeadline"),
  freightMaxDeadline: document.querySelector("#freightMaxDeadline"),
  freightInsuranceValue: document.querySelector("#freightInsuranceValue"),
  freightIcmsLabel: document.querySelector("#freightIcmsLabel"),
  freightIcmsValue: document.querySelector("#freightIcmsValue"),
  freightOperationalValue: document.querySelector("#freightOperationalValue"),
  freightTaxesValue: document.querySelector("#freightTaxesValue"),
  freightSurchargesValue: document.querySelector("#freightSurchargesValue"),
  freightGrandValue: document.querySelector("#freightGrandValue"),
  freightOrderPercent: document.querySelector("#freightOrderPercent"),
};

render();
bindEvents();

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const quote = seedQuote();
    return {
      budgets: [quote],
      companies: cloneCompanies(DEFAULT_COMPANIES),
      representatives: cloneRepresentatives(DEFAULT_REPRESENTATIVES),
      freightRules: cloneFreightRules(DEFAULT_FREIGHT_RULES),
      freightSimulator: defaultFreightSimulator(),
      commissions: {},
      manualCommissions: [],
      commissionFilter: "todos",
      taxRules: cloneTaxRules(DEFAULT_TAX_RULES),
      taxRuleFilters: defaultTaxRuleFilters(),
      selectedId: quote.id,
      filter: "todos",
      search: "",
      screen: "propostas",
      pdfOrientation: "landscape",
      overviewNumberSort: "asc",
      itemsCollapsed: false,
      attachmentsCollapsed: true,
      freightSimulatorCollapsed: true,
      proposalView: "overview",
    };
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed.budgets) || parsed.budgets.length === 0) {
      throw new Error("Invalid budget storage");
    }
    parsed.budgets.forEach(normalizeQuoteInPlace);
    const companies = normalizeCompanies(parsed.companies);
    const representatives = normalizeRepresentatives(parsed.representatives);
    const freightRules = normalizeFreightRules(parsed.freightRules);
    const taxRules = normalizeTaxRules(parsed.taxRules);
    return {
      budgets: parsed.budgets,
      companies: companies.length ? companies : cloneCompanies(DEFAULT_COMPANIES),
      representatives,
      freightRules: freightRules.length ? freightRules : cloneFreightRules(DEFAULT_FREIGHT_RULES),
      freightSimulator: normalizeFreightSimulator(parsed.freightSimulator),
      commissions: normalizeCommissions(parsed.commissions),
      manualCommissions: normalizeManualCommissions(parsed.manualCommissions),
      commissionFilter: parsed.commissionFilter || "todos",
      taxRules: taxRules.length ? taxRules : cloneTaxRules(DEFAULT_TAX_RULES),
      taxRuleFilters: {
        ...defaultTaxRuleFilters(),
        ...(parsed.taxRuleFilters || {}),
      },
      selectedId: parsed.selectedId || parsed.budgets[0].id,
      filter: parsed.filter === "todos" ? "todos" : normalizeQuoteStatus(parsed.filter),
      search: parsed.search || "",
      pdfOrientation: normalizePdfOrientation(parsed.pdfOrientation),
      overviewNumberSort: parsed.overviewNumberSort === "desc" ? "desc" : "asc",
      itemsCollapsed: parsed.itemsCollapsed === true,
      attachmentsCollapsed: parsed.attachmentsCollapsed !== false,
      freightSimulatorCollapsed: parsed.freightSimulatorCollapsed !== false,
      screen: parsed.screen || "propostas",
      proposalView: parsed.proposalView || "overview",
    };
  } catch {
    const quote = seedQuote();
    return {
      budgets: [quote],
      companies: cloneCompanies(DEFAULT_COMPANIES),
      representatives: cloneRepresentatives(DEFAULT_REPRESENTATIVES),
      freightRules: cloneFreightRules(DEFAULT_FREIGHT_RULES),
      freightSimulator: defaultFreightSimulator(),
      commissions: {},
      manualCommissions: [],
      commissionFilter: "todos",
      taxRules: cloneTaxRules(DEFAULT_TAX_RULES),
      taxRuleFilters: defaultTaxRuleFilters(),
      selectedId: quote.id,
      filter: "todos",
      search: "",
      pdfOrientation: "landscape",
      overviewNumberSort: "asc",
      itemsCollapsed: false,
      attachmentsCollapsed: true,
      freightSimulatorCollapsed: true,
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
    state.itemsCollapsed = false;
    touchQuote(quote);
    persistAndRender();
  });

  elements.addCompanyButton.addEventListener("click", addCompany);
  elements.addCompanyBankAccountButton?.addEventListener("click", addCompanyBankAccount);
  elements.addCompanyPaymentAccountButton?.addEventListener("click", addCompanyPaymentAccount);
  elements.closeCompanyDetailsButton?.addEventListener("click", closeCompanyDetails);
  elements.companyDetailsModal?.addEventListener("click", (event) => {
    if (event.target === elements.companyDetailsModal) closeCompanyDetails();
  });
  elements.addRepresentativeButton.addEventListener("click", addRepresentative);
  elements.addManualCommissionButton.addEventListener("click", addManualCommission);
  elements.addFreightButton.addEventListener("click", addFreightRule);
  elements.toggleFreightSimulatorButton.addEventListener("click", toggleFreightSimulator);
  elements.useSelectedQuoteFreightButton.addEventListener("click", useSelectedQuoteInFreightSimulator);
  elements.applyFreightToQuoteButton.addEventListener("click", applyFreightSimulatorToQuote);
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
    clone.revision = "R0";
    clone.sentAt = "";
    clone.nextContactAt = "";
    clone.lastClientResponse = "";
    clone.rejectionReason = "";
    clone.followUpNotes = "";
    clone.revisionHistory = [];
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
  elements.exportBackupButton.addEventListener("click", exportAllData);
  elements.importInput.addEventListener("change", importQuote);
  elements.importBackupInput.addEventListener("change", importAllData);
  elements.lookupCnpjButton.addEventListener("click", lookupClientCnpj);
  elements.saveQuoteButton.addEventListener("click", saveCurrentQuote);
  elements.createRevisionButton.addEventListener("click", createQuoteRevision);
  elements.saleSimulationButton?.addEventListener("click", openSaleSimulation);
  elements.closeItemDescriptionButton.addEventListener("click", closeItemDescriptionEditor);
  elements.cancelItemDescriptionButton.addEventListener("click", closeItemDescriptionEditor);
  elements.saveItemDescriptionButton.addEventListener("click", saveItemDescriptionEditor);
  elements.itemDescriptionModal.addEventListener("click", (event) => {
    if (event.target === elements.itemDescriptionModal) closeItemDescriptionEditor();
  });
  elements.closePaymentRatesButton?.addEventListener("click", closePaymentRatesEditor);
  elements.closePaymentRatesFooterButton?.addEventListener("click", closePaymentRatesEditor);
  elements.addPaymentRateRowButton?.addEventListener("click", addPaymentRateRow);
  elements.paymentRatesModal?.addEventListener("click", (event) => {
    if (event.target === elements.paymentRatesModal) closePaymentRatesEditor();
  });
  elements.closeSaleSimulationButton?.addEventListener("click", closeSaleSimulation);
  elements.cancelSaleSimulationButton?.addEventListener("click", closeSaleSimulation);
  elements.selectSaleSimulationButton?.addEventListener("click", selectSaleSimulationForQuote);
  elements.generateSaleSimulationButton?.addEventListener("click", generateSaleSimulation);
  elements.saleSimulationValue?.addEventListener("blur", () => {
    const amount = parseMoneyInput(elements.saleSimulationValue.value);
    elements.saleSimulationValue.value = amount ? moneyFormatter.format(amount) : "";
  });
  elements.saleSimulationValue?.addEventListener("input", resetSaleSimulationResult);
  elements.saleSimulationBrand?.addEventListener("change", resetSaleSimulationResult);
  elements.saleSimulationType?.addEventListener("change", resetSaleSimulationResult);
  elements.saleSimulationModal?.addEventListener("click", (event) => {
    if (event.target === elements.saleSimulationModal) closeSaleSimulation();
  });
  elements.proposalAttachmentInput?.addEventListener("change", addProposalAttachments);
  elements.toggleProposalAttachmentsButton?.addEventListener("click", toggleProposalAttachments);
  elements.closePdfResultButton.addEventListener("click", closePdfResultModal);
  elements.pdfResultModal.addEventListener("click", (event) => {
    if (event.target === elements.pdfResultModal) closePdfResultModal();
  });
  elements.exportTaxRulesButton.addEventListener("click", exportTaxRules);
  elements.importTaxRulesInput.addEventListener("change", importTaxRules);
  elements.addTaxRuleButton.addEventListener("click", addTaxRule);
  elements.resetTaxRulesButton.addEventListener("click", resetTaxRules);
  elements.printButton.addEventListener("click", openPrintablePreviewPdf);
  elements.previewPdfButton.addEventListener("click", () => openPdfPreview(false));
  elements.printPreviewButton.addEventListener("click", openPrintablePreviewPdf);
  elements.backFromPdfPreviewButton.addEventListener("click", () => {
    state.screen = "propostas";
    state.proposalView = "editor";
    persistAndRender();
  });
  elements.toggleItemsButton?.addEventListener("click", toggleItemsPanel);
  elements.pdfOrientationSelect?.addEventListener("change", () => {
    state.pdfOrientation = normalizePdfOrientation(elements.pdfOrientationSelect.value);
    saveState();
    renderPrintProposal();
  });
  window.addEventListener("beforeprint", renderPrintProposal);

  elements.taxCompanyFilter.addEventListener("change", () => {
    state.taxRuleFilters.company = elements.taxCompanyFilter.value;
    renderFiscalRules();
    saveState();
  });

  elements.taxUfFilter.addEventListener("change", () => {
    state.taxRuleFilters.uf = elements.taxUfFilter.value;
    renderFiscalRules();
    saveState();
  });

  elements.taxRuleSearch.addEventListener("input", (event) => {
    state.taxRuleFilters.search = event.target.value;
    renderFiscalRules();
    saveState();
  });

  elements.commissionStatusFilter.addEventListener("change", (event) => {
    state.commissionFilter = event.target.value;
    renderCommissions();
    saveState();
  });

  elements.freightSimulatorFields.forEach((input) => {
    const updateFreightSimulatorField = () => {
      setFreightSimulatorValue(input.dataset.freightSimField, input.value);
      if (input.dataset.freightSimField === "destinationUf") input.value = state.freightSimulator.destinationUf;
      renderFreightSimulator();
      saveState();
    };
    input.addEventListener("input", updateFreightSimulatorField);
    input.addEventListener("change", updateFreightSimulatorField);
  });

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

  elements.sortOverviewNumberButton.addEventListener("click", () => {
    state.overviewNumberSort = state.overviewNumberSort === "desc" ? "asc" : "desc";
    renderQuoteList();
    renderProposalOverview();
    saveState();
  });

  elements.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.screen = button.dataset.screen;
      if (state.screen === "propostas") state.proposalView = "overview";
      renderScreen();
      if (state.screen === "fiscal") renderFiscalRules();
      if (state.screen === "empresas") renderCompanies();
      if (state.screen === "representantes") renderRepresentatives();
      if (state.screen === "comissoes") renderCommissions();
      if (state.screen === "frete") renderFreightRules();
      saveState();
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.itemDescriptionModal.classList.contains("is-hidden")) {
      closeItemDescriptionEditor();
    }
    if (event.key === "Escape" && !elements.pdfResultModal.classList.contains("is-hidden")) {
      closePdfResultModal();
    }
    if (event.key === "Escape" && elements.paymentRatesModal && !elements.paymentRatesModal.classList.contains("is-hidden")) {
      closePaymentRatesEditor();
    }
    if (event.key === "Escape" && elements.saleSimulationModal && !elements.saleSimulationModal.classList.contains("is-hidden")) {
      closeSaleSimulation();
    }
  });
}

function createNewQuote() {
  const quote = {
    ...seedQuote(),
    id: crypto.randomUUID(),
    number: nextQuoteNumber(state.budgets),
    company: defaultCompanyCode(),
    hasRepresentative: "nao",
    representativeId: "",
    client: "Novo cliente",
    legalName: "",
    cnpj: "",
    items: [],
  };
  quote.items = [defaultItem(quote)];
  quote.revisionHistory = [buildRevisionRecord(quote, "R0", { emittedAt: new Date().toISOString(), notes: "Proposta inicial." })];
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

function saveCurrentQuote() {
  const quote = selectedQuote();
  if (quote) touchQuote(quote);
  elements.saveState.textContent = "Salvando...";
  saveState();
  renderQuoteList();
  renderProposalOverview();
  renderProposalRows();
  renderSummary();
  renderRevisionTimeline();
  renderPrintProposal();
  renderTitle();
  elements.saveState.textContent = "Salvo agora";
}

function createQuoteRevision() {
  const quote = selectedQuote();
  if (!quote) return;

  ensureRevisionHistory(quote);
  syncCurrentRevisionRecord(quote);
  const nextRevision = nextRevisionLabel(quote);
  quote.revision = nextRevision;
  quote.status = "negociacao";
  quote.sentAt = "";
  quote.rejectionReason = "";
  const record = buildRevisionRecord(quote, nextRevision, {
    emittedAt: new Date().toISOString(),
    notes: "Nova proposta criada para ajuste comercial.",
  });
  quote.revisionHistory.push(record);
  touchQuote(quote);
  persistAndRender();
}

function duplicateQuoteRevision(revision) {
  const quote = selectedQuote();
  if (!quote) return;

  syncCurrentRevisionRecord(quote);
  const sourceRevision = formatRevision(revision);
  const source = ensureRevisionHistory(quote).find((record) => formatRevision(record.revision) === sourceRevision);
  if (!source) return;

  const nextRevision = nextRevisionLabel(quote);
  const snapshot = normalizeRevisionSnapshot(source.snapshot, quote);
  snapshot.status = "rascunho";
  const record = {
    ...buildRevisionRecord(quote, nextRevision, {
      emittedAt: new Date().toISOString(),
      status: "rascunho",
      total: calculateSnapshotTotal(snapshot),
      notes: `Duplicada de ${formatRevisionAsProposal(sourceRevision)}.`,
    }),
    snapshot,
  };

  quote.revisionHistory.push(record);
  quote.revision = nextRevision;
  applyRevisionSnapshot(quote, snapshot);
  touchQuote(quote);
  persistAndRender();
}

function selectQuoteRevision(revision) {
  const quote = selectedQuote();
  if (!quote) return;

  const targetRevision = formatRevision(revision);
  if (targetRevision === formatRevision(quote.revision)) return;

  syncCurrentRevisionRecord(quote);
  const target = ensureRevisionHistory(quote).find((record) => formatRevision(record.revision) === targetRevision);
  if (!target) return;

  quote.revision = targetRevision;
  applyRevisionSnapshot(quote, target.snapshot);
  touchQuote(quote);
  persistAndRender();
}

function deleteQuoteRevision(revision) {
  const quote = selectedQuote();
  if (!quote) return;

  syncCurrentRevisionRecord(quote);
  const targetRevision = formatRevision(revision);
  const records = ensureRevisionHistory(quote);
  if (records.length <= 1) {
    alert("O orçamento precisa ter pelo menos uma proposta.");
    return;
  }

  const target = records.find((record) => formatRevision(record.revision) === targetRevision);
  if (!target) return;

  const proposalName = formatRevisionAsProposal(targetRevision);
  if (!confirm(`Excluir ${proposalName}?`)) return;

  const remaining = records.filter((record) => formatRevision(record.revision) !== targetRevision);
  quote.revisionHistory = remaining;

  if (targetRevision === formatRevision(quote.revision)) {
    const nextActive = remaining
      .slice()
      .sort((a, b) => revisionNumber(b.revision) - revisionNumber(a.revision))[0];
    quote.revision = formatRevision(nextActive.revision);
    applyRevisionSnapshot(quote, nextActive.snapshot);
  }

  touchQuote(quote);
  persistAndRender();
}

async function lookupClientCnpj() {
  const quote = selectedQuote();
  if (!quote) return;

  const cnpj = onlyDigits(elements.quoteForm.elements.cnpj?.value || quote.cnpj);
  if (cnpj.length !== 14) {
    setCnpjLookupStatus("Informe um CNPJ com 14 dígitos.", "error");
    elements.quoteForm.elements.cnpj?.focus();
    return;
  }

  elements.lookupCnpjButton.disabled = true;
  setCnpjLookupStatus("Buscando CNPJ...", "loading");

  try {
    const data = await fetchCnpjData(cnpj);
    applyCnpjDataToQuote(quote, data);
    syncFreightDestinationFromQuote(quote);
    touchQuote(quote);
    saveState();
    renderForm();
    renderQuoteList();
    renderProposalOverview();
    renderProposalRows();
    renderPrintProposal();
    renderTitle();
    setCnpjLookupStatus("CNPJ encontrado e dados atualizados.", "success");
  } catch (error) {
    setCnpjLookupStatus(error.message || "Não foi possível consultar agora.", "error");
  } finally {
    elements.lookupCnpjButton.disabled = false;
  }
}

async function fetchCnpjData(cnpj) {
  const localApi =
    window.location.protocol === "file:" ? `http://127.0.0.1:4173/api/cnpj/${cnpj}` : `/api/cnpj/${cnpj}`;
  const endpoints = [
    { url: `https://minhareceita.org/${cnpj}`, local: false },
    { url: localApi, local: true },
    { url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, local: false },
  ];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "CNPJ não encontrado.");
      }

      return data;
    } catch (error) {
      lastError = error;
    }
  }

  if (window.location.protocol === "file:") {
    throw new Error("Não foi possível consultar. Verifique a internet ou abra pelo servidor local.");
  }

  throw lastError || new Error("Não foi possível consultar agora.");
}

function applyCnpjDataToQuote(quote, data = {}) {
  quote.cnpj = formatCnpj(data.cnpj || quote.cnpj);
  quote.legalName = cnpjValue(data.razao_social, quote.legalName);
  quote.client = cnpjValue(data.nome_fantasia || data.razao_social, quote.client);
  quote.email = cnpjValue(data.email, quote.email).toLowerCase();
  quote.phone = formatPhone(cnpjValue(data.ddd_telefone_1 || data.ddd_telefone_2, quote.phone));
  quote.address = cnpjValue(formatCnpjAddress(data), quote.address);
  quote.addressNumber = cnpjValue(data.numero, quote.addressNumber);
  quote.district = cnpjValue(data.bairro, quote.district);
  quote.city = cnpjValue(data.municipio, quote.city);
  quote.state = cnpjValue(data.uf, quote.state).toUpperCase();
  quote.zipCode = formatCep(cnpjValue(data.cep, quote.zipCode));
  quote.items.forEach((item) => applyTaxRule(item, quote));
}

function cnpjValue(value, fallback = "") {
  const text = String(value || "").trim();
  return text || String(fallback || "").trim();
}

function formatCnpjAddress(data = {}) {
  const streetType = String(data.descricao_tipo_de_logradouro || "").trim();
  let street = String(data.logradouro || "").trim();
  const number = String(data.numero || "").trim();
  if (number && street.endsWith(` ${number}`)) {
    street = street.slice(0, -number.length).trim();
  }
  if (!street) return "";
  if (streetType && !street.toUpperCase().startsWith(streetType.toUpperCase())) {
    return `${streetType} ${street}`.trim();
  }
  return street;
}

function handleFormChange(event) {
  const quote = selectedQuote();
  const field = event.target.name;
  if (!field) return;

  quote[field] = field === "freight" ? parseNumber(event.target.value) : event.target.value;

  if (field === "status") {
    quote.status = normalizeQuoteStatus(quote.status);
    if (quote.status === "enviado" && !quote.sentAt) {
      quote.sentAt = today;
      if (elements.quoteForm.elements.sentAt) elements.quoteForm.elements.sentAt.value = today;
    }
    syncCurrentRevisionRecord(quote, quote.status === "enviado" ? { emittedAt: new Date().toISOString() } : {});
  }

  if (field === "sentAt" && quote.sentAt) {
    syncCurrentRevisionRecord(quote, { emittedAt: `${String(quote.sentAt).slice(0, 10)}T12:00:00` });
  }

  if (field === "state") {
    quote.state = String(quote.state || "").toUpperCase();
    quote.items.forEach((item) => {
      applyTaxRule(item, quote);
    });
    syncFreightDestinationFromQuote(quote);
  }

  if (field === "company") {
    quote.bankAccountId = "";
    quote.paymentAccountId = "";
    renderReceiptAccountOptions();
    quote.items.forEach((item) => applyTaxRule(item, quote));
  }

  if (field === "receiptMethod") {
    quote.receiptMethod = normalizeReceiptMethod(quote.receiptMethod);
    if (quote.receiptMethod !== RECEIPT_METHODS.cielo) quote.saleSimulation = null;
    renderReceiptAccountOptions();
    renderSaleSimulationButton();
    renderSelectedSaleSimulationSummary();
  }

  if (field === "receiptAccountId") {
    if (normalizeReceiptMethod(quote.receiptMethod) === RECEIPT_METHODS.cielo) {
      quote.paymentAccountId = event.target.value;
    } else if (normalizeReceiptMethod(quote.receiptMethod) === RECEIPT_METHODS.bank) {
      quote.bankAccountId = event.target.value;
    }
    quote.receiptAccountId = "";
  }

  if (field === "hasRepresentative" && quote.hasRepresentative !== "sim") {
    quote.representativeId = "";
  }

  touchQuote(quote);
  syncCurrentRevisionRecord(quote);
  elements.saveState.textContent = "Salvando...";
  saveState();
  renderQuoteList();
  renderProposalOverview();
  renderProposalRows();
  renderSummary();
  renderPrintProposal();
  renderRepresentativeFields();
  renderCommissions();
  renderNcmOptions();
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
  if (elements.pdfOrientationSelect) elements.pdfOrientationSelect.value = currentPdfOrientation();
  renderCompanyOptions();
  renderRepresentativeOptions();
  renderRepresentativeFields();
  renderNcmOptions();
  renderStatusTabs();
  renderQuoteList();
  renderProposalOverview();
  renderForm();
  renderRevisionTimeline();
  renderRepresentativeFields();
  renderItems();
  renderProposalRows();
  renderCompanies();
  renderRepresentatives();
  renderCommissions();
  renderFreightSimulator();
  renderFreightRules();
  renderFiscalRules();
  renderPrintProposal();
  renderSaleSimulationButton();
  renderSelectedSaleSimulationSummary();
  renderProposalAttachments();
  renderScreen();
  renderSummary();
  renderTitle();
}

function renderScreen() {
  const screen = ["propostas", "lista", "empresas", "representantes", "comissoes", "frete", "fiscal", "pdf"].includes(state.screen)
    ? state.screen
    : "propostas";
  state.screen = screen;
  elements.moduleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === screen);
  });
  elements.proposalScreen.classList.toggle("is-hidden", screen !== "propostas");
  elements.proposalListScreen.classList.toggle("is-hidden", screen !== "lista");
  elements.companiesScreen.classList.toggle("is-hidden", screen !== "empresas");
  elements.representativesScreen.classList.toggle("is-hidden", screen !== "representantes");
  elements.commissionsScreen.classList.toggle("is-hidden", screen !== "comissoes");
  elements.freightScreen.classList.toggle("is-hidden", screen !== "frete");
  elements.taxRulesScreen.classList.toggle("is-hidden", screen !== "fiscal");
  elements.pdfPreviewScreen.classList.toggle("is-hidden", screen !== "pdf");
  const proposalView = state.proposalView === "editor" ? "editor" : "overview";
  state.proposalView = proposalView;
  elements.proposalOverview.classList.toggle("is-hidden", screen !== "propostas" || proposalView !== "overview");
  elements.proposalEditor.classList.toggle("is-hidden", screen !== "propostas" || proposalView !== "editor");
}

function renderSaleSimulationButton() {
  if (!elements.saleSimulationButton) return;
  const quote = selectedQuote();
  const show = normalizeReceiptMethod(quote?.receiptMethod) === RECEIPT_METHODS.cielo;
  elements.saleSimulationButton.classList.toggle("is-hidden", !show);
}

function openSaleSimulation() {
  const quote = selectedQuote();
  if (!quote || normalizeReceiptMethod(quote.receiptMethod) !== RECEIPT_METHODS.cielo) return;
  const summary = calculateQuote(quote);
  elements.saleSimulationValue.value = moneyFormatter.format(summary.total);
  elements.saleSimulationBrand.value = "visa";
  renderSaleSimulationTypeOptions();
  resetSaleSimulationResult();
  elements.saleSimulationModal?.classList.remove("is-hidden");
}

function closeSaleSimulation() {
  elements.saleSimulationModal?.classList.add("is-hidden");
}

function renderSaleSimulationTypeOptions() {
  const quote = selectedQuote();
  if (!quote || !elements.saleSimulationType) return;
  const company = selectedCompany(quote);
  const account = selectedCompanyPaymentAccount(quote);
  const rows = normalizePaymentRateTable(account?.rateTable, company);
  elements.saleSimulationType.innerHTML = rows
    .filter((row) => row.type && !normalizeKey(row.type).includes("PIX"))
    .map((row) => `<option value="${escapeHtml(row.type)}">${escapeHtml(formatSaleTypeLabel(row.type))}</option>`)
    .join("");
  if (!elements.saleSimulationType.value && rows[0]) elements.saleSimulationType.value = rows[0].type;
}

function resetSaleSimulationResult() {
  if (!elements.saleSimulationResult) return;
  activeSaleSimulation = null;
  if (elements.selectSaleSimulationButton) elements.selectSaleSimulationButton.disabled = true;
  elements.saleSimulationResult.innerHTML = `
    <div class="sale-simulation-empty">
      <strong>Informe os dados e gere a simulação.</strong>
      <span>As taxas serão buscadas na conta Cielo selecionada nesta proposta.</span>
    </div>
  `;
}

function generateSaleSimulation() {
  const simulation = buildSaleSimulationFromInputs();

  if (!simulation) {
    elements.saleSimulationResult.innerHTML = `
      <div class="sale-simulation-empty">
        <strong>Não foi possível gerar a simulação.</strong>
        <span>Confira se existe taxa cadastrada para a bandeira e o tipo de venda escolhidos.</span>
      </div>
    `;
    return;
  }

  activeSaleSimulation = simulation;
  if (elements.selectSaleSimulationButton) elements.selectSaleSimulationButton.disabled = false;

  elements.saleSimulationResult.innerHTML = `
    <div class="sale-simulation-output">
      <div class="sale-simulation-cards">
        <article class="sale-simulation-card">
          <div class="simulation-metric">
            <span>Valor da venda</span>
            <strong>${simulation.installments > 1 ? `${simulation.installments}x de ${moneyFormatter.format(simulation.installmentAmount)}` : moneyFormatter.format(simulation.amount)}</strong>
          </div>
          <div class="simulation-metric">
            <span>Você receberá</span>
            <strong class="simulation-positive">${moneyFormatter.format(simulation.netAmount)}</strong>
          </div>
          <div class="simulation-metric">
            <span>Taxa total</span>
            <strong>${formatPercentDisplay(simulation.rate)}%</strong>
          </div>
          <div class="simulation-metric">
            <span>Prazo de recebimento</span>
            <strong>${escapeHtml(simulation.receivableDays)}</strong>
          </div>
          <div class="simulation-metric">
            <span>Taxa aplicada</span>
            <strong class="simulation-cost">${moneyFormatter.format(simulation.feeAmount)}</strong>
          </div>
          <div class="simulation-metric">
            <span>Recebe por parcela</span>
            <strong class="simulation-positive">${simulation.installments > 1 ? `${simulation.installments}x de ${moneyFormatter.format(simulation.netInstallmentAmount)}` : moneyFormatter.format(simulation.netAmount)}</strong>
          </div>
        </article>
      </div>
      <aside class="sale-simulation-side">
        <div><span>Valor simulado</span><strong>${moneyFormatter.format(simulation.amount)}</strong></div>
        <div><span>Bandeira</span><strong>${escapeHtml(simulation.brandLabel)}</strong></div>
        <div><span>Tipo de venda</span><strong>${escapeHtml(simulation.typeLabel)}</strong></div>
        <div><span>Modalidade</span><strong>Link de Pagamento</strong></div>
        <div><span>Conta</span><strong>${escapeHtml(simulation.accountLabel)}</strong></div>
      </aside>
    </div>
  `;
}

function buildSaleSimulationFromInputs() {
  const quote = selectedQuote();
  if (!quote) return null;
  const company = selectedCompany(quote);
  const account = selectedCompanyPaymentAccount(quote);
  const amount = parseMoneyInput(elements.saleSimulationValue?.value);
  const brand = elements.saleSimulationBrand?.value || "visa";
  const type = elements.saleSimulationType?.value || "";
  const rateRow = normalizePaymentRateTable(account?.rateTable, company).find((row) => row.type === type);
  const rate = parseRatePercent(rateRow?.[brand]);
  if (!amount || !rateRow || !Number.isFinite(rate)) return null;

  const installments = saleTypeInstallments(type);
  const installmentAmount = installments > 0 ? amount / installments : amount;
  const netAmount = amount * (1 - rate);
  const feeAmount = amount - netAmount;
  const netInstallmentAmount = installments > 0 ? netAmount / installments : netAmount;
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    amount,
    brand,
    brandLabel: formatCardBrandLabel(brand),
    type,
    typeLabel: formatSaleTypeLabel(type),
    modality: "Link de Pagamento",
    accountId: account?.id || "",
    accountLabel: formatPaymentAccountOption(account || {}, 0),
    rate,
    installments,
    installmentAmount,
    netAmount,
    netInstallmentAmount,
    feeAmount,
    receivableDays: installments > 1 ? "31 dias úteis por parcela" : "31 dias úteis",
  };
}

function selectSaleSimulationForQuote() {
  const quote = selectedQuote();
  if (!quote || !activeSaleSimulation) return;
  quote.saleSimulation = normalizeSaleSimulation(activeSaleSimulation);
  quote.paymentTerms = formatSimulationPaymentTerms(quote.saleSimulation);
  if (elements.quoteForm?.elements.paymentTerms) elements.quoteForm.elements.paymentTerms.value = quote.paymentTerms;
  touchQuote(quote);
  syncCurrentRevisionRecord(quote);
  saveState();
  renderSelectedSaleSimulationSummary();
  renderPrintProposal();
  closeSaleSimulation();
}

function renderSelectedSaleSimulationSummary() {
  const quote = selectedQuote();
  if (!elements.selectedSaleSimulationSummary || !quote) return;
  const simulation = normalizeSaleSimulation(quote.saleSimulation);
  const show = normalizeReceiptMethod(quote.receiptMethod) === RECEIPT_METHODS.cielo && simulation;
  elements.selectedSaleSimulationSummary.classList.toggle("is-hidden", !show);
  if (!show) {
    elements.selectedSaleSimulationSummary.innerHTML = "";
    return;
  }
  elements.selectedSaleSimulationSummary.innerHTML = `
    <div>
      <strong>Simulação Cielo selecionada</strong>
      <span>${escapeHtml(simulation.typeLabel)} · ${escapeHtml(simulation.brandLabel)} · ${moneyFormatter.format(simulation.amount)}</span>
    </div>
    <div>
      <span>Você receberá <b class="simulation-positive">${moneyFormatter.format(simulation.netAmount)}</b></span>
      <span>Recebe por parcela <b class="simulation-positive">${moneyFormatter.format(simulation.netInstallmentAmount)}</b></span>
      <span>Taxa aplicada <b class="simulation-cost">${moneyFormatter.format(simulation.feeAmount)}</b></span>
      <button class="ghost-button compact-button" type="button" data-remove-sale-simulation>Remover</button>
    </div>
    <label class="selected-sale-link-field">
      Link gerado
      <div class="selected-sale-link-row">
        <button class="secondary-button compact-button" type="button" data-open-cielo-link>Gerar link de pagamento</button>
        <input type="url" data-sale-payment-link value="${escapeHtml(simulation.paymentLink || "")}" placeholder="Cole aqui o link de pagamento da Cielo" />
        <a class="secondary-button compact-button ${simulation.paymentLink ? "" : "is-hidden"}" data-open-sale-payment-link href="${escapeHtml(normalizeExternalUrl(simulation.paymentLink))}" target="_blank" rel="noopener">Abrir link</a>
      </div>
    </label>
  `;
  elements.selectedSaleSimulationSummary.querySelector("[data-open-cielo-link]")?.addEventListener("click", () => {
    window.open("https://minhaconta2.cielo.com.br/site/ecommerce/checkout-link", "_blank", "noopener");
  });
  elements.selectedSaleSimulationSummary.querySelector("[data-sale-payment-link]")?.addEventListener("input", (event) => {
    const openLink = elements.selectedSaleSimulationSummary.querySelector("[data-open-sale-payment-link]");
    const normalizedUrl = normalizeExternalUrl(event.target.value);
    quote.saleSimulation = normalizeSaleSimulation({
      ...simulation,
      paymentLink: event.target.value,
    });
    touchQuote(quote);
    syncCurrentRevisionRecord(quote);
    saveState();
    openLink?.classList.toggle("is-hidden", !normalizedUrl);
    if (openLink && normalizedUrl) openLink.href = normalizedUrl;
  });
  elements.selectedSaleSimulationSummary.querySelector("[data-remove-sale-simulation]")?.addEventListener("click", () => {
    quote.saleSimulation = null;
    touchQuote(quote);
    syncCurrentRevisionRecord(quote);
    saveState();
    renderSelectedSaleSimulationSummary();
    renderPrintProposal();
  });
}

async function addProposalAttachments(event) {
  const quote = selectedQuote();
  const files = Array.from(event.target.files || []);
  if (!quote || files.length === 0) return;
  quote.attachments = normalizeProposalAttachments(quote.attachments);

  for (const file of files) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      alert(`O arquivo ${file.name} n\u00e3o \u00e9 PDF nem imagem.`);
      continue;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert(`O arquivo ${file.name} \u00e9 grande demais para salvar no app local. Tente um arquivo menor que 3 MB.`);
      continue;
    }
    const dataUrl = await readFileAsDataUrl(file);
    quote.attachments.push(
      normalizeProposalAttachment({
        id: createId(),
        name: file.name,
        type: file.type === "application/pdf" ? "Ficha t\u00e9cnica" : "Imagem complementar",
        itemId: "",
        showInPdf: true,
        mimeType: file.type,
        size: file.size,
        dataUrl,
        createdAt: new Date().toISOString(),
      }),
    );
  }

  event.target.value = "";
  state.attachmentsCollapsed = false;
  touchQuote(quote);
  syncCurrentRevisionRecord(quote);
  saveState();
  renderProposalAttachments();
  renderPrintProposal();
}

function renderProposalAttachments() {
  const quote = selectedQuote();
  if (!elements.proposalAttachmentsList || !quote) return;
  quote.attachments = normalizeProposalAttachments(quote.attachments);
  const count = quote.attachments.length;
  const visibleCount = quote.attachments.filter((attachment) => attachment.showInPdf).length;
  if (elements.proposalAttachmentsSummary) {
    elements.proposalAttachmentsSummary.textContent =
      count === 0
        ? "Nenhum anexo cadastrado nesta proposta."
        : `${count} anexo${count === 1 ? "" : "s"} cadastrado${count === 1 ? "" : "s"} · ${visibleCount} no PDF`;
  }
  elements.proposalAttachmentsPanel?.classList.toggle("is-collapsed", state.attachmentsCollapsed);
  if (elements.toggleProposalAttachmentsButton) {
    elements.toggleProposalAttachmentsButton.textContent = state.attachmentsCollapsed ? "↓" : "↑";
    elements.toggleProposalAttachmentsButton.title = state.attachmentsCollapsed ? "Expandir anexos" : "Reduzir anexos";
    elements.toggleProposalAttachmentsButton.setAttribute("aria-label", state.attachmentsCollapsed ? "Expandir anexos" : "Reduzir anexos");
    elements.toggleProposalAttachmentsButton.setAttribute("aria-expanded", String(!state.attachmentsCollapsed));
  }
  if (quote.attachments.length === 0) {
    elements.proposalAttachmentsList.innerHTML = '<p class="empty-attachment-state">Nenhum anexo cadastrado nesta proposta.</p>';
    return;
  }

  const itemOptions = [
    '<option value="">Proposta inteira</option>',
    ...quote.items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.code || item.description || "Item")}</option>`),
  ].join("");

  elements.proposalAttachmentsList.innerHTML = quote.attachments
    .map(
      (attachment) => `
        <div class="proposal-attachment-card" data-attachment-id="${escapeHtml(attachment.id)}">
          <div class="attachment-file-main">
            <strong>${escapeHtml(attachment.name)}</strong>
            <span>${escapeHtml(attachment.mimeType === "application/pdf" ? "PDF" : "Imagem")} Â· ${formatFileSize(attachment.size)}</span>
          </div>
          <select data-attachment-field="type">
            ${["Ficha t\u00e9cnica", "Cat\u00e1logo", "Manual", "Desenho t\u00e9cnico", "Outro"]
              .map((type) => `<option value="${escapeHtml(type)}" ${attachment.type === type ? "selected" : ""}>${escapeHtml(type)}</option>`)
              .join("")}
          </select>
          <select data-attachment-field="itemId">
            ${itemOptions.replace(`value="${escapeHtml(attachment.itemId)}"`, `value="${escapeHtml(attachment.itemId)}" selected`)}
          </select>
          <label class="attachment-check">
            <input data-attachment-field="showInPdf" type="checkbox" ${attachment.showInPdf ? "checked" : ""} />
            Mostrar no PDF
          </label>
          <a class="ghost-button compact-button" href="${escapeHtml(attachment.dataUrl)}" target="_blank" rel="noopener">Abrir</a>
          <button class="icon-button danger" data-remove-attachment type="button" title="Remover anexo" aria-label="Remover anexo">x</button>
        </div>
      `,
    )
    .join("");

  elements.proposalAttachmentsList.querySelectorAll("[data-attachment-field]").forEach((input) => {
    input.addEventListener("change", () => updateProposalAttachment(input));
    if (input.tagName !== "SELECT") input.addEventListener("input", () => updateProposalAttachment(input));
  });
  elements.proposalAttachmentsList.querySelectorAll("[data-remove-attachment]").forEach((button) => {
    button.addEventListener("click", () => removeProposalAttachment(button.closest("[data-attachment-id]")?.dataset.attachmentId));
  });
}

function toggleProposalAttachments() {
  state.attachmentsCollapsed = !state.attachmentsCollapsed;
  saveState();
  renderProposalAttachments();
}

function updateProposalAttachment(input) {
  const quote = selectedQuote();
  const id = input.closest("[data-attachment-id]")?.dataset.attachmentId;
  const attachment = quote?.attachments?.find((current) => current.id === id);
  if (!attachment) return;
  const field = input.dataset.attachmentField;
  attachment[field] = input.type === "checkbox" ? input.checked : input.value;
  touchQuote(quote);
  syncCurrentRevisionRecord(quote);
  saveState();
  renderPrintProposal();
}

function removeProposalAttachment(id) {
  const quote = selectedQuote();
  if (!quote || !id) return;
  quote.attachments = normalizeProposalAttachments(quote.attachments).filter((attachment) => attachment.id !== id);
  touchQuote(quote);
  syncCurrentRevisionRecord(quote);
  saveState();
  renderProposalAttachments();
  renderPrintProposal();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("Falha ao ler o anexo")));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(size) {
  const bytes = parseNumber(size);
  if (!bytes) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("pt-BR")} KB`;
}

function formatSimulationPaymentTerms(simulation = {}) {
  const normalized = normalizeSaleSimulation(simulation);
  if (!normalized) return "";
  if (normalized.installments > 1) {
    return `${normalized.typeLabel} ${moneyFormatter.format(normalized.installmentAmount)}`;
  }
  return `${normalized.typeLabel} ${moneyFormatter.format(normalized.amount)}`;
}

function normalizeExternalUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function normalizeSaleSimulation(simulation = null) {
  if (!simulation || typeof simulation !== "object") return null;
  const amount = parseNumber(simulation.amount);
  const rate = parseNumber(simulation.rate);
  const installments = Math.max(1, parseNumber(simulation.installments) || saleTypeInstallments(simulation.type));
  const installmentAmount = parseNumber(simulation.installmentAmount) || (installments > 0 ? amount / installments : amount);
  const netAmount = parseNumber(simulation.netAmount) || amount * (1 - rate);
  const feeAmount = parseNumber(simulation.feeAmount) || amount - netAmount;
  const netInstallmentAmount = parseNumber(simulation.netInstallmentAmount) || (installments > 0 ? netAmount / installments : netAmount);
  if (!amount) return null;
  return {
    id: simulation.id || createId(),
    createdAt: simulation.createdAt || new Date().toISOString(),
    amount,
    brand: simulation.brand || "visa",
    brandLabel: simulation.brandLabel || formatCardBrandLabel(simulation.brand),
    type: simulation.type || "",
    typeLabel: simulation.typeLabel || formatSaleTypeLabel(simulation.type),
    modality: simulation.modality || "Link de Pagamento",
    accountId: simulation.accountId || "",
    accountLabel: simulation.accountLabel || "",
    rate,
    installments,
    installmentAmount,
    netAmount,
    netInstallmentAmount,
    feeAmount,
    receivableDays: simulation.receivableDays || (installments > 1 ? "31 dias úteis por parcela" : "31 dias úteis"),
    paymentLink: String(simulation.paymentLink || "").trim(),
  };
}

function normalizeProposalAttachments(attachments = []) {
  return (Array.isArray(attachments) ? attachments : [])
    .filter(Boolean)
    .map(normalizeProposalAttachment)
    .filter((attachment) => attachment.name && attachment.dataUrl);
}

function normalizeProposalAttachment(attachment = {}) {
  return {
    id: attachment.id || createId(),
    name: String(attachment.name || "Anexo").trim(),
    type: String(attachment.type || "Ficha t\u00e9cnica").trim(),
    itemId: String(attachment.itemId || "").trim(),
    showInPdf: attachment.showInPdf !== false,
    mimeType: String(attachment.mimeType || attachment.typeMime || "").trim(),
    size: parseNumber(attachment.size),
    dataUrl: String(attachment.dataUrl || "").trim(),
    createdAt: attachment.createdAt || new Date().toISOString(),
  };
}

function openPdfPreview(printAfterOpen = false) {
  state.screen = "pdf";
  renderPrintProposal();
  renderScreen();
  saveState();
  if (printAfterOpen) {
    printCurrentProposalPdf();
  }
}

function printCurrentProposalPdf() {
  renderPrintProposal();
  const previousTitle = document.title;
  const quote = selectedQuote();
  document.title = buildPdfDocumentTitle(quote);
  const restoreTitle = () => {
    document.title = previousTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };
  window.addEventListener("afterprint", restoreTitle);
  window.focus();
  window.print();
}

function buildPdfDocumentTitle(quote) {
  const number = quote ? formatProposalNumber(quote.number) : "";
  const proposalCode = quote ? formatRevisionProposalCode(quote.revision) : "01";
  return sanitizeFilename(`Orcamento ${number || "sem numero"} - ${proposalCode}`);
}

function sanitizeFilename(value) {
  return String(value || "Proposta")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePdfOrientation(value) {
  return value === "portrait" ? "portrait" : "landscape";
}

function currentPdfOrientation() {
  return normalizePdfOrientation(state.pdfOrientation);
}

function currentPdfPageSpec() {
  return PDF_PAGE_SIZES[currentPdfOrientation()];
}

async function openPrintablePreviewPdf() {
  const quote = selectedQuote();
  if (!quote) return;
  try {
    renderPrintProposal();
    const pdfBytes = await buildPreviewImagePdf();
    downloadPdfBytes(pdfBytes, `${buildPdfDocumentTitle(quote)}.pdf`);
  } catch (error) {
    console.error(error);
    alert("Nao foi possivel gerar o PDF da previa. Abra a Previa PDF e tente novamente.");
  }
}

async function buildPreviewImagePdf() {
  const sourcePage = elements.printProposal.querySelector(".print-page");
  if (!sourcePage) throw new Error("Previa indisponivel");
  const pageSpec = currentPdfPageSpec();
  const renderHost = document.createElement("div");
  renderHost.className = "pdf-preview-body";
  renderHost.style.cssText = [
    "background:#fff",
    "left:-20000px",
    "pointer-events:none",
    "position:absolute",
    "top:0",
    `width:${pageSpec.width}px`,
    "z-index:-1",
  ].join(";");
  const pageClone = sourcePage.cloneNode(true);
  pageClone.style.boxShadow = "none";
  renderHost.append(pageClone);
  document.body.append(renderHost);
  await waitForRenderFrame();
  try {
    const contentHeight = measurePrintPageContentHeight(pageClone);
    const canvas = await renderElementToCanvas(pageClone);
    const pages = splitCanvasIntoPages(canvas, pageSpec.width, pageSpec.height, pageSpec.bottomMargin, contentHeight);
    return createImagePdfFile(pages, pageSpec.width, pageSpec.height);
  } finally {
    renderHost.remove();
  }
}

function waitForRenderFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function renderElementToCanvas(element) {
  const width = Math.ceil(element.scrollWidth);
  const height = Math.ceil(element.scrollHeight);
  const xhtml = new XMLSerializer().serializeToString(element);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject x="0" y="0" width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <style>${escapeSvgText(collectPrintableStyles())}</style>
      ${xhtml}
    </div>
  </foreignObject>
</svg>`;
  const image = await loadSvgImage(svg);
  const scale = Math.min(2, window.devicePixelRatio || 1.5);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function loadSvgImage(svg) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao renderizar previa"));
    };
    image.src = url;
  });
}

function splitCanvasIntoPages(canvas, pageWidth, pageHeight, bottomMargin = 0, sourceContentHeight = pageHeight) {
  const scale = canvas.width / pageWidth;
  const printableHeight = Math.max(1, pageHeight - bottomMargin);
  const sliceHeight = Math.floor(printableHeight * scale);
  const pageCanvasHeight = Math.floor(pageHeight * scale);
  const pages = [];
  const contentCanvasHeight = Math.ceil(Math.max(1, sourceContentHeight) * scale);
  const pageTops = contentCanvasHeight <= sliceHeight
    ? [0]
    : Array.from({ length: Math.ceil(contentCanvasHeight / sliceHeight) }, (_, index) => index * sliceHeight);
  pageTops.forEach((top) => {
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageCanvasHeight;
    const context = pageCanvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    const currentSliceHeight = Math.min(sliceHeight, contentCanvasHeight - top);
    context.drawImage(canvas, 0, top, canvas.width, currentSliceHeight, 0, 0, pageCanvas.width, currentSliceHeight);
    pages.push({
      bytes: dataUrlToBytes(pageCanvas.toDataURL("image/jpeg", 0.94)),
      height: pageCanvas.height,
      width: pageCanvas.width,
    });
  });
  return pages;
}

function createImagePdfFile(imagePages, pageWidth, pageHeight) {
  const objects = [];
  const pageObjectIds = [];
  const imageObjectIds = [];
  const addObject = (body) => {
    objects.push(typeof body === "string" ? stringToPdfBytes(body) : body);
    return objects.length;
  };

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("");

  imagePages.forEach((imagePage, index) => {
    const imageId = addObject([
      ...stringToPdfBytes(`<< /Type /XObject /Subtype /Image /Width ${imagePage.width} /Height ${imagePage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imagePage.bytes.length} >>\nstream\n`),
      ...imagePage.bytes,
      ...stringToPdfBytes("\nendstream"),
    ]);
    const content = `q ${formatPdfNumber(pageWidth)} 0 0 ${formatPdfNumber(pageHeight)} 0 0 cm /Im${index + 1} Do Q`;
    const contentId = addObject(`<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(pageWidth)} ${formatPdfNumber(pageHeight)}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    imageObjectIds.push(imageId);
    pageObjectIds.push(pageId);
  });

  objects[1] = stringToPdfBytes(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`);

  return assemblePdfBytes(objects);
}

function assemblePdfBytes(objects) {
  const chunks = [stringToPdfBytes("%PDF-1.4\n")];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((body, index) => {
    offsets.push(length);
    const header = stringToPdfBytes(`${index + 1} 0 obj\n`);
    const footer = stringToPdfBytes("\nendobj\n");
    chunks.push(header, body, footer);
    length += header.length + body.length + footer.length;
  });
  const xrefStart = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  chunks.push(stringToPdfBytes(xref));
  return concatBytes(chunks);
}

function downloadPdfBytes(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function stringToPdfBytes(value) {
  return new Uint8Array([...String(value)].map((char) => char.charCodeAt(0) & 0xff));
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function collectPrintableStyles() {
  return Array.from(document.querySelectorAll("style"))
    .map((style) => style.textContent || "")
    .join("\n");
}

function escapeSvgText(value) {
  return String(value).replace(/<\/style/gi, "<\\/style");
}

function downloadCurrentProposalPdf() {
  const quote = selectedQuote();
  if (!quote) return;
  renderPrintProposal();
  const pdfBytes = buildProposalPdf(quote);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  if (activePdfUrl) URL.revokeObjectURL(activePdfUrl);
  const url = URL.createObjectURL(blob);
  const filename = `${buildPdfDocumentTitle(quote)}.pdf`;
  activePdfUrl = url;
  elements.pdfResultFilename.textContent = filename;
  elements.pdfResultOpenButton.href = url;
  elements.pdfResultDownloadButton.href = url;
  elements.pdfResultDownloadButton.download = filename;
  elements.pdfResultModal.classList.remove("is-hidden");
}

function closePdfResultModal() {
  elements.pdfResultModal.classList.add("is-hidden");
  elements.pdfResultOpenButton.removeAttribute("href");
  elements.pdfResultDownloadButton.removeAttribute("href");
  if (activePdfUrl) {
    URL.revokeObjectURL(activePdfUrl);
    activePdfUrl = "";
  }
}

function buildProposalPdf(quote) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 21;
  const bottomMargin = 24;
  const contentWidth = pageWidth - margin * 2;
  const pages = [];
  let page;
  let y;

  const addPage = () => {
    page = [];
    pages.push(page);
    y = pageHeight - margin;
  };
  const ensureSpace = (height) => {
    if (y - height < bottomMargin) addPage();
  };
  const command = (value) => page.push(value);
  const line = (x1, y1, x2, y2, width = 0.5) => {
    command(`${formatPdfNumber(width)} w ${formatPdfNumber(x1)} ${formatPdfNumber(y1)} m ${formatPdfNumber(x2)} ${formatPdfNumber(y2)} l S`);
  };
  const rect = (x, rowY, width, height, fill = false, gray = 0.93) => {
    if (fill) {
      command(`${formatPdfNumber(gray)} g ${formatPdfNumber(x)} ${formatPdfNumber(rowY)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re f 0 g`);
      return;
    }
    command(`${formatPdfNumber(x)} ${formatPdfNumber(rowY)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re S`);
  };
  const text = (value, x, rowY, size = 8, options = {}) => {
    const safe = escapePdfText(normalizePdfText(value));
    const font = options.bold ? "F2" : "F1";
    const tx = options.align === "right" ? x - estimateTextWidth(value, size) : x;
    if (options.color) command(`${options.color.map(formatPdfNumber).join(" ")} rg`);
    command(`BT /${font} ${formatPdfNumber(size)} Tf ${formatPdfNumber(tx)} ${formatPdfNumber(rowY)} Td (${safe}) Tj ET`);
    if (options.color) command("0 0 0 rg");
  };
  const wrappedText = (value, x, topY, width, size = 8, maxLines = 0) => {
    const lines = wrapPdfText(value, width, size);
    const visible = maxLines > 0 ? lines.slice(0, maxLines) : lines;
    visible.forEach((lineText, index) => text(lineText, x, topY - index * (size + 2), size));
    return visible.length;
  };
  const sectionTitle = (title) => {
    ensureSpace(22);
    text(title, margin, y, 10, { bold: true });
    y -= 5;
    line(margin, y, pageWidth - margin, y, 0.8);
    y -= 12;
  };

  addPage();

  const summary = calculateQuote(quote);
  const taxSummary = calculateTaxSummary(quote);
  const company = selectedCompany(quote);
  const proposalNumber = formatProposalNumber(quote.number);
  const proposalCode = formatRevisionProposalCode(quote.revision);
  const proposalDate = formatDateOnly(quote.date || today);

  const brandName = (company.code || company.name || "empresa").toLowerCase();
  const brandColor = brandName.includes("frio") ? [0.02, 0.28, 0.6] : [0.02, 0.02, 0.26];
  text(brandName, margin + 12, y - 24, 19, { bold: true, color: brandColor });
  text(company.name || company.code || "Empresa", margin + 118, y, 8.5, { bold: true });
  text(`PROPOSTA: ${proposalNumber} - ${proposalCode}`, pageWidth - margin, y, 12, { align: "right", bold: true });
  y -= 10;
  text(`Regime tributario: ${company.taxRegime || ""}`, margin + 118, y, 6.5);
  text(proposalDate, pageWidth - margin, y, 7, { align: "right" });
  y -= 9;
  text(`CNPJ: ${company.cnpj || ""} - Inscricao Estadual: ${company.stateRegistration || ""}`, margin + 118, y, 6.5);
  y -= 9;
  text(formatCompanyAddressLine(company), margin + 118, y, 6.5);
  y -= 9;
  text(`Telefone(s): ${company.phone || ""} - E-mail: ${company.email || ""}`, margin + 118, y, 6.5);
  y -= 12;
  line(margin, y, pageWidth - margin, y, 0.8);
  y -= 16;

  sectionTitle("Dados do cliente");
  wrappedText(quote.client || quote.legalName || "Cliente nao informado", margin + 10, y, contentWidth - 20, 7.8);
  y -= 10;
  if (quote.legalName && normalizeKey(quote.legalName) !== normalizeKey(quote.client)) {
    wrappedText(quote.legalName, margin + 10, y, contentWidth - 20, 6.5);
    y -= 9;
  }
  text(`CNPJ/CPF: ${quote.cnpj || ""}`, margin + 10, y, 6.5);
  y -= 9;
  wrappedText(formatClientAddressLine(quote), margin + 10, y, contentWidth - 20, 6.5);
  y -= 9;
  wrappedText(`Requisitante: ${quote.requester || ""} - Telefone: ${quote.phone || ""} - E-mail: ${quote.email || ""}`, margin + 10, y, contentWidth - 20, 6.5);
  y -= 18;

  sectionTitle("Totais");
  const totalsTop = y;
  const blockWidth = (contentWidth - 12) / 2;
  rect(margin, totalsTop - 48, blockWidth, 52);
  rect(margin + blockWidth + 12, totalsTop - 48, blockWidth, 52);
  text("Total das mercadorias e servicos", margin + 8, totalsTop - 12, 8.5, { bold: true });
  text("Total dos tributos", margin + blockWidth + 20, totalsTop - 12, 8.5, { bold: true });
  text(`Produto: ${moneyFormatter.format(summary.itemsTotal)}`, margin + 8, totalsTop - 28, 6.5);
  text(`Frete: ${moneyFormatter.format(summary.freight)}`, margin + 8, totalsTop - 40, 6.5);
  text(`Total: ${moneyFormatter.format(summary.total)}`, margin + blockWidth - 8, totalsTop - 40, 7, { align: "right", bold: true });
  text(`ICMS: ${moneyFormatter.format(taxSummary.icms)}`, margin + blockWidth + 20, totalsTop - 28, 6.5);
  text(`IPI: ${moneyFormatter.format(taxSummary.ipi)}`, margin + blockWidth + 20, totalsTop - 40, 6.5);
  if (taxSummary.highlightPisCofins) {
    text(`PIS: ${moneyFormatter.format(taxSummary.pis)}`, margin + blockWidth + 138, totalsTop - 28, 6.5);
    text(`COFINS: ${moneyFormatter.format(taxSummary.cofins)}`, margin + blockWidth + 138, totalsTop - 40, 6.5);
  }
  y -= 65;

  drawPdfItemsTable({
    quote,
    margin,
    pageWidth,
    pageHeight,
    bottomMargin,
    addPage,
    ensureSpace,
    command,
    line,
    rect,
    text,
    wrappedText,
    getY: () => y,
    setY: (value) => {
      y = value;
    },
  });

  sectionTitle("Condicoes comerciais");
  const commercialLines = [
    `Validade: ${quote.proposalValidity || ""}`,
    `Frete: ${quote.freightType || ""}`,
    quote.paymentTerms && normalizeReceiptMethod(quote.receiptMethod) !== RECEIPT_METHODS.cielo ? `Pagamento: ${quote.paymentTerms}` : "",
    normalizeReceiptMethod(quote.receiptMethod) !== RECEIPT_METHODS.cielo ? `Recebimento: ${receiptMethodLabel(quote.receiptMethod)}` : "",
    quote.deliveryTime ? `Entrega: ${quote.deliveryTime}` : "",
  ].filter(Boolean);
  commercialLines.forEach((lineText) => {
    ensureSpace(12);
    text(lineText, margin, y, 8);
    y -= 11;
  });
  y -= 8;

  const receiptDetails = selectedReceiptDetails(quote);
  if (receiptDetails.lines.length) {
    sectionTitle(receiptDetails.title);
    receiptDetails.lines.forEach((lineText) => {
      ensureSpace(12);
      text(lineText, margin, y, 8);
      y -= 11;
    });
    if (receiptDetails.paymentLink) {
      ensureSpace(12);
      text(`Link: ${receiptDetails.paymentLink}`, margin, y, 8);
      y -= 11;
    }
    y -= 8;
  }

  const pdfAttachments = normalizeProposalAttachments(quote.attachments).filter((attachment) => attachment.showInPdf);
  if (pdfAttachments.length) {
    sectionTitle("Anexos complementares");
    pdfAttachments.forEach((attachment) => {
      const itemLabel = attachment.itemId ? printAttachmentItemLabel(quote, attachment.itemId) : "Proposta inteira";
      ensureSpace(22);
      text(`${attachment.type || "Anexo"}: ${attachment.name}`, margin, y, 8);
      y -= 11;
      text(`Vinculado a: ${itemLabel}`, margin, y, 8);
      y -= 11;
    });
    y -= 8;
  }

  if (quote.notes) {
    sectionTitle("Observacoes sobre a proposta");
    const noteLines = wrapPdfText(quote.notes, contentWidth, 8);
    noteLines.forEach((lineText) => {
      ensureSpace(12);
      text(lineText, margin, y, 8);
      y -= 11;
    });
  }

  pages.forEach((commands, index) => {
    const footerY = 18;
    commands.push(`BT /F1 7 Tf ${formatPdfNumber(margin)} ${formatPdfNumber(footerY)} Td (${escapePdfText(normalizePdfText(company.email || ""))}) Tj ET`);
    commands.push(`BT /F1 7 Tf ${formatPdfNumber(pageWidth - margin - 42)} ${formatPdfNumber(footerY)} Td (Pagina ${index + 1} de ${pages.length}) Tj ET`);
  });

  return createPdfFile(pages, pageWidth, pageHeight);
}

function drawPdfItemsTable(context) {
  const {
    quote,
    margin,
    pageWidth,
    bottomMargin,
    addPage,
    ensureSpace,
    line,
    rect,
    text,
    wrappedText,
    getY,
    setY,
  } = context;
  const columns = [
    { label: "Item", width: 24 },
    { label: "Produto", width: 36 },
    { label: "Descricao", width: 120 },
    { label: "Qtde", width: 24 },
    { label: "Unid.", width: 22 },
    { label: "NCM", width: 42 },
    { label: "Preco liq.", width: 42 },
    { label: "BC ICMS", width: 32 },
    { label: "ICMS %", width: 30 },
    { label: "ICMS R$", width: 36 },
    { label: "IPI %", width: 26 },
    { label: "IPI R$", width: 34 },
    { label: "Vlr un. bruto", width: 39 },
    { label: "SubTotal", width: 28 },
  ];
  const headerHeight = 20;

  const drawHeader = () => {
    let y = getY();
    ensureSpace(38);
    text("Itens da proposta", margin, y, 10, { bold: true });
    y -= 8;
    line(margin, y, pageWidth - margin, y, 0.8);
    y -= 18;
    setY(y);
    drawTableHeader();
  };

  const drawTableHeader = () => {
    let y = getY();
    let x = margin;
    rect(margin, y - headerHeight + 4, pageWidth - margin * 2, headerHeight, true, 0.9);
    columns.forEach((column) => {
      text(column.label, x + 2, y - 7, 5.1, { bold: true });
      x += column.width;
    });
    y -= headerHeight;
    line(margin, y, pageWidth - margin, y, 0.6);
    setY(y);
  };

  drawHeader();

  quote.items.forEach((item, index) => {
    const description = item.commercialDescription || item.description || "";
    const descriptionLines = wrapPdfText(description, columns[2].width - 4, 5.2).slice(0, 4);
    const rowHeight = Math.max(17, descriptionLines.length * 6.2 + 6);
    if (getY() - rowHeight < bottomMargin) {
      addPage();
      setY(841.89 - margin);
      drawTableHeader();
    }
    const y = getY();
    const totals = calculateItem(item);
    let x = margin;
    const values = [
      formatPrintItemNumber(index),
      item.code || item.ncm || "",
      "",
      formatQuantity(totals.quantity),
      "UN",
      item.ncm || "",
      moneyFormatter.format(parseNumber(item.liquidPrice)),
      `${formatPercentDisplay(item.icmsBase)}%`,
      `${formatPercentDisplay(item.icms)}%`,
      moneyFormatter.format(totals.icmsTotal),
      `${formatPercentDisplay(item.ipi)}%`,
      moneyFormatter.format(totals.ipiTotal),
      moneyFormatter.format(totals.unitTotal),
      moneyFormatter.format(totals.lineTotal),
    ];
    columns.forEach((column, columnIndex) => {
      if (columnIndex === 2) {
        descriptionLines.forEach((lineText, lineIndex) => {
          text(lineText, x + 2, y - 8 - lineIndex * 6.2, 5.2);
        });
      } else {
        text(values[columnIndex], x + 2, y - 8, 5.2);
      }
      x += column.width;
    });
    line(margin, y - rowHeight, pageWidth - margin, y - rowHeight, 0.35);
    setY(y - rowHeight);
  });
  setY(getY() - 16);
}

function createPdfFile(pages, pageWidth, pageHeight) {
  const objects = [];
  const fontRegularId = 3;
  const fontBoldId = 4;
  const pageObjectIds = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  pages.forEach((commands) => {
    const stream = commands.join("\n");
    const contentId = addObject(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(pageWidth)} ${formatPdfNumber(pageHeight)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageObjectIds.push(pageId);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Uint8Array([...pdf].map((char) => char.charCodeAt(0)));
}

function wrapPdfText(value, width, size) {
  const text = normalizePdfText(value);
  const maxChars = Math.max(8, Math.floor(width / (size * 0.48)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      return;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function normalizePdfText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function estimateTextWidth(value, size) {
  return normalizePdfText(value).length * size * 0.48;
}

function formatPdfNumber(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function byteLength(value) {
  return [...value].length;
}

function renderStatusTabs() {
  elements.statusTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });
}

function renderQuoteList() {
  elements.quoteList.innerHTML = "";
  const visible = getVisibleQuotes();

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
  renderOverviewNumberSort();

  if (visible.length === 0) {
    const empty = document.createElement("tr");
    empty.innerHTML = '<td colspan="10">Nenhum orçamento encontrado para o filtro atual.</td>';
    elements.proposalOverviewBody.append(empty);
  }

  visible.forEach((quote) => {
    const summary = calculateQuote(quote);
    const row = document.createElement("tr");
    row.classList.toggle("is-selected-row", quote.id === state.selectedId);
    row.innerHTML = `
      <td><button class="quote-number-link" type="button">${escapeHtml(quote.number || "Sem número")}</button></td>
      <td>${escapeHtml(formatRevisionAsProposal(quote.revision))}</td>
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
    { rascunho: 0, enviado: 0, negociacao: 0, aprovado: 0, reprovado: 0, cancelado: 0, expirado: 0 },
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
  return state.budgets
    .filter((quote) => {
      const matchesStatus = state.filter === "todos" || quote.status === state.filter;
      const searchable = [
        quote.number,
        quote.company,
        quote.client,
        quote.legalName,
        quote.cnpj,
        quote.requester,
        quote.status,
        statusLabel(quote.status),
        quote.revision,
        quote.sentAt,
        quote.nextContactAt,
        quote.lastClientResponse,
        quote.rejectionReason,
        quote.followUpNotes,
        ...quote.items.map((item) => `${item.code} ${item.description} ${item.commercialDescription || ""} ${item.ncm}`),
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!search || searchable.includes(search));
    })
    .sort(compareQuotesByNumber);
}

function compareQuotesByNumber(a, b) {
  const direction = state.overviewNumberSort === "desc" ? -1 : 1;
  const aValue = quoteNumberSortValue(a.number);
  const bValue = quoteNumberSortValue(b.number);
  if (aValue !== bValue) return (aValue - bValue) * direction;
  return String(a.number || "").localeCompare(String(b.number || ""), "pt-BR", { numeric: true }) * direction;
}

function quoteNumberSortValue(value) {
  const parsed = parseQuoteNumber(value);
  const year = Number(parsed.year);
  const sequence = Number(parsed.sequence);
  if (!Number.isFinite(sequence)) return 0;
  return (Number.isFinite(year) ? year : 0) * 1000000 + sequence;
}

function renderOverviewNumberSort() {
  if (!elements.sortOverviewNumberButton || !elements.sortOverviewNumberIcon) return;
  const isDesc = state.overviewNumberSort === "desc";
  elements.sortOverviewNumberIcon.textContent = isDesc ? "↓" : "↑";
  elements.sortOverviewNumberButton.title = isDesc ? "Ordenado do maior para o menor" : "Ordenado do menor para o maior";
  elements.sortOverviewNumberButton.setAttribute("aria-label", isDesc ? "Ordenar do menor para o maior" : "Ordenar do maior para o menor");
}

function renderForm() {
  const quote = selectedQuote();
  renderCompanyOptions();
  renderReceiptAccountOptions();
  const fields = new FormData(elements.quoteForm);
  for (const [name] of fields.entries()) {
    const input = elements.quoteForm.elements[name];
    if (!input) continue;
    if (name === "receiptAccountId") continue;
    if (name === "receiptMethod") {
      input.value = normalizeReceiptMethod(quote.receiptMethod);
      continue;
    }
    input.value = name === "revision" ? formatRevisionAsProposal(quote.revision) : quote[name] ?? "";
  }
  renderReceiptAccountOptions();
}

function renderRevisionTimeline() {
  const quote = selectedQuote();
  if (!elements.revisionTimeline || !quote) return;

  const records = ensureRevisionHistory(quote)
    .slice()
    .sort((a, b) => revisionNumber(b.revision) - revisionNumber(a.revision));

  if (!records.length) {
    elements.revisionTimeline.innerHTML = '<p class="empty-state">Nenhuma proposta registrada.</p>';
    return;
  }

  elements.revisionTimeline.innerHTML = records
    .map((record) => {
      const isCurrent = formatRevision(record.revision) === formatRevision(quote.revision);
      const notes = record.notes ? `<small>${escapeHtml(record.notes)}</small>` : "";
      const revision = escapeHtml(formatRevision(record.revision));
      return `
        <article class="revision-card${isCurrent ? " is-current" : ""}">
          <button class="revision-select-button" type="button" data-revision="${revision}">
            <div class="revision-icon" aria-hidden="true">#</div>
            <div class="revision-main">
              <div class="revision-line">
                <strong>${escapeHtml(formatRevisionAsProposal(record.revision))}</strong>
                <span class="revision-badge">${escapeHtml(statusLabel(record.status))}</span>
                ${isCurrent ? '<span class="revision-badge is-current-badge">Atual</span>' : ""}
              </div>
              <div class="revision-meta">
                <span>${escapeHtml(formatRevisionTimestamp(record.emittedAt || record.createdAt))}</span>
                <span>${moneyFormatter.format(parseNumber(record.total))}</span>
              </div>
              ${notes}
            </div>
          </button>
          <div class="revision-actions">
            <button class="ghost-button revision-action-button" type="button" data-duplicate-revision="${revision}">Duplicar</button>
            <button class="ghost-button revision-action-button danger-text" type="button" data-delete-revision="${revision}">Excluir</button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.revisionTimeline.querySelectorAll("[data-revision]").forEach((button) => {
    button.addEventListener("click", () => selectQuoteRevision(button.dataset.revision));
  });
  elements.revisionTimeline.querySelectorAll("[data-duplicate-revision]").forEach((button) => {
    button.addEventListener("click", () => duplicateQuoteRevision(button.dataset.duplicateRevision));
  });
  elements.revisionTimeline.querySelectorAll("[data-delete-revision]").forEach((button) => {
    button.addEventListener("click", () => deleteQuoteRevision(button.dataset.deleteRevision));
  });

  if (elements.activeProposalTitle) {
    elements.activeProposalTitle.textContent = formatRevisionAsProposal(quote.revision);
  }
}

function renderCompanyOptions() {
  const select = elements.quoteForm.elements.company;
  if (!select) return;
  const currentValue = selectedQuote()?.company || defaultCompanyCode();
  select.innerHTML = "";
  getCompanies().forEach((company) => {
    const option = document.createElement("option");
    option.value = company.code;
    option.textContent = `${company.name || company.code} (${company.taxRegime})`;
    select.append(option);
  });
  select.value = getCompanies().some((company) => company.code === currentValue) ? currentValue : defaultCompanyCode();
}

function renderReceiptAccountOptions() {
  const select = elements.quoteForm.elements.receiptAccountId;
  const methodSelect = elements.quoteForm.elements.receiptMethod;
  const quote = selectedQuote();
  if (!select || !quote) return;
  const company = selectedCompany(quote);
  const method = normalizeReceiptMethod(quote.receiptMethod);
  quote.receiptMethod = method;
  if (methodSelect) methodSelect.value = method;
  select.innerHTML = "";

  if (method === RECEIPT_METHODS.combine || method === RECEIPT_METHODS.cash) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = method === RECEIPT_METHODS.cash ? "Em espécie" : "A combinar";
    select.append(option);
    select.value = "";
    select.disabled = true;
    return;
  }

  select.disabled = false;
  const accounts = method === RECEIPT_METHODS.cielo ? getCompanyPaymentAccounts(company) : getCompanyBankAccounts(company);

  if (!accounts.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = method === RECEIPT_METHODS.cielo ? "Cadastre uma conta Cielo na empresa" : "Cadastre uma conta bancaria na empresa";
    select.append(option);
    if (method === RECEIPT_METHODS.cielo) quote.paymentAccountId = "";
    else quote.bankAccountId = "";
    return;
  }

  accounts.forEach((account, index) => {
    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = method === RECEIPT_METHODS.cielo ? formatPaymentAccountOption(account, index) : formatBankAccountOption(account, index);
    select.append(option);
  });

  if (method === RECEIPT_METHODS.cielo) {
    if (!accounts.some((account) => account.id === quote.paymentAccountId)) {
      quote.paymentAccountId = primaryCompanyPaymentAccount(company)?.id || accounts[0]?.id || "";
    }
    select.value = quote.paymentAccountId || "";
    return;
  }

  if (!accounts.some((account) => account.id === quote.bankAccountId)) {
    quote.bankAccountId = primaryCompanyBankAccount(company)?.id || accounts[0]?.id || "";
  }
  select.value = quote.bankAccountId || "";
}

function formatBankAccountOption(account, index) {
  const bankName = account.bankName || "Banco nao informado";
  const agency = account.bankAgency ? `Ag. ${account.bankAgency}` : "";
  const accountNumber = account.bankAccount ? `Conta ${account.bankAccount}` : "";
  const details = [agency, accountNumber].filter(Boolean).join(" - ");
  return details ? `${bankName} (${details})` : `${bankName} - Conta ${index + 1}`;
}

function formatPaymentAccountOption(account, index) {
  const provider = account.provider || "Cielo";
  const establishment = account.establishmentNumber ? `Estab. ${account.establishmentNumber}` : "";
  const statement = account.statementName ? `Fatura: ${account.statementName}` : "";
  const description = account.description ? `${account.description} - ` : "";
  const details = [establishment, statement].filter(Boolean).join(" - ");
  return details ? `${description}${provider} (${details})` : `${description}${provider} - Conta ${index + 1}`;
}

function renderRepresentativeOptions() {
  const select = elements.quoteForm.elements.representativeId;
  if (!select) return;
  const quote = selectedQuote();
  const currentValue = quote?.representativeId || "";
  select.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = getRepresentatives().length ? "Selecione" : "Cadastre um representante";
  select.append(emptyOption);

  getRepresentatives().forEach((representative) => {
    const option = document.createElement("option");
    option.value = representative.id;
    option.textContent = `${representative.name || "Sem nome"} (${formatPercentDisplay(representative.commissionRate) || "0"}%)`;
    select.append(option);
  });

  select.value = getRepresentatives().some((representative) => representative.id === currentValue) ? currentValue : "";
  if (quote && quote.representativeId !== select.value) quote.representativeId = select.value;
}

function renderRepresentativeFields() {
  const quote = selectedQuote();
  const hasRepresentative = quote?.hasRepresentative === "sim";
  elements.representativeField.classList.toggle("is-hidden", !hasRepresentative);
  renderRepresentativeOptions();
}

function setCnpjLookupStatus(message = "", tone = "") {
  if (!elements.cnpjLookupStatus) return;
  elements.cnpjLookupStatus.textContent = message;
  elements.cnpjLookupStatus.dataset.tone = tone;
}

function renderNcmOptions() {
  if (!elements.ncmOptions) return;
  elements.ncmOptions.innerHTML = "";
  getNcmSuggestions().forEach((suggestion) => {
    const option = document.createElement("option");
    option.value = suggestion.ncm;
    option.label = `${suggestion.ncm} - ${suggestion.label}`;
    option.textContent = `${suggestion.ncm} - ${suggestion.label}`;
    elements.ncmOptions.append(option);
  });
}

function getNcmSuggestions() {
  const quote = selectedQuote();
  const company = normalizeKey(quote?.company || defaultCompanyCode());
  const grouped = new Map();

  getActiveTaxRules().forEach((rule) => {
    const ncm = String(rule.ncm || "").trim();
    if (!ncm) return;
    const key = normalizeKey(ncm);
    if (!grouped.has(key)) {
      grouped.set(key, {
        ncm,
        descriptions: new Set(),
        companies: new Set(),
        priority: normalizeKey(rule.company) === company ? 0 : 1,
      });
    }
    const suggestion = grouped.get(key);
    if (rule.description) suggestion.descriptions.add(rule.description);
    if (rule.company) suggestion.companies.add(rule.company);
    if (normalizeKey(rule.company) === company) suggestion.priority = 0;
  });

  return [...grouped.values()]
    .sort((a, b) => a.priority - b.priority || a.ncm.localeCompare(b.ncm, "pt-BR"))
    .map((suggestion) => {
      const description = [...suggestion.descriptions][0] || "Sem grupo fiscal";
      const companies = [...suggestion.companies].join("/");
      return {
        ncm: suggestion.ncm,
        label: `${description}${companies ? ` - ${companies}` : ""}`,
      };
    });
}

function setupNcmSuggestionMenu(input, menu, item, quote) {
  if (!menu) return;
  let activeIndex = -1;
  let currentSuggestions = [];

  const hideMenu = () => {
    menu.classList.add("is-hidden");
    activeIndex = -1;
  };

  const renderMenu = () => {
    currentSuggestions = filterNcmSuggestions(input.value);
    activeIndex = currentSuggestions.length ? Math.min(Math.max(activeIndex, 0), currentSuggestions.length - 1) : -1;

    if (currentSuggestions.length === 0) {
      hideMenu();
      menu.innerHTML = "";
      return;
    }

    menu.innerHTML = currentSuggestions
      .map(
        (suggestion, index) => `
          <button class="ncm-suggestion-option ${index === activeIndex ? "is-active" : ""}" type="button" data-index="${index}">
            <strong>${escapeHtml(suggestion.ncm)}</strong>
            <span>${escapeHtml(suggestion.label)}</span>
          </button>
        `,
      )
      .join("");
    menu.classList.remove("is-hidden");

    menu.querySelectorAll("[data-index]").forEach((button) => {
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        selectNcmSuggestion(currentSuggestions[Number(button.dataset.index)], input, menu, item, quote);
      });
    });
  };

  input.addEventListener("focus", renderMenu);
  input.addEventListener("input", renderMenu);
  input.addEventListener("blur", () => {
    setTimeout(hideMenu, 140);
  });
  input.addEventListener("keydown", (event) => {
    if (menu.classList.contains("is-hidden")) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentSuggestions.length - 1);
      renderMenu();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderMenu();
    }
    if (event.key === "Enter" && currentSuggestions[activeIndex]) {
      event.preventDefault();
      selectNcmSuggestion(currentSuggestions[activeIndex], input, menu, item, quote);
    }
    if (event.key === "Escape") {
      hideMenu();
    }
  });
}

function filterNcmSuggestions(value) {
  const search = normalizeKey(value);
  return getNcmSuggestions()
    .filter((suggestion) => {
      if (!search) return true;
      return normalizeKey(`${suggestion.ncm} ${suggestion.label}`).includes(search);
    })
    .slice(0, 14);
}

function selectNcmSuggestion(suggestion, input, menu, item, quote) {
  if (!suggestion) return;
  input.value = suggestion.ncm;
  item.ncm = suggestion.ncm;
  applyTaxRule(item, quote);
  touchQuote(quote);
  saveState();
  menu.classList.add("is-hidden");
  renderItems();
  renderProposalOverview();
  renderProposalRows();
  renderSummary();
  renderQuoteList();
  renderPrintProposal();
  renderCommissions();
}

function renderItems() {
  const quote = selectedQuote();
  renderItemsPanelState(quote);
  elements.itemsBody.innerHTML = "";

  quote.items.forEach((item) => {
    const row = elements.itemTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.itemId = item.id;
    row.querySelectorAll("[data-field]").forEach((input) => {
      const field = input.dataset.field;
      input.value =
        field === "liquidPrice"
          ? formatPriceInput(item[field])
          : isPercentField(field)
            ? formatPercentInput(item[field])
            : (item[field] ?? "");
      input.addEventListener("input", () => {
        item[field] =
          field === "liquidPrice"
            ? parseNumber(input.value)
            : isPercentField(field)
            ? parseNumber(input.value) / 100
            : input.type === "number"
              ? parseNumber(input.value)
              : input.value;
        touchQuote(quote);
        saveState();
        updateRowTotals(row, item);
        renderProposalOverview();
        renderProposalRows();
        renderSummary();
        renderQuoteList();
      });

      if (field === "liquidPrice") {
        input.addEventListener("change", () => {
          input.value = formatPriceInput(item.liquidPrice);
        });
      }

      if (field === "description") {
        input.addEventListener("focus", () => {
          requestAnimationFrame(() => {
            input.setSelectionRange(0, 0);
            input.scrollLeft = 0;
          });
        });
      }

      if (field === "ncm") {
        setupNcmSuggestionMenu(input, row.querySelector('[data-role="ncm-suggestions"]'), item, quote);
        input.addEventListener("change", () => {
          item.ncm = String(input.value || "").trim();
          input.value = item.ncm;
          applyTaxRule(item, quote);
          touchQuote(quote);
          saveState();
          renderItems();
          renderProposalOverview();
          renderProposalRows();
          renderSummary();
          renderQuoteList();
        });
      }
    });

    updateRowTotals(row, item);
    row
      .querySelector('[data-role="edit-description"]')
      .addEventListener("click", () => openItemDescriptionEditor(item.id));
    row.querySelector('[data-role="remove"]').addEventListener("click", () => {
      quote.items = quote.items.filter((current) => current.id !== item.id);
      touchQuote(quote);
      persistAndRender();
    });
    elements.itemsBody.append(row);
  });
}

function renderItemsPanelState(quote = selectedQuote()) {
  if (!quote) return;
  const summary = calculateQuote(quote);
  const count = quote.items.length;
  if (elements.itemsSummary) {
    elements.itemsSummary.textContent = `${count} item${count === 1 ? "" : "s"} · ${moneyFormatter.format(summary.itemsTotal)} em produtos`;
  }
  elements.itemsPanel?.classList.toggle("is-collapsed", state.itemsCollapsed === true);
  if (elements.toggleItemsButton) {
    const collapsed = state.itemsCollapsed === true;
    elements.toggleItemsButton.textContent = collapsed ? "↓" : "↑";
    elements.toggleItemsButton.title = collapsed ? "Expandir itens" : "Reduzir itens";
    elements.toggleItemsButton.setAttribute("aria-label", collapsed ? "Expandir itens" : "Reduzir itens");
    elements.toggleItemsButton.setAttribute("aria-expanded", String(!collapsed));
  }
}

function toggleItemsPanel() {
  state.itemsCollapsed = state.itemsCollapsed !== true;
  saveState();
  renderItemsPanelState();
}

function openItemDescriptionEditor(itemId) {
  const quote = selectedQuote();
  const item = quote?.items.find((current) => current.id === itemId);
  if (!item) return;

  activeDescriptionItemId = item.id;
  elements.itemDescriptionTitle.textContent = `Descrição - ${item.code || "item"}`;
  elements.itemDescriptionSummary.value = item.description || "";
  elements.itemCommercialDescription.value = item.commercialDescription || item.description || "";
  elements.itemDescriptionModal.classList.remove("is-hidden");
  elements.itemCommercialDescription.focus();
}

function closeItemDescriptionEditor() {
  activeDescriptionItemId = "";
  elements.itemDescriptionModal.classList.add("is-hidden");
}

function saveItemDescriptionEditor() {
  const quote = selectedQuote();
  const item = quote?.items.find((current) => current.id === activeDescriptionItemId);
  if (!item) return;

  const commercialDescription = elements.itemCommercialDescription.value.trim();
  item.commercialDescription = commercialDescription;
  item.description = elements.itemDescriptionSummary.value.trim() || summarizeItemDescription(commercialDescription);
  touchQuote(quote);
  saveState();
  renderItems();
  renderProposalOverview();
  renderProposalRows();
  renderQuoteList();
  renderPrintProposal();
  closeItemDescriptionEditor();
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
      <td>${escapeHtml(item.commercialDescription || item.description)}</td>
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

function renderCompanies() {
  renderCompanySummary();
  elements.companiesBody.innerHTML = "";

  getCompanies().forEach((company) => {
    const row = elements.companyTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.companyId = company.id;

    row.querySelectorAll("[data-company-value]").forEach((element) => {
      element.textContent = companyListValue(company, element.dataset.companyValue);
    });

    const nameButton = row.querySelector('[data-role="open-company"]');
    if (nameButton) nameButton.textContent = company.name || company.code || "Empresa";
    renderCompanyLogoPreview(row, company);

    row.querySelector('[data-role="remove-company"]').addEventListener("click", () => removeCompany(company.id));
    row.querySelector('[data-role="open-company"]')?.addEventListener("click", () => openCompanyDetails(company.id));
    row.addEventListener("dblclick", (event) => {
      if (event.target.closest("button")) return;
      openCompanyDetails(company.id);
    });
    elements.companiesBody.append(row);
  });
}

function companyListValue(company, field) {
  const bank = primaryCompanyBankAccount(company) || {};
  const bankValues = {
    bankName: bank.bankName,
    bankAgency: bank.bankAgency,
    bankAccount: bank.bankAccount,
    pixKey: bank.pixKey,
  };
  return String(bankValues[field] ?? company[field] ?? "-");
}

function renderCompanySummary() {
  const companies = getCompanies();
  elements.companyCount.textContent = String(companies.length);
  elements.companyRegimeCount.textContent = String(new Set(companies.map((company) => company.taxRegime).filter(Boolean)).size);
  elements.companyBankCount.textContent = String(companies.filter(hasBankData).length);
  elements.defaultCompanyName.textContent = companies[0]?.name || "-";
  if (elements.companySaveState) elements.companySaveState.textContent = "Salvo localmente";
}

function renderCompanyLogoPreview(row, company) {
  const preview = row.querySelector('[data-role="company-logo-preview"]');
  if (!preview) return;
  preview.innerHTML = company.logoDataUrl
    ? `<img src="${escapeHtml(company.logoDataUrl)}" alt="${escapeHtml(company.name || company.code)}" />`
    : "Sem logo";
}

function openCompanyDetails(companyId) {
  activeCompanyId = companyId;
  renderCompanyDetails();
  elements.companyDetailsModal?.classList.remove("is-hidden");
}

function closeCompanyDetails() {
  activeCompanyId = "";
  elements.companyDetailsModal?.classList.add("is-hidden");
}

function activeCompanyDetails() {
  return getCompanies().find((company) => company.id === activeCompanyId) || null;
}

function renderCompanyDetails() {
  const company = activeCompanyDetails();
  if (!company || !elements.companyDetailsModal) return;
  elements.companyDetailsTitle.textContent = `${company.name || company.code} (${company.code})`;
  renderCompanyLogoPreview(elements.companyDetailsModal, company);

  const logoInput = elements.companyDetailsModal.querySelector('[data-role="company-detail-logo-input"]');
  if (logoInput) {
    logoInput.onchange = (event) => {
      const [file] = event.target.files;
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        company.logoDataUrl = String(reader.result || "");
        persistCompanyDetails();
        renderCompanyLogoPreview(elements.companyDetailsModal, company);
      });
      reader.readAsDataURL(file);
      event.target.value = "";
    };
  }

  elements.companyDetailsModal.querySelectorAll("[data-company-detail-field]").forEach((input) => {
    const field = input.dataset.companyDetailField;
    input.value = company[field] ?? "";
    input.oninput = () => {
      const previousCode = company.code;
      setCompanyValue(company, field, input.value);
      if (field === "code") {
        updateCompanyReferences(previousCode, company.code);
        input.value = company.code;
      }
      persistCompanyDetails();
    };
  });

  renderCompanyBankAccounts(company);
  renderCompanyPaymentAccounts(company);
}

function renderCompanyBankAccounts(company) {
  if (!elements.companyBankAccountsBody) return;
  const accounts = getCompanyBankAccounts(company);
  elements.companyBankAccountsBody.innerHTML = accounts
    .map((account, index) => `
      <tr>
        <td class="center-cell"><input data-bank-index="${index}" data-bank-field="isDefault" type="checkbox" ${account.isDefault ? "checked" : ""} /></td>
        <td>
          <div class="bank-logo-cell">
            <div class="bank-logo-preview">${account.bankLogoDataUrl ? `<img src="${escapeHtml(account.bankLogoDataUrl)}" alt="${escapeHtml(account.bankName || "Banco")}" />` : "Logo"}</div>
            <label class="ghost-button file-button bank-logo-button">
              Upload
              <input data-bank-logo-index="${index}" type="file" accept="image/*" />
            </label>
          </div>
        </td>
        <td><input data-bank-index="${index}" data-bank-field="description" type="text" value="${escapeHtml(account.description)}" /></td>
        <td><input data-bank-index="${index}" data-bank-field="bankName" type="text" value="${escapeHtml(account.bankName)}" /></td>
        <td><input data-bank-index="${index}" data-bank-field="bankAgency" type="text" value="${escapeHtml(account.bankAgency)}" /></td>
        <td><input data-bank-index="${index}" data-bank-field="bankAccount" type="text" value="${escapeHtml(account.bankAccount)}" /></td>
        <td><input data-bank-index="${index}" data-bank-field="pixKey" type="text" value="${escapeHtml(account.pixKey)}" /></td>
        <td><button class="icon-button danger" data-remove-bank-index="${index}" type="button" title="Remover conta" aria-label="Remover conta">x</button></td>
      </tr>
    `)
    .join("");

  elements.companyBankAccountsBody.querySelectorAll("[data-bank-field]").forEach((input) => {
    if (input.type === "checkbox") {
      input.addEventListener("change", () => updateCompanyBankAccount(input));
      return;
    }
    input.addEventListener("input", () => updateCompanyBankAccount(input));
  });
  elements.companyBankAccountsBody.querySelectorAll("[data-remove-bank-index]").forEach((button) => {
    button.addEventListener("click", () => removeCompanyBankAccount(Number(button.dataset.removeBankIndex)));
  });
  elements.companyBankAccountsBody.querySelectorAll("[data-bank-logo-index]").forEach((input) => {
    input.addEventListener("change", (event) => updateCompanyBankLogo(Number(input.dataset.bankLogoIndex), event));
  });
}

function updateCompanyBankLogo(index, event) {
  const company = activeCompanyDetails();
  if (!company) return;
  const accounts = getCompanyBankAccounts(company);
  if (!accounts[index]) return;
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    accounts[index].bankLogoDataUrl = String(reader.result || "");
    company.bankAccounts = accounts;
    persistCompanyDetails();
    renderCompanyBankAccounts(company);
  });
  reader.readAsDataURL(file);
  event.target.value = "";
}

function updateCompanyBankAccount(input) {
  const company = activeCompanyDetails();
  if (!company) return;
  const index = Number(input.dataset.bankIndex);
  const field = input.dataset.bankField;
  const accounts = getCompanyBankAccounts(company);
  if (!accounts[index]) return;

  if (field === "isDefault") {
    accounts.forEach((account, accountIndex) => {
      account.isDefault = accountIndex === index;
    });
  } else {
    accounts[index][field] = String(input.value || "").trim();
  }
  company.bankAccounts = accounts;
  syncCompanyPrimaryBank(company);
  persistCompanyDetails();
  if (field === "isDefault") renderCompanyBankAccounts(company);
}

function addCompanyBankAccount() {
  const company = activeCompanyDetails();
  if (!company) return;
  const accounts = getCompanyBankAccounts(company);
  accounts.push(defaultBankAccount(accounts.length === 0));
  company.bankAccounts = accounts;
  syncCompanyPrimaryBank(company);
  persistCompanyDetails();
  renderCompanyBankAccounts(company);
}

function removeCompanyBankAccount(index) {
  const company = activeCompanyDetails();
  if (!company) return;
  const accounts = getCompanyBankAccounts(company);
  accounts.splice(index, 1);
  if (accounts.length && !accounts.some((account) => account.isDefault)) accounts[0].isDefault = true;
  company.bankAccounts = accounts;
  syncCompanyPrimaryBank(company);
  persistCompanyDetails();
  renderCompanyBankAccounts(company);
}

function renderCompanyPaymentAccounts(company) {
  if (!elements.companyPaymentAccountsBody) return;
  const accounts = getCompanyPaymentAccounts(company);
  elements.companyPaymentAccountsBody.innerHTML = accounts
    .map((account, index) => `
      <tr>
        <td class="center-cell"><input data-payment-index="${index}" data-payment-field="isDefault" type="checkbox" ${account.isDefault ? "checked" : ""} /></td>
        <td>
          <div class="bank-logo-cell">
            <div class="bank-logo-preview">${account.logoDataUrl ? `<img src="${escapeHtml(account.logoDataUrl)}" alt="Cielo" />` : "Logo"}</div>
            <label class="ghost-button file-button bank-logo-button">
              Upload
              <input data-payment-logo-index="${index}" type="file" accept="image/*" />
            </label>
          </div>
        </td>
        <td><input data-payment-index="${index}" data-payment-field="description" type="text" value="${escapeHtml(account.description)}" placeholder="Link cartão" /></td>
        <td>
          <select data-payment-index="${index}" data-payment-field="environment">
            <option value="Produção" ${account.environment === "Produção" ? "selected" : ""}>Produção</option>
            <option value="Teste" ${account.environment === "Teste" ? "selected" : ""}>Teste</option>
          </select>
        </td>
        <td><input data-payment-index="${index}" data-payment-field="establishmentNumber" type="text" value="${escapeHtml(account.establishmentNumber)}" placeholder="Nº estabelecimento" /></td>
        <td><input data-payment-index="${index}" data-payment-field="statementName" type="text" value="${escapeHtml(account.statementName)}" /></td>
        <td><button class="ghost-button compact-button" data-payment-rates-index="${index}" type="button">${escapeHtml(paymentRatesButtonLabel(account, company))}</button></td>
        <td>
          <select data-payment-index="${index}" data-payment-field="status">
            <option value="Ativa" ${account.status === "Ativa" ? "selected" : ""}>Ativa</option>
            <option value="Inativa" ${account.status === "Inativa" ? "selected" : ""}>Inativa</option>
          </select>
        </td>
        <td><button class="icon-button danger" data-remove-payment-index="${index}" type="button" title="Remover conta de pagamento" aria-label="Remover conta de pagamento">x</button></td>
      </tr>
    `)
    .join("");

  elements.companyPaymentAccountsBody.querySelectorAll("[data-payment-field]").forEach((input) => {
    if (input.type === "checkbox" || input.tagName === "SELECT") {
      input.addEventListener("change", () => updateCompanyPaymentAccount(input));
      return;
    }
    input.addEventListener("input", () => updateCompanyPaymentAccount(input));
  });
  elements.companyPaymentAccountsBody.querySelectorAll("[data-remove-payment-index]").forEach((button) => {
    button.addEventListener("click", () => removeCompanyPaymentAccount(Number(button.dataset.removePaymentIndex)));
  });
  elements.companyPaymentAccountsBody.querySelectorAll("[data-payment-rates-index]").forEach((button) => {
    button.addEventListener("click", () => openPaymentRatesEditor(Number(button.dataset.paymentRatesIndex)));
  });
  elements.companyPaymentAccountsBody.querySelectorAll("[data-payment-logo-index]").forEach((input) => {
    input.addEventListener("change", (event) => updateCompanyPaymentLogo(Number(input.dataset.paymentLogoIndex), event));
  });
}

function paymentRatesButtonLabel(account, company = {}) {
  const summary = summarizePaymentRates(account.rateTable, company);
  return summary || "Cadastrar taxas";
}

function updateCompanyPaymentLogo(index, event) {
  const company = activeCompanyDetails();
  if (!company) return;
  const accounts = getCompanyPaymentAccounts(company);
  if (!accounts[index]) return;
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    accounts[index].logoDataUrl = String(reader.result || "");
    company.paymentAccounts = accounts;
    persistCompanyDetails();
    renderCompanyPaymentAccounts(company);
  });
  reader.readAsDataURL(file);
  event.target.value = "";
}

function updateCompanyPaymentAccount(input) {
  const company = activeCompanyDetails();
  if (!company) return;
  const index = Number(input.dataset.paymentIndex);
  const field = input.dataset.paymentField;
  const accounts = getCompanyPaymentAccounts(company);
  if (!accounts[index]) return;

  if (field === "isDefault") {
    accounts.forEach((account, accountIndex) => {
      account.isDefault = accountIndex === index;
    });
  } else {
    accounts[index][field] = String(input.value || "").trim();
  }
  company.paymentAccounts = accounts;
  persistCompanyDetails();
  if (field === "isDefault" || input.tagName === "SELECT") renderCompanyPaymentAccounts(company);
}

function addCompanyPaymentAccount() {
  const company = activeCompanyDetails();
  if (!company) return;
  const accounts = getCompanyPaymentAccounts(company);
  accounts.push(defaultPaymentAccount(accounts.length === 0, company));
  company.paymentAccounts = accounts;
  persistCompanyDetails();
  renderCompanyPaymentAccounts(company);
}

function removeCompanyPaymentAccount(index) {
  const company = activeCompanyDetails();
  if (!company) return;
  const accounts = getCompanyPaymentAccounts(company);
  accounts.splice(index, 1);
  if (accounts.length && !accounts.some((account) => account.isDefault)) accounts[0].isDefault = true;
  company.paymentAccounts = accounts;
  persistCompanyDetails();
  renderCompanyPaymentAccounts(company);
}

function openPaymentRatesEditor(index) {
  const company = activeCompanyDetails();
  if (!company) return;
  const account = getCompanyPaymentAccounts(company)[index];
  if (!account) return;
  activePaymentRatesAccountId = account.id;
  renderPaymentRatesEditor();
  elements.paymentRatesModal?.classList.remove("is-hidden");
}

function closePaymentRatesEditor() {
  activePaymentRatesAccountId = "";
  elements.paymentRatesModal?.classList.add("is-hidden");
  const company = activeCompanyDetails();
  if (company) renderCompanyPaymentAccounts(company);
}

function activePaymentRatesAccount() {
  const company = activeCompanyDetails();
  if (!company) return null;
  return getCompanyPaymentAccounts(company).find((account) => account.id === activePaymentRatesAccountId) || null;
}

function renderPaymentRatesEditor() {
  const company = activeCompanyDetails();
  const account = activePaymentRatesAccount();
  if (!account || !elements.paymentRatesBody) return;
  account.rateTable = normalizePaymentRateTable(account.rateTable, company);
  if (elements.paymentRatesTitle) {
    const companyName = company?.name || company?.code || "Empresa";
    const accountName = account.description || account.establishmentNumber || "conta";
    elements.paymentRatesTitle.textContent = `Taxas Cielo - ${companyName} - ${accountName}`;
  }
  elements.paymentRatesBody.innerHTML = account.rateTable
    .map((row, index) => `
      <tr>
        <td><input data-rate-index="${index}" data-rate-field="type" type="text" value="${escapeHtml(row.type)}" /></td>
        <td><input data-rate-index="${index}" data-rate-field="visa" type="text" value="${escapeHtml(row.visa)}" placeholder="0,00%" /></td>
        <td><input data-rate-index="${index}" data-rate-field="mastercard" type="text" value="${escapeHtml(row.mastercard)}" placeholder="0,00%" /></td>
        <td><input data-rate-index="${index}" data-rate-field="elo" type="text" value="${escapeHtml(row.elo)}" placeholder="0,00%" /></td>
        <td><button class="icon-button danger" data-remove-rate-index="${index}" type="button" title="Remover taxa" aria-label="Remover taxa">x</button></td>
      </tr>
    `)
    .join("");

  elements.paymentRatesBody.querySelectorAll("[data-rate-field]").forEach((input) => {
    input.addEventListener("input", () => updatePaymentRate(input));
  });
  elements.paymentRatesBody.querySelectorAll("[data-remove-rate-index]").forEach((button) => {
    button.addEventListener("click", () => removePaymentRateRow(Number(button.dataset.removeRateIndex)));
  });
}

function updatePaymentRate(input) {
  const company = activeCompanyDetails();
  const account = activePaymentRatesAccount();
  if (!account) return;
  const index = Number(input.dataset.rateIndex);
  const field = input.dataset.rateField;
  account.rateTable = normalizePaymentRateTable(account.rateTable, company);
  if (!account.rateTable[index]) return;
  account.rateTable[index][field] = String(input.value || "").trim();
  account.feeRules = summarizePaymentRates(account.rateTable, company);
  persistCompanyDetails();
}

function addPaymentRateRow() {
  const company = activeCompanyDetails();
  const account = activePaymentRatesAccount();
  if (!account) return;
  account.rateTable = normalizePaymentRateTable(account.rateTable, company);
  account.rateTable.push(defaultPaymentRateRow("Nova modalidade"));
  account.feeRules = summarizePaymentRates(account.rateTable, company);
  persistCompanyDetails();
  renderPaymentRatesEditor();
}

function removePaymentRateRow(index) {
  const company = activeCompanyDetails();
  const account = activePaymentRatesAccount();
  if (!account) return;
  account.rateTable = normalizePaymentRateTable(account.rateTable, company);
  account.rateTable.splice(index, 1);
  account.feeRules = summarizePaymentRates(account.rateTable, company);
  persistCompanyDetails();
  renderPaymentRatesEditor();
}

function persistCompanyDetails() {
  saveState();
  renderCompanies();
  renderCompanyOptions();
  renderReceiptAccountOptions();
  renderQuoteList();
  renderProposalOverview();
  renderProposalRows();
  renderCommissions();
  renderPrintProposal();
}

function renderRepresentatives() {
  renderRepresentativeSummary();
  elements.representativesBody.innerHTML = "";

  getRepresentatives().forEach((representative) => {
    const row = elements.representativeTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.representativeId = representative.id;
    row.querySelectorAll("[data-representative-field]").forEach((input) => {
      const field = input.dataset.representativeField;
      input.value = field === "commissionRate" ? formatPercentInput(representative[field]) : (representative[field] ?? "");
      input.addEventListener("input", () => {
        setRepresentativeValue(representative, field, input.value);
        saveState();
        renderRepresentativeSummary();
        renderRepresentativeOptions();
        renderQuoteList();
        renderProposalOverview();
        renderProposalRows();
        renderPrintProposal();
      });
    });
    row
      .querySelector('[data-role="remove-representative"]')
      .addEventListener("click", () => removeRepresentative(representative.id));
    elements.representativesBody.append(row);
  });
}

function renderRepresentativeSummary() {
  const representatives = getRepresentatives();
  const commissionRates = representatives.map((representative) => representative.commissionRate).filter((rate) => rate > 0);
  const averageRate =
    commissionRates.length > 0 ? commissionRates.reduce((sum, rate) => sum + rate, 0) / commissionRates.length : 0;
  elements.representativeCount.textContent = String(representatives.length);
  elements.averageCommissionRate.textContent = `${formatPercentDisplay(averageRate)}%`;
  elements.representativeBankCount.textContent = String(representatives.filter(hasRepresentativeBankData).length);
  elements.representedClientCount.textContent = String(
    representatives.reduce((sum, representative) => sum + splitRepresentedClients(representative).length, 0),
  );
  if (elements.representativeSaveState) elements.representativeSaveState.textContent = "Salvo localmente";
}

function renderCommissions() {
  elements.commissionStatusFilter.value = state.commissionFilter || "todos";
  const rows = getCommissionRows();
  const visibleRows = rows.filter((row) => state.commissionFilter === "todos" || row.record.status === state.commissionFilter);
  renderCommissionSummary(rows);
  elements.commissionsBody.innerHTML = "";

  if (visibleRows.length === 0) {
    const empty = document.createElement("tr");
    empty.innerHTML = '<td colspan="10">Nenhuma comissão encontrada. Lance uma comissão manual ou marque representante em uma proposta para gerar o relatório.</td>';
    elements.commissionsBody.append(empty);
    return;
  }

  visibleRows.forEach((commissionRow) => {
    const { quote, representative, record, amount, rate, total } = commissionRow;
    const row = document.createElement("tr");
    row.dataset.commissionRowId = commissionRow.id;

    if (commissionRow.type === "manual") {
      row.innerHTML = `
        <td><input data-manual-commission-field="description" type="text" /></td>
        <td><input data-manual-commission-field="client" type="text" /></td>
        <td>
          <select data-manual-commission-field="representativeId">
            <option value="">Sem representante</option>
            ${getRepresentatives()
              .map(
                (current) =>
                  `<option value="${escapeHtml(current.id)}">${escapeHtml(current.name || "Representante sem nome")}</option>`,
              )
              .join("")}
          </select>
        </td>
        <td><input data-manual-commission-field="baseAmount" class="money-input" type="number" min="0" step="0.01" /></td>
        <td><input data-manual-commission-field="commissionRate" type="number" min="0" step="0.01" /></td>
        <td><input data-manual-commission-field="amount" class="money-input" type="number" min="0" step="0.01" /></td>
        <td>
          <select data-manual-commission-field="status">
            <option value="a_pagar">A pagar</option>
            <option value="pago">Pago</option>
          </select>
        </td>
        <td><input data-manual-commission-field="paidAt" type="date" /></td>
        <td><input data-manual-commission-field="notes" type="text" /></td>
        <td><button class="compact-button" data-remove-manual-commission type="button">Excluir</button></td>
      `;
      row.querySelector('[data-manual-commission-field="description"]').value = record.description || "";
      row.querySelector('[data-manual-commission-field="client"]').value = record.client || "";
      row.querySelector('[data-manual-commission-field="representativeId"]').value = record.representativeId || "";
      row.querySelector('[data-manual-commission-field="baseAmount"]').value = record.baseAmount || "";
      row.querySelector('[data-manual-commission-field="commissionRate"]').value = formatPercentInput(record.commissionRate || 0);
      row.querySelector('[data-manual-commission-field="amount"]').value = record.amount || "";
      row.querySelector('[data-manual-commission-field="status"]').value = record.status;
      row.querySelector('[data-manual-commission-field="paidAt"]').value = record.paidAt || "";
      row.querySelector('[data-manual-commission-field="notes"]').value = record.notes || "";
      row.querySelectorAll("[data-manual-commission-field]").forEach((input) => {
        input.addEventListener("input", () =>
          updateManualCommission(record.id, input.dataset.manualCommissionField, input.value, { rerender: false }),
        );
        input.addEventListener("change", () =>
          updateManualCommission(record.id, input.dataset.manualCommissionField, input.value, { rerender: true }),
        );
      });
      row
        .querySelector("[data-remove-manual-commission]")
        .addEventListener("click", () => removeManualCommission(record.id));
      elements.commissionsBody.append(row);
      return;
    }

    row.innerHTML = `
      <td><button class="quote-number-link" type="button">${escapeHtml(quote.number || "Sem número")}</button></td>
      <td>${escapeHtml(quote.client || "Cliente não informado")}</td>
      <td>${escapeHtml(representative.name || "Representante sem nome")}</td>
      <td class="money-cell">${moneyFormatter.format(total)}</td>
      <td>${formatPercentDisplay(rate)}%</td>
      <td class="money-cell">${moneyFormatter.format(amount)}</td>
      <td>
        <select data-commission-field="status">
          <option value="a_pagar">A pagar</option>
          <option value="pago">Pago</option>
        </select>
      </td>
      <td><input data-commission-field="paidAt" type="date" /></td>
      <td><input data-commission-field="notes" type="text" /></td>
      <td></td>
    `;
    row.querySelector('[data-commission-field="status"]').value = record.status;
    row.querySelector('[data-commission-field="paidAt"]').value = record.paidAt || "";
    row.querySelector('[data-commission-field="notes"]').value = record.notes || "";
    row.querySelectorAll("[data-commission-field]").forEach((input) => {
      input.addEventListener("input", () => updateCommissionRecord(quote.id, input.dataset.commissionField, input.value));
      input.addEventListener("change", () => updateCommissionRecord(quote.id, input.dataset.commissionField, input.value));
    });
    row.querySelector(".quote-number-link").addEventListener("click", () => openProposal(quote.id));
    elements.commissionsBody.append(row);
  });
}

function renderCommissionSummary(rows = getCommissionRows()) {
  const totals = rows.reduce(
    (acc, row) => {
      if (row.record.status === "pago") {
        acc.paidTotal += row.amount;
        acc.paidCount += 1;
      } else {
        acc.pendingTotal += row.amount;
        acc.pendingCount += 1;
      }
      return acc;
    },
    { pendingTotal: 0, paidTotal: 0, pendingCount: 0, paidCount: 0 },
  );
  elements.commissionPendingTotal.textContent = moneyFormatter.format(totals.pendingTotal);
  elements.commissionPaidTotal.textContent = moneyFormatter.format(totals.paidTotal);
  elements.commissionPendingCount.textContent = String(totals.pendingCount);
  elements.commissionPaidCount.textContent = String(totals.paidCount);
  if (elements.commissionSaveState) elements.commissionSaveState.textContent = "Salvo localmente";
}

function renderFreightRules() {
  renderFreightSummary();
  elements.freightBody.innerHTML = "";

  getFreightRules().forEach((rule) => {
    const row = elements.freightTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.freightId = rule.id;
    row.querySelectorAll("[data-freight-field]").forEach((input) => {
      const field = input.dataset.freightField;
      input.value = field === "rate" ? formatPercentInput(rule[field]) : (rule[field] ?? "");
      input.addEventListener("input", () => {
        setFreightRuleValue(rule, field, input.value);
        if (field === "originUf" || field === "destinationUf") input.value = rule[field];
        saveState();
        renderFreightSummary();
      });
    });
    row.querySelector('[data-role="remove-freight"]').addEventListener("click", () => removeFreightRule(rule.id));
    elements.freightBody.append(row);
  });
}

function renderFreightSummary() {
  const rules = getFreightRules();
  const deadlines = rules.map((rule) => parseDeadlineDays(rule.deadline)).filter((days) => days > 0);
  elements.freightRuleCount.textContent = String(rules.length);
  elements.freightCarrierCount.textContent = String(rules.filter((rule) => rule.carrier).length);
  elements.freightMinDeadline.textContent = deadlines.length ? `${Math.min(...deadlines)} dias` : "-";
  elements.freightMaxDeadline.textContent = deadlines.length ? `${Math.max(...deadlines)} dias` : "-";
  if (elements.freightSaveState) elements.freightSaveState.textContent = "Salvo localmente";
}

function renderFreightSimulator() {
  if (!elements.freightSimulatorFields?.length) return;
  updateFreightSimulatorToggle();
  const simulator = getFreightSimulator();
  elements.freightSimulatorFields.forEach((input) => {
    const field = input.dataset.freightSimField;
    if (field === "invoiceValue" || field === "baseFreight") {
      if (document.activeElement !== input) input.value = formatPriceInput(simulator[field]);
      return;
    }
    if (field.endsWith("Rate")) {
      if (document.activeElement !== input) input.value = formatPercentInput(simulator[field]);
      return;
    }
    input.value = simulator[field] ?? "";
  });

  const result = calculateFreightSimulator(simulator);
  elements.freightInsuranceValue.textContent = moneyFormatter.format(result.insuranceValue);
  elements.freightIcmsLabel.textContent = `ICMS ${formatPercentDisplay(result.icmsRate)}%`;
  elements.freightIcmsValue.textContent = moneyFormatter.format(result.icmsValue);
  elements.freightOperationalValue.textContent = moneyFormatter.format(result.operationalValue);
  elements.freightTaxesValue.textContent = moneyFormatter.format(result.taxesValue);
  elements.freightSurchargesValue.textContent = moneyFormatter.format(result.surchargesValue);
  elements.freightGrandValue.textContent = moneyFormatter.format(result.totalFreight);
  elements.freightOrderPercent.textContent = `${formatPercentDisplay(result.orderPercent)}%`;
}

function updateFreightSimulatorToggle() {
  if (!elements.toggleFreightSimulatorButton || !elements.freightSimulatorPanel) return;
  const isOpen = state.freightSimulatorCollapsed === false;
  const label = isOpen ? "Reduzir simulador de frete" : "Expandir simulador de frete";
  elements.freightSimulatorPanel.classList.toggle("is-collapsed", !isOpen);
  elements.toggleFreightSimulatorButton.textContent = isOpen ? "↑" : "↓";
  elements.toggleFreightSimulatorButton.title = label;
  elements.toggleFreightSimulatorButton.setAttribute("aria-label", label);
  elements.toggleFreightSimulatorButton.setAttribute("aria-expanded", String(isOpen));
}

function renderPrintProposal() {
  const quote = selectedQuote();
  if (!quote || !elements.printProposal) return;

  const summary = calculateQuote(quote);
  const taxSummary = calculateTaxSummary(quote);
  const company = selectedCompany(quote);
  const proposalDate = formatDateOnly(quote.date || today);
  const proposalNumber = formatProposalNumber(quote.number);
  const proposalCode = formatRevisionProposalCode(quote.revision);
  const companyLogo = company.logoDataUrl
    ? `<div class="print-logo has-image"><img src="${escapeHtml(company.logoDataUrl)}" alt="${escapeHtml(company.name)}" /></div>`
    : `<div class="print-logo">${escapeHtml((company.name || company.code || "empresa").toLowerCase())}</div>`;
  const commercialLines = [
    `- Validade: ${quote.proposalValidity || ""}`,
    `- Frete: ${quote.freightType || ""}`,
    quote.paymentTerms && normalizeReceiptMethod(quote.receiptMethod) !== RECEIPT_METHODS.cielo ? `- Pagamento: ${quote.paymentTerms}` : "",
    normalizeReceiptMethod(quote.receiptMethod) !== RECEIPT_METHODS.cielo ? `- Recebimento: ${receiptMethodLabel(quote.receiptMethod)}` : "",
    quote.deliveryTime ? `- Entrega: ${quote.deliveryTime}` : "",
  ].filter(Boolean);
  const companyBank = selectedCompanyBankAccount(quote);
  const legacyBankLines = [
    companyBank?.bankName ? `Banco: ${companyBank.bankName}` : "",
    companyBank?.bankAgency ? `Agência: ${companyBank.bankAgency}` : "",
    companyBank?.bankAccount ? `Conta: ${companyBank.bankAccount}` : "",
    companyBank?.pixKey ? `PIX: ${companyBank.pixKey}` : "",
  ].filter(Boolean);
  const receiptDetails = selectedReceiptDetails(quote);
  const bankLines = receiptDetails.lines;
  const paymentLink = receiptDetails.paymentLink || "";
  const bankLogoHtml = receiptDetails.logoDataUrl
    ? `<div class="print-bank-logo"><img src="${escapeHtml(receiptDetails.logoDataUrl)}" alt="${escapeHtml(receiptDetails.logoAlt || "Recebimento")}" /></div>`
    : "";
  const paymentLinkHtml = paymentLink
    ? `<a class="print-payment-link" href="${escapeHtml(normalizeExternalUrl(paymentLink))}" target="_blank" rel="noopener">Link: ${escapeHtml(paymentLink)}</a>`
    : "";
  const commercialBankSection = `
      <section class="print-section print-commercial-bank-section ${bankLines.length ? "" : "single-column"}">
        <div class="print-commercial-bank-block">
          <h2>Condições comerciais</h2>
          <div class="print-commercial-lines">${escapeHtml(commercialLines.join("\n"))}</div>
        </div>
        ${bankLines.length ? `
          <div class="print-commercial-bank-block print-bank-section">
            <h2>${escapeHtml(receiptDetails.title || "Dados bancarios")}</h2>
            <div class="print-bank-details ${bankLogoHtml ? "" : "without-logo"}">
              ${bankLogoHtml}
              <div class="print-bank-lines">${escapeHtml(bankLines.join("\n"))}${paymentLinkHtml}</div>
            </div>
          </div>
        ` : ""}
      </section>
    `;
  const taxSummaryHtml = taxSummary.highlightPisCofins
    ? `
            <div>
              ${printSummaryRow("ICMS:", taxSummary.icms)}
              ${printSummaryRow("PIS:", taxSummary.pis)}
            </div>
            <div>
              ${printSummaryRow("IPI:", taxSummary.ipi)}
              ${printSummaryRow("COFINS:", taxSummary.cofins)}
            </div>
      `
    : `
            <div>
              ${printSummaryRow("ICMS:", taxSummary.icms)}
            </div>
            <div>
              ${printSummaryRow("IPI:", taxSummary.ipi)}
            </div>
      `;
  const attachmentsHtml = printAttachmentsHtml(quote);

  let proposalHtml = `
    <div class="print-page is-pdf-${currentPdfOrientation()}">
      <header class="print-header">
        ${companyLogo}
        <div class="print-company">
          <strong>${escapeHtml(company.name || company.code)}</strong>
          <span>Regime tributário: ${escapeHtml(company.taxRegime || "")}</span>
          <span>CNPJ: ${escapeHtml(company.cnpj || "")} - Inscrição Estadual: ${escapeHtml(company.stateRegistration || "")}</span>
          <span>${escapeHtml(formatCompanyAddressLine(company))}</span>
          <span>Telefone(s): ${escapeHtml(company.phone || "")} - E-mail: ${escapeHtml(company.email || "")}</span>
        </div>
        <div class="print-proposal-meta">
          <strong>PROPOSTA: ${escapeHtml(proposalNumber)} - ${escapeHtml(proposalCode)}</strong>
          <span>${escapeHtml(proposalDate)}</span>
        </div>
      </header>

      <section class="print-section">
        <h2>Dados do cliente</h2>
        <div class="print-client-lines">
          <strong class="print-client-name">${escapeHtml(quote.client || quote.legalName || "Cliente não informado")}</strong>
          ${quote.legalName && normalizeKey(quote.legalName) !== normalizeKey(quote.client) ? `<span class="print-client-legal-name">${escapeHtml(quote.legalName)}</span>` : ""}
          <span>CNPJ/CPF: ${escapeHtml(quote.cnpj || "")}</span>
          <span>${escapeHtml(formatClientAddressLine(quote))}</span>
          <span>Requisitante: ${escapeHtml(quote.requester || "")} - Telefone: ${escapeHtml(quote.phone || "")} - E-mail: ${escapeHtml(quote.email || "")}</span>
        </div>
      </section>

      <section class="print-summary-grid" aria-label="Totais da proposta">
        <div class="print-summary-block">
          <h2>Total dos tributos</h2>
          <div class="print-summary-columns">
            ${taxSummaryHtml}
          </div>
        </div>
        <div class="print-summary-block">
          <h2>Total das mercadorias e serviços</h2>
          <div class="print-summary-columns">
            <div>
              ${printSummaryRow("Produto:", summary.itemsTotal)}
              ${printSummaryRow("Frete:", summary.freight)}
            </div>
            <div>
              ${printSummaryRow("Desconto:", 0)}
              ${printSummaryRow("Total:", summary.total, { highlight: true })}
            </div>
          </div>
        </div>
      </section>

      <section class="print-section">
        <h2>Itens da proposta</h2>
        <table class="print-items-table">
          <thead>
            <tr>
              <th style="width: 4%">Item</th>
              <th style="width: 7%">Produto</th>
              <th style="width: 28%">Descrição</th>
              <th style="width: 4%">Qtde</th>
              <th style="width: 4%">Unid.</th>
              <th style="width: 7%">NCM</th>
              <th style="width: 7%">Preço un.<br>líq.</th>
              <th style="width: 5%">BC ICMS %</th>
              <th style="width: 5%">ICMS %</th>
              <th style="width: 5%">ICMS R$</th>
              <th style="width: 4%">IPI %</th>
              <th style="width: 5%">IPI R$</th>
              <th style="width: 7%">Valor un.<br>bruto</th>
              <th style="width: 8%">SubTotal</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map((item, index) => printItemRow(item, quote, index)).join("")}
          </tbody>
        </table>
      </section>

      ${attachmentsHtml}

      ${commercialBankSection}

      <section class="print-section">
        <h2>Observações sobre a proposta:</h2>
        <div class="print-notes">${escapeHtml(quote.notes || "")}</div>
      </section>

      <footer class="print-footer">
        <span>${escapeHtml(quote.includedBy || "André Araujo")} - ${escapeHtml(company.email || "vendas@extrainox.com.br")}</span>
        <span class="print-footer-right">${escapeHtml(formatDateOnly(today))}<br>Página <span class="print-page-number"></span> de <span class="print-page-count"></span></span>
      </footer>
    </div>
  `;
  elements.printProposal.innerHTML = proposalHtml;
  applyPdfSectionBreaks(elements.printProposal.querySelector(".print-page"));
  proposalHtml = elements.printProposal.innerHTML;
  if (elements.pdfPreviewBody) {
    renderPdfPreviewPages(proposalHtml);
  }
}

function applyPdfSectionBreaks(pageElement) {
  if (!pageElement) return;
  pageElement.querySelectorAll(".pdf-section-spacer").forEach((spacer) => spacer.remove());
  const pageSpec = currentPdfPageSpec();
  const contentHeightPerPage = pageSpec.height - pageSpec.bottomMargin;
  pageElement.querySelectorAll(".print-commercial-bank-section, .print-attachments-section").forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = Math.max(section.offsetHeight, section.scrollHeight, 112);
    const usedOnPage = sectionTop % contentHeightPerPage;
    if (usedOnPage <= 1 || usedOnPage + sectionHeight <= contentHeightPerPage - 8) return;
    const spacer = document.createElement("div");
    spacer.className = "pdf-section-spacer";
    spacer.style.height = `${Math.max(0, contentHeightPerPage - usedOnPage + 8)}px`;
    section.before(spacer);
  });
}

function renderPdfPreviewPages(proposalHtml) {
  const pageSpec = currentPdfPageSpec();
  const pageWidth = pageSpec.width;
  const pageHeight = pageSpec.height;
  const contentHeightPerPage = pageHeight - pageSpec.bottomMargin;
  const measureHost = document.createElement("div");
  measureHost.className = "pdf-preview-body pdf-preview-measure-host";
  measureHost.style.cssText = [
    "left:-20000px",
    "pointer-events:none",
    "position:absolute",
    "top:0",
    `width:${pageWidth}px`,
    "visibility:hidden",
    "z-index:-1",
  ].join(";");
  measureHost.innerHTML = proposalHtml;
  document.body.append(measureHost);

  const sourcePage = measureHost.querySelector(".print-page");
  applyPdfSectionBreaks(sourcePage);
  proposalHtml = measureHost.innerHTML;
  const contentHeight = sourcePage ? measurePrintPageContentHeight(sourcePage) : pageHeight;
  const pageCount = contentHeight <= contentHeightPerPage ? 1 : Math.ceil(contentHeight / contentHeightPerPage);
  measureHost.remove();

  elements.pdfPreviewBody.innerHTML = Array.from({ length: pageCount }, (_, index) => {
    const offset = index * contentHeightPerPage;
    return `
      <div class="pdf-preview-page-wrap" style="width: ${pageWidth}px;">
        <div class="pdf-preview-page-label">Página ${index + 1} de ${pageCount}</div>
        <div class="print-page pdf-preview-page is-pdf-${currentPdfOrientation()}" style="width: ${pageWidth}px; height: ${pageHeight}px; min-height: ${pageHeight}px;">
          <div class="pdf-preview-page-content-area" style="height: ${contentHeightPerPage}px; width: ${pageWidth}px;">
            <div class="pdf-preview-page-slice" style="transform: translateY(-${offset}px); width: ${pageWidth}px;">
              ${proposalHtml}
            </div>
          </div>
          <div class="pdf-preview-bottom-margin" style="height: ${pageSpec.bottomMargin}px;"></div>
        </div>
      </div>
    `;
  }).join("");
}

function measurePrintPageContentHeight(pageElement) {
  if (!pageElement) return currentPdfPageSpec().height;
  const children = Array.from(pageElement.children);
  const contentBottom = children.reduce((bottom, child) => Math.max(bottom, child.offsetTop + child.offsetHeight), 0);
  return Math.max(1, Math.ceil(contentBottom));
}

function printAttachmentsHtml(quote) {
  const attachments = normalizeProposalAttachments(quote.attachments).filter((attachment) => attachment.showInPdf);
  if (attachments.length === 0) return "";
  return `
      <section class="print-section print-attachments-section">
        <h2>Anexos complementares</h2>
        <div class="print-attachments-list">
          ${attachments
            .map((attachment) => {
              const itemLabel = attachment.itemId ? printAttachmentItemLabel(quote, attachment.itemId) : "Proposta inteira";
              const isImage = attachment.mimeType.startsWith("image/");
              return `
                <article class="print-attachment-item ${isImage ? "with-image" : ""}">
                  <div class="print-attachment-meta">
                    <strong>${escapeHtml(attachment.type || "Anexo")} - ${escapeHtml(attachment.name)}</strong>
                    <span>Vinculado a: ${escapeHtml(itemLabel)}${attachment.mimeType === "application/pdf" ? " - PDF anexo para envio junto a proposta." : ""}</span>
                  </div>
                  ${isImage ? `<img src="${escapeHtml(attachment.dataUrl)}" alt="${escapeHtml(attachment.name)}" />` : ""}
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
}

function printAttachmentItemLabel(quote, itemId) {
  const item = quote.items.find((current) => current.id === itemId);
  if (!item) return "Item da proposta";
  return [item.code, item.description].filter(Boolean).join(" - ") || "Item da proposta";
}

function printSummaryRow(label, value, options = {}) {
  return `<div class="print-summary-row ${options.highlight ? "is-highlight" : ""}"><span>${escapeHtml(label)}</span><span>${moneyFormatter.format(parseNumber(value))}</span></div>`;
}

function printItemRow(item, quote, index) {
  const totals = calculateItem(item);
  return `
    <tr>
      <td class="number-cell">${escapeHtml(formatPrintItemNumber(index))}</td>
      <td class="center-cell">${escapeHtml(item.code || item.ncm || "")}</td>
      <td class="print-description">${escapeHtml(item.commercialDescription || item.description || "")}</td>
      <td class="center-cell">${formatQuantity(totals.quantity)}</td>
      <td class="center-cell">UN</td>
      <td class="center-cell">${escapeHtml(item.ncm || "")}</td>
      <td class="money-cell">${moneyFormatter.format(parseNumber(item.liquidPrice))}</td>
      <td class="center-cell print-tax-rate">${formatPercentDisplay(item.icmsBase)}%</td>
      <td class="center-cell print-tax-rate">${formatPercentDisplay(item.icms)}%</td>
      <td class="money-cell">${moneyFormatter.format(totals.icmsTotal)}</td>
      <td class="center-cell print-tax-rate">${formatPercentDisplay(item.ipi)}%</td>
      <td class="money-cell">${moneyFormatter.format(totals.ipiTotal)}</td>
      <td class="money-cell">${moneyFormatter.format(totals.unitTotal)}</td>
      <td class="money-cell">${moneyFormatter.format(totals.lineTotal)}</td>
    </tr>
  `;
}

function calculateTaxSummary(quote) {
  const highlightPisCofins = !quoteUsesSimpleNational(quote);
  return quote.items.reduce(
    (acc, item) => {
      const totals = calculateItem(item);
      acc.icms += totals.icmsTotal;
      acc.ipi += totals.ipiTotal;
      if (highlightPisCofins) {
        const pisCofins = totals.pisCofinsTotal;
        const pis = totals.pisCofins > 0 ? pisCofins * (0.0065 / 0.0365) : 0;
        acc.pis += pis;
        acc.cofins += pisCofins - pis;
      }
      return acc;
    },
    { icms: 0, ipi: 0, pis: 0, cofins: 0, highlightPisCofins },
  );
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
          item.commercialDescription,
          item.ncm,
          quote.state,
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(search);
      });
  });
}

function renderFiscalRules() {
  renderNcmOptions();
  renderTaxRuleFilters();
  renderTaxRuleSummary();

  elements.taxRuleSearch.value = state.taxRuleFilters.search || "";
  elements.taxRulesBody.innerHTML = "";
  const rules = getVisibleTaxRules();

  if (rules.length === 0) {
    const empty = document.createElement("tr");
    empty.innerHTML = '<td colspan="9">Nenhuma regra fiscal encontrada para o filtro atual.</td>';
    elements.taxRulesBody.append(empty);
    return;
  }

  rules.forEach((rule) => {
    const row = elements.taxRuleTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.ruleId = rule.id;
    row.querySelectorAll("[data-tax-field]").forEach((input) => {
      const field = input.dataset.taxField;
      input.value = isPercentField(field) ? formatPercentInput(rule[field]) : (rule[field] ?? "");
      input.addEventListener("input", () => {
        setTaxRuleValue(rule, field, input.value);
        applyTaxRulesToBudgets();
        saveState();
        renderTaxRuleSummary();
        renderQuoteList();
        renderProposalOverview();
        renderProposalRows();
        renderSummary();
        renderNcmOptions();
        if (elements.taxSaveState) elements.taxSaveState.textContent = "Salvo localmente";
      });
    });
    row.querySelector('[data-role="remove-tax-rule"]').addEventListener("click", () => {
      state.taxRules = state.taxRules.filter((current) => current.id !== rule.id);
      applyTaxRulesToBudgets();
      saveState();
      render();
    });
    elements.taxRulesBody.append(row);
  });
}

function renderTaxRuleFilters() {
  const companies = uniqueTaxValues("company");
  const ufs = uniqueTaxValues("uf");
  setSelectOptions(elements.taxCompanyFilter, companies, "Todas", state.taxRuleFilters.company);
  setSelectOptions(elements.taxUfFilter, ufs, "Todas", state.taxRuleFilters.uf);
}

function renderTaxRuleSummary() {
  const rules = state.taxRules || [];
  elements.taxRuleCount.textContent = String(rules.length);
  elements.taxCompanyCount.textContent = String(uniqueTaxValues("company").length);
  elements.taxUfCount.textContent = String(uniqueTaxValues("uf").length);
  elements.taxNcmCount.textContent = String(uniqueTaxValues("ncm").length);
}

function getVisibleTaxRules() {
  const filters = state.taxRuleFilters || defaultTaxRuleFilters();
  const search = String(filters.search || "").trim().toLowerCase();
  return (state.taxRules || [])
    .filter((rule) => filters.company === "todos" || rule.company === filters.company)
    .filter((rule) => filters.uf === "todos" || rule.uf === filters.uf)
    .filter((rule) => {
      if (!search) return true;
      return [rule.company, rule.uf, rule.ncm, rule.description].join(" ").toLowerCase().includes(search);
    })
    .sort((a, b) => {
      const companyCompare = a.company.localeCompare(b.company, "pt-BR");
      if (companyCompare !== 0) return companyCompare;
      const ufCompare = a.uf.localeCompare(b.uf, "pt-BR");
      if (ufCompare !== 0) return ufCompare;
      return a.ncm.localeCompare(b.ncm, "pt-BR");
    });
}

function uniqueTaxValues(field) {
  return [...new Set((state.taxRules || []).map((rule) => rule[field]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

function setSelectOptions(select, values, allLabel, selectedValue) {
  const currentValue = values.includes(selectedValue) ? selectedValue : "todos";
  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "todos";
  allOption.textContent = allLabel;
  select.append(allOption);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.value = currentValue;
  if (selectedValue !== currentValue) {
    if (select === elements.taxCompanyFilter) state.taxRuleFilters.company = currentValue;
    if (select === elements.taxUfFilter) state.taxRuleFilters.uf = currentValue;
  }
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
  const taxSummary = calculateTaxSummary(quote);
  elements.statusPill.textContent = statusLabel(quote.status);
  elements.liquidTotal.textContent = moneyFormatter.format(summary.liquidTotal);
  elements.icmsTotal.textContent = moneyFormatter.format(summary.icmsTotal);
  elements.ipiTotal.textContent = moneyFormatter.format(summary.ipiTotal);
  elements.pisCofinsTotal.textContent = taxSummary.highlightPisCofins ? moneyFormatter.format(summary.pisCofinsTotal) : moneyFormatter.format(0);
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
  item.pisCofins = roundRuleNumber(rule.pisCofins ?? DEFAULT_PIS_COFINS);
}

function applyTaxRulesToBudgets() {
  let changed = false;
  state.budgets.forEach((quote) => {
    let quoteChanged = false;
    quote.items.forEach((item) => {
      const before = [item.icmsBase, item.icms, item.ipi, item.pisCofins].join("|");
      applyTaxRule(item, quote);
      const after = [item.icmsBase, item.icms, item.ipi, item.pisCofins].join("|");
      if (before !== after) quoteChanged = true;
    });
    if (quoteChanged) {
      touchQuote(quote);
      changed = true;
    }
  });
  return changed;
}

function findTaxRule(item, quote) {
  const company = normalizeKey(quote.company || "EXTRAINOX");
  const uf = normalizeKey(quote.state || "");
  const ncm = normalizeKey(item.ncm || "");
  if (!ncm) return null;

  const taxRules = getActiveTaxRules();
  const exactRule = taxRules.find(
    (rule) =>
      normalizeKey(rule.company) === company &&
      normalizeKey(rule.uf) === uf &&
      normalizeKey(rule.ncm) === ncm,
  );
  const fallbackRule = taxRules.find(
    (rule) => normalizeKey(rule.company) === company && normalizeKey(rule.ncm) === ncm,
  );
  return exactRule || fallbackRule || null;
}

function getActiveTaxRules() {
  return state?.taxRules?.length ? state.taxRules : DEFAULT_TAX_RULES;
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
  if (elements.taxSaveState) elements.taxSaveState.textContent = "Salvo localmente";
  if (elements.companySaveState) elements.companySaveState.textContent = "Salvo localmente";
  if (elements.representativeSaveState) elements.representativeSaveState.textContent = "Salvo localmente";
  if (elements.commissionSaveState) elements.commissionSaveState.textContent = "Salvo localmente";
  if (elements.freightSaveState) elements.freightSaveState.textContent = "Salvo localmente";
}

function touchQuote(quote) {
  quote.updatedAt = new Date().toISOString();
  if (Array.isArray(quote.items)) syncCurrentRevisionRecord(quote);
}

function normalizeQuoteStatus(status) {
  const normalized = normalizeKey(status || "rascunho");
  const aliases = {
    enviado_ao_cliente: "enviado",
    enviada_ao_cliente: "enviado",
    em_negociacao: "negociacao",
    negociacao: "negociacao",
    revisao: "negociacao",
    em_revisao: "negociacao",
    recusado: "reprovado",
    reprovada: "reprovado",
    reprovado: "reprovado",
    cancelada: "cancelado",
    cancelado: "cancelado",
    expirada: "expirado",
    expirado: "expirado",
  };
  const value = aliases[normalized] || normalized;
  return ["rascunho", "enviado", "negociacao", "aprovado", "reprovado", "cancelado", "expirado"].includes(value)
    ? value
    : "rascunho";
}

function ensureRevisionHistory(quote) {
  if (!quote) return [];
  quote.revision = formatRevision(quote.revision);
  const raw = Array.isArray(quote.revisionHistory) ? quote.revisionHistory : [];
  quote.revisionHistory = raw
    .filter(Boolean)
    .map((record) => normalizeRevisionRecord(record, quote))
    .sort((a, b) => revisionNumber(a.revision) - revisionNumber(b.revision));

  if (!quote.revisionHistory.some((record) => formatRevision(record.revision) === quote.revision)) {
        quote.revisionHistory.push(buildRevisionRecord(quote, quote.revision, { notes: "Proposta inicial." }));
  }

  return quote.revisionHistory;
}

function normalizeRevisionRecord(record, quote) {
  return {
    id: record.id || crypto.randomUUID(),
    revision: formatRevision(record.revision || quote.revision),
    emittedAt: record.emittedAt || record.sentAt || quote.sentAt || record.createdAt || quote.date || quote.updatedAt || new Date().toISOString(),
    status: normalizeQuoteStatus(record.status || quote.status),
    total: parseNumber(record.total || calculateQuote(quote).total),
    notes: record.notes || "",
    snapshot: normalizeRevisionSnapshot(record.snapshot, quote),
    createdAt: record.createdAt || new Date().toISOString(),
  };
}

function buildRevisionRecord(quote, revision, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    revision: formatRevision(revision),
    emittedAt: overrides.emittedAt || quote.sentAt || quote.date || new Date().toISOString(),
    status: normalizeQuoteStatus(overrides.status || quote.status),
    total: parseNumber(overrides.total ?? calculateQuote(quote).total),
    notes: overrides.notes || "",
    snapshot: buildRevisionSnapshot(quote),
    createdAt: new Date().toISOString(),
  };
}

function syncCurrentRevisionRecord(quote, overrides = {}) {
  const records = ensureRevisionHistory(quote);
  const revision = formatRevision(quote.revision);
  let record = records.find((current) => formatRevision(current.revision) === revision);
  if (!record) {
    record = buildRevisionRecord(quote, revision);
    records.push(record);
  }
  record.status = normalizeQuoteStatus(quote.status);
  record.total = calculateQuote(quote).total;
  record.notes = record.notes || "";
  record.snapshot = buildRevisionSnapshot(quote);
  if (overrides.emittedAt) record.emittedAt = overrides.emittedAt;
  return record;
}

function buildRevisionSnapshot(quote) {
  return {
    status: normalizeQuoteStatus(quote.status),
    paymentTerms: quote.paymentTerms || "",
    deliveryTime: quote.deliveryTime || "",
    proposalValidity: quote.proposalValidity || "",
    freightType: quote.freightType || "",
    receiptMethod: normalizeReceiptMethod(quote.receiptMethod),
    bankAccountId: quote.bankAccountId || "",
    paymentAccountId: quote.paymentAccountId || "",
    saleSimulation: normalizeSaleSimulation(quote.saleSimulation),
    notes: quote.notes || "",
    freight: parseNumber(quote.freight),
    attachments: cloneAttachmentsForSnapshot(quote.attachments || []),
    items: cloneItemsForSnapshot(quote.items || []),
  };
}

function calculateSnapshotTotal(snapshot) {
  const itemsTotal = (snapshot.items || []).reduce((sum, item) => sum + calculateItem(item).lineTotal, 0);
  return itemsTotal + parseNumber(snapshot.freight);
}

function normalizeRevisionSnapshot(snapshot, quote) {
  if (!snapshot || typeof snapshot !== "object") return buildRevisionSnapshot(quote);
  return {
    status: normalizeQuoteStatus(snapshot.status || quote.status),
    paymentTerms: snapshot.paymentTerms ?? quote.paymentTerms ?? "",
    deliveryTime: snapshot.deliveryTime ?? quote.deliveryTime ?? "",
    proposalValidity: snapshot.proposalValidity ?? quote.proposalValidity ?? "",
    freightType: snapshot.freightType ?? quote.freightType ?? "",
    receiptMethod: normalizeReceiptMethod(snapshot.receiptMethod ?? quote.receiptMethod),
    bankAccountId: snapshot.bankAccountId ?? quote.bankAccountId ?? "",
    paymentAccountId: snapshot.paymentAccountId ?? quote.paymentAccountId ?? "",
    saleSimulation: normalizeSaleSimulation(snapshot.saleSimulation ?? quote.saleSimulation),
    notes: snapshot.notes ?? quote.notes ?? "",
    freight: parseNumber(snapshot.freight ?? quote.freight),
    attachments: cloneAttachmentsForSnapshot(Array.isArray(snapshot.attachments) ? snapshot.attachments : quote.attachments || []),
    items: cloneItemsForSnapshot(Array.isArray(snapshot.items) ? snapshot.items : quote.items || []),
  };
}

function applyRevisionSnapshot(quote, snapshot) {
  const normalized = normalizeRevisionSnapshot(snapshot, quote);
  quote.status = normalized.status;
  quote.paymentTerms = normalized.paymentTerms;
  quote.deliveryTime = normalized.deliveryTime;
  quote.proposalValidity = normalized.proposalValidity;
  quote.freightType = normalized.freightType;
  quote.receiptMethod = normalized.receiptMethod;
  quote.bankAccountId = normalized.bankAccountId;
  quote.paymentAccountId = normalized.paymentAccountId;
  quote.saleSimulation = normalized.saleSimulation;
  quote.notes = normalized.notes;
  quote.freight = normalized.freight;
  quote.attachments = cloneAttachmentsForSnapshot(normalized.attachments);
  quote.items = cloneItemsForSnapshot(normalized.items);
  quote.items.forEach((item) => {
    normalizeItemDescriptionFields(item);
    applyTaxRule(item, quote);
  });
}

function cloneItemsForSnapshot(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    id: item.id || crypto.randomUUID(),
    code: item.code || "",
    description: item.description || "",
    commercialDescription: item.commercialDescription || "",
    quantity: parseNumber(item.quantity),
    ncm: item.ncm || "",
    liquidPrice: parseNumber(item.liquidPrice),
    icmsBase: parseNumber(item.icmsBase || 1),
    icms: parseNumber(item.icms),
    ipi: parseNumber(item.ipi),
    pisCofins: parseNumber(item.pisCofins) || DEFAULT_PIS_COFINS,
  }));
}

function cloneAttachmentsForSnapshot(attachments) {
  return normalizeProposalAttachments(attachments).map((attachment) => ({ ...attachment }));
}

function nextRevisionLabel(quote) {
  const records = ensureRevisionHistory(quote);
  const maxRevision = Math.max(0, revisionNumber(quote.revision), ...records.map((record) => revisionNumber(record.revision)));
  return `R${maxRevision + 1}`;
}

function revisionNumber(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function statusLabel(status) {
  const labels = {
    rascunho: "Rascunho",
    enviado: "Enviada ao cliente",
    negociacao: "Em negociação",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    cancelado: "Cancelado",
    expirado: "Expirado",
  };
  return labels[normalizeQuoteStatus(status)] || "Rascunho";
}

function formatRevision(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized.startsWith("PROPOSTA")) {
    const proposalMatch = normalized.match(/\d+/);
    return proposalMatch ? `R${Math.max(0, Number(proposalMatch[0]) - 1)}` : "R0";
  }
  const revision = normalized.replace(/^REV\s*/, "R");
  if (!revision) return "R0";
  const match = revision.match(/\d+/);
  return match ? `R${Number(match[0])}` : revision;
}

function formatRevisionAsProposal(value) {
  return `Proposta ${formatRevisionProposalCode(value)}`;
}

function formatRevisionProposalCode(value) {
  const sequence = revisionNumber(formatRevision(value)) + 1;
  return String(sequence).padStart(2, "0");
}

function defaultCompanies() {
  return [
    {
      code: "EXTRAINOX",
      name: "EXTRAINOX",
      taxRegime: "Lucro Presumido",
      cnpj: "01.851.360/0001-60",
      stateRegistration: "90131587-60",
      address: "RUA PERNAMBUCO",
      addressNumber: "",
      district: "VILA GUARACI",
      city: "Colombo",
      state: "PR",
      zipCode: "83404-250",
      phone: "(41) 3663-1237",
      email: "EXTRAINOX@EXTRAINOX.COM.BR",
    bankName: "",
    bankAgency: "",
    bankAccount: "",
    pixKey: "",
      bankAccounts: [],
      paymentAccounts: [],
    logoDataUrl: "",
    },
    {
      code: "EXTRAFRIO",
      name: "EXTRAFRIO",
      taxRegime: "Simples Nacional",
      cnpj: "",
      stateRegistration: "",
      address: "",
      addressNumber: "",
      district: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      bankName: "",
      bankAgency: "",
      bankAccount: "",
      pixKey: "",
      bankAccounts: [],
      paymentAccounts: [],
      logoDataUrl: "",
    },
  ].map((company) => normalizeCompany(company));
}

function defaultFreightRules() {
  return [
    {
      name: "CIF padrão",
      type: "CIF",
      carrier: "",
      originUf: "PR",
      destinationUf: "",
      deadline: "A combinar",
      minimumValue: 0,
      rate: 0,
      notes: "",
    },
    {
      name: "FOB cliente",
      type: "FOB",
      carrier: "Por conta do cliente",
      originUf: "PR",
      destinationUf: "",
      deadline: "A combinar",
      minimumValue: 0,
      rate: 0,
      notes: "Coleta e contratação por conta do cliente.",
    },
  ].map((rule) => normalizeFreightRule(rule));
}

function defaultFreightSimulator() {
  return normalizeFreightSimulator({
    invoiceValue: 0,
    baseFreight: 0,
    destinationUf: "PR",
    insuranceRate: 0.006,
    operationalRate: 0.02,
    type: "CIF",
  });
}

function getCompanies() {
  if (!Array.isArray(state.companies) || state.companies.length === 0) {
    state.companies = cloneCompanies(DEFAULT_COMPANIES);
  }
  return state.companies;
}

function selectedCompany(quote = selectedQuote()) {
  const code = normalizeKey(quote?.company || defaultCompanyCode());
  return getCompanies().find((company) => company.code === code) || getCompanies()[0] || normalizeCompany({ code: "EXTRAINOX" });
}

function quoteUsesSimpleNational(quote = selectedQuote()) {
  return isSimpleNationalRegime(selectedCompany(quote).taxRegime);
}

function isSimpleNationalRegime(value) {
  return normalizeKey(value).includes("SIMPLES");
}

function defaultCompanyCode() {
  return getCompanies()[0]?.code || "EXTRAINOX";
}

function normalizeCompanies(companies) {
  if (!Array.isArray(companies)) return [];
  const seen = new Set();
  return companies
    .map((company) => normalizeCompany(company))
    .filter((company) => {
      if (!company.code || seen.has(company.code)) return false;
      seen.add(company.code);
      return true;
    });
}

function normalizeCompany(company = {}) {
  const code = normalizeKey(company.code || company.name || "EMPRESA");
  const normalized = {
    id: company.id || createId(),
    code,
    name: String(company.name || code).trim(),
    taxRegime: company.taxRegime || "Lucro Presumido",
    cnpj: String(company.cnpj || "").trim(),
    stateRegistration: String(company.stateRegistration || company.ie || "").trim(),
    address: String(company.address || "").trim(),
    addressNumber: String(company.addressNumber || "").trim(),
    district: String(company.district || "").trim(),
    city: String(company.city || "").trim(),
    state: normalizeKey(company.state || ""),
    zipCode: String(company.zipCode || "").trim(),
    phone: String(company.phone || "").trim(),
    email: String(company.email || "").trim(),
    bankName: String(company.bankName || "").trim(),
    bankAgency: String(company.bankAgency || "").trim(),
    bankAccount: String(company.bankAccount || "").trim(),
    pixKey: String(company.pixKey || "").trim(),
    bankAccounts: normalizeBankAccounts(company.bankAccounts, company),
    paymentAccounts: normalizePaymentAccounts(company.paymentAccounts, { code, name: company.name || code }),
    logoDataUrl: String(company.logoDataUrl || ""),
  };
  syncCompanyPrimaryBank(normalized);
  return normalized;
}

function cloneCompanies(companies) {
  return normalizeCompanies(companies).map(({ id, ...company }) => ({ ...company, id: createId() }));
}

function defaultBankAccount(isDefault = false) {
  return {
    id: createId(),
    description: "",
    bankName: "",
    bankAgency: "",
    bankAccount: "",
    pixKey: "",
    bankLogoDataUrl: "",
    isDefault,
  };
}

function defaultPaymentAccount(isDefault = false, company = {}) {
  return {
    id: createId(),
    description: "",
    provider: "Cielo",
    environment: "Produção",
    establishmentNumber: "",
    statementName: "",
    feeRules: "",
    rateTable: defaultPaymentRateTable(company),
    logoDataUrl: "",
    status: "Ativa",
    isDefault,
  };
}

function defaultPaymentRateRow(type = "") {
  return {
    id: createId(),
    type,
    visa: "",
    mastercard: "",
    elo: "",
  };
}

function defaultPaymentRateTable(company = {}) {
  return paymentRateRowsForCompany(company).map((row) => ({
    ...defaultPaymentRateRow(row.type),
    visa: row.visa,
    mastercard: row.mastercard,
    elo: row.elo,
  }));
}

function paymentRateRowsForCompany(company = {}) {
  const key = normalizeKey(`${company.code || ""} ${company.name || ""}`);
  if (key.includes("EXTRAFRIO")) {
    return [
      { type: "Pix Cielo", visa: "0,49%", mastercard: "0,49%", elo: "0,49%" },
      { type: "Debito", visa: "1,27%", mastercard: "1,27%", elo: "1,92%" },
      { type: "Credito a vista", visa: "2,11%", mastercard: "2,11%", elo: "2,76%" },
      { type: "Credito Parc. Loja 2x", visa: "2,51%", mastercard: "2,51%", elo: "3,26%" },
      { type: "Credito Parc. Loja 3x", visa: "2,51%", mastercard: "2,51%", elo: "3,26%" },
      { type: "Credito Parc. Loja 4x", visa: "2,51%", mastercard: "2,51%", elo: "3,26%" },
      { type: "Credito Parc. Loja 5x", visa: "2,51%", mastercard: "2,51%", elo: "3,26%" },
      { type: "Credito Parc. Loja 6x", visa: "2,51%", mastercard: "2,51%", elo: "3,26%" },
      { type: "Credito Parc. Loja 7x", visa: "2,81%", mastercard: "2,81%", elo: "3,56%" },
      { type: "Credito Parc. Loja 8x", visa: "2,81%", mastercard: "2,81%", elo: "3,56%" },
      { type: "Credito Parc. Loja 9x", visa: "2,81%", mastercard: "2,81%", elo: "3,56%" },
      { type: "Credito Parc. Loja 10x", visa: "2,81%", mastercard: "2,81%", elo: "3,56%" },
      { type: "Credito Parc. Loja 11x", visa: "2,81%", mastercard: "2,81%", elo: "3,56%" },
      { type: "Credito Parc. Loja 12x", visa: "2,81%", mastercard: "2,81%", elo: "3,56%" },
    ];
  }
  return [
    { type: "Pix Cielo", visa: "0,99%", mastercard: "0,99%", elo: "0,99%" },
    { type: "Debito", visa: "0,86%", mastercard: "0,86%", elo: "1,56%" },
    { type: "Credito a vista", visa: "1,98%", mastercard: "1,98%", elo: "2,68%" },
    { type: "Credito Parc. Loja 2x", visa: "2,15%", mastercard: "2,15%", elo: "3,10%" },
    { type: "Credito Parc. Loja 3x", visa: "2,15%", mastercard: "2,15%", elo: "3,10%" },
    { type: "Credito Parc. Loja 4x", visa: "2,15%", mastercard: "2,15%", elo: "3,10%" },
    { type: "Credito Parc. Loja 5x", visa: "2,15%", mastercard: "2,15%", elo: "3,10%" },
    { type: "Credito Parc. Loja 6x", visa: "2,15%", mastercard: "2,15%", elo: "3,10%" },
    { type: "Credito Parc. Loja 7x", visa: "2,47%", mastercard: "2,47%", elo: "3,52%" },
    { type: "Credito Parc. Loja 8x", visa: "2,47%", mastercard: "2,47%", elo: "3,52%" },
    { type: "Credito Parc. Loja 9x", visa: "2,47%", mastercard: "2,47%", elo: "3,52%" },
    { type: "Credito Parc. Loja 10x", visa: "2,47%", mastercard: "2,47%", elo: "3,52%" },
    { type: "Credito Parc. Loja 11x", visa: "2,47%", mastercard: "2,47%", elo: "3,52%" },
    { type: "Credito Parc. Loja 12x", visa: "2,47%", mastercard: "2,47%", elo: "3,52%" },
  ];
}

function normalizeBankAccounts(accounts, company = {}) {
  const normalized = Array.isArray(accounts)
    ? accounts.map((account, index) => ({
        id: account.id || createId(),
        description: String(account.description || account.label || "").trim(),
        bankName: String(account.bankName || account.bank || "").trim(),
        bankAgency: String(account.bankAgency || account.agency || "").trim(),
        bankAccount: String(account.bankAccount || account.account || "").trim(),
        pixKey: String(account.pixKey || account.pix || "").trim(),
        bankLogoDataUrl: String(account.bankLogoDataUrl || account.logoDataUrl || account.logo || ""),
        isDefault: Boolean(account.isDefault || account.default),
      }))
    : [];

  if (!normalized.length && hasLegacyBankData(company)) {
    normalized.push({
      ...defaultBankAccount(true),
      description: "Conta principal",
      bankName: String(company.bankName || "").trim(),
      bankAgency: String(company.bankAgency || "").trim(),
      bankAccount: String(company.bankAccount || "").trim(),
      pixKey: String(company.pixKey || "").trim(),
      bankLogoDataUrl: "",
    });
  }

  if (normalized.length && !normalized.some((account) => account.isDefault)) normalized[0].isDefault = true;
  if (normalized.filter((account) => account.isDefault).length > 1) {
    let foundDefault = false;
    normalized.forEach((account) => {
      if (account.isDefault && !foundDefault) {
        foundDefault = true;
        return;
      }
      account.isDefault = false;
    });
  }
  return normalized;
}

function normalizePaymentAccounts(accounts, company = {}) {
  const normalized = Array.isArray(accounts)
    ? accounts.map((account) => ({
        id: account.id || createId(),
        description: String(account.description || account.label || "").trim(),
        provider: "Cielo",
        environment: normalizePaymentEnvironment(account.environment),
        establishmentNumber: String(account.establishmentNumber || account.merchantId || account.merchantCode || "").trim(),
        statementName: String(account.statementName || account.softDescriptor || "").trim(),
        feeRules: String(account.feeRules || account.fees || account.rates || "").trim(),
        rateTable: normalizePaymentRateTable(account.rateTable || account.feeTable || account.ratesTable, company),
        logoDataUrl: String(account.logoDataUrl || account.logo || ""),
        status: normalizePaymentStatus(account.status),
        isDefault: Boolean(account.isDefault || account.default),
      }))
    : [];

  if (normalized.length && !normalized.some((account) => account.isDefault)) normalized[0].isDefault = true;
  if (normalized.filter((account) => account.isDefault).length > 1) {
    let foundDefault = false;
    normalized.forEach((account) => {
      if (account.isDefault && !foundDefault) {
        foundDefault = true;
        return;
      }
      account.isDefault = false;
    });
  }
  return normalized;
}

function normalizePaymentRateRows(rows) {
  return Array.isArray(rows)
    ? rows
        .map((row) => ({
          id: row.id || createId(),
          type: String(row.type || row.description || "").trim(),
          visa: String(row.visa || row.Visa || "").trim(),
          mastercard: String(row.mastercard || row.master || row.Mastercard || "").trim(),
          elo: String(row.elo || row.Elo || "").trim(),
        }))
        .filter((row) => row.type || row.visa || row.mastercard || row.elo)
    : [];
}

function paymentRateRowSignature(row) {
  return [normalizeKey(row.type), String(row.visa || "").trim(), String(row.mastercard || "").trim(), String(row.elo || "").trim()].join("|");
}

function paymentRateTablesMatch(rows, defaults) {
  if (rows.length !== defaults.length) return false;
  return rows.every((row, index) => paymentRateRowSignature(row) === paymentRateRowSignature(defaults[index]));
}

function isExtrafrioCompany(company = {}) {
  return normalizeKey(`${company.code || ""} ${company.name || ""}`).includes("EXTRAFRIO");
}

function normalizePaymentRateTable(rows, company = {}) {
  const normalized = normalizePaymentRateRows(rows);
  const companyDefault = defaultPaymentRateTable(company);
  const hasFilledRate = normalized.some((row) => row.visa || row.mastercard || row.elo);
  if (!normalized.length || !hasFilledRate) return companyDefault;

  const extrainoxDefault = defaultPaymentRateTable({ code: "EXTRAINOX", name: "EXTRAINOX" });
  if (isExtrafrioCompany(company) && paymentRateTablesMatch(normalized, extrainoxDefault)) {
    return companyDefault;
  }

  return normalized;
}

function summarizePaymentRates(rows, company = {}) {
  const filled = normalizePaymentRateTable(rows, company).filter((row) => row.visa || row.mastercard || row.elo).length;
  return filled ? `${filled} taxas cadastradas` : "";
}

function normalizePaymentEnvironment(value) {
  return normalizeKey(value).includes("TEST") ? "Teste" : "Produção";
}

function normalizePaymentStatus(value) {
  return normalizeKey(value).includes("INAT") ? "Inativa" : "Ativa";
}

function hasLegacyBankData(company = {}) {
  return Boolean(company.bankName || company.bankAgency || company.bankAccount || company.pixKey);
}

function getCompanyBankAccounts(company = {}) {
  company.bankAccounts = normalizeBankAccounts(company.bankAccounts, company);
  return company.bankAccounts;
}

function getCompanyPaymentAccounts(company = {}) {
  company.paymentAccounts = normalizePaymentAccounts(company.paymentAccounts, company);
  return company.paymentAccounts;
}

function primaryCompanyBankAccount(company = {}) {
  return getCompanyBankAccounts(company).find((account) => account.isDefault) || getCompanyBankAccounts(company)[0] || null;
}

function primaryCompanyPaymentAccount(company = {}) {
  return getCompanyPaymentAccounts(company).find((account) => account.isDefault) || getCompanyPaymentAccounts(company)[0] || null;
}

function selectedCompanyBankAccount(quote = {}) {
  const company = selectedCompany(quote);
  const accounts = getCompanyBankAccounts(company);
  return accounts.find((account) => account.id === quote.bankAccountId) || primaryCompanyBankAccount(company);
}

function selectedCompanyPaymentAccount(quote = {}) {
  const company = selectedCompany(quote);
  const accounts = getCompanyPaymentAccounts(company);
  return accounts.find((account) => account.id === quote.paymentAccountId) || primaryCompanyPaymentAccount(company);
}

function normalizeReceiptMethod(value) {
  const key = normalizeKey(value);
  if (key.includes("CIELO") || key.includes("LINK")) return RECEIPT_METHODS.cielo;
  if (key.includes("ESPECIE") || key.includes("DINHEIRO")) return RECEIPT_METHODS.cash;
  if (key.includes("COMBINAR")) return RECEIPT_METHODS.combine;
  if (Object.values(RECEIPT_METHODS).includes(value)) return value;
  return RECEIPT_METHODS.bank;
}

function receiptMethodLabel(value) {
  const method = normalizeReceiptMethod(value);
  if (method === RECEIPT_METHODS.cielo) return "Link de Pagamento Cielo";
  if (method === RECEIPT_METHODS.cash) return "Em espécie";
  if (method === RECEIPT_METHODS.combine) return "A combinar";
  return "Transferência Bancária/Pix";
}

function selectedReceiptDetails(quote = {}) {
  const method = normalizeReceiptMethod(quote.receiptMethod);
  if (method === RECEIPT_METHODS.cielo) {
    const account = selectedCompanyPaymentAccount(quote);
    const simulation = normalizeSaleSimulation(quote.saleSimulation);
    const lines = [
      `Operadora: ${account?.provider || "Cielo"}`,
      account?.establishmentNumber ? `Estabelecimento: ${account.establishmentNumber}` : "",
      simulation?.brandLabel ? `Bandeira: ${simulation.brandLabel}` : "",
      quote.paymentTerms ? `Pagamento: ${quote.paymentTerms}` : "",
    ].filter(Boolean);
    return {
      method,
      title: "Link de pagamento Cielo",
      lines,
      paymentLink: simulation?.paymentLink || "",
      logoDataUrl: account?.logoDataUrl || "",
      logoAlt: account?.provider || "Cielo",
    };
  }
  if (method === RECEIPT_METHODS.combine) {
    return { method, title: "", lines: [], paymentLink: "", logoDataUrl: "", logoAlt: "" };
  }
  if (method === RECEIPT_METHODS.cash) {
    return { method, title: "", lines: [], paymentLink: "", logoDataUrl: "", logoAlt: "" };
  }
  const account = selectedCompanyBankAccount(quote);
  const lines = [
    account?.bankName ? `Banco: ${account.bankName}` : "",
    account?.bankAgency ? `Agencia: ${account.bankAgency}` : "",
    account?.bankAccount ? `Conta: ${account.bankAccount}` : "",
    account?.pixKey ? `PIX: ${account.pixKey}` : "",
  ].filter(Boolean);
  return {
    method,
    title: "Dados bancarios",
    lines,
    paymentLink: "",
    logoDataUrl: account?.bankLogoDataUrl || "",
    logoAlt: account?.bankName || "Banco",
  };
}

function syncCompanyPrimaryBank(company = {}) {
  const account = primaryCompanyBankAccount(company);
  company.bankName = account?.bankName || "";
  company.bankAgency = account?.bankAgency || "";
  company.bankAccount = account?.bankAccount || "";
  company.pixKey = account?.pixKey || "";
}

function setCompanyValue(company, field, value) {
  if (field === "code" || field === "state") {
    const maxLength = field === "code" ? 3 : 2;
    company[field] = normalizeKey(value).slice(0, maxLength);
    return;
  }
  company[field] = String(value || "").trim();
}

function updateCompanyReferences(previousCode, nextCode) {
  if (!previousCode || !nextCode || previousCode === nextCode) return;
  state.budgets.forEach((quote) => {
    if (normalizeKey(quote.company) === previousCode) quote.company = nextCode;
  });
  state.taxRules.forEach((rule) => {
    if (normalizeKey(rule.company) === previousCode) rule.company = nextCode;
  });
}

function addCompany() {
  const nextNumber = getCompanies().length + 1;
  state.companies.push(
    normalizeCompany({
      code: `EMPRESA${nextNumber}`,
      name: `Nova empresa ${nextNumber}`,
      taxRegime: "Lucro Presumido",
    }),
  );
  saveState();
  render();
  state.screen = "empresas";
  renderScreen();
}

function removeCompany(companyId) {
  if (getCompanies().length <= 1) {
    alert("Mantenha pelo menos uma empresa cadastrada.");
    return;
  }
  const company = getCompanies().find((current) => current.id === companyId);
  if (!company) return;
  if (!confirm(`Remover a empresa ${company.name || company.code}?`)) return;
  state.companies = getCompanies().filter((current) => current.id !== companyId);
  const fallbackCode = defaultCompanyCode();
  updateCompanyReferences(company.code, fallbackCode);
  saveState();
  render();
}

function hasBankData(company) {
  return getCompanyBankAccounts(company).some((account) => account.bankName || account.bankAgency || account.bankAccount || account.pixKey);
}

function formatCompanyAddressLine(company) {
  const street = [company.address, company.addressNumber].filter(Boolean).join(", ");
  const cityLine = [company.district, company.city, company.state].filter(Boolean).join(" - ");
  const zip = company.zipCode ? `CEP: ${company.zipCode}` : "";
  return [street, cityLine, zip].filter(Boolean).join(" - ");
}

function getRepresentatives() {
  if (!Array.isArray(state.representatives)) {
    state.representatives = cloneRepresentatives(DEFAULT_REPRESENTATIVES);
  }
  return state.representatives;
}

function selectedRepresentative(quote = selectedQuote()) {
  if (quote?.hasRepresentative !== "sim" || !quote?.representativeId) return null;
  return getRepresentatives().find((representative) => representative.id === quote.representativeId) || null;
}

function normalizeRepresentatives(representatives) {
  if (!Array.isArray(representatives)) return [];
  return representatives.map((representative) => normalizeRepresentative(representative));
}

function normalizeRepresentative(representative = {}) {
  return {
    id: representative.id || createId(),
    name: String(representative.name || "").trim(),
    cnpj: String(representative.cnpj || "").trim(),
    phone: String(representative.phone || "").trim(),
    email: String(representative.email || "").trim(),
    representedClients: String(representative.representedClients || "").trim(),
    commissionRate: normalizeTaxPercent(representative.commissionRate || 0),
    bankName: String(representative.bankName || "").trim(),
    bankAgency: String(representative.bankAgency || "").trim(),
    bankAccount: String(representative.bankAccount || "").trim(),
    pixKey: String(representative.pixKey || "").trim(),
  };
}

function cloneRepresentatives(representatives) {
  return normalizeRepresentatives(representatives).map(({ id, ...representative }) => ({ ...representative, id: createId() }));
}

function setRepresentativeValue(representative, field, value) {
  if (field === "commissionRate") {
    representative[field] = roundRuleNumber(parseNumber(value) / 100);
    return;
  }
  representative[field] = String(value || "").trim();
}

function addRepresentative() {
  state.representatives.push(
    normalizeRepresentative({
      name: "Novo representante",
      commissionRate: 0,
    }),
  );
  saveState();
  render();
  state.screen = "representantes";
  renderScreen();
}

function removeRepresentative(representativeId) {
  const representative = getRepresentatives().find((current) => current.id === representativeId);
  if (!representative) return;
  if (!confirm(`Remover o representante ${representative.name || "sem nome"}?`)) return;
  state.representatives = getRepresentatives().filter((current) => current.id !== representativeId);
  state.budgets.forEach((quote) => {
    if (quote.representativeId === representativeId) {
      quote.hasRepresentative = "nao";
      quote.representativeId = "";
      touchQuote(quote);
    }
  });
  saveState();
  render();
}

function hasRepresentativeBankData(representative) {
  return Boolean(representative.bankName || representative.bankAgency || representative.bankAccount || representative.pixKey);
}

function splitRepresentedClients(representative) {
  return String(representative.representedClients || "")
    .split(/[;,]/)
    .map((client) => client.trim())
    .filter(Boolean);
}

function getFreightRules() {
  if (!Array.isArray(state.freightRules)) {
    state.freightRules = cloneFreightRules(DEFAULT_FREIGHT_RULES);
  }
  return state.freightRules;
}

function getFreightSimulator() {
  state.freightSimulator = normalizeFreightSimulator(state.freightSimulator);
  return state.freightSimulator;
}

function normalizeFreightSimulator(simulator = {}) {
  return {
    invoiceValue: parseNumber(simulator.invoiceValue),
    baseFreight: parseNumber(simulator.baseFreight),
    destinationUf: normalizeKey(simulator.destinationUf || "PR").slice(0, 2),
    insuranceRate: normalizeTaxPercent(simulator.insuranceRate ?? 0.006),
    operationalRate: normalizeTaxPercent(simulator.operationalRate ?? 0.02),
    type: normalizeKey(simulator.type || "CIF"),
  };
}

function setFreightSimulatorValue(field, value) {
  const simulator = getFreightSimulator();
  if (field === "invoiceValue" || field === "baseFreight") {
    simulator[field] = parseNumber(value);
    return;
  }
  if (field === "insuranceRate" || field === "operationalRate") {
    simulator[field] = roundRuleNumber(parseNumber(value) / 100);
    return;
  }
  if (field === "destinationUf") {
    simulator.destinationUf = normalizeKey(value).slice(0, 2);
    return;
  }
  if (field === "type") {
    simulator.type = normalizeKey(value);
  }
}

function calculateFreightSimulator(simulator = getFreightSimulator()) {
  const invoiceValue = parseNumber(simulator.invoiceValue);
  const baseFreight = parseNumber(simulator.baseFreight);
  const icmsRate = freightIcmsRateForUf(simulator.destinationUf);
  const insuranceValue = invoiceValue * parseNumber(simulator.insuranceRate);
  const icmsValue = baseFreight * icmsRate;
  const operationalValue = baseFreight * parseNumber(simulator.operationalRate);
  const taxesValue = icmsValue + operationalValue;
  const surchargesValue = insuranceValue + taxesValue;
  const totalFreight = baseFreight + surchargesValue;
  const orderPercent = invoiceValue > 0 ? totalFreight / invoiceValue : 0;
  return {
    invoiceValue,
    baseFreight,
    icmsRate,
    insuranceValue,
    icmsValue,
    operationalValue,
    taxesValue,
    surchargesValue,
    totalFreight,
    orderPercent,
  };
}

function toggleFreightSimulator() {
  if (!elements.freightSimulatorPanel) return;
  state.freightSimulatorCollapsed = state.freightSimulatorCollapsed === false;
  if (!state.freightSimulatorCollapsed) {
    useSelectedQuoteInFreightSimulator();
  } else {
    saveState();
    updateFreightSimulatorToggle();
  }
}

function syncFreightDestinationFromQuote(quote = selectedQuote()) {
  if (!quote || !elements.freightSimulatorPanel || state.freightSimulatorCollapsed !== false) return;
  const destinationUf = normalizeKey(quote.state || "").slice(0, 2);
  if (!destinationUf) return;
  const simulator = getFreightSimulator();
  simulator.destinationUf = destinationUf;
  renderFreightSimulator();
}

function freightIcmsRateForUf(uf) {
  return FREIGHT_ICMS_12_UFS.has(normalizeKey(uf)) ? 0.12 : 0.07;
}

function useSelectedQuoteInFreightSimulator() {
  const quote = selectedQuote();
  if (!quote) return;
  const summary = calculateQuote(quote);
  const simulator = getFreightSimulator();
  simulator.invoiceValue = summary.itemsTotal;
  simulator.baseFreight = parseNumber(quote.freight);
  simulator.destinationUf = normalizeKey(quote.state || "PR").slice(0, 2);
  simulator.type = normalizeKey(quote.freightType || simulator.type || "CIF");
  saveState();
  renderFreightSimulator();
}

function applyFreightSimulatorToQuote() {
  const quote = selectedQuote();
  if (!quote) return;
  const simulator = getFreightSimulator();
  const result = calculateFreightSimulator(simulator);
  quote.freight = result.totalFreight;
  quote.freightType = `${simulator.type || "CIF"} - SIMULADO`;
  touchQuote(quote);
  saveState();
  renderForm();
  renderSummary();
  renderQuoteList();
  renderProposalOverview();
  renderProposalRows();
  renderPrintProposal();
  renderFreightSimulator();
}

function normalizeFreightRules(rules) {
  if (!Array.isArray(rules)) return [];
  return rules.map((rule) => normalizeFreightRule(rule));
}

function normalizeFreightRule(rule = {}) {
  return {
    id: rule.id || createId(),
    name: String(rule.name || "Nova regra de frete").trim(),
    type: normalizeKey(rule.type || "CIF"),
    carrier: String(rule.carrier || "").trim(),
    originUf: normalizeKey(rule.originUf || "PR").slice(0, 2),
    destinationUf: normalizeKey(rule.destinationUf || "").slice(0, 2),
    deadline: String(rule.deadline || "").trim(),
    minimumValue: parseNumber(rule.minimumValue),
    rate: normalizeTaxPercent(rule.rate || 0),
    notes: String(rule.notes || "").trim(),
  };
}

function cloneFreightRules(rules) {
  return normalizeFreightRules(rules).map(({ id, ...rule }) => ({ ...rule, id: createId() }));
}

function setFreightRuleValue(rule, field, value) {
  if (field === "minimumValue") {
    rule[field] = parseNumber(value);
    return;
  }
  if (field === "rate") {
    rule[field] = roundRuleNumber(parseNumber(value) / 100);
    return;
  }
  if (field === "type") {
    rule[field] = normalizeKey(value);
    return;
  }
  if (field === "originUf" || field === "destinationUf") {
    rule[field] = normalizeKey(value).slice(0, 2);
    return;
  }
  rule[field] = String(value || "").trim();
}

function addFreightRule() {
  getFreightRules().unshift(
    normalizeFreightRule({
      name: "Nova regra de frete",
      type: "CIF",
      originUf: selectedCompany()?.state || "PR",
      deadline: "A combinar",
    }),
  );
  state.screen = "frete";
  saveState();
  render();
}

function removeFreightRule(ruleId) {
  const rule = getFreightRules().find((current) => current.id === ruleId);
  if (!rule) return;
  if (!confirm(`Remover a regra de frete ${rule.name || "sem nome"}?`)) return;
  state.freightRules = getFreightRules().filter((current) => current.id !== ruleId);
  saveState();
  renderFreightRules();
}

function parseDeadlineDays(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function normalizeCommissions(commissions) {
  if (!commissions || typeof commissions !== "object") return {};
  return Object.fromEntries(
    Object.entries(commissions).map(([quoteId, record]) => [
      quoteId,
      {
        status: record?.status === "pago" ? "pago" : "a_pagar",
        paidAt: String(record?.paidAt || ""),
        notes: String(record?.notes || ""),
      },
    ]),
  );
}

function normalizeManualCommissions(manualCommissions) {
  if (!Array.isArray(manualCommissions)) return [];
  return manualCommissions.map((commission) => normalizeManualCommission(commission));
}

function normalizeManualCommission(commission = {}) {
  const baseAmount = parseNumber(commission.baseAmount);
  const commissionRate = normalizeTaxPercent(commission.commissionRate || 0);
  const calculatedAmount = baseAmount * commissionRate;
  const amount = parseNumber(commission.amount || calculatedAmount);
  return {
    id: commission.id || createId(),
    description: String(commission.description || "Comissão manual").trim(),
    client: String(commission.client || "").trim(),
    representativeId: String(commission.representativeId || "").trim(),
    baseAmount,
    commissionRate,
    amount,
    status: commission.status === "pago" ? "pago" : "a_pagar",
    paidAt: String(commission.paidAt || ""),
    notes: String(commission.notes || "").trim(),
    createdAt: commission.createdAt || new Date().toISOString(),
    updatedAt: commission.updatedAt || new Date().toISOString(),
  };
}

function commissionRecordForQuote(quoteId) {
  state.commissions ||= {};
  state.commissions[quoteId] ||= { status: "a_pagar", paidAt: "", notes: "" };
  return state.commissions[quoteId];
}

function getCommissionRows() {
  const automaticRows = state.budgets
    .map((quote) => {
      const representative = selectedRepresentative(quote);
      if (!representative) return null;
      const total = calculateQuote(quote).total;
      const rate = parseNumber(representative.commissionRate);
      return {
        id: quote.id,
        type: "automatic",
        quote,
        representative,
        record: commissionRecordForQuote(quote.id),
        total,
        rate,
        amount: total * rate,
        sortDate: quote.updatedAt || "",
      };
    })
    .filter(Boolean);
  const manualRows = getManualCommissions().map((commission) => {
    const representative = representativeById(commission.representativeId);
    const total = parseNumber(commission.baseAmount);
    const rate = parseNumber(commission.commissionRate);
    return {
      id: commission.id,
      type: "manual",
      quote: null,
      representative,
      record: commission,
      total,
      rate,
      amount: manualCommissionAmount(commission),
      sortDate: commission.updatedAt || commission.createdAt || "",
    };
  });
  return [...manualRows, ...automaticRows].sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));
}

function updateCommissionRecord(quoteId, field, value) {
  const record = commissionRecordForQuote(quoteId);
  if (field === "status") {
    record.status = value === "pago" ? "pago" : "a_pagar";
    if (record.status === "pago" && !record.paidAt) record.paidAt = today;
  } else if (field === "paidAt") {
    record.paidAt = value || "";
  } else if (field === "notes") {
    record.notes = value || "";
  }
  saveState();
  if (field === "status") renderCommissions();
}

function getManualCommissions() {
  if (!Array.isArray(state.manualCommissions)) {
    state.manualCommissions = [];
  }
  return state.manualCommissions;
}

function representativeById(representativeId) {
  return getRepresentatives().find((representative) => representative.id === representativeId) || null;
}

function manualCommissionAmount(commission) {
  const amount = parseNumber(commission.amount);
  if (amount > 0) return amount;
  return parseNumber(commission.baseAmount) * parseNumber(commission.commissionRate);
}

function addManualCommission() {
  const representative = getRepresentatives()[0] || null;
  const commissionRate = representative ? parseNumber(representative.commissionRate) : 0;
  getManualCommissions().unshift(
    normalizeManualCommission({
      description: "Comissão manual",
      representativeId: representative?.id || "",
      commissionRate,
      status: "a_pagar",
    }),
  );
  state.screen = "comissoes";
  saveState();
  render();
}

function updateManualCommission(commissionId, field, value, options = {}) {
  const commission = getManualCommissions().find((current) => current.id === commissionId);
  if (!commission) return;

  if (field === "baseAmount" || field === "amount") {
    commission[field] = parseNumber(value);
  } else if (field === "commissionRate") {
    commission.commissionRate = roundRuleNumber(parseNumber(value) / 100);
  } else if (field === "representativeId") {
    commission.representativeId = value || "";
    const representative = representativeById(commission.representativeId);
    if (representative) commission.commissionRate = parseNumber(representative.commissionRate);
  } else if (field === "status") {
    commission.status = value === "pago" ? "pago" : "a_pagar";
    if (commission.status === "pago" && !commission.paidAt) commission.paidAt = today;
  } else if (field === "paidAt") {
    commission.paidAt = value || "";
  } else if (field === "description" || field === "client" || field === "notes") {
    commission[field] = String(value || "").trim();
  }

  commission.updatedAt = new Date().toISOString();
  saveState();
  renderCommissionSummary(getCommissionRows());
  if (options.rerender && ["representativeId", "status"].includes(field)) renderCommissions();
}

function removeManualCommission(commissionId) {
  const commission = getManualCommissions().find((current) => current.id === commissionId);
  if (!commission) return;
  if (!confirm(`Excluir o lançamento ${commission.description || "manual"}?`)) return;
  state.manualCommissions = getManualCommissions().filter((current) => current.id !== commissionId);
  saveState();
  renderCommissions();
}

function defaultTaxRuleFilters() {
  return {
    company: "todos",
    uf: "todos",
    search: "",
  };
}

function normalizeTaxRules(rules) {
  if (!Array.isArray(rules)) return [];
  return rules
    .map((rule) => normalizeTaxRule(rule))
    .filter((rule) => rule.company && rule.ncm);
}

function normalizeTaxRule(rule = {}) {
  return {
    id: rule.id || createId(),
    company: normalizeKey(rule.company || "EXTRAINOX"),
    uf: normalizeKey(rule.uf || ""),
    ncm: String(rule.ncm || "").trim(),
    description: normalizeKey(rule.description || "SEM GRUPO FISCAL"),
    icms: normalizeTaxPercent(rule.icms),
    icmsBase: normalizeTaxPercent(rule.icmsBase ?? 1),
    ipi: normalizeTaxPercent(rule.ipi),
    pisCofins: normalizeTaxPercent(rule.pisCofins ?? DEFAULT_PIS_COFINS),
  };
}

function cloneTaxRules(rules) {
  return normalizeTaxRules(rules).map(({ id, ...rule }) => ({ ...rule, id: createId() }));
}

function normalizeTaxPercent(value) {
  const number = parseNumber(value);
  return roundRuleNumber(number > 1 ? number / 100 : number);
}

function setTaxRuleValue(rule, field, value) {
  if (isPercentField(field)) {
    rule[field] = roundRuleNumber(parseNumber(value) / 100);
    return;
  }

  if (field === "company" || field === "uf" || field === "description") {
    rule[field] = normalizeKey(value);
    return;
  }

  rule[field] = String(value || "").trim();
}

function parseTaxRuleImport(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("window.TAX_RULES")) {
    return JSON.parse(trimmed.replace(/^window\.TAX_RULES\s*=\s*/, "").replace(/;\s*$/, ""));
  }
  return JSON.parse(trimmed);
}

function normalizeItemDescriptionFields(item) {
  const summary = String(item.description || item.descriptionSummary || item.shortDescription || "").trim();
  const commercial = String(item.commercialDescription || "").trim();

  if (commercial) {
    item.commercialDescription = commercial;
    item.description = summary || commercial;
    return;
  }

  item.commercialDescription = summary;
  item.description = summary;
}

function summarizeItemDescription(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return String(value || "").trim();
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatCep(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 8) return String(value || "").trim();
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

function formatPhone(value) {
  const digits = onlyDigits(value);
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  return String(value || "").trim();
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

function parseMoneyInput(value) {
  const cleaned = String(value || "").replace(/[^\d,.-]/g, "");
  return parseNumber(cleaned);
}

function parseRatePercent(value) {
  const cleaned = String(value || "").replace(/[^\d,.-]/g, "");
  if (!cleaned) return Number.NaN;
  return parseNumber(cleaned) / 100;
}

function saleTypeInstallments(type) {
  const match = String(type || "").match(/(\d+)\s*x/i);
  return match ? Math.max(1, Number(match[1])) : 1;
}

function formatCardBrandLabel(value) {
  const key = normalizeKey(value);
  if (key === "MASTERCARD") return "Mastercard";
  if (key === "ELO") return "Elo";
  return "Visa";
}

function formatSaleTypeLabel(value) {
  const text = String(value || "").trim();
  const key = normalizeKey(text);
  if (key.includes("DEBITO")) return "Débito";
  if (key.includes("A VISTA")) return "Crédito à vista";
  const installments = saleTypeInstallments(text);
  if (installments > 1) return `Crédito parcelado loja ${installments}x`;
  return text;
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

function formatPriceInput(value) {
  const number = parseNumber(value);
  if (!number) return "";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
  }).format(number);
}

function formatPercentInput(value) {
  const percent = parseNumber(value) * 100;
  return Number.isFinite(percent) ? String(Math.round(percent * 10000) / 10000) : "";
}

function isPercentField(field) {
  return ["icmsBase", "icms", "ipi", "pisCofins"].includes(field);
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

function formatDateOnly(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatRevisionTimestamp(value) {
  if (!value) return "Sem data de emissão";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data de emissão";
  const formattedDate = new Intl.DateTimeFormat("pt-BR").format(date);
  const formattedTime = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${formattedDate} às ${formattedTime}`;
}

function formatAddressLine(quote) {
  return [quote.address, quote.addressNumber].filter(Boolean).join(",");
}

function formatClientAddressLine(quote) {
  const street = [quote.address, quote.addressNumber].filter(Boolean).join(", ");
  const cityLine = [quote.district, quote.city, quote.state].filter(Boolean).join(" - ");
  const zip = quote.zipCode ? `CEP: ${quote.zipCode}` : "";
  return [street, cityLine, zip].filter(Boolean).join(" - ");
}

function formatProposalNumber(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.toUpperCase().startsWith("CP") ? text : text;
}

function formatPrintItemNumber(index) {
  return String((index + 1) * 10).padStart(5, "0");
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

function exportAllData() {
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      source: "orcamentos-app-local",
      ...state,
    },
    null,
    2,
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `backup-orcamentos-${today}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importAllData(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.budgets) || parsed.budgets.length === 0) {
      throw new Error("Arquivo sem propostas");
    }
    if (!confirm("Importar estes dados e substituir os dados atuais deste navegador?")) return;
    parsed.budgets.forEach(normalizeQuoteInPlace);
    state = {
      budgets: parsed.budgets,
      companies: normalizeCompanies(parsed.companies).length ? normalizeCompanies(parsed.companies) : cloneCompanies(DEFAULT_COMPANIES),
      representatives: normalizeRepresentatives(parsed.representatives),
      freightRules: normalizeFreightRules(parsed.freightRules).length ? normalizeFreightRules(parsed.freightRules) : cloneFreightRules(DEFAULT_FREIGHT_RULES),
      freightSimulator: normalizeFreightSimulator(parsed.freightSimulator),
      commissions: normalizeCommissions(parsed.commissions),
      manualCommissions: normalizeManualCommissions(parsed.manualCommissions),
      commissionFilter: parsed.commissionFilter || "todos",
      taxRules: normalizeTaxRules(parsed.taxRules).length ? normalizeTaxRules(parsed.taxRules) : cloneTaxRules(DEFAULT_TAX_RULES),
      taxRuleFilters: {
        ...defaultTaxRuleFilters(),
        ...(parsed.taxRuleFilters || {}),
      },
      selectedId: parsed.selectedId && parsed.budgets.some((quote) => quote.id === parsed.selectedId) ? parsed.selectedId : parsed.budgets[0].id,
      filter: parsed.filter || "todos",
      search: parsed.search || "",
      overviewNumberSort: parsed.overviewNumberSort === "desc" ? "desc" : "asc",
      screen: "propostas",
      proposalView: "overview",
    };
    saveState();
    render();
    alert("Dados importados com sucesso.");
  } catch (error) {
    alert(error.message || "Nao foi possivel importar este backup.");
  } finally {
    event.target.value = "";
  }
}

function addTaxRule() {
  const filters = state.taxRuleFilters || defaultTaxRuleFilters();
  const company = filters.company !== "todos" ? filters.company : "EXTRAINOX";
  const uf = filters.uf !== "todos" ? filters.uf : "PR";
  state.taxRules.unshift(
    normalizeTaxRule({
      company,
      uf,
      ncm: "",
      description: "NOVO GRUPO FISCAL",
      icmsBase: 1,
      icms: 0,
      ipi: 0,
      pisCofins: DEFAULT_PIS_COFINS,
    }),
  );
  saveState();
  renderFiscalRules();
}

function exportTaxRules() {
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      taxRules: state.taxRules.map(({ id, ...rule }) => rule),
    },
    null,
    2,
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "regras-fiscais.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importTaxRules(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = parseTaxRuleImport(text);
    const rules = Array.isArray(parsed) ? parsed : parsed.taxRules || parsed.rules;
    const normalized = normalizeTaxRules(rules);
    if (!normalized.length) throw new Error("Formato invalido");
    state.taxRules = normalized;
    applyTaxRulesToBudgets();
    saveState();
    render();
  } catch {
    alert("Nao foi possivel importar as regras fiscais. Use um JSON exportado por esta tela ou uma lista de regras valida.");
  } finally {
    event.target.value = "";
  }
}

function resetTaxRules() {
  if (!confirm("Restaurar a tabela fiscal padrao e substituir as alteracoes locais?")) return;
  state.taxRules = cloneTaxRules(DEFAULT_TAX_RULES);
  state.taxRuleFilters = defaultTaxRuleFilters();
  applyTaxRulesToBudgets();
  saveState();
  render();
}

async function importQuote(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const importedQuotes = importedQuotesFromPayload(parsed);
    if (!importedQuotes.length) {
      throw new Error("Formato inválido");
    }
    const applyTaxRules = parsed.applyTaxRulesOnImport !== false;
    const quotes = importedQuotes.map((imported) => normalizeImportedQuote(imported, { applyTaxRules }));
    state.budgets.unshift(...quotes);
    state.selectedId = quotes[0].id;
    persistAndRender();
    alert(quotes.length === 1 ? "Orçamento importado com sucesso." : `${quotes.length} orçamentos importados com sucesso.`);
  } catch (error) {
    alert(error.message || "Não foi possível importar esse arquivo. Verifique se ele veio deste protótipo.");
  } finally {
    event.target.value = "";
  }
}

function importedQuotesFromPayload(parsed) {
  const quotes = Array.isArray(parsed) ? parsed : parsed.quotes || parsed.budgets || (parsed.quote ? [parsed.quote] : [parsed]);
  return quotes.filter((imported) => imported?.client && Array.isArray(imported.items));
}

function normalizeImportedQuote(imported, options = {}) {
  const quote = {
    id: crypto.randomUUID(),
    number: normalizeQuoteNumber(imported.number || nextQuoteNumber(state.budgets)),
    company: imported.company || "EXTRAINOX",
    status: normalizeQuoteStatus(imported.status),
    revision: formatRevision(imported.revision),
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
    receiptMethod: normalizeReceiptMethod(imported.receiptMethod),
    bankAccountId: imported.bankAccountId || "",
    paymentAccountId: imported.paymentAccountId || "",
    saleSimulation: normalizeSaleSimulation(imported.saleSimulation),
    includedBy: imported.includedBy || "",
    sentAt: imported.sentAt || "",
    nextContactAt: imported.nextContactAt || "",
    lastClientResponse: imported.lastClientResponse || "",
    rejectionReason: imported.rejectionReason || "",
    followUpNotes: imported.followUpNotes || "",
    hasRepresentative: imported.hasRepresentative === "sim" ? "sim" : "nao",
    representativeId: imported.representativeId || "",
    date: imported.date || today,
    notes: imported.notes || "",
    freight: parseNumber(imported.freight),
    attachments: normalizeProposalAttachments(imported.attachments),
    revisionHistory: Array.isArray(imported.revisionHistory) ? imported.revisionHistory : [],
    items: imported.items.map((item) => ({
      id: crypto.randomUUID(),
      code: item.code || "",
      description: item.descriptionSummary || item.shortDescription || summarizeItemDescription(item.description || item.commercialDescription || ""),
      commercialDescription: item.commercialDescription || item.description || "",
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
  quote.items.forEach((item) => {
    normalizeItemDescriptionFields(item);
    if (options.applyTaxRules !== false) applyTaxRule(item, quote);
  });
  ensureRevisionHistory(quote);
  return quote;
}

function normalizeQuoteInPlace(quote) {
  quote.number = normalizeQuoteNumber(quote.number);
  quote.company ||= "EXTRAINOX";
  quote.status = normalizeQuoteStatus(quote.status);
  quote.revision = formatRevision(quote.revision);
  quote.revisionHistory = Array.isArray(quote.revisionHistory) ? quote.revisionHistory : [];
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
  quote.receiptMethod = normalizeReceiptMethod(quote.receiptMethod);
  quote.bankAccountId ||= "";
  quote.paymentAccountId ||= "";
  quote.saleSimulation = normalizeSaleSimulation(quote.saleSimulation);
  if (quote.saleSimulation && normalizeReceiptMethod(quote.receiptMethod) === RECEIPT_METHODS.cielo) {
    quote.paymentTerms = formatSimulationPaymentTerms(quote.saleSimulation);
  }
  quote.includedBy ||= quote.owner || "";
  quote.sentAt ||= "";
  quote.nextContactAt ||= "";
  quote.lastClientResponse ||= "";
  quote.rejectionReason ||= "";
  quote.followUpNotes ||= "";
  quote.hasRepresentative = quote.hasRepresentative === "sim" ? "sim" : "nao";
  quote.representativeId = quote.hasRepresentative === "sim" ? quote.representativeId || "" : "";
  quote.freight = parseNumber(quote.freight);
  quote.attachments = normalizeProposalAttachments(quote.attachments);
  quote.items = Array.isArray(quote.items) ? quote.items : [];
  quote.items.forEach((item) => {
    item.id ||= crypto.randomUUID();
    normalizeItemDescriptionFields(item);
    item.ncm ||= "";
    item.quantity = parseNumber(item.quantity);
    item.liquidPrice = parseNumber(item.liquidPrice || item.unitCost || 0);
    item.icmsBase = parseNumber(item.icmsBase || 1);
    item.icms = parseNumber(item.icms || 0);
    item.ipi = parseNumber(item.ipi || item.tax || 0);
    item.pisCofins = parseNumber(item.pisCofins) || DEFAULT_PIS_COFINS;
  });
  ensureRevisionHistory(quote);
}

function normalizeQuoteNumber(value) {
  const text = String(value || "").trim();
  if (!text) return nextQuoteNumber([]);
  if (/[a-z]/i.test(text)) return text.toUpperCase();
  if (/^\d+\.\d{2}$/.test(text)) return text;
  const parsed = parseQuoteNumber(text);
  if (!Number.isFinite(parsed.sequence)) return text;
  return `${parsed.sequence}.${parsed.year || currentYearShort}`;
}

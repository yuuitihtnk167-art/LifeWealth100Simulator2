const STORAGE_KEY = "lifewealth100-simulator-state";
const APP_VERSION = "0.1.0";

const PHASES = [
  { key: "active", label: "現役" },
  { key: "retired", label: "定年後" },
  { key: "pension", label: "年金生活" },
  { key: "late", label: "終末期" },
];

const INCOME_FIELDS = [
  { key: "salary", label: "給与" },
  { key: "nonSalary", label: "月給以外" },
  { key: "dividends", label: "配当所得" },
  { key: "otherIncome", label: "その他入金" },
];

const EXPENSE_FIELDS = [
  { key: "housing", label: "住宅" },
  { key: "car", label: "自動車" },
  { key: "cashCard", label: "現金・カード" },
  { key: "communication", label: "通信費" },
  { key: "utilities", label: "水道光熱費" },
  { key: "food", label: "食費" },
  { key: "leisure", label: "趣味・娯楽" },
  { key: "insurance", label: "保険" },
  { key: "special", label: "特別な支出" },
  { key: "dailyGoods", label: "日用品" },
  { key: "medical", label: "健康・医療" },
  { key: "social", label: "交際費" },
  { key: "transport", label: "交通費" },
  { key: "beauty", label: "衣服・美容" },
  { key: "taxSocial", label: "税・社会保障" },
  { key: "otherExpense", label: "その他" },
];

const SECTION_HEADERS = new Set([
  "預金・現金・暗号資産",
  "株式（現物）",
  "投資信託",
  "債券",
  "保険",
  "年金",
  "ポイント・マイル",
  "その他の資産",
]);

const state = loadState();
let currentView = "dashboard";
let lastFocusedControl = null;
let pendingRenderFrame = 0;

const dom = {
  birthDate: document.querySelector("#birth-date"),
  inflationRate: document.querySelector("#inflation-rate"),
  marketRiseAdjustmentRate: document.querySelector("#market-rise-adjustment-rate"),
  usdJpyRate: document.querySelector("#usd-jpy-rate"),
  fetchUsdJpyRateButton: document.querySelector("#fetch-usd-jpy-rate"),
  usdJpyRateStatus: document.querySelector("#usd-jpy-rate-status"),
  endAge: document.querySelector("#end-age"),
  assetListFile: document.querySelector("#asset-list-file"),
  assetTrendFile: document.querySelector("#asset-trend-file"),
  importButton: document.querySelector("#import-csv-button"),
  importStatus: document.querySelector("#import-status"),
  backupButton: document.querySelector("#backup-button"),
  restoreFile: document.querySelector("#restore-file"),
  seedSampleButton: document.querySelector("#seed-sample-button"),
  summaryStrip: document.querySelector("#summary-strip"),
  assetCardGrid: document.querySelector("#asset-card-grid"),
  dashboardWarningList: document.querySelector("#dashboard-warning-list"),
  researchWarningList: document.querySelector("#research-warning-list"),
  heroNetWorth: document.querySelector("#hero-net-worth"),
  heroFutureWorth: document.querySelector("#hero-future-worth"),
  heroShortage: document.querySelector("#hero-shortage"),
  phaseStartsForm: document.querySelector("#phase-starts-form"),
  cashflowPhaseSections: document.querySelector("#cashflow-phase-sections"),
  bondMetrics: document.querySelector("#bond-metrics"),
  bondTable: document.querySelector("#bond-table"),
  bondMaturedTable: document.querySelector("#bond-matured-table"),
  fundSettingsForm: document.querySelector("#fund-settings-form"),
  fundImportTable: document.querySelector("#fund-import-table"),
  stockSettingsForm: document.querySelector("#stock-settings-form"),
  stockImportTable: document.querySelector("#stock-import-table"),
  insuranceSettingsForm: document.querySelector("#insurance-settings-form"),
  insuranceTable: document.querySelector("#insurance-table"),
  dollarSettingsForm: document.querySelector("#dollar-settings-form"),
  dollarImportTable: document.querySelector("#dollar-import-table"),
  cashMetrics: document.querySelector("#cash-metrics"),
  cashBreakdownGrid: document.querySelector("#cash-breakdown-grid"),
  cashImportTable: document.querySelector("#cash-import-table"),
  pointsImportTable: document.querySelector("#points-import-table"),
  cashExcludedTable: document.querySelector("#cash-excluded-table"),
  pensionTable: document.querySelector("#pension-table"),
  loanTable: document.querySelector("#loan-table"),
  cardTable: document.querySelector("#card-table"),
  researchStrip: document.querySelector("#research-strip"),
  networthChart: document.querySelector("#networth-chart"),
  cashChart: document.querySelector("#cash-chart"),
  chartDetailPanel: document.querySelector("#chart-detail-panel"),
  timelineTable: document.querySelector("#timeline-table"),
  navButtons: [...document.querySelectorAll(".nav-chip")],
  viewPanels: [...document.querySelectorAll(".view-panel")],
};

bindEvents();
computeProjection();
renderApp();

function bindEvents() {
  document.addEventListener("focusin", trackFocusedControl, true);

  dom.navButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  dom.importButton.addEventListener("click", handleImportClick);
  dom.seedSampleButton.addEventListener("click", () => {
    seedSampleData();
    saveAndRender("入力例を反映しました。");
  });
  dom.backupButton.addEventListener("click", downloadBackup);
  dom.restoreFile.addEventListener("change", handleRestoreFile);

  bindReactiveInput(dom.birthDate, (event) => {
    state.profile.birthDate = event.target.value;
  });
  bindReactiveInput(dom.inflationRate, (event) => {
    state.assumptions.inflationRate = toNumber(event.target.value);
  });
  bindReactiveInput(dom.marketRiseAdjustmentRate, (event) => {
    state.assumptions.marketRiseAdjustmentRate = toNumber(event.target.value);
  });
  bindReactiveInput(dom.usdJpyRate, (event) => {
    state.assumptions.usdJpyRate = toNumber(event.target.value);
    state.assumptions.usdJpyRateSource = "manual";
    state.assumptions.usdJpyRateReferenceDate = "";
    state.assumptions.usdJpyRateFetchedAt = "";
  });
  bindReactiveInput(dom.endAge, (event) => {
    state.profile.endAge = Math.max(1, Math.round(toNumber(event.target.value)));
  });
  dom.fetchUsdJpyRateButton.addEventListener("click", fetchLatestUsdJpyRate);

  document.querySelector("#add-bond-row").addEventListener("click", () => {
    state.manual.bondAssets.push(createBondRow());
    saveAndRender();
  });
  document.querySelector("#sort-bond-rows").addEventListener("click", () => {
    sortBondAssetsByMaturity();
    saveAndRender("債券を償還日の早い順に並び替えました。");
  });
  document.querySelector("#add-insurance-row").addEventListener("click", () => {
    state.manual.insurancePolicies.push(createInsurancePolicy());
    saveAndRender();
  });
  document.querySelector("#add-pension-row").addEventListener("click", () => {
    state.manual.pensions.push(createPensionPlan());
    saveAndRender();
  });
  document.querySelector("#add-loan-row").addEventListener("click", () => {
    state.manual.loans.push(createLoan());
    saveAndRender();
  });
  document.querySelector("#add-card-row").addEventListener("click", () => {
    state.manual.cards.push(createCardDebt());
    saveAndRender();
  });
}

function bindReactiveInput(element, applyValue) {
  ["input", "change"].forEach((eventName) => {
    element.addEventListener(eventName, (event) => {
      applyValue(event);
      if (eventName === "change") {
        saveAndRender();
      } else {
        scheduleRender();
      }
    });
  });
}

function createDefaultState() {
  const phaseValues = {};
  PHASES.forEach((phase, index) => {
    phaseValues[phase.key] = {
      startAge: index === 0 ? 0 : [65, 68, 85][index - 1],
      retirementBonus: 0,
      incomes: INCOME_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: 0 }), {}),
      expenses: EXPENSE_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: 0 }), {}),
    };
  });

  return {
    version: APP_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      birthDate: "",
      endAge: 100,
    },
    assumptions: {
      inflationRate: 2,
      marketRiseAdjustmentRate: 1,
      usdJpyRate: 150,
      usdJpyRateSource: "manual",
      usdJpyRateReferenceDate: "",
      usdJpyRateFetchedAt: "",
      conservativeInflation: 3,
      conservativeReturnShift: -2,
      fxStressPercent: 10,
    },
    imports: {
      assetListRaw: "",
      assetTrendRaw: "",
      parsedAssetList: null,
      parsedAssetTrend: [],
      importedAt: null,
    },
    phaseValues,
    manual: {
      bondAssets: [],
      funds: { monthlyContribution: 0, expectedReturn: 4, endAge: 65 },
      stocks: { monthlyContribution: 0, expectedReturn: 5, endAge: 65 },
      insuranceSettings: { manualAdjustment: 0, expectedReturn: 0.5 },
      insurancePolicies: [],
      dollarSavings: { monthlyContribution: 0, expectedReturn: 0, endAge: 65 },
      pensions: [],
      loans: [],
      cards: [],
    },
    computed: {
      warnings: [],
      snapshot: null,
      timeline: [],
      summary: null,
    },
  };
}

function createBondRow(partial = {}) {
  return {
    id: generateId("bond"),
    name: "",
    institution: "",
    sourceCategory: "manual",
    type: "bond",
    currentValue: 0,
    currency: "JPY",
    faceValue: 0,
    currentPrice: 0,
    maturityDate: "",
    rate: 0,
    excludeFromCash: false,
    destination: "cash",
    notes: "",
    ...partial,
  };
}

function createInsurancePolicy(partial = {}) {
  return {
    id: generateId("insurance"),
    name: "",
    currentValue: 0,
    premiumPerMonth: 0,
    endMonth: "",
    memo: "",
    ...partial,
  };
}

function createPensionPlan(partial = {}) {
  return {
    id: generateId("pension"),
    name: "",
    currentValue: 0,
    startAge: 65,
    contributionPerMonth: 0,
    payoutType: "split",
    splitAmount: 0,
    lumpSumAmount: 0,
    memo: "",
    ...partial,
  };
}

function createLoan(partial = {}) {
  return {
    id: generateId("loan"),
    name: "",
    type: "住宅ローン",
    balance: 0,
    annualRate: 0,
    monthlyPayment: 0,
    bonusPayment: 0,
    bonusMonths: "6,12",
    endMonth: "",
    includedInExpenses: true,
    memo: "",
    ...partial,
  };
}

function createCardDebt(partial = {}) {
  return {
    id: generateId("card"),
    name: "",
    balance: 0,
    dueMonth: "",
    paymentType: "一括",
    monthlyPayment: 0,
    annualRate: 0,
    includedInExpenses: false,
    memo: "",
    ...partial,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return mergeWithDefault(JSON.parse(raw));
  } catch (error) {
    console.error(error);
    return createDefaultState();
  }
}

function mergeWithDefault(candidate) {
  const base = createDefaultState();
  return {
    ...base,
    ...candidate,
    profile: { ...base.profile, ...candidate.profile },
    assumptions: { ...base.assumptions, ...candidate.assumptions },
    imports: { ...base.imports, ...candidate.imports },
    manual: {
      ...base.manual,
      ...candidate.manual,
      funds: { ...base.manual.funds, ...(candidate.manual?.funds ?? {}) },
      stocks: { ...base.manual.stocks, ...(candidate.manual?.stocks ?? {}) },
      insuranceSettings: { ...base.manual.insuranceSettings, ...(candidate.manual?.insuranceSettings ?? {}) },
      dollarSavings: { ...base.manual.dollarSavings, ...(candidate.manual?.dollarSavings ?? {}) },
      bondAssets: [...(candidate.manual?.bondAssets ?? [])],
      insurancePolicies: [...(candidate.manual?.insurancePolicies ?? [])].filter(
        (row) => !(toNumber(row.currentValue) > 0 && !toNumber(row.premiumPerMonth) && !row.endMonth && !row.memo)
      ),
      pensions: [...(candidate.manual?.pensions ?? [])],
      loans: [...(candidate.manual?.loans ?? [])],
      cards: [...(candidate.manual?.cards ?? [])],
    },
    phaseValues: PHASES.reduce((acc, phase) => {
      acc[phase.key] = {
        ...base.phaseValues[phase.key],
        ...(candidate.phaseValues?.[phase.key] ?? {}),
        incomes: { ...base.phaseValues[phase.key].incomes, ...(candidate.phaseValues?.[phase.key]?.incomes ?? {}) },
        expenses: { ...base.phaseValues[phase.key].expenses, ...(candidate.phaseValues?.[phase.key]?.expenses ?? {}) },
      };
      return acc;
    }, {}),
    computed: { ...base.computed, ...candidate.computed },
  };
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveAndRender(statusMessage = "") {
  if (pendingRenderFrame) {
    cancelAnimationFrame(pendingRenderFrame);
    pendingRenderFrame = 0;
  }
  const focusSnapshot = captureFocusSnapshot();
  computeProjection();
  saveState();
  renderApp(statusMessage);
  restoreFocusSnapshot(focusSnapshot);
}

function scheduleRender(statusMessage = "") {
  if (pendingRenderFrame) return;
  pendingRenderFrame = requestAnimationFrame(() => {
    pendingRenderFrame = 0;
    saveAndRender(statusMessage);
  });
}

function trackFocusedControl(event) {
  const descriptor = describeFocusableElement(event.target);
  if (descriptor) {
    lastFocusedControl = descriptor;
  }
}

function captureFocusSnapshot() {
  const activeDescriptor = describeFocusableElement(document.activeElement);
  return activeDescriptor || lastFocusedControl;
}

function restoreFocusSnapshot(snapshot) {
  if (!snapshot) return;
  const target = findFocusableElement(snapshot);
  if (!target) return;
  target.focus({ preventScroll: true });
  if (
    typeof snapshot.value === "string" &&
    (
      (target instanceof HTMLInputElement && ["text", "search", "tel", "url", "email", "password"].includes(target.type)) ||
      target instanceof HTMLTextAreaElement
    )
  ) {
    target.value = snapshot.value;
  }

  if (
    typeof snapshot.selectionStart === "number" &&
    typeof snapshot.selectionEnd === "number" &&
    typeof target.setSelectionRange === "function"
  ) {
    target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  }
}

function describeFocusableElement(element) {
  if (!(element instanceof HTMLElement)) return null;
  if (!["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(element.tagName)) return null;

  const descriptor = {
    tagName: element.tagName.toLowerCase(),
  };

  if (element.id) descriptor.id = element.id;
  if (element.name) descriptor.name = element.name;

  const datasetEntries = Object.entries(element.dataset ?? {}).filter(([, value]) => value !== "");
  if (datasetEntries.length) descriptor.dataset = Object.fromEntries(datasetEntries);

  if (typeof element.selectionStart === "number" && typeof element.selectionEnd === "number") {
    descriptor.selectionStart = element.selectionStart;
    descriptor.selectionEnd = element.selectionEnd;
  }
  if (
    (element instanceof HTMLInputElement && ["text", "search", "tel", "url", "email", "password"].includes(element.type)) ||
    element instanceof HTMLTextAreaElement
  ) {
    descriptor.value = element.value;
  }

  if (!descriptor.id && !descriptor.name && !descriptor.dataset) return null;
  return descriptor;
}

function findFocusableElement(snapshot) {
  if (snapshot.id) {
    return document.getElementById(snapshot.id);
  }

  let selector = snapshot.tagName || "input";
  if (snapshot.name) {
    selector += `[name="${escapeSelectorValue(snapshot.name)}"]`;
  }

  Object.entries(snapshot.dataset ?? {}).forEach(([key, value]) => {
    selector += `[data-${datasetKeyToAttribute(key)}="${escapeSelectorValue(value)}"]`;
  });

  return document.querySelector(selector);
}

function datasetKeyToAttribute(key) {
  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function escapeSelectorValue(value) {
  if (window.CSS?.escape) return window.CSS.escape(String(value));
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function renderApp(statusMessage = "") {
  renderTopForm();
  renderSummaryStrip();
  renderAssetCards();
  renderPhaseStartsForm();
  renderCashflowSections();
  renderCashSection();
  renderBondSection();
  renderFundsSection();
  renderStocksSection();
  renderInsuranceSection();
  renderDollarSection();
  renderPensionSection();
  renderDebtSection();
  renderResearchSection();
  renderWarnings();
  renderImportStatus(statusMessage);
  enhanceMoneyInputs();
  switchView(currentView, true);
}

function enhanceMoneyInputs() {
  const selectors = [
    "[data-phase-field]",
    "[data-retirement-bonus]",
    "#fund-monthly",
    "#stock-monthly",
    "#insurance-adjustment",
    "#dollar-monthly",
    "[data-bond-id][data-key=\"faceValue\"]",
    "[data-insurance-id][data-key=\"premiumPerMonth\"]",
    "[data-pension-id][data-key=\"currentValue\"]",
    "[data-pension-id][data-key=\"contributionPerMonth\"]",
    "[data-pension-id][data-key=\"splitAmount\"]",
    "[data-pension-id][data-key=\"lumpSumAmount\"]",
    "[data-loan-id][data-key=\"balance\"]",
    "[data-loan-id][data-key=\"monthlyPayment\"]",
    "[data-loan-id][data-key=\"bonusPayment\"]",
    "[data-card-id][data-key=\"balance\"]",
    "[data-card-id][data-key=\"monthlyPayment\"]",
  ];
  document.querySelectorAll(selectors.join(", ")).forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.type = "text";
    input.inputMode = "decimal";
    input.dataset.inputKind = "money";
    input.autocomplete = "off";
    input.spellcheck = false;
    if (document.activeElement !== input) {
      input.value = formatMoneyInputValue(input.value);
    }
  });
}

function renderTopForm() {
  dom.birthDate.value = state.profile.birthDate;
  dom.inflationRate.value = state.assumptions.inflationRate ?? 2;
  dom.marketRiseAdjustmentRate.value = state.assumptions.marketRiseAdjustmentRate ?? 1;
  dom.usdJpyRate.value = state.assumptions.usdJpyRate ?? 150;
  dom.endAge.value = state.profile.endAge ?? 100;
  renderUsdJpyRateStatus();
}

function renderUsdJpyRateStatus(overrideMessage = "") {
  if (!dom.usdJpyRateStatus) return;
  if (overrideMessage) {
    dom.usdJpyRateStatus.textContent = overrideMessage;
    return;
  }

  if (state.assumptions.usdJpyRateSource === "frankfurter" && state.assumptions.usdJpyRateFetchedAt) {
    const referenceDate = state.assumptions.usdJpyRateReferenceDate
      ? formatSimpleDate(state.assumptions.usdJpyRateReferenceDate)
      : "不明";
    dom.usdJpyRateStatus.textContent = `最新公表日: ${referenceDate} / 取得: ${formatDateTime(state.assumptions.usdJpyRateFetchedAt)} / 出典: Frankfurter`;
    return;
  }

  dom.usdJpyRateStatus.textContent = "手入力値です。必要なら最新公表レートを取得できます。";
}

function setUsdJpyRateFetchPending(isPending) {
  if (!dom.fetchUsdJpyRateButton) return;
  dom.fetchUsdJpyRateButton.disabled = isPending;
  dom.fetchUsdJpyRateButton.textContent = isPending ? "取得中..." : "最新レート取得";
}

async function fetchLatestUsdJpyRate() {
  setUsdJpyRateFetchPending(true);
  renderUsdJpyRateStatus("USD/JPY の最新公表レートを取得しています...");

  try {
    const response = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const latestRate = toNumber(data?.rates?.JPY);
    if (!(latestRate > 0)) {
      throw new Error("USD/JPY レートが取得できませんでした。");
    }

    state.assumptions.usdJpyRate = latestRate;
    state.assumptions.usdJpyRateSource = "frankfurter";
    state.assumptions.usdJpyRateReferenceDate = String(data?.date ?? "");
    state.assumptions.usdJpyRateFetchedAt = new Date().toISOString();
    saveAndRender(`USD/JPY レートを ${formatDecimal(latestRate, 2)} 円/USD に更新しました。`);
  } catch (error) {
    console.error(error);
    renderUsdJpyRateStatus(`取得に失敗しました。手入力値を使用してください。${error?.message ? ` (${error.message})` : ""}`);
  } finally {
    setUsdJpyRateFetchPending(false);
  }
}

function renderImportStatus(statusMessage = "") {
  const importedAt = state.imports.importedAt ? formatDateTime(state.imports.importedAt) : "未読込";
  dom.importStatus.textContent =
    statusMessage ||
    `資産一覧: ${state.imports.assetListRaw ? "読込済み" : "未読込"} / 資産推移: ${state.imports.assetTrendRaw ? "読込済み" : "未読込"} / 更新: ${importedAt}`;
}

function renderSummaryStrip() {
  const snapshot = state.computed.snapshot;
  const summary = state.computed.summary;
  const futureAgeLabel = `${formatAge(state.profile.endAge || 100)}時点`;
  if (dom.summaryStrip) {
    const cards = [
      {
        label: "使える現金",
        value: snapshot ? formatCurrency(snapshot.effectiveCash) : "--",
        note: snapshot ? `${formatCurrency(snapshot.pointsAsCash)} をポイントから加算` : "",
      },
      {
        label: "債券扱い資産",
        value: snapshot ? formatCurrency(snapshot.bondLikeAssets) : "--",
        note: snapshot ? `平均利率 ${formatPercent(snapshot.averageBondRate)}` : "",
      },
      {
        label: "負債合計",
        value: summary ? formatCurrency(summary.currentDebt) : "--",
        note: summary ? `純資産 ${formatCurrency(summary.currentNetWorth)}` : "",
      },
      {
        label: "100歳時点の純資産",
        value: summary ? formatCurrency(summary.futureNetWorth) : "--",
        note: summary?.firstShortageMonth ? `不足月 ${summary.firstShortageMonth}` : "不足なし",
      },
    ];
    cards[cards.length - 1].label = `${futureAgeLabel}の純資産`;

    dom.summaryStrip.innerHTML = cards
      .map(
        (card) => `
          <div class="summary-card">
            <span class="label">${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(card.value)}</strong>
            <p class="inline-note">${escapeHtml(card.note || "")}</p>
          </div>
        `
      )
      .join("");
  }

  dom.heroNetWorth.textContent = summary ? formatCurrency(summary.currentNetWorth) : "--";
  dom.heroFutureWorth.textContent = summary ? formatCurrency(summary.futureNetWorth) : "--";
  if (dom.heroFutureWorth?.previousElementSibling) {
    dom.heroFutureWorth.previousElementSibling.textContent = futureAgeLabel;
  }
  dom.heroShortage.textContent = summary?.firstShortageMonth || "なし";
}

function renderAssetCards() {
  const snapshot = state.computed.snapshot;
  if (!snapshot) {
    dom.assetCardGrid.innerHTML = `
      <div class="asset-card">
        <p>CSVを読み込むと、初期残高と詳細画面への移動ボタンを表示します。</p>
      </div>
    `;
    return;
  }

  const cards = [
    { label: "現金", value: snapshot.importedCashTotal + snapshot.pointsAsCash, view: "dashboard", note: "取込ベースの現金カテゴリとポイント" },
    { label: "使える現金", value: snapshot.effectiveCash, view: "dashboard", note: "現金から除外した資産を差し引いた残高" },
    { label: "債券", value: snapshot.bondLikeAssets, view: "bonds", note: "現金から除外する資産を含む" },
    { label: "投資信託・ETF", value: snapshot.fundsBalance, view: "funds", note: "CSVから取得した現在残高" },
    { label: "株式", value: snapshot.stocksBalance, view: "stocks", note: "個別株の現在残高" },
    { label: "保険", value: snapshot.insuranceBalance, view: "insurance", note: "CSV保険残高と手動調整ベース" },
    { label: "ドル積立", value: snapshot.dollarBalance, view: "dollar", note: "USD/JPY現在レート固定で円換算" },
    { label: "年金", value: snapshot.pensionBalance, view: "pension", note: "開始年齢と受給条件は手入力" },
    { label: "負債", value: state.computed.summary?.currentDebt ?? 0, view: "debt", note: "純資産計算に使用" },
  ];

  cards[0].view = "cash";
  cards[1].view = "cash";

  dom.assetCardGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="asset-card">
          <p>${escapeHtml(card.label)}</p>
          <strong>${formatCurrency(card.value)}</strong>
          <p>${escapeHtml(card.note)}</p>
          <button type="button" class="ghost-button" data-open-view="${escapeHtml(card.view)}">詳細を開く</button>
        </article>
      `
    )
    .join("");

  dom.assetCardGrid.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.openView));
  });
}

function renderCashSection() {
  if (!dom.cashMetrics || !dom.cashBreakdownGrid || !dom.cashImportTable || !dom.pointsImportTable || !dom.cashExcludedTable) return;

  const snapshot = state.computed.snapshot;
  const sections = state.imports.parsedAssetList?.sections ?? {};
  const cashSection = sections["預金・現金・暗号資産"];
  const pointsSection = sections["ポイント・マイル"];
  const dollarManagedItems = getDollarManagedCashItems(sections);
  const excludedBondRows = state.manual.bondAssets.filter((row) => row.excludeFromCash);
  const excludedBondTotal = excludedBondRows.reduce((sum, row) => sum + getBondDisplayValue(row), 0);
  const rawCashValue = snapshot ? snapshot.importedCashTotal + snapshot.pointsAsCash : 0;

  dom.cashMetrics.innerHTML = `
    <div class="metric-box">
      <span class="label">現金</span>
      <strong>${snapshot ? formatCurrency(rawCashValue) : "--"}</strong>
    </div>
    <div class="metric-box">
      <span class="label">使える現金</span>
      <strong>${snapshot ? formatCurrency(snapshot.effectiveCash) : "--"}</strong>
    </div>
    <div class="metric-box">
      <span class="label">ポイント</span>
      <strong>${snapshot ? formatCurrency(snapshot.pointsAsCash) : "--"}</strong>
    </div>
    <div class="metric-box">
      <span class="label">現金から除外</span>
      <strong>${snapshot ? formatCurrency(snapshot.cashExcludedTotal) : "--"}</strong>
    </div>
  `;

  dom.cashBreakdownGrid.innerHTML = snapshot
    ? `
        <section class="cash-breakdown-card">
          <h3>現金の内訳</h3>
          <p class="inline-note">インポートされた現金カテゴリとポイントの合計です。</p>
          <div class="asset-detail-list">
            <div class="asset-detail-row">
              <span>インポートされた現金カテゴリ</span>
              <strong>${formatCurrency(snapshot.importedCashTotal)}</strong>
            </div>
            <div class="asset-detail-row">
              <span>ポイント</span>
              <strong>${formatCurrency(snapshot.pointsAsCash)}</strong>
            </div>
          </div>
          <div class="asset-detail-total">
            <span>現金</span>
            <strong>${formatCurrency(rawCashValue)}</strong>
          </div>
        </section>
        <section class="cash-breakdown-card">
          <h3>使える現金の内訳</h3>
          <p class="inline-note">現金カテゴリとポイントから、現金として使わない資産を差し引いた残高です。</p>
          <div class="asset-detail-list">
            <div class="asset-detail-row">
              <span>インポートされた現金カテゴリ</span>
              <strong>${formatCurrency(snapshot.importedCashTotal)}</strong>
            </div>
            <div class="asset-detail-row">
              <span>ポイント</span>
              <strong class="is-positive">${formatSignedCurrency(snapshot.pointsAsCash)}</strong>
            </div>
            <div class="asset-detail-row">
              <span>現金から除外している資産</span>
              <strong class="is-negative">${formatSignedCurrency(-snapshot.cashExcludedTotal)}</strong>
            </div>
          </div>
          <div class="asset-detail-sublist">
            <div class="asset-detail-subrow">
              <span>内訳: 債券扱い資産など</span>
              <strong>${formatCurrency(excludedBondTotal)}</strong>
            </div>
            <div class="asset-detail-subrow">
              <span>内訳: ドル資産として別管理</span>
              <strong>${formatCurrency(snapshot.dollarBalance)}</strong>
            </div>
          </div>
          <div class="asset-detail-total">
            <span>使える現金</span>
            <strong>${formatCurrency(snapshot.effectiveCash)}</strong>
          </div>
        </section>
      `
    : `
        <section class="cash-breakdown-card">
          <p>CSV を読み込むと、現金と使える現金の内訳をここに表示します。</p>
        </section>
      `;

  dom.cashImportTable.innerHTML = renderImportedSectionTable(cashSection, {
    fallbackColumns: ["種類・名称", "残高", "保有金融機関"],
    extraColumns: [{ label: "アプリ内での扱い", render: (item) => getCashItemHandlingLabel(item) }],
  });
  dom.pointsImportTable.innerHTML = renderImportedSectionTable(pointsSection, {
    fallbackColumns: ["名称", "現在の価値"],
  });
  dom.cashExcludedTable.innerHTML = renderCashExcludedTable(excludedBondRows, dollarManagedItems, snapshot);
}

function renderImportedSectionTable(section, options = {}) {
  const rows = section?.items ?? [];
  const inferredColumns = section?.headers?.length ? [...section.headers] : Object.keys(rows[0] ?? {});
  const columns = inferredColumns.length ? inferredColumns : [...(options.fallbackColumns ?? [])];
  const extraColumns = options.extraColumns ?? [];
  const allColumns = [...columns, ...extraColumns.map((column) => column.label)];

  if (!allColumns.length) {
    return `
      <thead><tr><th>項目</th></tr></thead>
      <tbody><tr><td>表示できる明細がありません。</td></tr></tbody>
    `;
  }

  if (!rows.length) {
    return `
      <thead><tr>${allColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
      <tbody><tr><td colspan="${allColumns.length}">表示できる明細がありません。</td></tr></tbody>
    `;
  }

  return `
    <thead><tr>${allColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows
        .map(
          (row) => `
            <tr>
              ${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}
              ${extraColumns.map((column) => `<td>${escapeHtml(column.render(row))}</td>`).join("")}
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;
}

function getCashItemHandlingLabel(item) {
  const name = String(item["種類・名称"] ?? "");
  const institution = String(item["保有金融機関"] ?? "");
  const matcher = `${name}${institution}`;
  if (isDollarManagedCashItem(item)) return "現金から除外し、ドル資産として別管理";
  if (/ビットコイン|Mona|円仕組/i.test(matcher)) return "現金から除外";
  return "現金として計上";
}

function renderCashExcludedTable(rows, dollarManagedItems, snapshot) {
  const detailRows = rows.map((row) => ({
    name: row.name || "除外資産",
    amount: getBondDisplayValue(row),
    institution: row.institution || "-",
    source: getCashExcludedSourceLabel(row),
    handling: row.destination === "dollar" ? "ドル資産として別管理" : "現金から除外",
  }));

  if (dollarManagedItems.length) {
    detailRows.push(
      ...dollarManagedItems.map((item) => ({
        name: item["種類・名称"] || "ドル資産",
        amount: parseMoney(item["残高"]),
        institution: item["保有金融機関"] || "-",
        source: "現金カテゴリ",
        handling: "ドル資産として別管理",
      }))
    );
  } else if (snapshot?.dollarBalance) {
    detailRows.push({
      name: "ドル資産として別管理している残高",
      amount: snapshot.dollarBalance,
      institution: "-",
      source: "現金カテゴリ",
      handling: "使える現金では別管理",
    });
  }

  if (!detailRows.length) {
    return `
      <thead>
        <tr>
          <th>資産名</th>
          <th>金額</th>
          <th>保有先</th>
          <th>取込元</th>
          <th>扱い</th>
        </tr>
      </thead>
      <tbody><tr><td colspan="5">現金から除外している資産はありません。</td></tr></tbody>
    `;
  }

  return `
    <thead>
      <tr>
        <th>資産名</th>
        <th>金額</th>
        <th>保有先</th>
        <th>取込元</th>
        <th>扱い</th>
      </tr>
    </thead>
    <tbody>
      ${detailRows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.name)}</td>
              <td>${escapeHtml(formatCurrency(row.amount))}</td>
              <td>${escapeHtml(row.institution)}</td>
              <td>${escapeHtml(row.source)}</td>
              <td>${escapeHtml(row.handling)}</td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;
}

function getCashExcludedSourceLabel(row) {
  if (row.sourceCategory === "cash") return "現金カテゴリ";
  if (row.sourceCategory === "bonds") return "債券";
  if (row.sourceCategory === "other") return "その他の資産";
  return "手入力";
}

function renderWarnings() {
  const warnings = state.computed.warnings;
  const markup = warnings.length
    ? warnings
        .map(
          (warning) => `
            <div class="warning-card">
              <p><strong>${escapeHtml(warning.location)}</strong>${escapeHtml(warning.message)}</p>
            </div>
          `
        )
        .join("")
    : `<div class="warning-card"><p><strong>良好</strong>CSVからの不足項目や警告はありません。</p></div>`;

  dom.dashboardWarningList.innerHTML = markup;
  dom.researchWarningList.innerHTML = markup;
}

function renderPhaseStartsForm() {
  dom.phaseStartsForm.innerHTML = PHASES.slice(1)
    .map((phase) => {
      const values = state.phaseValues[phase.key];
      if (phase.key === "retired") {
        return `
          <div class="phase-start-pair-card">
            <div class="phase-start-pair">
              <label class="field">
                <span>${escapeHtml(phase.label)}開始年齢</span>
                <input type="number" min="0" max="120" step="1" data-phase-start="${escapeHtml(phase.key)}" value="${escapeHtml(String(values.startAge))}">
              </label>
              <label class="field">
                <span>退職金</span>
                ${renderMoneyInput(`data-retirement-bonus="retired"`, values.retirementBonus ?? 0)}
              </label>
            </div>
          </div>
        `;
      }

      return `
        <label class="field">
          <span>${escapeHtml(phase.label)}開始年齢</span>
          <input type="number" min="0" max="120" step="1" data-phase-start="${escapeHtml(phase.key)}" value="${escapeHtml(String(values.startAge))}">
        </label>
      `;
    })
    .join("");

  dom.phaseStartsForm.querySelectorAll("[data-phase-start]").forEach((input) => {
    const handler = (event) => {
      const key = event.target.dataset.phaseStart;
      state.phaseValues[key].startAge = Math.max(0, Math.round(toNumber(event.target.value)));
      if (event.type === "change") {
        saveAndRender();
      } else {
        scheduleRender();
      }
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });

  dom.phaseStartsForm.querySelectorAll("[data-retirement-bonus]").forEach((input) => {
    const handler = (event) => {
      const key = event.target.dataset.retirementBonus;
      state.phaseValues[key].retirementBonus = Math.max(0, parseMoney(event.target.value));
      if (event.type === "change") {
        saveAndRender();
      } else {
        scheduleRender();
      }
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });
}

function renderCashflowSections() {
  dom.cashflowPhaseSections.innerHTML = PHASES.map((phase, index) => {
    const values = state.phaseValues[phase.key];
    const previousPhase = index > 0 ? PHASES[index - 1] : null;
    const totalIncome = sumValues(values.incomes);
    const totalExpenses = sumValues(values.expenses);
    const monthlyBalance = totalIncome - totalExpenses;
    const forecastSummary = getPhaseForecastSummary(phase.key, monthlyBalance);
    const incomes = INCOME_FIELDS.map((field) =>
      renderPhaseMoneyField({
        label: field.label,
        phaseKey: phase.key,
        kind: "income",
        fieldKey: field.key,
        value: values.incomes[field.key] ?? 0,
        previousPhaseLabel: previousPhase?.label ?? "",
        previousValue: previousPhase ? state.phaseValues[previousPhase.key].incomes[field.key] ?? 0 : null,
      })
    ).join("");

    const expenses = EXPENSE_FIELDS.map((field) =>
      renderPhaseMoneyField({
        label: field.label,
        phaseKey: phase.key,
        kind: "expense",
        fieldKey: field.key,
        value: values.expenses[field.key] ?? 0,
        previousPhaseLabel: previousPhase?.label ?? "",
        previousValue: previousPhase ? state.phaseValues[previousPhase.key].expenses[field.key] ?? 0 : null,
      })
    ).join("");

    return `
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Phase</p>
            <h2>${escapeHtml(phase.label)}</h2>
          </div>
          <span class="pill">月額入力</span>
        </div>
        <div class="form-grid form-grid-4">
          ${renderLabeledMetric("収入合計", formatCurrency(totalIncome))}
          ${renderLabeledMetric("支出合計", formatCurrency(totalExpenses))}
          ${renderLabeledMetric("月次収支（基本）", formatCurrency(monthlyBalance))}
        </div>
        ${renderCashflowForecastSummary(forecastSummary)}
        <h3>収入</h3>
        <div class="form-grid form-grid-4">${incomes}</div>
        <h3>支出</h3>
        <div class="form-grid form-grid-4">${expenses}</div>
      </article>
    `;
  }).join("");

  dom.cashflowPhaseSections.querySelectorAll("[data-phase-field]").forEach((input) => {
    const handler = (event) => {
      const phaseKey = event.target.dataset.phaseField;
      const kind = event.target.dataset.kind;
      const key = event.target.dataset.key;
      const bucket = kind === "income" ? state.phaseValues[phaseKey].incomes : state.phaseValues[phaseKey].expenses;
      bucket[key] = parseMoney(event.target.value);
      if (event.type === "change") {
        saveAndRender();
      } else {
        scheduleRender();
      }
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });
}

function renderPhaseMoneyField({ label, phaseKey, kind, fieldKey, value, previousPhaseLabel = "", previousValue = null }) {
  const reference = previousPhaseLabel
    ? `<span class="phase-field-reference">${escapeHtml(previousPhaseLabel)} ${escapeHtml(formatCurrency(previousValue ?? 0))}</span>`
    : "";
  return `
    <label class="field phase-field">
      <span>${escapeHtml(label)}</span>
      <div class="phase-field-control">
        ${renderMoneyInput(`data-phase-field="${escapeHtml(phaseKey)}" data-kind="${escapeHtml(kind)}" data-key="${escapeHtml(fieldKey)}"`, value)}
        ${reference}
      </div>
    </label>
  `;
}

function getPhaseForecastSummary(phaseKey, baseMonthlyBalance) {
  const phase = PHASES.find((item) => item.key === phaseKey);
  const timeline = state.computed.timeline;
  if (!phase || !timeline.length) {
    return { startMonthLabel: "", actualCashDelta: null, adjustmentDelta: null };
  }

  const firstIndex = timeline.findIndex((row) => row.phaseLabel === phase.label);
  if (firstIndex === -1) {
    return { startMonthLabel: "", actualCashDelta: null, adjustmentDelta: null };
  }

  const openingCash = firstIndex > 0 ? timeline[firstIndex - 1].effectiveCash : (state.computed.snapshot?.effectiveCash ?? 0);
  const actualCashDelta = timeline[firstIndex].effectiveCash - openingCash;

  return {
    startMonthLabel: timeline[firstIndex].monthLabel,
    actualCashDelta,
    adjustmentDelta: actualCashDelta - baseMonthlyBalance,
  };
}

function renderCashflowForecastSummary(summary) {
  if (!summary.startMonthLabel) {
    return `
      <div class="inline-note">このフェーズに該当する予測月はありません。</div>
    `;
  }

  return `
    <div class="inline-note">月次収支（基本）に、積立・保険・年金・返済などを反映した開始月の結果です。</div>
    <div class="form-grid form-grid-2">
      ${renderLabeledMetric("実際の現金増減（開始月）", summary.actualCashDelta === null ? "--" : formatCurrency(summary.actualCashDelta))}
      ${renderLabeledMetric("追加反映分（積立・保険・返済など）", summary.adjustmentDelta === null ? "--" : formatCurrency(summary.adjustmentDelta))}
    </div>
    <p class="inline-note">${escapeHtml(summary.startMonthLabel)} 時点の予測値です。</p>
  `;
}

function renderBondSection() {
  const snapshot = state.computed.snapshot;
  const simulationStartDate = getSimulationStartDate();
  const activeRows = state.manual.bondAssets.filter((row) => !isBondMaturedOnOrBefore(row, simulationStartDate));
  const maturedRows = state.manual.bondAssets.filter((row) => isBondMaturedOnOrBefore(row, simulationStartDate));
  const averageRate = snapshot ? snapshot.averageBondRate : 0;
  const metrics = [
    { label: "債券扱い合計", value: snapshot ? snapshot.bondLikeAssets : 0 },
    { label: "現金から除外", value: snapshot ? snapshot.cashExcludedTotal : 0 },
    { label: "平均利率", value: formatPercent(averageRate) },
    { label: "償還済み件数", value: maturedRows.length.toString() },
  ];

  dom.bondMetrics.innerHTML = metrics
    .map(
      (metric) => `
        <div class="metric-box">
          <span class="label">${escapeHtml(metric.label)}</span>
          <strong>${typeof metric.value === "string" ? escapeHtml(metric.value) : formatCurrency(metric.value)}</strong>
        </div>
      `
    )
    .join("");

  dom.bondTable.innerHTML = `
    <thead>
      <tr>
        <th>名称</th>
        <th>保有金融機関</th>
        <th>区分</th>
        <th>現金から除外</th>
        <th>通貨</th>
        <th>保有額面</th>
        <th>現在値</th>
        <th>円評価額</th>
        <th>償還日</th>
        <th>利率(年)</th>
        <th>償還先</th>
        <th>削除</th>
      </tr>
    </thead>
    <tbody>
      ${activeRows
        .map(
          (row) => `
            <tr>
              <td><input data-bond-id="${escapeHtml(row.id)}" data-key="name" value="${escapeHtml(row.name)}"></td>
              <td><input data-bond-id="${escapeHtml(row.id)}" data-key="institution" value="${escapeHtml(row.institution)}"></td>
              <td>
                <select data-bond-id="${escapeHtml(row.id)}" data-key="type">
                  ${[
                    ["bond", "債券"],
                    ["foreign", "外貨"],
                    ["volatile", "金・暗号資産"],
                    ["locked", "その他長期資産"],
                  ]
                    .map(([value, label]) => `<option value="${value}" ${row.type === value ? "selected" : ""}>${label}</option>`)
                    .join("")}
                </select>
              </td>
              <td><input type="checkbox" data-bond-id="${escapeHtml(row.id)}" data-key="excludeFromCash" ${row.excludeFromCash ? "checked" : ""}></td>
              <td>
                <select data-bond-id="${escapeHtml(row.id)}" data-key="currency">
                  ${["JPY", "USD", "OTHER"].map((code) => `<option value="${code}" ${row.currency === code ? "selected" : ""}>${code}</option>`).join("")}
                </select>
              </td>
              <td><input type="number" step="0.0001" data-bond-id="${escapeHtml(row.id)}" data-key="faceValue" value="${escapeHtml(String(row.faceValue ?? 0))}"></td>
              <td><input type="number" step="0.0001" data-bond-id="${escapeHtml(row.id)}" data-key="currentPrice" value="${escapeHtml(String(row.currentPrice ?? 0))}"></td>
              <td class="mono">${formatCurrency(getBondDisplayValue(row))}</td>
              <td><input type="date" data-bond-id="${escapeHtml(row.id)}" data-key="maturityDate" value="${escapeHtml(row.maturityDate || "")}"></td>
              <td><input type="number" step="0.01" data-bond-id="${escapeHtml(row.id)}" data-key="rate" value="${escapeHtml(String(row.rate ?? 0))}"></td>
              <td>
                <select data-bond-id="${escapeHtml(row.id)}" data-key="destination">
                  ${[
                    ["cash", "現金"],
                    ["dollar", "ドル"],
                    ["keep", "残す"],
                  ]
                    .map(([value, label]) => `<option value="${value}" ${row.destination === value ? "selected" : ""}>${label}</option>`)
                    .join("")}
                </select>
              </td>
              <td><button type="button" class="danger-cell-button" data-remove-bond="${escapeHtml(row.id)}">削除</button></td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;

  dom.bondMaturedTable.innerHTML = `
    <thead>
      <tr>
        <th>名称</th>
        <th>円評価額</th>
        <th>償還日</th>
      </tr>
    </thead>
    <tbody>
      ${
        maturedRows.length
          ? maturedRows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.name)}</td>
                    <td>${formatCurrency(getBondDisplayValue(row))}</td>
                    <td>${escapeHtml(row.maturityDate || "")}</td>
                  </tr>
                `
              )
              .join("")
          : `<tr><td colspan="3">まだありません。</td></tr>`
      }
    </tbody>
  `;

  dom.bondTable.querySelectorAll("[data-bond-id]").forEach((input) => {
    input.addEventListener("input", handleBondInput);
    input.addEventListener("change", handleBondInput);
  });
  dom.bondTable.querySelectorAll("[data-remove-bond]").forEach((button) => {
    button.addEventListener("click", () => {
      state.manual.bondAssets = state.manual.bondAssets.filter((row) => row.id !== button.dataset.removeBond);
      saveAndRender();
    });
  });
}

function handleBondInput(event) {
  const id = event.target.dataset.bondId;
  const key = event.target.dataset.key;
  const row = state.manual.bondAssets.find((item) => item.id === id);
  if (!row) return;
  row[key] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  if (key === "faceValue" || key === "currentValue") {
    row[key] = parseMoney(row[key]);
  }
  if (key === "currentPrice" || key === "rate") {
    row[key] = toNumber(row[key]);
  }
  if (row.faceValue > 0 && row.currentPrice > 0) {
    row.currentValue = row.faceValue * row.currentPrice;
  }
  if (event.type === "change") {
    saveAndRender();
  } else {
    scheduleRender();
  }
}

function renderFundsSection() {
  const snapshot = state.computed.snapshot;
  const effectiveReturn = toNumber(state.manual.funds.expectedReturn) + toNumber(state.assumptions.marketRiseAdjustmentRate);
  dom.fundSettingsForm.innerHTML = `
    ${renderLabeledMetric("残高", snapshot ? formatCurrency(snapshot.fundsBalance) : "--")}
    ${renderNumericField("月々の積立額", "fund-monthly", state.manual.funds.monthlyContribution)}
    ${renderNumericField("想定利回り（年）", "fund-return", state.manual.funds.expectedReturn, 0.1)}
    ${renderLabeledMetric("実効想定利回り（年）", formatPercent(effectiveReturn))}
    ${renderNumericField("積立終了年齢", "fund-end-age", state.manual.funds.endAge, 1)}
  `;
  bindSimpleNumericInput("#fund-monthly", "manual.funds.monthlyContribution", parseMoney);
  bindSimpleNumericInput("#fund-return", "manual.funds.expectedReturn");
  bindSimpleNumericInput("#fund-end-age", "manual.funds.endAge");

  const rows = state.imports.parsedAssetList?.sections?.["投資信託"]?.items ?? [];
  dom.fundImportTable.innerHTML = renderImportedSimpleTable(rows, ["銘柄名", "評価額", "保有金融機関"]);
}

function renderStocksSection() {
  const snapshot = state.computed.snapshot;
  const effectiveReturn = toNumber(state.manual.stocks.expectedReturn) + toNumber(state.assumptions.marketRiseAdjustmentRate);
  dom.stockSettingsForm.innerHTML = `
    ${renderLabeledMetric("残高", snapshot ? formatCurrency(snapshot.stocksBalance) : "--")}
    ${renderNumericField("月々の積立額", "stock-monthly", state.manual.stocks.monthlyContribution)}
    ${renderNumericField("想定利回り（年）", "stock-return", state.manual.stocks.expectedReturn, 0.1)}
    ${renderLabeledMetric("実効想定利回り（年）", formatPercent(effectiveReturn))}
    ${renderNumericField("積立終了年齢", "stock-end-age", state.manual.stocks.endAge, 1)}
  `;
  bindSimpleNumericInput("#stock-monthly", "manual.stocks.monthlyContribution", parseMoney);
  bindSimpleNumericInput("#stock-return", "manual.stocks.expectedReturn");
  bindSimpleNumericInput("#stock-end-age", "manual.stocks.endAge");

  const rows = state.imports.parsedAssetList?.sections?.["株式（現物）"]?.items ?? [];
  dom.stockImportTable.innerHTML = renderImportedSimpleTable(rows, ["銘柄コード", "銘柄名", "評価額", "保有金融機関"]);
}

function renderInsuranceSection() {
  const snapshot = state.computed.snapshot;
  dom.insuranceSettingsForm.innerHTML = `
    ${renderLabeledMetric("合計残高", snapshot ? formatCurrency(snapshot.insuranceBalance) : "--")}
    ${renderNumericField("手動調整額", "insurance-adjustment", state.manual.insuranceSettings.manualAdjustment)}
    ${renderNumericField("想定利回り（年）", "insurance-return", state.manual.insuranceSettings.expectedReturn, 0.1)}
    <div class="field"><span>計算式</span><div class="pill">元保険残高 + 手動調整 + 積立 + 利回り</div></div>
    <div class="field"><span>補足</span><div class="pill">元保険残高はCSV合計、調整差分は手動調整額で反映</div></div>
  `;
  bindSimpleNumericInput("#insurance-adjustment", "manual.insuranceSettings.manualAdjustment", parseMoney);
  bindSimpleNumericInput("#insurance-return", "manual.insuranceSettings.expectedReturn");

  dom.insuranceTable.innerHTML = `
    <thead>
      <tr>
        <th>名称</th>
        <th>保険料(円/月)</th>
        <th>終了年月</th>
        <th>メモ</th>
        <th>削除</th>
      </tr>
    </thead>
    <tbody>
      ${state.manual.insurancePolicies
        .map(
          (row) => `
            <tr>
              <td><input data-insurance-id="${escapeHtml(row.id)}" data-key="name" value="${escapeHtml(row.name)}"></td>
              <td><input type="number" step="1" data-insurance-id="${escapeHtml(row.id)}" data-key="premiumPerMonth" value="${escapeHtml(String(row.premiumPerMonth ?? 0))}"></td>
              <td><input type="month" data-insurance-id="${escapeHtml(row.id)}" data-key="endMonth" value="${escapeHtml(row.endMonth || "")}"></td>
              <td><input data-insurance-id="${escapeHtml(row.id)}" data-key="memo" value="${escapeHtml(row.memo || "")}"></td>
              <td><button type="button" class="danger-cell-button" data-remove-insurance="${escapeHtml(row.id)}">削除</button></td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;

  dom.insuranceTable.querySelectorAll("[data-insurance-id]").forEach((input) => {
    const handler = (event) => {
      const row = state.manual.insurancePolicies.find((item) => item.id === event.target.dataset.insuranceId);
      if (!row) return;
      const key = event.target.dataset.key;
      row[key] = event.target.value;
      if (key === "premiumPerMonth") row[key] = parseMoney(row[key]);
      if (event.type === "change") {
        saveAndRender();
      } else {
        scheduleRender();
      }
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });
  dom.insuranceTable.querySelectorAll("[data-remove-insurance]").forEach((button) => {
    button.addEventListener("click", () => {
      state.manual.insurancePolicies = state.manual.insurancePolicies.filter((row) => row.id !== button.dataset.removeInsurance);
      saveAndRender();
    });
  });
}

function renderDollarSection() {
  const snapshot = state.computed.snapshot;
  dom.dollarSettingsForm.innerHTML = `
    ${renderLabeledMetric("初期残高", snapshot ? formatCurrency(snapshot.dollarBalance) : "--")}
    ${renderLabeledMetric("参考USD残高", snapshot ? formatDecimal(snapshot.dollarBalanceUsd, 2) + " USD" : "--")}
    ${renderLabeledMetric("換算レート", `${formatDecimal(state.assumptions.usdJpyRate, 2)} 円/USD`)}
    ${renderNumericField("月々の積立額", "dollar-monthly", state.manual.dollarSavings.monthlyContribution)}
    ${renderNumericField("想定利回り（年）", "dollar-return", state.manual.dollarSavings.expectedReturn, 0.1)}
    ${renderNumericField("積立終了年齢", "dollar-end-age", state.manual.dollarSavings.endAge, 1)}
  `;
  bindSimpleNumericInput("#dollar-monthly", "manual.dollarSavings.monthlyContribution", parseMoney);
  bindSimpleNumericInput("#dollar-return", "manual.dollarSavings.expectedReturn");
  bindSimpleNumericInput("#dollar-end-age", "manual.dollarSavings.endAge");

  const rows =
    state.imports.parsedAssetList?.sections?.["預金・現金・暗号資産"]?.items.filter(
      (item) => `${item["種類・名称"] ?? ""}${item["保有金融機関"] ?? ""}`.includes("米ドル普通")
    ) ?? [];
  dom.dollarImportTable.innerHTML = renderImportedSimpleTable(rows, ["種類・名称", "残高", "保有金融機関"]);
}

function renderPensionSection() {
  dom.pensionTable.innerHTML = `
    <thead>
      <tr>
        <th>名称</th>
        <th>現在価値</th>
        <th>受給開始年齢</th>
        <th>拠出額(円/月)</th>
        <th>振替</th>
        <th>分割金額(円/月)</th>
        <th>一括受取額</th>
        <th>メモ</th>
        <th>削除</th>
      </tr>
    </thead>
    <tbody>
      ${state.manual.pensions
        .map(
          (row) => `
            <tr>
              <td><input data-pension-id="${escapeHtml(row.id)}" data-key="name" value="${escapeHtml(row.name)}"></td>
              <td><input type="number" step="1" data-pension-id="${escapeHtml(row.id)}" data-key="currentValue" value="${escapeHtml(String(row.currentValue ?? 0))}"></td>
              <td><input type="number" min="0" max="120" step="1" data-pension-id="${escapeHtml(row.id)}" data-key="startAge" value="${escapeHtml(String(row.startAge ?? 65))}"></td>
              <td><input type="number" step="1" data-pension-id="${escapeHtml(row.id)}" data-key="contributionPerMonth" value="${escapeHtml(String(row.contributionPerMonth ?? 0))}"></td>
              <td>
                <select data-pension-id="${escapeHtml(row.id)}" data-key="payoutType">
                  <option value="split" ${row.payoutType === "split" ? "selected" : ""}>分割</option>
                  <option value="lump" ${row.payoutType === "lump" ? "selected" : ""}>一括</option>
                </select>
              </td>
              <td><input type="number" step="1" data-pension-id="${escapeHtml(row.id)}" data-key="splitAmount" value="${escapeHtml(String(row.splitAmount ?? 0))}"></td>
              <td><input type="number" step="1" data-pension-id="${escapeHtml(row.id)}" data-key="lumpSumAmount" value="${escapeHtml(String(getPensionLumpSumAmount(row)))}"></td>
              <td><input data-pension-id="${escapeHtml(row.id)}" data-key="memo" value="${escapeHtml(row.memo || "")}"></td>
              <td><button type="button" class="danger-cell-button" data-remove-pension="${escapeHtml(row.id)}">削除</button></td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;

  dom.pensionTable.querySelectorAll("[data-pension-id]").forEach((input) => {
    const handler = (event) => {
      const row = state.manual.pensions.find((item) => item.id === event.target.dataset.pensionId);
      if (!row) return;
      const key = event.target.dataset.key;
      row[key] = event.target.value;
      if (["currentValue", "contributionPerMonth", "splitAmount", "lumpSumAmount"].includes(key)) {
        row[key] = parseMoney(row[key]);
      }
      if (key === "startAge") {
        row[key] = toNumber(row[key]);
      }
      if (event.type === "change") {
        saveAndRender();
      } else {
        scheduleRender();
      }
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });
  dom.pensionTable.querySelectorAll("[data-remove-pension]").forEach((button) => {
    button.addEventListener("click", () => {
      state.manual.pensions = state.manual.pensions.filter((row) => row.id !== button.dataset.removePension);
      saveAndRender();
    });
  });
}

function renderDebtSection() {
  dom.loanTable.innerHTML = `
    <thead>
      <tr>
        <th>名称</th>
        <th>種類</th>
        <th>現在残高</th>
        <th>年利</th>
        <th>毎月返済額</th>
        <th>ボーナス返済額</th>
        <th>ボーナス月</th>
        <th>返済終了年月</th>
        <th>支出平均に含める</th>
        <th>削除</th>
      </tr>
    </thead>
    <tbody>
      ${state.manual.loans
        .map(
          (row) => `
            <tr>
              <td><input data-loan-id="${escapeHtml(row.id)}" data-key="name" value="${escapeHtml(row.name)}"></td>
              <td>
                <select data-loan-id="${escapeHtml(row.id)}" data-key="type">
                  ${["住宅ローン", "自動車ローン", "その他ローン"]
                    .map((label) => `<option value="${label}" ${row.type === label ? "selected" : ""}>${label}</option>`)
                    .join("")}
                </select>
              </td>
              <td><input type="number" step="1" data-loan-id="${escapeHtml(row.id)}" data-key="balance" value="${escapeHtml(String(row.balance ?? 0))}"></td>
              <td><input type="number" step="0.01" data-loan-id="${escapeHtml(row.id)}" data-key="annualRate" value="${escapeHtml(String(row.annualRate ?? 0))}"></td>
              <td><input type="number" step="1" data-loan-id="${escapeHtml(row.id)}" data-key="monthlyPayment" value="${escapeHtml(String(row.monthlyPayment ?? 0))}"></td>
              <td><input type="number" step="1" data-loan-id="${escapeHtml(row.id)}" data-key="bonusPayment" value="${escapeHtml(String(row.bonusPayment ?? 0))}"></td>
              <td><input data-loan-id="${escapeHtml(row.id)}" data-key="bonusMonths" value="${escapeHtml(row.bonusMonths || "")}"></td>
              <td><input type="month" data-loan-id="${escapeHtml(row.id)}" data-key="endMonth" value="${escapeHtml(row.endMonth || "")}"></td>
              <td><input type="checkbox" data-loan-id="${escapeHtml(row.id)}" data-key="includedInExpenses" ${row.includedInExpenses ? "checked" : ""}></td>
              <td><button type="button" class="danger-cell-button" data-remove-loan="${escapeHtml(row.id)}">削除</button></td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;

  dom.cardTable.innerHTML = `
    <thead>
      <tr>
        <th>名称</th>
        <th>未払残高</th>
        <th>引落年月</th>
        <th>支払方法</th>
        <th>毎月返済額</th>
        <th>年利</th>
        <th>支出平均に含める</th>
        <th>削除</th>
      </tr>
    </thead>
    <tbody>
      ${state.manual.cards
        .map(
          (row) => `
            <tr>
              <td><input data-card-id="${escapeHtml(row.id)}" data-key="name" value="${escapeHtml(row.name)}"></td>
              <td><input type="number" step="1" data-card-id="${escapeHtml(row.id)}" data-key="balance" value="${escapeHtml(String(row.balance ?? 0))}"></td>
              <td><input type="month" data-card-id="${escapeHtml(row.id)}" data-key="dueMonth" value="${escapeHtml(row.dueMonth || "")}"></td>
              <td>
                <select data-card-id="${escapeHtml(row.id)}" data-key="paymentType">
                  ${["一括", "分割", "リボ"]
                    .map((label) => `<option value="${label}" ${row.paymentType === label ? "selected" : ""}>${label}</option>`)
                    .join("")}
                </select>
              </td>
              <td><input type="number" step="1" data-card-id="${escapeHtml(row.id)}" data-key="monthlyPayment" value="${escapeHtml(String(row.monthlyPayment ?? 0))}"></td>
              <td><input type="number" step="0.01" data-card-id="${escapeHtml(row.id)}" data-key="annualRate" value="${escapeHtml(String(row.annualRate ?? 0))}"></td>
              <td><input type="checkbox" data-card-id="${escapeHtml(row.id)}" data-key="includedInExpenses" ${row.includedInExpenses ? "checked" : ""}></td>
              <td><button type="button" class="danger-cell-button" data-remove-card="${escapeHtml(row.id)}">削除</button></td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;

  bindTableInputs(dom.loanTable, "data-loan-id", state.manual.loans, ["balance", "annualRate", "monthlyPayment", "bonusPayment"], ["balance", "monthlyPayment", "bonusPayment"]);
  bindTableInputs(dom.cardTable, "data-card-id", state.manual.cards, ["balance", "monthlyPayment", "annualRate"], ["balance", "monthlyPayment"]);
  bindRemoveButtons(dom.loanTable, "[data-remove-loan]", "removeLoan");
  bindRemoveButtons(dom.cardTable, "[data-remove-card]", "removeCard");
}

function renderResearchSection() {
  const summary = state.computed.summary;
  const timelineRows = state.computed.timeline;
  const ageTicks = timelineRows.reduce((ticks, row, index) => {
    const lastTick = ticks[ticks.length - 1];
    if (!lastTick || lastTick.label !== formatAge(row.age)) {
      ticks.push({ xIndex: index, label: formatAge(row.age) });
    }
    return ticks;
  }, []);
  const cashSeriesValues = timelineRows.map((row, index) => ({ label: row.monthLabel, xLabel: formatAge(row.age), xIndex: index, value: row.effectiveCash }));
  const cashAnnotations = buildCashChartAnnotations(timelineRows);

  dom.researchStrip.innerHTML = [
    { label: "取込日", value: state.imports.importedAt ? formatDateTime(state.imports.importedAt) : "未取込" },
    { label: "現在総資産", value: summary ? formatCurrency(summary.currentAssets) : "--" },
    { label: "現在純資産", value: summary ? formatCurrency(summary.currentNetWorth) : "--" },
    { label: "不足回避に必要な改善", value: summary?.monthlyImprovementNeeded ? formatCurrency(summary.monthlyImprovementNeeded) : "0円" },
  ]
    .map(
      (item) => `
        <div class="summary-card">
          <span class="label">${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `
    )
    .join("");

  renderForecastChart(dom.networthChart, [
    {
      name: "総資産",
      color: "#0f6a6f",
      values: timelineRows.map((row, index) => ({ label: row.monthLabel, xLabel: formatAge(row.age), xIndex: index, value: row.totalAssets })),
    },
    {
      name: "純資産（総資産-負債）",
      color: "#c75c33",
      values: timelineRows.map((row, index) => ({ label: row.monthLabel, xLabel: formatAge(row.age), xIndex: index, value: row.netWorth })),
    },
  ], { xTicks: ageTicks });

  renderForecastChart(dom.cashChart, [
    {
      name: "使える現金",
      color: "#0f6a6f",
      values: cashSeriesValues,
    },
  ], { xTicks: ageTicks, annotations: cashAnnotations, detailContainer: dom.chartDetailPanel, detailRenderer: renderCashAnnotationSelection, detailContext: { cashSeriesValues } });
  dom.timelineTable.innerHTML = `
    <thead>
      <tr>
        <th>年月</th>
        <th>年齢</th>
        <th>使える現金</th>
        <th>ドル</th>
        <th>債券扱い資産</th>
        <th>投資信託・ETF</th>
        <th>株式</th>
        <th>保険</th>
        <th>年金資産</th>
        <th>負債</th>
        <th>純資産</th>
      </tr>
    </thead>
    <tbody>
      ${
        timelineRows.length
          ? timelineRows
              .map((row, index) => {
                const isPhaseShift = index > 0 && timelineRows[index - 1].phaseLabel !== row.phaseLabel;
                const previousRow = index > 0 ? timelineRows[index - 1] : null;
                const effectiveCashClass = getBalanceTrendClass(row.effectiveCash, previousRow?.effectiveCash);
                const dollarBalanceClass = getBalanceTrendClass(row.dollarBalance, previousRow?.dollarBalance);
                const bondLikeAssetsClass = getBalanceTrendClass(row.bondLikeAssets, previousRow?.bondLikeAssets);
                const fundsBalanceClass = getBalanceTrendClass(row.fundsBalance, previousRow?.fundsBalance);
                const stocksBalanceClass = getBalanceTrendClass(row.stocksBalance, previousRow?.stocksBalance);
                const insuranceBalanceClass = getBalanceTrendClass(row.insuranceBalance, previousRow?.insuranceBalance);
                const pensionAssetBalanceClass = getBalanceTrendClass(row.pensionAssetBalance, previousRow?.pensionAssetBalance);
                const debtBalanceClass = getBalanceTrendClass(row.debtBalance, previousRow?.debtBalance, { invert: true });
                const netWorthClass = getBalanceTrendClass(row.netWorth, previousRow?.netWorth);
                return `
                  <tr class="${isPhaseShift ? "timeline-phase-shift" : ""}">
                    <td>${escapeHtml(row.monthLabel)}</td>
                    <td>${escapeHtml(formatAge(row.age))}</td>
                    <td class="${effectiveCashClass}">${formatCurrency(row.effectiveCash)}</td>
                    <td class="${dollarBalanceClass}">${formatCurrency(row.dollarBalance)}</td>
                    <td class="${bondLikeAssetsClass}">${formatCurrency(row.bondLikeAssets)}</td>
                    <td class="${fundsBalanceClass}">${formatCurrency(row.fundsBalance)}</td>
                    <td class="${stocksBalanceClass}">${formatCurrency(row.stocksBalance)}</td>
                    <td class="${insuranceBalanceClass}">${formatCurrency(row.insuranceBalance)}</td>
                    <td class="${pensionAssetBalanceClass}">${formatCurrency(row.pensionAssetBalance)}</td>
                    <td class="${debtBalanceClass}">${formatCurrency(row.debtBalance)}</td>
                    <td class="${netWorthClass}">${formatCurrency(row.netWorth)}</td>
                  </tr>
                `;
              })
              .join("")
          : `<tr><td colspan="11">誕生日と入力条件を設定すると、月次推移を表示します。</td></tr>`
      }
    </tbody>
  `;
}

function switchView(view, skipButtonState = false) {
  currentView = view;
  dom.viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `view-${view}`);
  });
  dom.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === currentView);
  });
}

async function handleImportClick() {
  try {
    const [assetListFile, assetTrendFile] = [dom.assetListFile.files?.[0], dom.assetTrendFile.files?.[0]];
    if (!assetListFile || !assetTrendFile) {
      renderImportStatus("2つのCSVを選択してください。");
      return;
    }

    const [assetListRaw, assetTrendRaw] = await Promise.all([readCsvFile(assetListFile), readCsvFile(assetTrendFile)]);
    state.imports.assetListRaw = assetListRaw;
    state.imports.assetTrendRaw = assetTrendRaw;
    state.imports.parsedAssetList = parseAssetListCsv(assetListRaw);
    state.imports.parsedAssetTrend = parseAssetTrendCsv(assetTrendRaw);
    state.imports.importedAt = new Date().toISOString();
    hydrateStateFromImports();
    saveAndRender("CSVを読み込みました。");
  } catch (error) {
    console.error(error);
    renderImportStatus(`CSVの読込に失敗しました: ${error.message}`);
  }
}

async function handleRestoreFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const restored = mergeWithDefault(JSON.parse(text));
    Object.assign(state, restored);
    saveAndRender("バックアップを復元しました。");
  } catch (error) {
    console.error(error);
    renderImportStatus(`復元に失敗しました: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

async function downloadBackup() {
  const payload = {
    ...state,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
  };
  const backupName = `lifewealth100-2-backup-${formatCompactDate(new Date())}.json`;
  const backupText = JSON.stringify(payload, null, 2);

  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: backupName,
        types: [
          {
            description: "JSON バックアップ",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(backupText);
      await writable.close();
      renderImportStatus(`バックアップを保存しました: ${backupName}`);
    } catch (error) {
      if (error?.name === "AbortError") {
        renderImportStatus("バックアップ保存をキャンセルしました。");
        return;
      }
      console.error(error);
      renderImportStatus(`バックアップ保存に失敗しました: ${error.message}`);
    }
    return;
  }

  const blob = new Blob([backupText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = backupName;
  anchor.click();
  URL.revokeObjectURL(url);
  renderImportStatus(`このブラウザでは保存先確認に未対応のため、通常のダウンロードを開始しました: ${backupName}`);
}

function hydrateStateFromImports() {
  const sections = state.imports.parsedAssetList?.sections;
  if (!sections) return;

  const pensionItems = sections["年金"]?.items ?? [];
  if (!state.manual.pensions.length) {
    state.manual.pensions = pensionItems.map((item) =>
      createPensionPlan({
        name: item["名称"] || "年金",
        currentValue: parseMoney(item["現在価値"]),
      })
    );
  } else {
    pensionItems.forEach((item) => {
      const row = state.manual.pensions.find((plan) => plan.name === (item["名称"] || ""));
      if (row) row.currentValue = parseMoney(item["現在価値"]);
    });
  }

  buildImportedBondRows(sections).forEach((candidate) => {
    const existing = state.manual.bondAssets.find(
      (row) => row.name === candidate.name && row.institution === candidate.institution && row.sourceCategory === candidate.sourceCategory
    );
    if (existing) {
      const shouldRefreshFaceValue =
        !toNumber(existing.faceValue) || (toNumber(existing.currentPrice) === 1 && Math.abs(toNumber(existing.faceValue) - toNumber(existing.currentValue)) < 1);
      existing.currentValue = candidate.currentValue;
      existing.excludeFromCash = candidate.excludeFromCash;
      existing.currency = "JPY";
      if (shouldRefreshFaceValue) existing.faceValue = candidate.faceValue;
      if (!toNumber(existing.currentPrice)) existing.currentPrice = candidate.currentPrice;
    } else {
      state.manual.bondAssets.push(candidate);
    }
  });
}

function buildImportedBondRows(sections) {
  const rows = [];
  (sections["債券"]?.items ?? []).forEach((item) => {
    const importedValue = parseMoney(item["評価額"]);
    rows.push(
      createBondRow({
        name: item["銘柄名"] || "債券",
        institution: item["保有金融機関"] || "",
        currentValue: importedValue,
        sourceCategory: "bonds",
        type: "bond",
        currency: "JPY",
        faceValue: importedValue,
        currentPrice: 1,
        destination: "cash",
      })
    );
  });

  const cashCandidates = (sections["預金・現金・暗号資産"]?.items ?? []).filter((item) => {
    const name = `${item["種類・名称"] ?? ""}${item["保有金融機関"] ?? ""}`;
    return /米ドル定期|ビットコイン|Mona|円仕組|米ドル 現金/i.test(name);
  });

  cashCandidates.forEach((item) => {
    const importedValue = parseMoney(item["残高"]);
    rows.push(
      createBondRow({
        name: item["種類・名称"] || "現金除外資産",
        institution: item["保有金融機関"] || "",
        currentValue: importedValue,
        sourceCategory: "cash",
        type: /ビットコイン|Mona/i.test(item["種類・名称"] || "") ? "volatile" : "foreign",
        excludeFromCash: true,
        currency: "JPY",
        faceValue: importedValue,
        currentPrice: 1,
        destination: /米ドル/i.test(item["種類・名称"] || "") ? "dollar" : "cash",
      })
    );
  });

  (sections["その他の資産"]?.items ?? []).forEach((item) => {
    const importedValue = parseMoney(item["現在価値"]);
    rows.push(
      createBondRow({
        name: item["名称"] || "その他の資産",
        institution: item["保有金融機関"] || "",
        currentValue: importedValue,
        sourceCategory: "other",
        type: item["名称"]?.includes("金") ? "volatile" : "locked",
        currency: "JPY",
        faceValue: importedValue,
        currentPrice: 1,
        destination: "keep",
      })
    );
  });

  return rows;
}

function computeProjection() {
  const snapshot = computeSnapshot();
  const warnings = buildWarnings(snapshot);
  const timeline = buildForecastTimeline(snapshot);
  const summary = buildSummary(snapshot, timeline);

  state.computed = {
    warnings,
    snapshot,
    timeline,
    summary,
  };
}

function computeSnapshot() {
  const sections = state.imports.parsedAssetList?.sections ?? {};
  const importedCashTotal = getSectionTotal(sections["預金・現金・暗号資産"]);
  const pointsAsCash = getSectionTotal(sections["ポイント・マイル"]);
  const fundsBalance = getSectionTotal(sections["投資信託"]);
  const stocksBalance = getSectionTotal(sections["株式（現物）"]);
  const insuranceBalance = getInsuranceCurrentBalance();
  const pensionBalance = getPensionCurrentBalance();
  const dollarBalance = getDollarInitialBalance(sections);
  const dollarBalanceUsd = convertYenToUsd(dollarBalance);
  const cashExcludedTotal =
    state.manual.bondAssets.reduce((sum, row) => (row.excludeFromCash ? sum + getBondDisplayValue(row) : sum), 0) + dollarBalance;
  const bondLikeAssets = state.manual.bondAssets.reduce((sum, row) => sum + getBondDisplayValue(row), 0);
  const effectiveCash = importedCashTotal + pointsAsCash - cashExcludedTotal;
  const averageBondRate = calculateAverageBondRate();

  return {
    importedCashTotal,
    pointsAsCash,
    cashExcludedTotal,
    effectiveCash,
    bondLikeAssets,
    fundsBalance,
    stocksBalance,
    insuranceBalance,
    pensionBalance,
    dollarBalance,
    dollarBalanceUsd,
    averageBondRate,
  };
}

function buildWarnings(snapshot) {
  const warnings = [];
  if (!state.profile.birthDate) warnings.push({ location: "基本情報", message: "誕生日が未入力です。" });

  state.manual.bondAssets.forEach((row) => {
    if (!row.currency) warnings.push({ location: "債券", message: `${row.name || "債券"} の通貨が未入力です。` });
    if (!row.maturityDate && row.type === "bond") warnings.push({ location: "債券", message: `${row.name || "債券"} の償還日が未入力です。` });
  });

  state.manual.pensions.forEach((row) => {
    if (!row.splitAmount && row.payoutType === "split") warnings.push({ location: "年金", message: `${row.name || "年金"} の分割金額が未入力です。` });
    if (row.payoutType === "lump" && !getPensionLumpSumAmount(row)) warnings.push({ location: "年金", message: `${row.name || "年金"} の一括受取額を計算できません。現在価値と拠出額を確認してください。` });
  });

  state.manual.loans.forEach((row) => {
    if (!row.endMonth) warnings.push({ location: "負債", message: `${row.name || "ローン"} の返済終了年月が未入力です。` });
  });

  if (snapshot && snapshot.effectiveCash < 0) {
    warnings.push({ location: "ホーム", message: "現在時点の使える現金がマイナスです。現金から除外する資産の設定を確認してください。" });
  }
  return warnings;
}

function buildForecastTimeline(snapshot) {
  if (!state.profile.birthDate) return [];

  const start = getSimulationStartDate();
  const end = getSimulationEndDate(state.profile.birthDate, state.profile.endAge);
  const monthlyInflationRate = annualToMonthlyRate(state.assumptions.inflationRate);
  const marketRiseAdjustmentRate = toNumber(state.assumptions.marketRiseAdjustmentRate);
  const timeline = [];

  let effectiveCash = snapshot.effectiveCash;
  let fundsBalance = snapshot.fundsBalance;
  let stocksBalance = snapshot.stocksBalance;
  let bondAssets = structuredClone(state.manual.bondAssets).map((row) => ({
    ...row,
    isMatured: isBondMaturedOnOrBefore(row, start),
    projectedValue: getBondDisplayValue(row),
  }));
  let insurancePolicies = structuredClone(state.manual.insurancePolicies).map((row) => ({ ...row }));
  let insuranceRunningBalance = snapshot.insuranceBalance;
  let pensionPlans = structuredClone(state.manual.pensions).map((row) => ({ ...row }));
  let dollarUnits = toNumber(snapshot.dollarBalanceUsd);
  let dollarBalance = convertUsdToYen(dollarUnits);
  let loans = structuredClone(state.manual.loans).map((row) => ({ ...row }));
  let cards = structuredClone(state.manual.cards).map((row) => ({ ...row }));
  let monthsSinceStart = 0;
  let retirementBonusPaid = false;
  const oneTimePensionPaidIds = new Set();

  for (let cursor = new Date(start); cursor <= end; cursor = addMonths(cursor, 1)) {
    const monthLabel = `${cursor.getFullYear()}/${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const age = getAgeAtMonthEnd(state.profile.birthDate, cursor);
    const phase = getPhaseForAge(age);
    const phaseValues = state.phaseValues[phase.key];
    const inflationFactor = (1 + monthlyInflationRate) ** monthsSinceStart;
    const monthlyIncome = sumValues(phaseValues.incomes);
    const monthlyExpenses = sumValues(phaseValues.expenses) * inflationFactor;
    const cashEvents = [];
    const retirementBonus = Math.max(0, toNumber(state.phaseValues.retired.retirementBonus));

    if (!retirementBonusPaid && age >= state.phaseValues.retired.startAge) {
      if (retirementBonus > 0) {
        effectiveCash += retirementBonus;
        cashEvents.push(createCashEvent("退職金", retirementBonus));
      }
      retirementBonusPaid = true;
    }

    effectiveCash += monthlyIncome;

    if (age < state.manual.funds.endAge) {
      effectiveCash -= state.manual.funds.monthlyContribution;
      fundsBalance += state.manual.funds.monthlyContribution;
      cashEvents.push(createCashEvent("投信積立", -state.manual.funds.monthlyContribution));
    }
    if (age < state.manual.stocks.endAge) {
      effectiveCash -= state.manual.stocks.monthlyContribution;
      stocksBalance += state.manual.stocks.monthlyContribution;
      cashEvents.push(createCashEvent("株式積立", -state.manual.stocks.monthlyContribution));
    }
    if (age < state.manual.dollarSavings.endAge) {
      effectiveCash -= state.manual.dollarSavings.monthlyContribution;
      dollarUnits += convertYenToUsd(state.manual.dollarSavings.monthlyContribution);
      cashEvents.push(createCashEvent("ドル積立", -state.manual.dollarSavings.monthlyContribution));
    }

    insurancePolicies.forEach((policy) => {
      if (!policy.endMonth || monthLabel <= policy.endMonth.replace("-", "/")) {
        effectiveCash -= policy.premiumPerMonth;
        insuranceRunningBalance += policy.premiumPerMonth;
        cashEvents.push(createCashEvent(`保険料: ${policy.name || "保険"}`, -policy.premiumPerMonth));
      }
    });
    insuranceRunningBalance *= 1 + annualToMonthlyRate(state.manual.insuranceSettings.expectedReturn);

    pensionPlans.forEach((plan) => {
      if (age < plan.startAge) {
        effectiveCash -= plan.contributionPerMonth;
        plan.currentValue += plan.contributionPerMonth;
        cashEvents.push(createCashEvent(`年金拠出: ${plan.name || "年金"}`, -plan.contributionPerMonth));
      } else if (plan.payoutType === "split") {
        const splitPayout = Math.min(Math.max(0, toNumber(plan.splitAmount)), Math.max(0, toNumber(plan.currentValue)));
        effectiveCash += splitPayout;
        plan.currentValue = Math.max(0, toNumber(plan.currentValue) - splitPayout);
        cashEvents.push(createCashEvent(`年金受取: ${plan.name || "年金"}`, splitPayout));
      } else if (plan.payoutType === "lump" && !oneTimePensionPaidIds.has(plan.id)) {
        const lumpSumAmount = getPensionLumpSumAmount(plan, true);
        effectiveCash += lumpSumAmount;
        plan.currentValue = Math.max(0, toNumber(plan.currentValue) - lumpSumAmount);
        oneTimePensionPaidIds.add(plan.id);
        cashEvents.push(createCashEvent(`年金一括受取: ${plan.name || "年金"}`, lumpSumAmount));
      }
    });

    effectiveCash -= monthlyExpenses;

    bondAssets.forEach((row) => {
      if (row.maturityDate && !row.isMatured && isSameMonthOrPast(row.maturityDate, cursor)) {
        if (row.destination === "cash") {
          effectiveCash += row.projectedValue;
          cashEvents.push(createCashEvent(`償還入金: ${row.name || "債券"}`, row.projectedValue));
        }
        if (row.destination === "dollar") dollarUnits += convertYenToUsd(row.projectedValue);
        row.isMatured = true;
      }
    });

    fundsBalance *= 1 + annualToMonthlyRate(toNumber(state.manual.funds.expectedReturn) + marketRiseAdjustmentRate);
    stocksBalance *= 1 + annualToMonthlyRate(toNumber(state.manual.stocks.expectedReturn) + marketRiseAdjustmentRate);
    dollarUnits *= 1 + annualToMonthlyRate(state.manual.dollarSavings.expectedReturn);
    dollarBalance = convertUsdToYen(dollarUnits);

    loans.forEach((loan) => {
      if (loan.balance <= 0) return;
      if (loan.endMonth && monthLabel > loan.endMonth.replace("-", "/")) return;
      const interest = loan.balance * annualToMonthlyRate(loan.annualRate);
      let payment = loan.monthlyPayment;
      if (parseBonusMonths(loan.bonusMonths).includes(cursor.getMonth() + 1)) payment += loan.bonusPayment;
      if (!loan.includedInExpenses) {
        effectiveCash -= payment;
        cashEvents.push(createCashEvent(`借入返済: ${loan.name || "ローン"}`, -payment));
      }
      loan.balance = Math.max(0, loan.balance - Math.max(0, payment - interest));
    });

    cards.forEach((card) => {
      if (card.balance <= 0) return;
      if (card.paymentType === "一括") {
        if (card.dueMonth && monthLabel === card.dueMonth.replace("-", "/")) {
          const lumpPayment = card.balance;
          if (!card.includedInExpenses) {
            effectiveCash -= lumpPayment;
            cashEvents.push(createCashEvent(`カード返済: ${card.name || "カード"}`, -lumpPayment));
          }
          card.balance = 0;
        }
        return;
      }
      const interest = card.balance * annualToMonthlyRate(card.annualRate);
      if (!card.includedInExpenses) {
        effectiveCash -= card.monthlyPayment;
        cashEvents.push(createCashEvent(`カード返済: ${card.name || "カード"}`, -card.monthlyPayment));
      }
      card.balance = Math.max(0, card.balance - Math.max(0, card.monthlyPayment - interest));
    });

    const bondLikeAssets = bondAssets.filter((row) => !row.isMatured).reduce((sum, row) => sum + row.projectedValue, 0);
    const pensionAssetBalance = pensionPlans.reduce((sum, row) => sum + row.currentValue, 0);
    const debtBalance = loans.reduce((sum, row) => sum + row.balance, 0) + cards.reduce((sum, row) => sum + row.balance, 0);
    const totalAssets = effectiveCash + dollarBalance + bondLikeAssets + fundsBalance + stocksBalance + insuranceRunningBalance + pensionAssetBalance;
    const netWorth = totalAssets - debtBalance;

    timeline.push({
      monthLabel,
      phaseLabel: phase.label,
      age,
      effectiveCash,
      dollarBalance,
      bondLikeAssets,
      fundsBalance,
      stocksBalance,
      insuranceBalance: insuranceRunningBalance,
      pensionAssetBalance,
      debtBalance,
      totalAssets,
      netWorth,
      cashEvents,
    });

    monthsSinceStart += 1;
  }

  return timeline;
}

function buildSummary(snapshot, timeline) {
  const currentDebt = state.manual.loans.reduce((sum, row) => sum + row.balance, 0) + state.manual.cards.reduce((sum, row) => sum + row.balance, 0);
  const currentAssets = (snapshot?.effectiveCash ?? 0) + (snapshot?.dollarBalance ?? 0) + (snapshot?.bondLikeAssets ?? 0) + (snapshot?.fundsBalance ?? 0) + (snapshot?.stocksBalance ?? 0) + (snapshot?.insuranceBalance ?? 0) + (snapshot?.pensionBalance ?? 0);
  const currentNetWorth = currentAssets - currentDebt;
  const futureRow = timeline[timeline.length - 1];
  const firstShortage = timeline.find((row) => row.effectiveCash < 0);
  return {
    currentAssets,
    currentDebt,
    currentNetWorth,
    futureNetWorth: futureRow?.netWorth ?? currentNetWorth,
    firstShortageMonth: firstShortage ? `${firstShortage.monthLabel} / ${formatAge(firstShortage.age)}` : "",
    monthlyImprovementNeeded: firstShortage ? Math.ceil(Math.abs(firstShortage.effectiveCash) / 12 / 1000) * 1000 : 0,
  };
}

function getSimulationStartDate() {
  const trendRows = state.imports.parsedAssetTrend;
  if (trendRows?.length) {
    const date = parseJapaneseDate(trendRows[0]["日付"]);
    if (date) return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getSimulationEndDate(birthDateText, endAge) {
  const birthDate = new Date(birthDateText);
  return new Date(birthDate.getFullYear() + endAge, birthDate.getMonth() + 1, 0);
}

function getAgeAtMonthEnd(birthDateText, targetDate) {
  const birth = new Date(birthDateText);
  let age = targetDate.getFullYear() - birth.getFullYear();
  if (targetDate.getMonth() < birth.getMonth()) age -= 1;
  return age;
}

function getPhaseForAge(age) {
  if (age >= state.phaseValues.late.startAge) return PHASES[3];
  if (age >= state.phaseValues.pension.startAge) return PHASES[2];
  if (age >= state.phaseValues.retired.startAge) return PHASES[1];
  return PHASES[0];
}
function renderForecastChart(container, seriesList, options = {}) {
  const allPoints = seriesList.flatMap((series) => series.values);
  if (!allPoints.length) {
    container.innerHTML = `<div class="inline-note">陦ｨ遉ｺ縺ｧ縺阪ｋ繝・・繧ｿ縺後∪縺縺ゅｊ縺ｾ縺帙ｓ縲・/div>`;
    if (options.detailContainer) {
      renderChartDetailPlaceholder(options.detailContainer);
    }
    return;
  }

  const width = 780;
  const height = 280;
  const padding = { top: 18, right: 20, bottom: 36, left: 52 };
  const values = allPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xMax = Math.max(
    1,
    ...allPoints.map((point, index) => (typeof point.xIndex === "number" ? point.xIndex : index)),
    ...(options.xTicks ?? []).map((tick, index) => (typeof tick.xIndex === "number" ? tick.xIndex : index))
  );

  const getX = (point, index) => {
    const xIndex = typeof point.xIndex === "number" ? point.xIndex : index;
    return padding.left + (plotWidth * xIndex) / xMax;
  };
  const getY = (value) => padding.top + plotHeight - ((value - min) / span) * plotHeight;
  const axisTicks = pickAxisTickPoints(options.xTicks?.length ? options.xTicks : buildDefaultAxisTicks(allPoints), 6);

  const lines = seriesList
    .map((series) => {
      if (!series.values.length) return "";
      const path = series.values
        .map((point, index) => `${index === 0 ? "M" : "L"} ${getX(point, index).toFixed(2)} ${getY(point.value).toFixed(2)}`)
        .join(" ");
      return `<path d="${path}" fill="none" stroke="${series.color}" stroke-width="3" stroke-linecap="round"></path>`;
    })
    .join("");

  const axisLabels = axisTicks
    .map((tick, index) => {
      const x = getX(tick, index);
      return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#576268">${escapeHtml(tick.label)}</text>`;
    })
    .join("");

  const valueLabels = [max, min, (max + min) / 2]
    .map((value) => {
      const y = getY(value);
      return `
        <line x1="${padding.left}" x2="${width - padding.right}" y1="${y}" y2="${y}" stroke="rgba(98, 83, 63, 0.12)"></line>
        <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="#576268">${escapeHtml(formatCurrencyShort(value))}</text>
      `;
    })
    .join("");

  const legend = seriesList
    .map(
      (series, index) => `
        <g transform="translate(${padding.left + index * 180}, ${padding.top - 2})">
          <rect x="0" y="0" width="18" height="4" rx="2" fill="${series.color}"></rect>
          <text x="26" y="6" font-size="12" fill="#1f2427">${escapeHtml(series.name)}</text>
        </g>
      `
    )
    .join("");

  const annotationGroups = buildAnnotationGroups(options.annotations ?? [], (annotation, index) => ({
    x: getX(annotation, index),
    y: getY(annotation.value),
  }));
  const annotations = annotationGroups
    .map((group, index) => createAnnotationGroupMarkup(group, index))
    .join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="forecast chart">
      <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
      ${valueLabels}
      ${lines}
      ${annotations}
      ${axisLabels}
      ${legend}
    </svg>
  `;

  const renderSelectedDetail = (selectedIndex) => {
    if (!options.detailContainer) return;
    const selectedGroup = selectedIndex >= 0 ? annotationGroups[selectedIndex] : null;
    if (selectedGroup && typeof options.detailRenderer === "function") {
      options.detailRenderer(options.detailContainer, selectedGroup, {
        ...options.detailContext,
        chartContainer: container,
        annotationGroups,
        annotations: options.annotations ?? [],
        selectedIndex,
      });
      return;
    }
    renderChartDetailPlaceholder(options.detailContainer);
  };

  if (options.detailContainer) {
    renderChartDetailPlaceholder(options.detailContainer);
  }

  container.querySelectorAll("[data-annotation-group-index]").forEach((node) => {
    const showDetail = () => {
      const groupIndex = Number(node.dataset.annotationGroupIndex);
      const nextIndex = groupIndex;
      updateSelectedAnnotationGroup(container, nextIndex);
      renderSelectedDetail(nextIndex);
    };

    node.addEventListener("click", showDetail);
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      showDetail();
    });
  });
}

function buildAnnotationGroups(annotations, resolvePosition, thresholdPx = 14) {
  if (!annotations.length) return [];

  const positioned = annotations
    .map((annotation, index) => ({
      ...annotation,
      plotX: resolvePosition(annotation, index).x,
      plotY: resolvePosition(annotation, index).y,
    }))
    .sort((left, right) => left.plotX - right.plotX || left.plotY - right.plotY);

  const groups = [];
  positioned.forEach((annotation) => {
    const matchingGroup = groups.find(
      (group) => Math.abs(annotation.plotX - group.x) <= thresholdPx && Math.abs(annotation.plotY - group.y) <= thresholdPx
    );
    if (!matchingGroup) {
      groups.push({
        annotations: [annotation],
        x: annotation.plotX,
        y: annotation.plotY,
      });
      return;
    }

    matchingGroup.annotations.push(annotation);
    matchingGroup.x = matchingGroup.annotations.reduce((sum, item) => sum + item.plotX, 0) / matchingGroup.annotations.length;
    matchingGroup.y = matchingGroup.annotations.reduce((sum, item) => sum + item.plotY, 0) / matchingGroup.annotations.length;
  });

  return groups.map((group) => {
    const orderedAnnotations = [...group.annotations].sort((left, right) => (left.xIndex ?? 0) - (right.xIndex ?? 0));
    const total = orderedAnnotations.reduce((sum, annotation) => sum + toNumber(annotation.total), 0);
    const startLabel = orderedAnnotations[0]?.label ?? "";
    const endLabel = orderedAnnotations[orderedAnnotations.length - 1]?.label ?? startLabel;
    return {
      ...group,
      annotations: orderedAnnotations,
      total,
      color: total >= 0 ? "#0f6a6f" : "#c75c33",
      ariaLabel:
        orderedAnnotations.length > 1
          ? `${startLabel}から${endLabel}に近接する${orderedAnnotations.length}件の候補`
          : orderedAnnotations[0]?.ariaLabel || orderedAnnotations[0]?.label || "chart point",
    };
  });
}

function createAnnotationGroupMarkup(group, index) {
  const visibleRadius = group.annotations.length > 1 ? 6.5 : 4.5;
  const hitRadius = group.annotations.length > 1 ? 16 : 13;
  return `
    <g
      class="chart-annotation-group${group.annotations.length > 1 ? " is-cluster" : ""}"
      tabindex="0"
      role="button"
      data-annotation-group-index="${index}"
      aria-label="${escapeHtml(group.ariaLabel)}"
    >
      <circle class="chart-annotation-hit" cx="${group.x.toFixed(2)}" cy="${group.y.toFixed(2)}" r="${hitRadius}" fill="rgba(255,255,255,0.001)"></circle>
      <circle class="chart-annotation-dot" cx="${group.x.toFixed(2)}" cy="${group.y.toFixed(2)}" r="${visibleRadius}" fill="${group.color}" stroke="#fff" stroke-width="1.5"></circle>
      ${group.annotations.length > 1 ? `<text class="chart-annotation-count" x="${group.x.toFixed(2)}" y="${(group.y + 4).toFixed(2)}" text-anchor="middle">${group.annotations.length}</text>` : ""}
    </g>
  `;
}

function updateSelectedAnnotationGroup(container, selectedIndex) {
  if (!container) return;
  container.querySelectorAll("[data-annotation-group-index]").forEach((node) => {
    node.classList.toggle("is-selected", Number(node.dataset.annotationGroupIndex) === selectedIndex);
  });
}

function renderChartDetailPlaceholder(container) {
  if (!container) return;
  container.hidden = true;
  container.innerHTML = "";
}

function buildDefaultAxisTicks(points) {
  return points.map((point, index) => ({
    xIndex: typeof point.xIndex === "number" ? point.xIndex : index,
    label: point.xLabel || point.label,
  }));
}

function pickAxisTickPoints(points, count) {
  if (!points.length) return [];
  if (points.length <= count) return points;
  const maxIndex = points.length - 1;
  const indexes = new Set([0, maxIndex]);
  for (let step = 1; step < count - 1; step += 1) {
    indexes.add(Math.round((maxIndex * step) / (count - 1)));
  }
  return [...indexes]
    .sort((left, right) => left - right)
    .map((index) => points[index]);
}

function buildCashChartAnnotations(timelineRows) {
  return timelineRows
    .map((row, index) => {
      const notableEvents = (row.cashEvents ?? []).filter((event) => Math.abs(event.amount) >= 100000);
      if (!notableEvents.length) return null;
      const total = notableEvents.reduce((sum, event) => sum + event.amount, 0);
      return {
        xIndex: index,
        value: row.effectiveCash,
        color: total >= 0 ? "#0f6a6f" : "#c75c33",
        label: row.monthLabel,
        monthLabel: row.monthLabel,
        age: row.age,
        effectiveCash: row.effectiveCash,
        total,
        eventCount: notableEvents.length,
        events: notableEvents,
        ariaLabel: `${row.monthLabel} ${formatAge(row.age)} ${notableEvents.length}件の明細`,
      };
    })
    .filter(Boolean);
}

function renderCashAnnotationSelection(container, group, context = {}) {
  if (!group) {
    renderChartDetailPlaceholder(container);
    return;
  }

  container.hidden = false;
  const annotations = [...group.annotations].sort((left, right) => (left.xIndex ?? 0) - (right.xIndex ?? 0));
  const isClustered = annotations.length > 1;
  const firstAnnotation = annotations[0];
  const lastAnnotation = annotations[annotations.length - 1];
  const heading = isClustered
    ? `${firstAnnotation?.monthLabel ?? ""} - ${lastAnnotation?.monthLabel ?? ""}`
    : `${firstAnnotation?.monthLabel ?? ""} / ${formatAge(firstAnnotation?.age ?? 0)}`;
  const note = isClustered
    ? "近い月が重なっているため、該当月をまとめて表示しています。"
    : "選択した月の明細です。";

  container.innerHTML = `
    <section class="chart-detail-group">
      <div class="chart-detail-header">
        <div>
          <h3>${escapeHtml(heading)}</h3>
          <p class="inline-note">${escapeHtml(note)}</p>
        </div>
        <div class="chart-detail-actions">
          ${isClustered ? `<span class="pill">${annotations.length}か月</span>` : ""}
          <button type="button" class="ghost-button chart-detail-reset-button" data-close-cash-detail>拡大を消す</button>
        </div>
      </div>
      <div class="chart-zoom-shell">
        <div class="chart-zoom-stage">
          ${renderCashClusterZoomChart(context.cashSeriesValues ?? [], annotations)}
        </div>
      </div>
      <div class="chart-detail-entry-list">${renderCashAnnotationRows(annotations)}</div>
    </section>
  `;

  container.querySelector("[data-close-cash-detail]")?.addEventListener("click", () => {
    updateSelectedAnnotationGroup(context.chartContainer, -1);
    renderChartDetailPlaceholder(container);
  });
}

function renderCashAnnotationRows(annotations) {
  return annotations
    .map(
      (annotation) => `
        <article class="chart-detail-entry">
          ${renderCashAnnotationFocus(annotation)}
        </article>
      `
    )
    .join("");
}

function renderCashAnnotationFocus(annotation, options = {}) {
  const isCompact = options.compact === true;
  const rows = annotation.events
    .map(
      (event) => `
        <div class="chart-detail-row">
          <span>${escapeHtml(event.label)}</span>
          <strong class="${event.amount < 0 ? "is-negative" : "is-positive"}">${escapeHtml(formatSignedCurrency(event.amount))}</strong>
        </div>
      `
    )
    .join("");

  if (isCompact) {
    return `
      <div class="chart-detail-list">${rows}</div>
    `;
  }

  return `
    <div class="chart-detail-summary">
      <div>
        <strong>${escapeHtml(`${annotation.monthLabel} / ${formatAge(annotation.age)}`)}</strong>
      </div>
      <strong class="chart-detail-amount ${annotation.total < 0 ? "is-negative" : "is-positive"}">${escapeHtml(formatSignedCurrency(annotation.total))}</strong>
    </div>
    <div class="chart-detail-list">${rows}</div>
  `;
}

function renderCashClusterZoomChart(cashSeriesValues, annotations) {
  if (!cashSeriesValues.length || !annotations.length) {
    return `<p class="inline-note">拡大表示できるデータがありません。</p>`;
  }

  const focusIndexes = annotations.map((annotation) => annotation.xIndex ?? 0);
  const windowStart = Math.max(0, Math.min(...focusIndexes) - 6);
  const windowEnd = Math.min(cashSeriesValues.length - 1, Math.max(...focusIndexes) + 6);
  const windowPoints = cashSeriesValues.filter((point) => point.xIndex >= windowStart && point.xIndex <= windowEnd);
  if (!windowPoints.length) {
    return `<p class="inline-note">拡大表示できるデータがありません。</p>`;
  }

  const width = 720;
  const height = 176;
  const padding = { top: 14, right: 18, bottom: 30, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = windowPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const xSpan = Math.max(1, windowEnd - windowStart);
  const getX = (xIndex) => padding.left + (plotWidth * (xIndex - windowStart)) / xSpan;
  const getY = (value) => padding.top + plotHeight - ((value - min) / span) * plotHeight;

  const path = windowPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${getX(point.xIndex).toFixed(2)} ${getY(point.value).toFixed(2)}`)
    .join(" ");

  const focusCircles = annotations
    .map(
      (annotation) => `
        <circle class="chart-zoom-focus" cx="${getX(annotation.xIndex).toFixed(2)}" cy="${getY(annotation.value).toFixed(2)}" r="5.2" fill="${annotation.total >= 0 ? "#0f6a6f" : "#c75c33"}"></circle>
      `
    )
    .join("");

  const tickLabels = pickAxisTickPoints(
    windowPoints.map((point) => ({
      xIndex: point.xIndex,
      label: point.label,
    })),
    3
  )
    .map((tick) => `<text x="${getX(tick.xIndex).toFixed(2)}" y="${height - 8}" text-anchor="middle">${escapeHtml(tick.label)}</text>`)
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="cash detail zoom chart">
      <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
      <line x1="${padding.left}" x2="${width - padding.right}" y1="${getY(max).toFixed(2)}" y2="${getY(max).toFixed(2)}" stroke="rgba(98, 83, 63, 0.12)"></line>
      <line x1="${padding.left}" x2="${width - padding.right}" y1="${getY((max + min) / 2).toFixed(2)}" y2="${getY((max + min) / 2).toFixed(2)}" stroke="rgba(98, 83, 63, 0.12)"></line>
      <line x1="${padding.left}" x2="${width - padding.right}" y1="${getY(min).toFixed(2)}" y2="${getY(min).toFixed(2)}" stroke="rgba(98, 83, 63, 0.12)"></line>
      <path d="${path}" fill="none" stroke="#0f6a6f" stroke-width="2.5" stroke-linecap="round"></path>
      ${focusCircles}
      <text x="${padding.left - 6}" y="${(getY(max) + 4).toFixed(2)}" text-anchor="end">${escapeHtml(formatCurrencyShort(max))}</text>
      <text x="${padding.left - 6}" y="${(getY(min) + 4).toFixed(2)}" text-anchor="end">${escapeHtml(formatCurrencyShort(min))}</text>
      ${tickLabels}
    </svg>
  `;
}

function renderImportedSimpleTable(rows, columns) {
  if (!rows.length) {
    return `
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
      <tbody><tr><td colspan="${columns.length}">CSV取込後に一覧を表示します。</td></tr></tbody>
    `;
  }

  return `
    <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows
        .map(
          (row) => `
            <tr>
              ${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;
}

function renderMoneyInput(attributes, value) {
  return `<input ${attributes} type="text" inputmode="decimal" data-input-kind="money" autocomplete="off" spellcheck="false" value="${escapeHtml(formatMoneyInputValue(value))}">`;
}

function renderNumericField(label, id, value, step = 1) {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input id="${escapeHtml(id)}" type="number" step="${escapeHtml(String(step))}" value="${escapeHtml(String(value ?? 0))}">
    </label>
  `;
}

function renderLabeledMetric(label, value) {
  return `
    <div class="field">
      <span>${escapeHtml(label)}</span>
      <div class="pill">${escapeHtml(value)}</div>
    </div>
  `;
}

function bindSimpleNumericInput(selector, path, parser = toNumber) {
  const input = document.querySelector(selector);
  if (!input) return;
  const handler = (event) => {
    setByPath(state, path, parser(event.target.value));
    if (event.type === "change") {
      saveAndRender();
    } else {
      scheduleRender();
    }
  };
  input.addEventListener("input", handler);
  input.addEventListener("change", handler);
}

function bindTableInputs(container, idAttribute, sourceArray, numericKeys, moneyKeys = []) {
  container.querySelectorAll(`[${idAttribute}]`).forEach((input) => {
    const handler = (event) => {
      const id = event.target.getAttribute(idAttribute);
      const row = sourceArray.find((item) => item.id === id);
      if (!row) return;
      const key = event.target.dataset.key;
      row[key] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      if (numericKeys.includes(key)) row[key] = moneyKeys.includes(key) ? parseMoney(row[key]) : toNumber(row[key]);
      if (event.type === "change") {
        saveAndRender();
      } else {
        scheduleRender();
      }
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });
}

function bindRemoveButtons(container, selector, type) {
  container.querySelectorAll(selector).forEach((button) => {
    button.addEventListener("click", () => {
      if (type === "removeLoan") state.manual.loans = state.manual.loans.filter((row) => row.id !== button.dataset.removeLoan);
      if (type === "removeCard") state.manual.cards = state.manual.cards.filter((row) => row.id !== button.dataset.removeCard);
      saveAndRender();
    });
  });
}

function setByPath(target, path, value) {
  const parts = path.split(".");
  const finalKey = parts.pop();
  const parent = parts.reduce((acc, key) => acc[key], target);
  parent[finalKey] = value;
}

async function readCsvFile(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!looksLikeMojibake(utf8)) return utf8;
  return new TextDecoder("shift-jis").decode(buffer);
}

function parseAssetListCsv(text) {
  const rows = parseCsvRows(text);
  const sections = {};
  let currentSection = null;
  let header = [];

  rows.forEach((rawRow) => {
    const row = rawRow.map((cell) => cell.trim());
    const first = row[0];
    if (!first) return;
    if (SECTION_HEADERS.has(first)) {
      currentSection = first;
      sections[currentSection] = { total: 0, headers: [], items: [] };
      header = [];
      return;
    }
    if (!currentSection) return;
    if (first.startsWith("合計：")) {
      sections[currentSection].total = parseMoney(first);
      return;
    }
    if (!header.length) {
      header = row.filter(Boolean);
      sections[currentSection].headers = header;
      return;
    }
    const item = {};
    header.forEach((column, index) => {
      item[column] = row[index] ?? "";
    });
    if (Object.values(item).some((value) => value !== "")) {
      sections[currentSection].items.push(item);
    }
  });

  return { sections };
}

function parseAssetTrendCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const [headerRow, ...bodyRows] = rows;
  return bodyRows.map((row) =>
    headerRow.reduce((acc, column, index) => {
      acc[column] = row[index] ?? "";
      return acc;
    }, {})
  );
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];
    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  return rows;
}

function seedSampleData() {
  state.profile.birthDate = "1975-03-10";
  state.imports.parsedAssetTrend = [
    { "日付": "2026/03/28", "合計（円）": "14855705" },
    { "日付": "2026/02/28", "合計（円）": "14810000" },
    { "日付": "2026/01/31", "合計（円）": "14730000" },
  ];
  state.imports.importedAt = new Date().toISOString();
  state.imports.parsedAssetList = {
    sections: {
      "預金・現金・暗号資産": {
        total: 1978413,
        items: [
          { "種類・名称": "代表口座 - 円普通", "残高": "250,492円", "保有金融機関": "住信SBIネット銀行" },
          { "種類・名称": "代表口座 - 米ドル普通", "残高": "22,994円", "保有金融機関": "住信SBIネット銀行" },
          { "種類・名称": "代表口座 - 米ドル定期", "残高": "112,175円", "保有金融機関": "住信SBIネット銀行" },
          { "種類・名称": "ビットコイン残高", "残高": "198,991円", "保有金融機関": "bitFlyer" },
          { "種類・名称": "代表口座 - 円仕組", "残高": "300,000円", "保有金融機関": "住信SBIネット銀行" },
        ],
      },
      "株式（現物）": {
        total: 1204741,
        items: [{ "銘柄コード": "7011", "銘柄名": "三菱重", "評価額": "297,505円", "保有金融機関": "SBI証券" }],
      },
      投資信託: {
        total: 3561870,
        items: [{ "銘柄名": "eMAXIS Slim 米国株式(S&P500)", "評価額": "144,379円", "保有金融機関": "SBI証券" }],
      },
      債券: {
        total: 2079886,
        items: [
          { "銘柄名": "第59回ソフトバンクグループ株式会社無担保社債", "評価額": "1,000,000円", "保有金融機関": "SBI証券" },
          { "銘柄名": "MW923 パナソニックHD 5.302% 2034/7/16満期", "評価額": "173,826円", "保有金融機関": "SBI証券" },
        ],
      },
      保険: {
        total: 1555313,
        items: [{ "名称": "終身保険", "現在価値": "1,555,313円" }],
      },
      年金: {
        total: 4229101,
        items: [{ "名称": "妻 SBIベネフィットシステムズ", "現在価値": "1,735,000円" }],
      },
      "ポイント・マイル": {
        total: 66381,
        items: [{ "名称": "楽天ポイント利息", "現在の価値": "60,797円" }],
      },
      "その他の資産": {
        total: 180000,
        items: [
          { "名称": "金", "現在価値": "10,000円", "保有金融機関": "SBI証券 金・プラチナ" },
          { "名称": "JA出資金", "現在価値": "170,000円", "保有金融機関": "JA出資金" },
        ],
      },
    },
  };

  state.phaseValues.active.incomes.salary = 500000;
  state.phaseValues.active.incomes.dividends = 20000;
  state.phaseValues.active.expenses.housing = 70000;
  state.phaseValues.active.expenses.food = 80000;
  state.phaseValues.active.expenses.cashCard = 120000;
  state.phaseValues.active.expenses.special = 30000;
  PHASES.slice(1).forEach((phase) => {
    state.phaseValues[phase.key].incomes = structuredClone(state.phaseValues.active.incomes);
    state.phaseValues[phase.key].expenses = structuredClone(state.phaseValues.active.expenses);
  });
  state.phaseValues.retired.incomes.salary = 180000;
  state.phaseValues.pension.incomes.salary = 0;
  state.phaseValues.pension.incomes.otherIncome = 220000;
  state.phaseValues.late.expenses.medical = 80000;

  hydrateStateFromImports();
  state.manual.funds.monthlyContribution = 30000;
  state.manual.stocks.monthlyContribution = 10000;
  state.manual.dollarSavings.monthlyContribution = 15000;
  state.manual.insurancePolicies = [
    createInsurancePolicy({
      name: "積立保険",
      premiumPerMonth: 12000,
      endMonth: "2035-03",
      memo: "サンプル",
    }),
  ];
  if (state.manual.pensions[0]) {
    state.manual.pensions[0].startAge = 65;
    state.manual.pensions[0].splitAmount = 70000;
    state.manual.pensions[0].contributionPerMonth = 10000;
  }
  state.manual.loans = [
    createLoan({
      name: "住宅ローン",
      balance: 12000000,
      annualRate: 0.8,
      monthlyPayment: 85000,
      endMonth: "2045-03",
      includedInExpenses: true,
    }),
  ];
  state.manual.cards = [
    createCardDebt({
      name: "クレジットカード未払",
      balance: 180000,
      dueMonth: "2026-04",
      paymentType: "一括",
      includedInExpenses: false,
    }),
  ];
}

function getSectionTotal(section) {
  return section?.total ?? 0;
}

function getInsuranceCurrentBalance() {
  const sections = state.imports.parsedAssetList?.sections ?? {};
  return getSectionTotal(sections["保険"]) + toNumber(state.manual.insuranceSettings.manualAdjustment);
}

function getPensionCurrentBalance() {
  return state.manual.pensions.reduce((sum, row) => sum + toNumber(row.currentValue), 0);
}

function getPensionLumpSumAmount(plan, useProjectedCurrent = false) {
  if (toNumber(plan.lumpSumAmount) > 0) return toNumber(plan.lumpSumAmount);
  if (useProjectedCurrent) return toNumber(plan.currentValue);

  let projectedBalance = toNumber(plan.currentValue);
  if (!state.profile.birthDate) return projectedBalance;

  const start = getSimulationStartDate();
  const end = getSimulationEndDate(state.profile.birthDate, Math.max(state.profile.endAge, toNumber(plan.startAge)));
  for (let cursor = new Date(start); cursor <= end; cursor = addMonths(cursor, 1)) {
    if (getAgeAtMonthEnd(state.profile.birthDate, cursor) >= toNumber(plan.startAge)) break;
    projectedBalance += toNumber(plan.contributionPerMonth);
  }
  return projectedBalance;
}

function createCashEvent(label, amount) {
  return {
    label,
    amount: toNumber(amount),
  };
}

function isDollarManagedCashItem(item) {
  const name = String(item["種類・名称"] ?? "");
  const institution = String(item["保有金融機関"] ?? "");
  return name.includes("米ドル普通") && institution.includes("住信SBIネット銀行");
}

function getDollarManagedCashItems(sections) {
  const items = sections["預金・現金・暗号資産"]?.items ?? [];
  return items.filter((item) => isDollarManagedCashItem(item));
}

function getDollarInitialBalance(sections) {
  return getDollarManagedCashItems(sections).reduce((sum, item) => sum + parseMoney(item["残高"]), 0);
}

function calculateAverageBondRate() {
  const simulationStartDate = getSimulationStartDate();
  const active = state.manual.bondAssets.filter((row) => !isBondMaturedOnOrBefore(row, simulationStartDate));
  const totalWeight = active.reduce((sum, row) => sum + getBondDisplayValue(row), 0);
  if (!totalWeight) return 0;
  return active.reduce((sum, row) => sum + getBondDisplayValue(row) * toNumber(row.rate), 0) / totalWeight;
}

function getBondDisplayValue(row) {
  if (row.faceValue > 0 && row.currentPrice > 0) return row.faceValue * row.currentPrice;
  return toNumber(row.currentValue);
}

function parseMoney(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^\d.-]/g, "")) || 0;
}

function toNumber(value) {
  return Number(value) || 0;
}

function sumValues(object) {
  return Object.values(object).reduce((sum, value) => sum + toNumber(value), 0);
}

function annualToMonthlyRate(annualPercent) {
  const annualRate = toNumber(annualPercent) / 100;
  return (1 + annualRate) ** (1 / 12) - 1;
}

function sortBondAssetsByMaturity() {
  state.manual.bondAssets.sort((left, right) => {
    const leftTime = getMaturitySortTime(left.maturityDate);
    const rightTime = getMaturitySortTime(right.maturityDate);
    if (leftTime !== rightTime) return leftTime - rightTime;
    return String(left.name || "").localeCompare(String(right.name || ""), "ja");
  });
}

function getMaturitySortTime(dateText) {
  if (!dateText) return Number.POSITIVE_INFINITY;
  const parsed = dateText.includes("/") ? parseJapaneseDate(dateText) : new Date(dateText);
  if (!parsed || Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  return parsed.getTime();
}

function getUsdJpyRate() {
  return Math.max(0.01, toNumber(state.assumptions.usdJpyRate) || 0.01);
}

function convertYenToUsd(amountYen) {
  return toNumber(amountYen) / getUsdJpyRate();
}

function convertUsdToYen(amountUsd) {
  return toNumber(amountUsd) * getUsdJpyRate();
}

function parseJapaneseDate(text) {
  if (!text) return null;
  const [year, month, day] = String(text).split("/").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameMonthOrPast(dateText, targetDate) {
  const date = dateText.includes("/") ? parseJapaneseDate(dateText) : new Date(dateText);
  if (!date || Number.isNaN(date.getTime())) return false;
  return date.getFullYear() < targetDate.getFullYear() || (date.getFullYear() === targetDate.getFullYear() && date.getMonth() <= targetDate.getMonth());
}

function isBondMaturedOnOrBefore(row, targetDate = getSimulationStartDate()) {
  return Boolean(row?.maturityDate) && isSameMonthOrPast(row.maturityDate, targetDate);
}

function parseBonusMonths(value) {
  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => item >= 1 && item <= 12);
}

function looksLikeMojibake(text) {
  return /鬆|蜀|繧|縺|�/.test(text.slice(0, 200));
}

function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(Math.round(toNumber(value)));
}

function formatMoneyInputValue(value) {
  return new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(parseMoney(value));
}

function getBalanceTrendClass(currentValue, previousValue, options = {}) {
  if (previousValue === null || previousValue === undefined) return "timeline-amount-flat";
  const delta = toNumber(currentValue) - toNumber(previousValue);
  if (!delta) return "timeline-amount-flat";
  const isGain = options.invert ? delta < 0 : delta > 0;
  return isGain ? "timeline-amount-gain" : "timeline-amount-loss";
}

function formatSignedCurrency(value) {
  const amount = Math.round(toNumber(value));
  if (!amount) return formatCurrency(0);
  return `${amount > 0 ? "+" : "-"}${formatCurrency(Math.abs(amount))}`;
}

function formatCurrencyShort(value) {
  const number = Math.round(toNumber(value));
  if (Math.abs(number) >= 100000000) return `${(number / 100000000).toFixed(1)}億`;
  if (Math.abs(number) >= 10000) return `${(number / 10000).toFixed(0)}万`;
  return new Intl.NumberFormat("ja-JP").format(number);
}

function formatDecimal(value, digits = 2) {
  return new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(toNumber(value));
}

function formatAge(value) {
  return `${Math.max(0, Math.floor(toNumber(value)))}歳`;
}

function formatPercent(value) {
  return `${toNumber(value).toFixed(2)}%`;
}

function formatCompactDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatDateTime(iso) {
  const date = new Date(iso);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatSimpleDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

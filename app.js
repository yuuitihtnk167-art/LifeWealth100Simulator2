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

const dom = {
  birthDate: document.querySelector("#birth-date"),
  inflationRate: document.querySelector("#inflation-rate"),
  usdJpyRate: document.querySelector("#usd-jpy-rate"),
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
  pensionTable: document.querySelector("#pension-table"),
  loanTable: document.querySelector("#loan-table"),
  cardTable: document.querySelector("#card-table"),
  researchStrip: document.querySelector("#research-strip"),
  networthChart: document.querySelector("#networth-chart"),
  cashChart: document.querySelector("#cash-chart"),
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

  dom.birthDate.addEventListener("change", (event) => {
    state.profile.birthDate = event.target.value;
    saveAndRender();
  });
  dom.inflationRate.addEventListener("change", (event) => {
    state.assumptions.inflationRate = toNumber(event.target.value);
    saveAndRender();
  });
  dom.usdJpyRate.addEventListener("change", (event) => {
    state.assumptions.usdJpyRate = toNumber(event.target.value);
    saveAndRender();
  });
  dom.endAge.addEventListener("change", (event) => {
    state.profile.endAge = Math.max(1, Math.round(toNumber(event.target.value)));
    saveAndRender();
  });

  document.querySelector("#add-bond-row").addEventListener("click", () => {
    state.manual.bondAssets.push(createBondRow());
    saveAndRender();
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

function createDefaultState() {
  const phaseValues = {};
  PHASES.forEach((phase, index) => {
    phaseValues[phase.key] = {
      startAge: index === 0 ? 0 : [65, 68, 85][index - 1],
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
      usdJpyRate: 150,
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
      actualTrendMonthly: [],
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
  const focusSnapshot = captureFocusSnapshot();
  computeProjection();
  saveState();
  renderApp(statusMessage);
  restoreFocusSnapshot(focusSnapshot);
}

function saveDraft() {
  saveState();
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
  switchView(currentView, true);
}

function renderTopForm() {
  dom.birthDate.value = state.profile.birthDate;
  dom.inflationRate.value = state.assumptions.inflationRate ?? 2;
  dom.usdJpyRate.value = state.assumptions.usdJpyRate ?? 150;
  dom.endAge.value = state.profile.endAge ?? 100;
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

  dom.heroNetWorth.textContent = summary ? formatCurrency(summary.currentNetWorth) : "--";
  dom.heroFutureWorth.textContent = summary ? formatCurrency(summary.futureNetWorth) : "--";
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
    { label: "ドル積立", value: snapshot.dollarBalance, view: "dollar", note: "SBIネット銀行の米ドル普通を初期値化" },
    { label: "年金", value: snapshot.pensionBalance, view: "pension", note: "開始年齢と受給条件は手入力" },
    { label: "負債", value: state.computed.summary?.currentDebt ?? 0, view: "debt", note: "純資産計算に使用" },
  ];

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
      const value = state.phaseValues[phase.key].startAge;
      return `
        <label class="field">
          <span>${escapeHtml(phase.label)}開始年齢</span>
          <input type="number" min="0" max="120" step="1" data-phase-start="${escapeHtml(phase.key)}" value="${escapeHtml(String(value))}">
        </label>
      `;
    })
    .join("");

  dom.phaseStartsForm.querySelectorAll("[data-phase-start]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const key = event.target.dataset.phaseStart;
      state.phaseValues[key].startAge = Math.max(0, Math.round(toNumber(event.target.value)));
      saveAndRender();
    });
  });
}

function renderCashflowSections() {
  dom.cashflowPhaseSections.innerHTML = PHASES.map((phase, index) => {
    const values = state.phaseValues[phase.key];
    const totalIncome = sumValues(values.incomes);
    const totalExpenses = sumValues(values.expenses);
    const monthlyBalance = totalIncome - totalExpenses;
    const incomes = INCOME_FIELDS.map(
      (field) => `
        <label class="field">
          <span>${escapeHtml(field.label)}</span>
          <input type="number" min="0" step="1000" value="${escapeHtml(String(values.incomes[field.key] ?? 0))}" data-phase-field="${phase.key}" data-kind="income" data-key="${field.key}">
        </label>
      `
    ).join("");

    const expenses = EXPENSE_FIELDS.map(
      (field) => `
        <label class="field">
          <span>${escapeHtml(field.label)}</span>
          <input type="number" min="0" step="1000" value="${escapeHtml(String(values.expenses[field.key] ?? 0))}" data-phase-field="${phase.key}" data-kind="expense" data-key="${field.key}">
        </label>
      `
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
          ${renderLabeledMetric("月次収支", formatCurrency(monthlyBalance))}
        </div>
        ${index < PHASES.length - 1 ? `<div class="action-row"><button type="button" class="ghost-button" data-copy-phase="${escapeHtml(phase.key)}">下のフェーズへコピー</button></div>` : ""}
        <h3>収入</h3>
        <div class="form-grid form-grid-4">${incomes}</div>
        <h3>支出</h3>
        <div class="form-grid form-grid-4">${expenses}</div>
      </article>
    `;
  }).join("");

  dom.cashflowPhaseSections.querySelectorAll("[data-phase-field]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const phaseKey = event.target.dataset.phaseField;
      const kind = event.target.dataset.kind;
      const key = event.target.dataset.key;
      const bucket = kind === "income" ? state.phaseValues[phaseKey].incomes : state.phaseValues[phaseKey].expenses;
      bucket[key] = toNumber(event.target.value);
      saveAndRender();
    });
  });

  dom.cashflowPhaseSections.querySelectorAll("[data-copy-phase]").forEach((button) => {
    button.addEventListener("click", () => {
      copyPhaseToOthers(button.dataset.copyPhase);
      saveAndRender();
    });
  });
}

function copyPhaseToOthers(phaseKey) {
  const source = state.phaseValues[phaseKey];
  const sourceIndex = PHASES.findIndex((phase) => phase.key === phaseKey);
  PHASES.forEach((phase, index) => {
    if (index <= sourceIndex) return;
    state.phaseValues[phase.key].incomes = structuredClone(source.incomes);
    state.phaseValues[phase.key].expenses = structuredClone(source.expenses);
  });
}

function renderBondSection() {
  const snapshot = state.computed.snapshot;
  const activeRows = state.manual.bondAssets.filter((row) => !row.isMatured);
  const maturedRows = state.manual.bondAssets.filter((row) => row.isMatured);
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
  if (["faceValue", "currentPrice", "rate", "currentValue"].includes(key)) {
    row[key] = toNumber(row[key]);
  }
  if (row.faceValue > 0 && row.currentPrice > 0) {
    row.currentValue = row.faceValue * row.currentPrice;
  }
  if (event.type === "change") {
    saveAndRender();
  } else {
    saveDraft();
  }
}

function renderFundsSection() {
  const snapshot = state.computed.snapshot;
  dom.fundSettingsForm.innerHTML = `
    ${renderLabeledMetric("残高", snapshot ? formatCurrency(snapshot.fundsBalance) : "--")}
    ${renderNumericField("月々の積立額", "fund-monthly", state.manual.funds.monthlyContribution)}
    ${renderNumericField("想定利回り（年）", "fund-return", state.manual.funds.expectedReturn, 0.1)}
    ${renderNumericField("積立終了年齢", "fund-end-age", state.manual.funds.endAge, 1)}
  `;
  bindSimpleNumericInput("#fund-monthly", "manual.funds.monthlyContribution");
  bindSimpleNumericInput("#fund-return", "manual.funds.expectedReturn");
  bindSimpleNumericInput("#fund-end-age", "manual.funds.endAge");

  const rows = state.imports.parsedAssetList?.sections?.["投資信託"]?.items ?? [];
  dom.fundImportTable.innerHTML = renderImportedSimpleTable(rows, ["銘柄名", "評価額", "保有金融機関"]);
}

function renderStocksSection() {
  const snapshot = state.computed.snapshot;
  dom.stockSettingsForm.innerHTML = `
    ${renderLabeledMetric("残高", snapshot ? formatCurrency(snapshot.stocksBalance) : "--")}
    ${renderNumericField("月々の積立額", "stock-monthly", state.manual.stocks.monthlyContribution)}
    ${renderNumericField("想定利回り（年）", "stock-return", state.manual.stocks.expectedReturn, 0.1)}
    ${renderNumericField("積立終了年齢", "stock-end-age", state.manual.stocks.endAge, 1)}
  `;
  bindSimpleNumericInput("#stock-monthly", "manual.stocks.monthlyContribution");
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
  bindSimpleNumericInput("#insurance-adjustment", "manual.insuranceSettings.manualAdjustment");
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
      if (key === "premiumPerMonth") row[key] = toNumber(row[key]);
      if (event.type === "change") {
        saveAndRender();
      } else {
        saveDraft();
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
    ${renderNumericField("月々の積立額", "dollar-monthly", state.manual.dollarSavings.monthlyContribution)}
    ${renderNumericField("想定利回り（年）", "dollar-return", state.manual.dollarSavings.expectedReturn, 0.1)}
    ${renderNumericField("積立終了年齢", "dollar-end-age", state.manual.dollarSavings.endAge, 1)}
  `;
  bindSimpleNumericInput("#dollar-monthly", "manual.dollarSavings.monthlyContribution");
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
              <td><input type="number" step="1" data-pension-id="${escapeHtml(row.id)}" data-key="lumpSumAmount" value="${escapeHtml(String(row.lumpSumAmount ?? 0))}"></td>
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
      if (["currentValue", "startAge", "contributionPerMonth", "splitAmount", "lumpSumAmount"].includes(key)) {
        row[key] = toNumber(row[key]);
      }
      if (event.type === "change") {
        saveAndRender();
      } else {
        saveDraft();
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

  bindTableInputs(dom.loanTable, "data-loan-id", state.manual.loans, ["balance", "annualRate", "monthlyPayment", "bonusPayment"]);
  bindTableInputs(dom.cardTable, "data-card-id", state.manual.cards, ["balance", "monthlyPayment", "annualRate"]);
  bindRemoveButtons(dom.loanTable, "[data-remove-loan]", "removeLoan");
  bindRemoveButtons(dom.cardTable, "[data-remove-card]", "removeCard");
}

function renderResearchSection() {
  const summary = state.computed.summary;
  const actualTrend = state.computed.actualTrendMonthly;

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

  renderLineChart(dom.networthChart, [
    {
      name: "実績総資産",
      color: "#8a5627",
      values: actualTrend.map((row) => ({ label: row.monthLabel, value: row.total })),
    },
    {
      name: "予測総資産",
      color: "#0f6a6f",
      values: state.computed.timeline.map((row) => ({ label: row.monthLabel, value: row.totalAssets })),
    },
    {
      name: "予測純資産",
      color: "#c75c33",
      values: state.computed.timeline.map((row) => ({ label: row.monthLabel, value: row.netWorth })),
    },
  ]);

  renderLineChart(dom.cashChart, [
    {
      name: "使える現金",
      color: "#0f6a6f",
      values: state.computed.timeline.map((row) => ({ label: row.monthLabel, value: row.effectiveCash })),
    },
  ]);

  const timelineRows = state.computed.timeline.slice(0, 240);
  dom.timelineTable.innerHTML = `
    <thead>
      <tr>
        <th>年月</th>
        <th>フェーズ</th>
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
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.monthLabel)}</td>
                    <td>${escapeHtml(row.phaseLabel)}</td>
                    <td>${formatCurrency(row.effectiveCash)}</td>
                    <td>${formatCurrency(row.dollarBalance)}</td>
                    <td>${formatCurrency(row.bondLikeAssets)}</td>
                    <td>${formatCurrency(row.fundsBalance)}</td>
                    <td>${formatCurrency(row.stocksBalance)}</td>
                    <td>${formatCurrency(row.insuranceBalance)}</td>
                    <td>${formatCurrency(row.pensionAssetBalance)}</td>
                    <td>${formatCurrency(row.debtBalance)}</td>
                    <td>${formatCurrency(row.netWorth)}</td>
                  </tr>
                `
              )
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

function downloadBackup() {
  const payload = {
    ...state,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lifewealth100-backup-${formatCompactDate(new Date())}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
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
      existing.currentValue = candidate.currentValue;
      existing.excludeFromCash = candidate.excludeFromCash;
    } else {
      state.manual.bondAssets.push(candidate);
    }
  });
}

function buildImportedBondRows(sections) {
  const rows = [];
  (sections["債券"]?.items ?? []).forEach((item) => {
    rows.push(
      createBondRow({
        name: item["銘柄名"] || "債券",
        institution: item["保有金融機関"] || "",
        currentValue: parseMoney(item["評価額"]),
        sourceCategory: "bonds",
        type: "bond",
        destination: "cash",
      })
    );
  });

  const cashCandidates = (sections["預金・現金・暗号資産"]?.items ?? []).filter((item) => {
    const name = `${item["種類・名称"] ?? ""}${item["保有金融機関"] ?? ""}`;
    return /米ドル定期|ビットコイン|Mona|円仕組|米ドル 現金/i.test(name);
  });

  cashCandidates.forEach((item) => {
    rows.push(
      createBondRow({
        name: item["種類・名称"] || "現金除外資産",
        institution: item["保有金融機関"] || "",
        currentValue: parseMoney(item["残高"]),
        sourceCategory: "cash",
        type: /ビットコイン|Mona/i.test(item["種類・名称"] || "") ? "volatile" : "foreign",
        excludeFromCash: true,
        currency: /米ドル/i.test(item["種類・名称"] || "") ? "USD" : "JPY",
        destination: /米ドル/i.test(item["種類・名称"] || "") ? "dollar" : "cash",
      })
    );
  });

  (sections["その他の資産"]?.items ?? []).forEach((item) => {
    rows.push(
      createBondRow({
        name: item["名称"] || "その他の資産",
        institution: item["保有金融機関"] || "",
        currentValue: parseMoney(item["現在価値"]),
        sourceCategory: "other",
        type: item["名称"]?.includes("金") ? "volatile" : "locked",
        destination: "keep",
      })
    );
  });

  return rows;
}

function computeProjection() {
  const snapshot = computeSnapshot();
  const warnings = buildWarnings(snapshot);
  const actualTrendMonthly = normalizeActualTrend(state.imports.parsedAssetTrend);
  const timeline = buildForecastTimeline(snapshot);
  const summary = buildSummary(snapshot, timeline);

  state.computed = {
    warnings,
    snapshot,
    timeline,
    summary,
    actualTrendMonthly,
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
    averageBondRate,
  };
}

function buildWarnings(snapshot) {
  const warnings = [];
  if (!state.profile.birthDate) warnings.push({ location: "基本情報", message: "誕生日が未入力です。" });

  state.manual.bondAssets.forEach((row) => {
    row.isMatured = Boolean(row.maturityDate) && isSameMonthOrPast(row.maturityDate, getSimulationStartDate());
    if (!row.currency) warnings.push({ location: "債券", message: `${row.name || "債券"} の通貨が未入力です。` });
    if (!row.maturityDate && row.type === "bond") warnings.push({ location: "債券", message: `${row.name || "債券"} の償還日が未入力です。` });
    if (row.rate === 0 && row.type === "bond") warnings.push({ location: "債券", message: `${row.name || "債券"} の利率が未入力または0%です。` });
  });

  state.manual.pensions.forEach((row) => {
    if (!row.splitAmount && row.payoutType === "split") warnings.push({ location: "年金", message: `${row.name || "年金"} の分割金額が未入力です。` });
    if (!row.lumpSumAmount && row.payoutType === "lump") warnings.push({ location: "年金", message: `${row.name || "年金"} の一括受取額が未入力です。` });
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
  const timeline = [];

  let effectiveCash = snapshot.effectiveCash;
  let fundsBalance = snapshot.fundsBalance;
  let stocksBalance = snapshot.stocksBalance;
  let bondAssets = structuredClone(state.manual.bondAssets).map((row) => ({ ...row }));
  let insurancePolicies = structuredClone(state.manual.insurancePolicies).map((row) => ({ ...row }));
  let insuranceRunningBalance = snapshot.insuranceBalance;
  let pensionPlans = structuredClone(state.manual.pensions).map((row) => ({ ...row }));
  let dollarBalance = snapshot.dollarBalance;
  let loans = structuredClone(state.manual.loans).map((row) => ({ ...row }));
  let cards = structuredClone(state.manual.cards).map((row) => ({ ...row }));
  let monthsSinceStart = 0;
  const oneTimePensionPaidIds = new Set();

  for (let cursor = new Date(start); cursor <= end; cursor = addMonths(cursor, 1)) {
    const monthLabel = `${cursor.getFullYear()}/${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const age = getAgeAtMonthEnd(state.profile.birthDate, cursor);
    const phase = getPhaseForAge(age);
    const phaseValues = state.phaseValues[phase.key];
    const inflationFactor = (1 + monthlyInflationRate) ** monthsSinceStart;
    const monthlyIncome = sumValues(phaseValues.incomes);
    const monthlyExpenses = sumValues(phaseValues.expenses) * inflationFactor;

    effectiveCash += monthlyIncome;

    if (age < state.manual.funds.endAge) {
      effectiveCash -= state.manual.funds.monthlyContribution;
      fundsBalance += state.manual.funds.monthlyContribution;
    }
    if (age < state.manual.stocks.endAge) {
      effectiveCash -= state.manual.stocks.monthlyContribution;
      stocksBalance += state.manual.stocks.monthlyContribution;
    }
    if (age < state.manual.dollarSavings.endAge) {
      effectiveCash -= state.manual.dollarSavings.monthlyContribution;
      dollarBalance += state.manual.dollarSavings.monthlyContribution;
    }

    insurancePolicies.forEach((policy) => {
      if (!policy.endMonth || monthLabel <= policy.endMonth.replace("-", "/")) {
        effectiveCash -= policy.premiumPerMonth;
        insuranceRunningBalance += policy.premiumPerMonth;
      }
    });
    insuranceRunningBalance *= 1 + annualToMonthlyRate(state.manual.insuranceSettings.expectedReturn);

    pensionPlans.forEach((plan) => {
      if (age < plan.startAge) {
        effectiveCash -= plan.contributionPerMonth;
        plan.currentValue += plan.contributionPerMonth;
      } else if (plan.payoutType === "split") {
        effectiveCash += plan.splitAmount;
      } else if (plan.payoutType === "lump" && !oneTimePensionPaidIds.has(plan.id)) {
        effectiveCash += plan.lumpSumAmount;
        oneTimePensionPaidIds.add(plan.id);
      }
    });

    effectiveCash -= monthlyExpenses;

    bondAssets.forEach((row) => {
      row.currentValue = getBondDisplayValue(row) * (1 + annualToMonthlyRate(row.rate || 0));
      if (row.maturityDate && !row.isMatured && isSameMonthOrPast(row.maturityDate, cursor)) {
        if (row.destination === "cash") effectiveCash += row.currentValue;
        if (row.destination === "dollar") dollarBalance += row.currentValue;
        row.isMatured = true;
      }
    });

    fundsBalance *= 1 + annualToMonthlyRate(state.manual.funds.expectedReturn);
    stocksBalance *= 1 + annualToMonthlyRate(state.manual.stocks.expectedReturn);
    dollarBalance *= 1 + annualToMonthlyRate(state.manual.dollarSavings.expectedReturn);

    loans.forEach((loan) => {
      if (loan.balance <= 0) return;
      if (loan.endMonth && monthLabel > loan.endMonth.replace("-", "/")) return;
      const interest = loan.balance * annualToMonthlyRate(loan.annualRate);
      let payment = loan.monthlyPayment;
      if (parseBonusMonths(loan.bonusMonths).includes(cursor.getMonth() + 1)) payment += loan.bonusPayment;
      if (!loan.includedInExpenses) effectiveCash -= payment;
      loan.balance = Math.max(0, loan.balance - Math.max(0, payment - interest));
    });

    cards.forEach((card) => {
      if (card.balance <= 0) return;
      if (card.paymentType === "一括") {
        if (card.dueMonth && monthLabel === card.dueMonth.replace("-", "/")) {
          if (!card.includedInExpenses) effectiveCash -= card.balance;
          card.balance = 0;
        }
        return;
      }
      const interest = card.balance * annualToMonthlyRate(card.annualRate);
      if (!card.includedInExpenses) effectiveCash -= card.monthlyPayment;
      card.balance = Math.max(0, card.balance - Math.max(0, card.monthlyPayment - interest));
    });

    const bondLikeAssets = bondAssets.filter((row) => !row.isMatured).reduce((sum, row) => sum + getBondDisplayValue(row), 0);
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
    firstShortageMonth: firstShortage?.monthLabel ?? "",
    monthlyImprovementNeeded: firstShortage ? Math.ceil(Math.abs(firstShortage.effectiveCash) / 12 / 1000) * 1000 : 0,
  };
}

function normalizeActualTrend(rows) {
  if (!rows?.length) return [];
  const grouped = new Map();
  rows.forEach((row) => {
    const date = parseJapaneseDate(row["日付"]);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = grouped.get(key);
    if (!existing || date > existing.date) {
      grouped.set(key, {
        monthLabel: `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`,
        date,
        total: toNumber(row["合計（円）"]),
      });
    }
  });
  return [...grouped.values()].sort((a, b) => a.date - b.date);
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

function renderLineChart(container, seriesList) {
  const allPoints = seriesList.flatMap((series) => series.values);
  if (!allPoints.length) {
    container.innerHTML = `<div class="inline-note">表示できるデータがまだありません。</div>`;
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
  const sampleLabels = pickAxisLabels(allPoints.map((point) => point.label), 6);

  const lines = seriesList
    .map((series) => {
      if (!series.values.length) return "";
      const path = series.values
        .map((point, index) => {
          const x = padding.left + (plotWidth * index) / Math.max(1, series.values.length - 1);
          const y = padding.top + plotHeight - ((point.value - min) / span) * plotHeight;
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
      return `<path d="${path}" fill="none" stroke="${series.color}" stroke-width="3" stroke-linecap="round"></path>`;
    })
    .join("");

  const axisLabels = sampleLabels
    .map((label, index) => {
      const x = padding.left + (plotWidth * index) / Math.max(1, sampleLabels.length - 1);
      return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#576268">${escapeHtml(label)}</text>`;
    })
    .join("");

  const valueLabels = [max, min, (max + min) / 2]
    .map((value) => {
      const y = padding.top + plotHeight - ((value - min) / span) * plotHeight;
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

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="資産推移グラフ">
      <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
      ${valueLabels}
      ${lines}
      ${axisLabels}
      ${legend}
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

function bindSimpleNumericInput(selector, path) {
  const input = document.querySelector(selector);
  if (!input) return;
  const handler = (event) => {
    setByPath(state, path, toNumber(event.target.value));
    if (event.type === "change") {
      saveAndRender();
    } else {
      saveDraft();
    }
  };
  input.addEventListener("input", handler);
  input.addEventListener("change", handler);
}

function bindTableInputs(container, idAttribute, sourceArray, numericKeys) {
  container.querySelectorAll(`[${idAttribute}]`).forEach((input) => {
    const handler = (event) => {
      const id = event.target.getAttribute(idAttribute);
      const row = sourceArray.find((item) => item.id === id);
      if (!row) return;
      const key = event.target.dataset.key;
      row[key] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      if (numericKeys.includes(key)) row[key] = toNumber(row[key]);
      if (event.type === "change") {
        saveAndRender();
      } else {
        saveDraft();
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

function getDollarInitialBalance(sections) {
  const items = sections["預金・現金・暗号資産"]?.items ?? [];
  return items.reduce((sum, item) => {
    if ((item["種類・名称"] ?? "").includes("米ドル普通") && (item["保有金融機関"] ?? "").includes("住信SBIネット銀行")) {
      return sum + parseMoney(item["残高"]);
    }
    return sum;
  }, 0);
}

function calculateAverageBondRate() {
  const active = state.manual.bondAssets.filter((row) => !row.isMatured);
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

function parseBonusMonths(value) {
  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => item >= 1 && item <= 12);
}

function pickAxisLabels(labels, count) {
  if (labels.length <= count) return labels;
  const step = Math.max(1, Math.floor(labels.length / (count - 1)));
  const sample = labels.filter((_, index) => index % step === 0);
  const last = labels[labels.length - 1];
  if (sample[sample.length - 1] !== last) sample.push(last);
  return sample.slice(0, count);
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

function formatCurrencyShort(value) {
  const number = Math.round(toNumber(value));
  if (Math.abs(number) >= 100000000) return `${(number / 100000000).toFixed(1)}億`;
  if (Math.abs(number) >= 10000) return `${(number / 10000).toFixed(0)}万`;
  return new Intl.NumberFormat("ja-JP").format(number);
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

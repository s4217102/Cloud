// ===== Paycheck plan =====
// You get paid every 2 weeks. Each bill gets a small piece of every paycheck,
// saved in the bank account that pays that bill.
//
// Saved data looks like:
// accounts: { id, name, balance }
// bills:    { id, name, amount, often, accountId, due }
let plan = loadData("budget-plan", {
  accounts: [],
  bills: [],
  nextPayday: "",
});

const PAYDAYS_A_YEAR = 26; // paid every 2 weeks = 26 times a year

// How many times a year each kind of bill comes
const TIMES_A_YEAR = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

const OFTEN_TEXT = {
  weekly: "every week",
  fortnightly: "every 2 weeks",
  monthly: "every month",
  quarterly: "every 3 months",
  yearly: "every year",
};

function savePlan() {
  saveData("budget-plan", plan);
}

// Stop typed names from breaking the page
function clean(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---- Date helpers (dates are saved as "YYYY-MM-DD") ----
function toDate(text) {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toText(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function today() {
  return toText(new Date());
}

function addDays(text, days) {
  const date = toDate(text);
  date.setDate(date.getDate() + days);
  return toText(date);
}

// Add months but keep the day safe (Jan 31 + 1 month = Feb 28, not Mar 3)
function addMonths(text, months) {
  const date = toDate(text);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toText(date);
}

// When is the bill due after this one?
function nextDue(often, due) {
  if (often === "weekly") return addDays(due, 7);
  if (often === "fortnightly") return addDays(due, 14);
  if (often === "monthly") return addMonths(due, 1);
  if (often === "quarterly") return addMonths(due, 3);
  return addMonths(due, 12); // yearly
}

// ---- The money maths ----

// How much to save for one bill every payday
function perPayday(bill) {
  return (bill.amount * TIMES_A_YEAR[bill.often]) / PAYDAYS_A_YEAR;
}

// How much one account should get every payday (all its bills together)
function shareForAccount(accountId) {
  let total = 0;
  plan.bills.forEach(function (bill) {
    if (bill.accountId === accountId) total += perPayday(bill);
  });
  return Math.round(total * 100) / 100; // round to cents
}

// Total of bills this account must pay up to a date
function dueUntil(accountId, endDate) {
  let total = 0;
  plan.bills.forEach(function (bill) {
    if (bill.accountId !== accountId) return;
    let due = bill.due;
    while (due <= endDate) {
      total += bill.amount;
      due = nextDue(bill.often, due);
    }
  });
  return total + installmentsDue(accountId, endDate);
}

// What to send to an account this payday:
// its bills share + Pay in 4 payments due in the next 2 weeks
function toSendNow(accountId) {
  const share = shareForAccount(accountId) + installmentsDue(accountId, addDays(today(), 13));
  return Math.round(share * 100) / 100;
}

function getNextPayday() {
  return plan.nextPayday || addDays(today(), 14);
}

function findAccount(id) {
  return plan.accounts.find(function (account) {
    return account.id === id;
  });
}

// ---- Tabs ----
document.querySelectorAll(".tabs button").forEach(function (button) {
  button.addEventListener("click", function () {
    document.querySelectorAll(".tabs button").forEach(function (b) {
      b.classList.remove("active");
    });
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.classList.add("hidden");
    });
    button.classList.add("active");
    document.getElementById("tab-" + button.dataset.tab).classList.remove("hidden");
  });
});

// ---- Accounts ----
document.getElementById("account-form").addEventListener("submit", function (event) {
  event.preventDefault();
  plan.accounts.push({
    id: Date.now(),
    name: document.getElementById("account-name").value,
    balance: Number(document.getElementById("account-balance").value) || 0,
  });
  savePlan();
  showPlan();
  event.target.reset();
});

function editBalance(account) {
  askNumber(`How much is in "${account.name}" now?`, account.balance, function (answer) {
    if (answer === "" || isNaN(Number(answer))) return;
    account.balance = Number(answer);
    savePlan();
    showPlan();
  });
}

function deleteAccount(account) {
  const used =
    plan.bills.some(function (bill) {
      return bill.accountId === account.id;
    }) ||
    buys.some(function (buy) {
      return buy.accountId === account.id;
    });
  if (used) {
    showMessage("Some bills or Pay in 4 purchases use this account. Delete those first.");
    return;
  }
  askYesNo(`Delete "${account.name}"?`, function () {
    plan.accounts = plan.accounts.filter(function (a) {
      return a.id !== account.id;
    });
    savePlan();
    showPlan();
  });
}

function showAccounts() {
  const list = document.getElementById("account-list");
  list.innerHTML = "";

  if (plan.accounts.length === 0) {
    list.innerHTML = '<p class="empty">Add your bank accounts first 🏦</p>';
    return;
  }

  const payday = getNextPayday();

  plan.accounts.forEach(function (account) {
    // Bills due before the next payday must be covered by what's in there now
    const needed = dueUntil(account.id, payday);
    const status =
      account.balance >= needed
        ? `<span class="ok">✔ Enough for bills before ${payday}</span>`
        : `<span class="warn">⚠ Short ${money(needed - account.balance)} for bills before ${payday}</span>`;

    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${clean(account.name)}</strong><br>
        <small>Gets ${money(shareForAccount(account.id))} each payday</small><br>
        <small>${status}</small>
      </div>
      <div>
        <span>${money(account.balance)}</span>
        <button class="small-btn edit">Edit</button>
        <button class="delete" title="Delete">✕</button>
      </div>`;
    li.querySelector(".edit").addEventListener("click", function () {
      editBalance(account);
    });
    li.querySelector(".delete").addEventListener("click", function () {
      deleteAccount(account);
    });
    list.appendChild(li);
  });
}

// ---- Bills ----
document.getElementById("bill-form").addEventListener("submit", function (event) {
  event.preventDefault();
  if (plan.accounts.length === 0) {
    showMessage("Please add a bank account first (Accounts tab).");
    return;
  }
  plan.bills.push({
    id: Date.now(),
    name: document.getElementById("bill-name").value,
    amount: Number(document.getElementById("bill-amount").value),
    often: document.getElementById("bill-often").value,
    accountId: Number(document.getElementById("bill-account").value),
    due: document.getElementById("bill-due").value,
  });
  savePlan();
  showPlan();
  event.target.reset();
});

// Paid a bill: take it out of its account, add it to the tracker,
// and move the due date to the next time
function payBill(bill) {
  const account = findAccount(bill.accountId);
  account.balance -= bill.amount;

  items.push({
    id: Date.now(),
    name: bill.name,
    amount: bill.amount,
    type: "expense",
    category: "Bills",
    date: today(),
  });
  save();

  bill.due = nextDue(bill.often, bill.due);
  savePlan();
  showEverything();
  showPlan();
}

function deleteBill(bill) {
  askYesNo(`Delete "${bill.name}"?`, function () {
    plan.bills = plan.bills.filter(function (b) {
      return b.id !== bill.id;
    });
    savePlan();
    showPlan();
  });
}

function showBills() {
  // Fill the "which account pays it" box
  const select = document.getElementById("bill-account");
  select.innerHTML = "";
  plan.accounts.forEach(function (account) {
    select.innerHTML += `<option value="${account.id}">Paid from: ${clean(account.name)}</option>`;
  });

  const list = document.getElementById("bill-list");
  list.innerHTML = "";

  if (plan.bills.length === 0) {
    list.innerHTML = '<p class="empty">No bills yet</p>';
    return;
  }

  // Soonest due first
  const sorted = [...plan.bills].sort(function (a, b) {
    return a.due.localeCompare(b.due);
  });

  sorted.forEach(function (bill) {
    const account = findAccount(bill.accountId);
    const late = bill.due < today() ? ' <span class="warn">(late!)</span>' : "";

    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${clean(bill.name)}</strong> · ${money(bill.amount)} ${OFTEN_TEXT[bill.often]}<br>
        <small>Due ${bill.due}${late} · from ${clean(account.name)}</small><br>
        <small>Save ${money(perPayday(bill))} each payday</small>
      </div>
      <div>
        <button class="small-btn pay">Paid</button>
        <button class="delete" title="Delete">✕</button>
      </div>`;
    li.querySelector(".pay").addEventListener("click", function () {
      payBill(bill);
    });
    li.querySelector(".delete").addEventListener("click", function () {
      deleteBill(bill);
    });
    list.appendChild(li);
  });
}

// ---- Payday split ----
const payInput = document.getElementById("pay-amount");
const paydayInput = document.getElementById("next-payday");

payInput.addEventListener("input", showSplit);

paydayInput.addEventListener("change", function () {
  plan.nextPayday = paydayInput.value;
  savePlan();
  showPlan();
});

function showSplit() {
  const box = document.getElementById("split");
  const pay = Number(payInput.value) || 0;

  if (plan.accounts.length === 0) {
    box.innerHTML = '<p class="empty">Add your accounts and bills to see your plan</p>';
    return;
  }

  let rows = "";
  let totalToMove = 0;
  plan.accounts.forEach(function (account) {
    const share = toSendNow(account.id);
    const payIn4 = installmentsDue(account.id, addDays(today(), 13));
    const note = payIn4 > 0 ? `<br><small>incl. ${money(payIn4)} Pay in 4</small>` : "";
    totalToMove += share;
    rows += `<li><span>${clean(account.name)}${note}</span><span>${money(share)}</span></li>`;
  });

  const leftOver = pay - totalToMove;
  let leftText = "";
  if (pay > 0) {
    leftText =
      leftOver >= 0
        ? `<li class="left-over"><span>Free to spend 🎉</span><span class="ok">${money(leftOver)}</span></li>`
        : `<li class="left-over"><span>⚠ Bills need more than this paycheck</span><span class="warn">${money(-leftOver)}</span></li>`;
  }

  box.innerHTML = `
    <p><strong>Send this to each account:</strong></p>
    <ul>${rows}${leftText}</ul>`;
}

// You moved the money: add it to each account, log the paycheck,
// and set the next payday 2 weeks later
document.getElementById("moved").addEventListener("click", function () {
  const pay = Number(payInput.value);
  if (!pay) {
    showMessage("Type your paycheck amount first.");
    return;
  }

  plan.accounts.forEach(function (account) {
    account.balance += toSendNow(account.id);
  });

  items.push({
    id: Date.now(),
    name: "Paycheck",
    amount: pay,
    type: "income",
    category: "Salary",
    date: today(),
  });
  save();

  plan.nextPayday = addDays(getNextPayday(), 14);
  savePlan();

  payInput.value = "";
  showEverything();
  showPlan();
  showMessage("Done! Your accounts are updated. 🎉");
});

// ---- Show all plan pages ----
function showPlan() {
  paydayInput.value = getNextPayday();
  showAccounts();
  showBills();
  showSplit();
  showInstallments();
}

showPlan();

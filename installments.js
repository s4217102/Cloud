// ===== Pay in 4 (Afterpay, PayPal...) =====
// You buy something and pay it in a few parts, every 2 weeks.
//
// Saved data looks like:
// { id, name, provider, total, count, first, accountId, paid: [true, false, ...] }
let buys = loadData("budget-installments", []);

function saveBuys() {
  saveData("budget-installments", buys);
}

// ---- The money maths ----

// Split the total evenly. The last payment takes any leftover cents.
// Example: $100 in 4 = $25, $25, $25, $25
function paymentAmount(buy, index) {
  const each = Math.floor((buy.total / buy.count) * 100) / 100;
  if (index < buy.count - 1) return each;
  return Math.round((buy.total - each * (buy.count - 1)) * 100) / 100;
}

// Payments come every 2 weeks after the first one
function paymentDate(buy, index) {
  return addDays(buy.first, 14 * index);
}

// Unpaid payments due on or before a date (for one account, or all if no account)
function installmentsDue(accountId, endDate) {
  let total = 0;
  buys.forEach(function (buy) {
    if (accountId && buy.accountId !== accountId) return;
    buy.paid.forEach(function (isPaid, i) {
      if (!isPaid && paymentDate(buy, i) <= endDate) total += paymentAmount(buy, i);
    });
  });
  return total;
}

// How much is still owed on one purchase
function owedLeft(buy) {
  let total = 0;
  buy.paid.forEach(function (isPaid, i) {
    if (!isPaid) total += paymentAmount(buy, i);
  });
  return total;
}

// Show dates like "20 Nov"
function shortDate(text) {
  return toDate(text).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// ---- Add a purchase ----
document.getElementById("buy-form").addEventListener("submit", function (event) {
  event.preventDefault();
  if (plan.accounts.length === 0) {
    showMessage("Please add a bank account first (Accounts tab).");
    return;
  }

  const count = Number(document.getElementById("buy-count").value);
  const paid = new Array(count).fill(false);
  // Afterpay and PayPal take the first payment when you buy
  paid[0] = document.getElementById("buy-first-paid").checked;

  buys.push({
    id: Date.now(),
    name: document.getElementById("buy-name").value,
    provider: document.getElementById("buy-provider").value,
    total: Number(document.getElementById("buy-total").value),
    count: count,
    first: document.getElementById("buy-first").value,
    accountId: Number(document.getElementById("buy-account").value),
    paid: paid,
  });
  saveBuys();
  event.target.reset();
  showPlan(); // also puts today's date back in the form
});

// ---- Pay one part: take it out of the account and add it to the tracker ----
function payPart(buy, index) {
  const amount = paymentAmount(buy, index);
  askYesNo(`Mark ${money(amount)} for "${buy.name}" as paid?`, function () {
    markPartPaid(buy, index, amount);
  });
}

function markPartPaid(buy, index, amount) {
  findAccount(buy.accountId).balance -= amount;
  buy.paid[index] = true;

  items.push({
    id: Date.now(),
    name: `${buy.name} (${buy.provider})`,
    amount: amount,
    type: "expense",
    category: "Pay in 4",
    date: today(),
  });

  save();
  savePlan();
  saveBuys();
  showEverything();
  showPlan();
}

function deleteBuy(buy) {
  askYesNo(`Delete "${buy.name}"?`, function () {
    buys = buys.filter(function (b) {
      return b.id !== buy.id;
    });
    saveBuys();
    showPlan();
  });
}

// ---- Show the Pay in 4 page ----
function showInstallments() {
  // Fill the "paid from" box
  const select = document.getElementById("buy-account");
  select.innerHTML = "";
  plan.accounts.forEach(function (account) {
    select.innerHTML += `<option value="${account.id}">Paid from: ${clean(account.name)}</option>`;
  });

  // Today as the default first payment date
  const firstInput = document.getElementById("buy-first");
  if (!firstInput.value) firstInput.value = today();

  // Totals at the top
  let owed = 0;
  buys.forEach(function (buy) {
    owed += owedLeft(buy);
  });
  document.getElementById("owed-total").textContent = money(owed);
  document.getElementById("owed-soon").textContent = money(installmentsDue(null, addDays(today(), 13)));

  const list = document.getElementById("buy-list");
  list.innerHTML = "";

  if (buys.length === 0) {
    list.innerHTML = '<p class="empty">No Pay in 4 purchases 🎉</p>';
    return;
  }

  buys.forEach(function (buy) {
    const account = findAccount(buy.accountId);
    const left = owedLeft(buy);
    const leftText = left > 0 ? `${money(left)} left of ${money(buy.total)}` : "All paid 🎉";

    const li = document.createElement("li");
    li.className = "buy";
    li.innerHTML = `
      <div class="buy-top">
        <div>
          <strong>${clean(buy.name)}</strong> · ${buy.provider}<br>
          <small>${leftText} · from ${clean(account ? account.name : "(no account)")}</small>
        </div>
        <button class="delete" title="Delete">✕</button>
      </div>
      <div class="chips"></div>`;

    // One button for each payment. Click it when you pay.
    buy.paid.forEach(function (isPaid, i) {
      const chip = document.createElement("button");
      const date = paymentDate(buy, i);
      chip.className = "chip";
      if (isPaid) {
        chip.classList.add("paid");
        chip.disabled = true;
        chip.textContent = `✔ ${shortDate(date)} · ${money(paymentAmount(buy, i))}`;
      } else {
        if (date < today()) chip.classList.add("late");
        chip.textContent = `${shortDate(date)} · ${money(paymentAmount(buy, i))}`;
        chip.addEventListener("click", function () {
          payPart(buy, i);
        });
      }
      li.querySelector(".chips").appendChild(chip);
    });

    li.querySelector(".delete").addEventListener("click", function () {
      deleteBuy(buy);
    });
    list.appendChild(li);
  });
}

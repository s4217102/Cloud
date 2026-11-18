// ---- 1. Load saved data ----
// We keep every item in this list. Each item looks like:
// { id, name, amount, type: "income" or "expense", category, date }
let items = JSON.parse(localStorage.getItem("budget-items")) || [];

// Grab the parts of the page we need
const form = document.getElementById("form");
const list = document.getElementById("list");
const dateInput = document.getElementById("date");

// Set today's date as the default
dateInput.value = new Date().toISOString().slice(0, 10);

// ---- 2. Helpers ----
function money(number) {
  return "$" + number.toFixed(2);
}

function save() {
  localStorage.setItem("budget-items", JSON.stringify(items));
}

// ---- 3. Add a new item ----
form.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading

  const newItem = {
    id: Date.now(),
    name: document.getElementById("name").value,
    amount: Number(document.getElementById("amount").value),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    date: dateInput.value,
  };

  items.push(newItem);
  save();
  showEverything();

  // Clear the name and amount boxes for the next one
  document.getElementById("name").value = "";
  document.getElementById("amount").value = "";
});

// ---- 4. Delete an item ----
function deleteItem(id) {
  items = items.filter(function (item) {
    return item.id !== id;
  });
  save();
  showEverything();
}

// ---- 5. Show the totals at the top ----
function showTotals() {
  let income = 0;
  let expense = 0;

  items.forEach(function (item) {
    if (item.type === "income") {
      income += item.amount;
    } else {
      expense += item.amount;
    }
  });

  document.getElementById("total-income").textContent = money(income);
  document.getElementById("total-expense").textContent = money(expense);
  document.getElementById("balance").textContent = money(income - expense);
}

// ---- 6. Show spending per category ----
function showCategories() {
  const box = document.getElementById("categories");
  const totals = {};
  let allSpending = 0;

  items.forEach(function (item) {
    if (item.type === "expense") {
      totals[item.category] = (totals[item.category] || 0) + item.amount;
      allSpending += item.amount;
    }
  });

  if (allSpending === 0) {
    box.innerHTML = '<p class="empty">No expenses yet</p>';
    return;
  }

  box.innerHTML = "";
  for (const category in totals) {
    const percent = (totals[category] / allSpending) * 100;
    box.innerHTML += `
      <div class="cat-row">
        <div class="cat-label">
          <span>${category}</span>
          <span>${money(totals[category])} (${percent.toFixed(0)}%)</span>
        </div>
        <div class="bar"><div style="width: ${percent}%"></div></div>
      </div>`;
  }
}

// ---- 7. Show the history list ----
function showList() {
  list.innerHTML = "";

  if (items.length === 0) {
    list.innerHTML = '<p class="empty">Nothing added yet</p>';
    return;
  }

  // Newest date first
  const sorted = [...items].sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  sorted.forEach(function (item) {
    const li = document.createElement("li");
    const sign = item.type === "income" ? "+" : "-";
    const color = item.type === "income" ? "plus" : "minus";

    li.innerHTML = `
      <div>
        <strong></strong><br>
        <small>${item.category} · ${item.date}</small>
      </div>
      <div>
        <span class="${color}">${sign}${money(item.amount)}</span>
        <button class="delete" title="Delete">✕</button>
      </div>`;

    // Use textContent for the name so any typed text shows safely
    li.querySelector("strong").textContent = item.name;
    li.querySelector(".delete").addEventListener("click", function () {
      deleteItem(item.id);
    });

    list.appendChild(li);
  });
}

// ---- 8. Update the whole page ----
function showEverything() {
  showTotals();
  showCategories();
  showList();
}

showEverything();

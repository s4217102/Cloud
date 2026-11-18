// ===== Helpers used by every page =====

// ---- Saving data in the browser ----
// If the browser blocks saving (like a private window), the app still works,
// it just won't remember things next time.
function loadData(key, startValue) {
  try {
    return JSON.parse(localStorage.getItem(key)) || startValue;
  } catch (error) {
    return startValue;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Saving is blocked: keep going without saving
  }
}

// ---- Our own pop-up box ----
// (Some places, like the web page viewer, block the browser's pop-ups.)
const dialog = document.getElementById("dialog");
const dialogText = document.getElementById("dialog-text");
const dialogInput = document.getElementById("dialog-input");
const dialogOk = document.getElementById("dialog-ok");
const dialogCancel = document.getElementById("dialog-cancel");
let whenOk = null;

function openDialog(text, options) {
  dialogText.textContent = text;
  dialogInput.classList.toggle("hidden", !options.number);
  dialogCancel.classList.toggle("hidden", !options.cancel);
  dialogInput.value = options.number ? options.value : "";
  whenOk = options.onOk || null;
  dialog.classList.add("open");
  (options.number ? dialogInput : dialogOk).focus();
}

dialogOk.addEventListener("click", function () {
  const done = whenOk;
  dialog.classList.remove("open");
  if (done) done(dialogInput.value);
});

dialogCancel.addEventListener("click", function () {
  dialog.classList.remove("open");
});

// Just a message with an OK button
function showMessage(text) {
  openDialog(text, {});
}

// "Are you sure?" with Cancel and OK
function askYesNo(text, onYes) {
  openDialog(text, { cancel: true, onOk: onYes });
}

// Ask for a number (like a new balance)
function askNumber(text, value, onDone) {
  openDialog(text, { cancel: true, number: true, value: value, onOk: onDone });
}

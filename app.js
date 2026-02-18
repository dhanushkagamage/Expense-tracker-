const STORAGE_KEY = "expenseTracker.v1";

const form = document.getElementById("expenseForm");
const dateEl = document.getElementById("date");
const amountEl = document.getElementById("amount");
const categoryEl = document.getElementById("category");
const noteEl = document.getElementById("note");

const listEl = document.getElementById("list");
const totalEl = document.getElementById("monthTotal");
const monthFilterEl = document.getElementById("monthFilter");

const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

// --- helpers ---
function money(n){
  return new Intl.NumberFormat("en-AU", { style:"currency", currency:"AUD" }).format(n || 0);
}

function todayISO(){
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0,10);
}

function currentMonthISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}

function load(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }catch{
    return [];
  }
}

function save(items){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function uuid(){
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function matchesMonth(item, monthYYYYMM){
  return item.date?.slice(0,7) === monthYYYYMM;
}

function toCSV(rows){
  const header = ["Date","Category","Note","Amount"];
  const lines = [header.join(",")];
  for(const r of rows){
    const line = [
      r.date,
      `"${(r.category || "").replace(/"/g,'""')}"`,
      `"${(r.note || "").replace(/"/g,'""')}"`,
      (r.amount ?? 0)
    ].join(",");
    lines.push(line);
  }
  return lines.join("\n");
}

function download(filename, text){
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- render ---
function render(){
  const items = load();
  const month = monthFilterEl.value || currentMonthISO();
  const filtered = items
    .filter(i => matchesMonth(i, month))
    .sort((a,b) => (b.date || "").localeCompare(a.date || ""));

  // total
  const total = filtered.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  totalEl.textContent = money(total);

  // table
  listEl.innerHTML = "";
  for(const item of filtered){
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = item.date || "";

    const tdCat = document.createElement("td");
    tdCat.textContent = item.category || "";

    const tdNote = document.createElement("td");
    tdNote.textContent = item.note || "";

    const tdAmt = document.createElement("td");
    tdAmt.className = "right";
    tdAmt.textContent = money(Number(item.amount) || 0);

    const tdDel = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "del";
    btn.textContent = "Delete";
    btn.addEventListener("click", () => {
      const next = load().filter(x => x.id !== item.id);
      save(next);
      render();
    });
    tdDel.appendChild(btn);

    tr.appendChild(tdDate);
    tr.appendChild(tdCat);
    tr.appendChild(tdNote);
    tr.appendChild(tdAmt);
    tr.appendChild(tdDel);

    listEl.appendChild(tr);
  }
}

// --- init defaults ---
dateEl.value = todayISO();
monthFilterEl.value = currentMonthISO();
render();

// --- events ---
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const date = dateEl.value;
  const amount = Number(amountEl.value);
  const category = categoryEl.value;
  const note = noteEl.value.trim();

  if(!date || !category || !Number.isFinite(amount) || amount <= 0){
    alert("Please enter a valid date, category, and amount.");
    return;
  }

  const items = load();
  items.push({ id: uuid(), date, amount, category, note });
  save(items);

  // reset fields
  amountEl.value = "";
  noteEl.value = "";
  categoryEl.value = "";
  dateEl.value = todayISO();

  render();
});

monthFilterEl.addEventListener("change", render);

exportBtn.addEventListener("click", () => {
  const month = monthFilterEl.value || currentMonthISO();
  const items = load().filter(i => matchesMonth(i, month));
  const csv = toCSV(items);
  download(`expenses-${month}.csv`, csv);
});

clearBtn.addEventListener("click", () => {
  if(confirm("Clear ALL saved expenses? This cannot be undone.")){
    localStorage.removeItem(STORAGE_KEY);
    render();
  }
});

// Лист героя — базовая логика (без кубов)
// Всё на русском. Данные хранятся в localStorage.

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

// Меняем ключ, чтобы обновления не конфликтовали со старыми полями
const КЛЮЧ = "hero_list_state_v3";

const состояние = {
  locked: false,
  уровень: 3,
  хп: { тек: 28, макс: 40, врем: 0 },
  кд: 16,
  скорость: 30,
  вдохновение: 0,
  хар: { сила: 15, ловкость: 14, телосложение: 14, интеллект: 10, мудрость: 12, харизма: 8 },
  быстрыеАтаки: Array.from({length: 5}, ()=>({ имя:"", бонус:"", урон:"" })),
  навыки: {
    // true = владение (проф.), false/undefined = нет
    "Атлетика": false,
    "Акробатика": false,
    "Ловкость рук": false,
    "Скрытность": false,

    "Магия": false,
    "История": false,
    "Анализ": false,
    "Природа": false,
    "Религия": false,

    "Уход за животными": false,
    "Проницательность": false,
    "Медицина": false,
    "Внимательность": false,
    "Выживание": false,

    "Выступление": false,
    "Запугивание": false,
    "Обман": false,
    "Убеждение": false
  }
};

function бонусМастерства(уровень){
  if(уровень >= 17) return 6;
  if(уровень >= 13) return 5;
  if(уровень >= 9) return 4;
  if(уровень >= 5) return 3;
  return 2;
}
function модификатор(знач){
  return Math.floor((знач - 10) / 2);
}
function форматМод(n){
  return (n >= 0 ? "+" : "") + n;
}
function clampInt(v, min, max, fallback){
  const n = parseInt(String(v).replace(/[^\d-]/g,""), 10);
  if(Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function загрузить(){
  try{
    const raw = localStorage.getItem(КЛЮЧ);
    if(!raw) return;
    const obj = JSON.parse(raw);

    // мягко мержим
    Object.assign(состояние, obj);
    состояние.хп = Object.assign({тек:0,макс:0,врем:0}, состояние.хп);
    состояние.хар = Object.assign({сила:10,ловкость:10,телосложение:10,интеллект:10,мудрость:10,харизма:10}, состояние.хар);
    состояние.вдохновение = clampInt(состояние.вдохновение, 0, 99, 0);

    const атак = Array.isArray(obj.быстрыеАтаки) ? obj.быстрыеАтаки : [];
    состояние.быстрыеАтаки = Array.from({length: 5}, (_,i)=> Object.assign({имя:"",бонус:"",урон:""}, атак[i]||{}));

    состояние.навыки = Object.assign({}, состояние.навыки, obj.навыки || {});
  }catch(e){}
}
function сохранить(){
  localStorage.setItem(КЛЮЧ, JSON.stringify(состояние));
}

function applyLock(){
  const locked = !!состояние.locked;

  // ✅ переключаем иконку через классы кнопки
  const btn = $("#замок");
  if(btn){
    btn.classList.toggle("locked", locked);
    btn.classList.toggle("unlocked", !locked);
  }

  // Инпуты/textarea
  $$(".lockable").forEach(el=>{
    if(el.id === "замок") return;
    if(el.classList.contains("tab")) return;

    if(el.tagName === "INPUT" || el.tagName === "TEXTAREA"){
      el.disabled = locked;
    }else{
      // кнопки-дивы
      el.setAttribute("aria-disabled", locked ? "true" : "false");
      if(locked) el.classList.add("disabled"); else el.classList.remove("disabled");
    }
  });
}

function нарисоватьБыстрыеАтаки(){
  const root = $("#быстрые_атаки");
  if(!root) return;
  root.innerHTML = "";

  for(let i=0;i<5;i++){
    const row = document.createElement("div");
    row.className = "atk-row";

    const a = состояние.быстрыеАтаки[i] || {имя:"",бонус:"",урон:""};

    row.innerHTML = `
      <input class="field atk-name lockable" data-idx="${i}" data-field="имя" placeholder="" value="${esc(a.имя)}" />
      <input class="field atk-bonus lockable" data-idx="${i}" data-field="бонус" inputmode="text" placeholder="" value="${esc(a.бонус)}" />
      <input class="field atk-dmg lockable" data-idx="${i}" data-field="урон" inputmode="text" placeholder="" value="${esc(a.урон)}" />
    `;
    root.appendChild(row);
  }
}

function esc(s){
  return String(s ?? "").replaceAll("&","&amp;").replaceAll("\"","&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function показать(){
  $("#уровень").value = состояние.уровень;

  $("#хп_тек").value = состояние.хп.тек;
  $("#хп_макс").value = состояние.хп.макс;
  $("#хп_врем").value = состояние.хп.врем;

  $("#кд").value = состояние.кд;
  $("#скорость").value = состояние.скорость;
  $("#вдохновение").value = состояние.вдохновение;

  // бонус мастерства
  $("#бм").textContent = форматМод(бонусМастерства(состояние.уровень));

  // хар-ки: значения + моды
  const карты = [
    ["сила","сила_знач","сила_мод"],
    ["ловкость","ловк_знач","ловк_мод"],
    ["телосложение","тело_знач","тело_мод"],
    ["интеллект","инт_знач","инт_мод"],
    ["мудрость","мудр_знач","мудр_мод"],
    ["харизма","хар_знач","хар_мод"],
  ];
  for(const [key, idInp, idMod] of карты){
    const v = clampInt(состояние.хар[key], 1, 30, 10);
    const inp = $("#"+idInp);
    if(inp) inp.value = v;
    $("#"+idMod).textContent = форматМод(модификатор(v));
  }

  // инициатива
  $("#иниц_текст").textContent = форматМод(модификатор(состояние.хар.ловкость));

  // быстрые атаки
  нарисоватьБыстрыеАтаки();

  // навыки
  нарисоватьНавыки();

  applyLock();
}

function нарисоватьНавыки(){
  const контейнер = $("#список_навыков");
  if(!контейнер) return;
  контейнер.innerHTML = "";

  const привязка = {
    "Атлетика": "сила",
    "Акробатика": "ловкость",
    "Ловкость рук": "ловкость",
    "Скрытность": "ловкость",
    "Магия": "интеллект",
    "История": "интеллект",
    "Анализ": "интеллект",
    "Природа": "интеллект",
    "Религия": "интеллект",
    "Уход за животными": "мудрость",
    "Проницательность": "мудрость",
    "Медицина": "мудрость",
    "Внимательность": "мудрость",
    "Выживание": "мудрость",
    "Выступление": "харизма",
    "Запугивание": "харизма",
    "Обман": "харизма",
    "Убеждение": "харизма"
  };

  const бм = бонусМастерства(состояние.уровень);

  Object.keys(состояние.навыки).forEach(название=>{
    const хар = привязка[название] || "ловкость";
    const баз = модификатор(состояние.хар[хар] ?? 10);
    const проф = !!состояние.навыки[название];
    const итог = баз + (проф ? бм : 0);

    const row = document.createElement("div");
    row.className = "skill";

    const pip = document.createElement("div");
    pip.className = "pip" + (проф ? " on" : "");
    pip.title = "Владение";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = название;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<b>${форматМод(итог)}</b> <span>(${хар})</span>`;

    row.appendChild(pip);
    row.appendChild(name);
    row.appendChild(meta);

    row.addEventListener("click", ()=>{
      if(состояние.locked) return;
      состояние.навыки[название] = !состояние.навыки[название];
      сохранить();
      показать();
    }, {passive:true});

    контейнер.appendChild(row);
  });
}

function bind(){
  // вкладки
  $$(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-to");
      $$(".tab").forEach(x=>x.setAttribute("aria-selected","false"));
      btn.setAttribute("aria-selected","true");
      $$(".page").forEach(p=>p.classList.remove("active"));
      $("#"+id).classList.add("active");
    });
  });

  // замок
  $("#замок").addEventListener("click", ()=>{
    состояние.locked = !состояние.locked;
    сохранить();
    applyLock();
  }, {passive:true});

  // поля боя
  
  // уровень — только через кнопки (- / +), без ручного ввода
  const levelEl = $("#уровень");
  const btnMinus = $("#уровень_минус");
  const btnPlus  = $("#уровень_плюс");

  // на всякий: блокируем любое "вводимое" действие
  if(levelEl){
    levelEl.setAttribute("readonly","readonly");
    levelEl.setAttribute("inputmode","none");
    levelEl.addEventListener("keydown", (e)=>{ e.preventDefault(); });
    levelEl.addEventListener("beforeinput", (e)=>{ e.preventDefault(); });
    levelEl.addEventListener("paste", (e)=>{ e.preventDefault(); });
    levelEl.addEventListener("cut", (e)=>{ e.preventDefault(); });
  }

  function применитьУровень(n){
    состояние.уровень = clampInt(n, 1, 20, состояние.уровень);
    сохранить();
    показать();
  }

  if(btnMinus){
    btnMinus.addEventListener("click", ()=>{
      if(состояние.locked) return;
      применитьУровень(состояние.уровень - 1);
    }, {passive:true});
  }
  if(btnPlus){
    btnPlus.addEventListener("click", ()=>{
      if(состояние.locked) return;
      применитьУровень(состояние.уровень + 1);
    }, {passive:true});
  }
$("#хп_тек").addEventListener("input", e=>{ состояние.хп.тек = clampInt(e.target.value, 0, 999, состояние.хп.тек); сохранить(); });
  $("#хп_макс").addEventListener("input", e=>{ состояние.хп.макс = clampInt(e.target.value, 0, 999, состояние.хп.макс); сохранить(); });
  $("#хп_врем").addEventListener("input", e=>{ состояние.хп.врем = clampInt(e.target.value, 0, 999, состояние.хп.врем); сохранить(); });
  $("#кд").addEventListener("input", e=>{ состояние.кд = clampInt(e.target.value, 0, 99, состояние.кд); сохранить(); });
  $("#скорость").addEventListener("input", e=>{ состояние.скорость = clampInt(e.target.value, 0, 999, состояние.скорость); сохранить(); });
  $("#вдохновение").addEventListener("input", e=>{ состояние.вдохновение = clampInt(e.target.value, 0, 99, состояние.вдохновение); сохранить(); });

  // длинный отдых = хп тек = хп макс
  $("#длинный_отдых").addEventListener("click", ()=>{
    if(состояние.locked) return;
    состояние.хп.тек = clampInt(состояние.хп.макс, 0, 999, состояние.хп.тек);
    сохранить();
    показать();
  }, {passive:true});

  // хар-ки (редактируются прямо в карточках)
  const map = [
    ["сила_знач","сила"],
    ["ловк_знач","ловкость"],
    ["тело_знач","телосложение"],
    ["инт_знач","интеллект"],
    ["мудр_знач","мудрость"],
    ["хар_знач","харизма"],
  ];
  for(const [id, key] of map){
    const el = $("#"+id);
    if(!el) continue;
    el.addEventListener("input", (e)=>{
      состояние.хар[key] = clampInt(e.target.value, 1, 30, состояние.хар[key] ?? 10);
      сохранить();
      показать();
    });
  }

  // быстрые атаки (делегирование)
  const atkRoot = $("#быстрые_атаки");
  if(atkRoot){
    atkRoot.addEventListener("input", (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLInputElement)) return;
      const idx = clampInt(t.dataset.idx, 0, 4, -1);
      const fld = t.dataset.field;
      if(idx < 0 || !fld) return;
      состояние.быстрыеАтаки[idx] = состояние.быстрыеАтаки[idx] || {имя:"",бонус:"",урон:""};
      состояние.быстрыеАтаки[idx][fld] = t.value;
      сохранить();
    });
  }
}

function регSW(){
  if(!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

window.addEventListener("DOMContentLoaded", ()=>{
  загрузить();
  bind();
  показать();
  регSW();
});

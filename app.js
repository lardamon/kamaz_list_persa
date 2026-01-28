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
  },

инв: {
  активная: "money",
  деньги: { см: "", зм: "", пм: "" }, // ✅ редактируемые поля
  предметы: [] // { id, cat, name, desc, createdAt }
},

маг: {
  активная: "slots", // slots | spells
  слоты: { 1:[],2:[],3:[],4:[],5:[],6:[],7:[],8:[],9:[] },
  заклинания: [] // { id, name, level, desc }
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
        // инвентарь
состояние.инв = Object.assign(
  { активная:"money", деньги:{см:"", зм:"", пм:""}, предметы:[] },
  obj.инв || {}
);
if(!состояние.инв.деньги) состояние.инв.деньги = {см:"", зм:"", пм:""};
if(!Array.isArray(состояние.инв.предметы)) состояние.инв.предметы = [];
// магия
состояние.маг = Object.assign(
  { слоты:{1:[],2:[],3:[],4:[],5:[],6:[],7:[],8:[],9:[]} },
  obj.маг || obj.mag || {}
);
if(!состояние.маг.слоты) состояние.маг.слоты = {1:[],2:[],3:[],4:[],5:[],6:[],7:[],8:[],9:[]};
for(let lvl=1; lvl<=9; lvl++){
  const arr = состояние.маг.слоты[lvl];
  состояние.маг.слоты[lvl] = Array.isArray(arr) ? arr.map(v=>!!v) : [];
}
// ✅ магия: активная вкладка + заклинания
if(!состояние.маг.активная) состояние.маг.активная = "slots";
if(!Array.isArray(состояние.маг.заклинания)) состояние.маг.заклинания = [];

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

  // инвентарь
  // инвентарь
  invRender();

  // магия
  magRender();
  magRenderUI();

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
/* =========================
   ИНВЕНТАРЬ
   ========================= */

const INV_CATS = [
  ["money", "Деньги"],
  ["weapons", "Оружие"],
  ["armor", "Броня"],
  ["accessories", "Аксессуары"],
  ["potions", "Зелья"],
  ["scrolls", "Свитки"],
  ["other", "Прочее"],
];
function showXpTable(){
  const wrap = document.createElement("div");

  const title = document.createElement("div");
  title.style.fontWeight = "1000";
  title.style.marginBottom = "6px";
  title.textContent = "Развитие персонажа";
  wrap.appendChild(title);

  const table = document.createElement("table");
  table.className = "xp-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Очки опыта</th>
        <th>Уровень</th>
        <th>Бонус мастерства</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>0</td><td>1</td><td>+2</td></tr>
      <tr><td>300</td><td>2</td><td>+2</td></tr>
      <tr><td>900</td><td>3</td><td>+2</td></tr>
      <tr><td>2,700</td><td>4</td><td>+2</td></tr>
      <tr><td>6,500</td><td>5</td><td>+3</td></tr>
      <tr><td>14,000</td><td>6</td><td>+3</td></tr>
      <tr><td>23,000</td><td>7</td><td>+3</td></tr>
      <tr><td>34,000</td><td>8</td><td>+3</td></tr>
      <tr><td>48,000</td><td>9</td><td>+4</td></tr>
      <tr><td>64,000</td><td>10</td><td>+4</td></tr>
      <tr><td>85,000</td><td>11</td><td>+4</td></tr>
      <tr><td>100,000</td><td>12</td><td>+4</td></tr>
      <tr><td>120,000</td><td>13</td><td>+5</td></tr>
      <tr><td>140,000</td><td>14</td><td>+5</td></tr>
      <tr><td>165,000</td><td>15</td><td>+5</td></tr>
      <tr><td>195,000</td><td>16</td><td>+5</td></tr>
      <tr><td>225,000</td><td>17</td><td>+6</td></tr>
      <tr><td>265,000</td><td>18</td><td>+6</td></tr>
      <tr><td>305,000</td><td>19</td><td>+6</td></tr>
      <tr><td>355,000</td><td>20</td><td>+6</td></tr>
    </tbody>
  `;
  wrap.appendChild(table);

  const bOk = invBtn("Ок");
  bOk.addEventListener("click", invCloseModal);

  invOpenModal("Таблица опыта", wrap, [bOk]);
}

function showRulesModal(){
  const wrap = document.createElement("div");

  const title = document.createElement("div");
  title.style.fontWeight = "1000";
  title.style.marginBottom = "8px";
  title.textContent = "Формулы (D&D 5e)";
  wrap.appendChild(title);

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "8px";
  list.style.fontSize = "13px";
  list.innerHTML = `
    <div><b>КД персонажа без доспеха:</b><br>10 + модификатор Ловкости</div>

    <div><b>Безоружный удар:</b><br>1к20 + бонус мастерства + модификатор Силы</div>
    <div><b>Урон безоружного удара:</b><br>1 + модификатор Силы</div>

    <div><b>Рукопашная атака оружием:</b><br>1к20 + бонус мастерства + модификатор Силы (Для фехтовального оружия может использоваться Ловкость)</div>
    <div><b>Урон рукопашной атаки оружием:</b><br>Кость оружия + модификатор Силы (Для фехтовального оружия может использоваться Ловкость)</div>

    <div><b>Дальнобойная атака оружием:</b><br>1к20 + бонус мастерства + модификатор Ловкости (Для рукопашного оружия со свойством метательное используется тот же модификатор, что и для рукопашной атаки)</div>
    <div><b>Урон дальнобойной атаки оружием:</b><br>Кость оружия + модификатор Ловкости (Для рукопашного оружия со свойством метательное используется тот же модификатор, что и для рукопашной атаки)</div>

    <div><b>Атака заклинанием:</b><br>1к20 + бонус мастерства + модификатор базовой характеристики заклинателя</div>
    <div><b>Урон заклинания:</b><br>индивидуален для каждого заклинания</div>
    <div><b>Сложность спасброска от заклинания:</b><br>8 + модификатор базовой характеристики заклинания + бонус мастерства</div>

    <div><b>Порядок ходов в бою:</b><br>1к20 + Инициатива (модификатор Ловкости)</div>

    <div><b>Спасбросок:</b><br>1к20 + модификатор характеристики + бонус мастерства (если у вас есть владение спасброском)</div>
    <div><b>Пассивное Восприятие:</b><br>10 + модификатор Мудрости (Восприятие)</div>
    <div><b>Стабилизация умирающего:</b><br>1к20 + модификатор Мудрости (Медицина) Сл 10</div>
    <div><b>Применение инструментов:</b><br>1к20 + модификатор характеристики (скажет Мастер) + бонус мастерства (если есть владение инструментом)</div>
  `;
  wrap.appendChild(list);

  const bOk = invBtn("Ок");
  bOk.addEventListener("click", invCloseModal);

  invOpenModal("Формулы", wrap, [bOk]);
}

function invOpenModal(title, contentNode, actions){
  const modal = $("#invModal");
  if(!modal) return;

  $("#invModalTitle").textContent = title;

  const c = $("#invModalContent");
  c.innerHTML = "";
  if(contentNode) c.appendChild(contentNode);

  const a = $("#invModalActions");
  a.innerHTML = "";
  (actions || []).forEach(btn => a.appendChild(btn));

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
}

function invCloseModal(){
  const modal = $("#invModal");
  if(!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
}

function invBtn(text, kind="normal"){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn";
  if(kind === "danger"){
    b.style.borderColor = "rgba(255,43,22,.38)";
  }
  b.textContent = text;
  return b;
}

function invRender(){
  const tabs = $("#invTabs");
  const list = $("#invList");
  const addBtn = $("#invAddBtn");
  if(!tabs || !list) return;

  // подсветка активной вкладки
  $$(".inv-tab", tabs).forEach(b=>{
    b.classList.toggle("is-active", b.dataset.invTab === состояние.инв.активная);
  });

  // ✅ ДЕНЬГИ: показываем 3 инпута, прячем "+"
  if(состояние.инв.активная === "money"){
    if(addBtn) addBtn.style.display = "none";

    const box = document.createElement("div");
    box.className = "inv-money";

    const makeField = (labelText, key) => {
      const wrap = document.createElement("div");
      wrap.className = "inv-money__cell";

      const lab = document.createElement("div");
      lab.className = "inv-money__label";
      lab.textContent = labelText;

      const inp = document.createElement("input");
      inp.className = "inv-money__input";
      inp.inputMode = "numeric";
      inp.placeholder = "0";
      inp.value = (состояние.инв.деньги && состояние.инв.деньги[key]) ? состояние.инв.деньги[key] : "";

      inp.addEventListener("input", ()=>{
        if(состояние.locked) return;
        // оставляем только цифры
        const v = inp.value.replace(/[^\d]/g, "");
        if(inp.value !== v) inp.value = v;

        состояние.инв.деньги[key] = v;
        сохранить();
      });

      wrap.appendChild(lab);
      wrap.appendChild(inp);
      return wrap;
    };

    box.appendChild(makeField("СМ", "см"));
    box.appendChild(makeField("ЗМ", "зм"));
    box.appendChild(makeField("ПМ", "пм"));

    list.innerHTML = "";
    list.appendChild(box);
    return;
  }

  // ✅ НЕ деньги: возвращаем "+"
  if(addBtn) addBtn.style.display = "";

  const items = (состояние.инв.предметы || []).filter(x => x.cat === состояние.инв.активная);

  list.innerHTML = "";
  if(items.length === 0){
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.innerHTML = `Предметов нет.<br>Нажми <b>+</b>, чтобы добавить.`;
    list.appendChild(empty);
    return;
  }

  items
    .slice()
    .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
    .forEach(item=>{
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "inv-item";
      btn.dataset.invId = item.id;

      const left = document.createElement("div");
      const t = document.createElement("div");
      t.className = "inv-item__title";
      t.textContent = item.name || "Без названия";

      const h = document.createElement("div");
      h.className = "inv-item__hint";
      h.textContent = item.desc ? "Есть описание" : "Без описания";

      left.appendChild(t);
      left.appendChild(h);

      const right = document.createElement("div");
      right.style.color = "rgba(255,235,200,.62)";
      right.style.fontWeight = "900";
      right.textContent = "›";

      btn.appendChild(left);
      btn.appendChild(right);

      btn.addEventListener("click", ()=>{
        invOpenItem(item.id);
      }, {passive:true});

      list.appendChild(btn);
    });
}

function invOpenItem(id){
  const item = (состояние.инв.предметы || []).find(x=>x.id === id);
  if(!item) return;

  const box = document.createElement("div");
  const name = document.createElement("div");
  name.style.fontWeight = "1000";
  name.style.marginBottom = "8px";
  name.textContent = item.name || "Без названия";

  const desc = document.createElement("div");
  desc.textContent = item.desc ? item.desc : "Описание не задано.";

  box.appendChild(name);
  box.appendChild(desc);

  const bClose = invBtn("Закрыть");
  bClose.addEventListener("click", invCloseModal);

  const bDel = invBtn("Удалить", "danger");
  bDel.addEventListener("click", ()=>{
    invConfirmDelete(item.id);
  });

  invOpenModal("Предмет", box, [bClose, bDel]);
}

function invConfirmDelete(id){
  const item = (состояние.инв.предметы || []).find(x=>x.id === id);
  if(!item) return;

  const box = document.createElement("div");
  box.textContent = `Удалить «${item.name || "Без названия"}»?`;

  const bNo = invBtn("Отмена");
  bNo.addEventListener("click", invCloseModal);

  const bYes = invBtn("Удалить", "danger");
  bYes.addEventListener("click", ()=>{
    if(состояние.locked) return;
    состояние.инв.предметы = (состояние.инв.предметы || []).filter(x=>x.id !== id);
    сохранить();
    invCloseModal();
    invRender();
  });

  invOpenModal("Подтверждение", box, [bNo, bYes]);
}

function invStartAdd(){
  if(состояние.locked) return;
  if(состояние.инв.активная === "money") return; // ✅ в деньгах нет "+"

  // Модалка 1: название
  const box = document.createElement("div");
  const label = document.createElement("div");
  label.textContent = "Название предмета:";
  label.style.marginBottom = "6px";

  const input = document.createElement("input");
  input.className = "inv-modal__field";
  input.placeholder = "Например: Длинный меч";
  input.value = "";
  input.autocomplete = "off";

  box.appendChild(label);
  box.appendChild(input);

  const bCancel = invBtn("Отмена");
  bCancel.addEventListener("click", invCloseModal);

  const bOk = invBtn("Ок");
  bOk.addEventListener("click", ()=>{
    const name = (input.value || "").trim();
    if(!name) return;
    invAskDesc(name);
  });

  invOpenModal("Добавить — название", box, [bCancel, bOk]);
  setTimeout(()=>input.focus(), 0);
}

function invAskDesc(name){
  // Модалка 2: описание (опционально)
  const box = document.createElement("div");

  const label = document.createElement("div");
  label.textContent = "Описание (необязательно):";
  label.style.marginBottom = "6px";

  const ta = document.createElement("textarea");
  ta.className = "inv-modal__field inv-modal__textarea";
  ta.placeholder = "Например: +1 к атакам, если ...";
  ta.value = "";

  box.appendChild(label);
  box.appendChild(ta);

  const bBack = invBtn("Назад");
  bBack.addEventListener("click", invStartAdd);

  const bOk = invBtn("Ок");
  bOk.addEventListener("click", ()=>{
    if(состояние.locked) return;

    const desc = (ta.value || "").trim();
    const item = {
      id: String(Date.now()) + "_" + Math.random().toString(16).slice(2),
      cat: состояние.инв.активная,
      name,
      desc,
      createdAt: Date.now()
    };

    состояние.инв.предметы = Array.isArray(состояние.инв.предметы) ? состояние.инв.предметы : [];
    состояние.инв.предметы.push(item);
    сохранить();
    invCloseModal();
    invRender();
  });

  invOpenModal("Добавить — описание", box, [bBack, bOk]);
  setTimeout(()=>ta.focus(), 0);
}
/* =========================
   МАГИЯ
   ========================= */

function magEnsure(){
  if(!состояние.маг) состояние.маг = {слоты:{1:[],2:[],3:[],4:[],5:[],6:[],7:[],8:[],9:[]}};
  if(!состояние.маг.слоты) состояние.маг.слоты = {1:[],2:[],3:[],4:[],5:[],6:[],7:[],8:[],9:[]};
  for(let lvl=1; lvl<=9; lvl++){
    if(!Array.isArray(состояние.маг.слоты[lvl])) состояние.маг.слоты[lvl] = [];
  }
}

function magSetCount(lvl, count){
  magEnsure();
  const n = clampInt(count, 0, 30, 0);
  const arr = состояние.маг.слоты[lvl] || [];
  if(arr.length === n) return;

  if(arr.length < n){
    while(arr.length < n) arr.push(false);
  }else{
    arr.length = n; // обрезаем хвост
  }
  состояние.маг.слоты[lvl] = arr;
}

function magToggle(lvl, idx){
  magEnsure();
  const arr = состояние.маг.слоты[lvl];
  if(!arr || idx < 0 || idx >= arr.length) return;
  arr[idx] = !arr[idx];
}

function magRender(){
  magEnsure();
  const root = $("#magSlots");
  if(!root) return;

  root.innerHTML = "";

  for(let lvl=1; lvl<=9; lvl++){
    const row = document.createElement("div");
    row.className = "mag-row";

    const left = document.createElement("div");
    left.className = "mag-lvl";
    left.textContent = String(lvl) + " ур.";

    const pips = document.createElement("div");
    pips.className = "mag-pips";

    const arr = состояние.маг.слоты[lvl] || [];
    for(let i=0; i<arr.length; i++){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mag-pip lockable" + (arr[i] ? " is-used" : "");
      b.setAttribute("aria-label", `Ячейка ${lvl} уровня: ${arr[i] ? "использована" : "свободна"}`);
      b.dataset.magLvl = String(lvl);
      b.dataset.magIdx = String(i);

      b.addEventListener("click", ()=>{
        if(состояние.locked) return;
        magToggle(lvl, i);
        сохранить();
        magRender();
        applyLock();
      }, {passive:true});

      pips.appendChild(b);
    }

    const ctrl = document.createElement("div");
    ctrl.className = "mag-ctrl";

    const bMinus = document.createElement("button");
    bMinus.type = "button";
    bMinus.className = "mag-btn minus lockable";
    bMinus.setAttribute("aria-label", `Убавить ячейку ${lvl} уровня`);
    bMinus.addEventListener("click", ()=>{
      if(состояние.locked) return;
      magSetCount(lvl, (состояние.маг.слоты[lvl]||[]).length - 1);
      сохранить();
      magRender();
      applyLock();
    }, {passive:true});

    const bPlus = document.createElement("button");
    bPlus.type = "button";
    bPlus.className = "mag-btn plus lockable";
    bPlus.setAttribute("aria-label", `Добавить ячейку ${lvl} уровня`);
    bPlus.addEventListener("click", ()=>{
      if(состояние.locked) return;
      magSetCount(lvl, (состояние.маг.слоты[lvl]||[]).length + 1);
      сохранить();
      magRender();
      applyLock();
    }, {passive:true});

    ctrl.appendChild(bMinus);
    ctrl.appendChild(bPlus);

    row.appendChild(left);
    row.appendChild(pips);
    row.appendChild(ctrl);

    root.appendChild(row);
  }
}
function magRenderUI(){
  magEnsureSpells();

  // подсветка вкладок
  const tabs = $("#magTabs");
  if(tabs){
    $$(".mag-tab", tabs).forEach(b=>{
      b.classList.toggle("is-active", b.dataset.magTab === состояние.маг.активная);
    });
  }

  // переключение страниц
  const pSlots = $("#magPageSlots");
  const pSpells = $("#magPageSpells");
  if(pSlots && pSpells){
    pSlots.classList.toggle("is-active", состояние.маг.активная === "slots");
    pSpells.classList.toggle("is-active", состояние.маг.активная === "spells");
  }

  // список заклинаний
  if(состояние.маг.активная === "spells"){
    magRenderSpells();
  }
}

// =========================
// МАГИЯ — ЗАКЛИНАНИЯ
// =========================

function magEnsureSpells(){
  magEnsure();
  if(!состояние.маг) состояние.маг = {};
  if(!Array.isArray(состояние.маг.заклинания)) состояние.маг.заклинания = [];
  if(!состояние.маг.активная) состояние.маг.активная = "slots"; // slots | spells
}

function magLevelLabel(lvl){
  const n = clampInt(lvl, 0, 9, 0);
  return n === 0 ? "Заговор" : `Уровень ${n}`;
}

function magRenderSpells(){
  magEnsureSpells();

  const list = $("#magSpellList");
  if(!list) return;

  const spells = (состояние.маг.заклинания || [])
    .slice()
    .sort((a,b)=>{
      const al = clampInt(a.level, 0, 9, 0);
      const bl = clampInt(b.level, 0, 9, 0);
      if(al !== bl) return al - bl;
      return String(a.name||"").localeCompare(String(b.name||""), "ru");
    });

  list.innerHTML = "";

  if(spells.length === 0){
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.innerHTML = `Заклинаний нет.<br>Нажми <b>+</b>, чтобы добавить.`;
    list.appendChild(empty);
    return;
  }

  spells.forEach(spell=>{
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inv-item";

    const left = document.createElement("div");

    const title = document.createElement("div");
    title.className = "inv-item__title";
    title.textContent = spell.name || "Без названия";

    const hint = document.createElement("div");
    hint.className = "inv-item__hint";
    hint.textContent = magLevelLabel(spell.level);

    left.appendChild(title);
    left.appendChild(hint);

    const right = document.createElement("div");
    right.style.color = "rgba(255,235,200,.62)";
    right.style.fontWeight = "900";
    right.textContent = "›";

    btn.appendChild(left);
    btn.appendChild(right);

    btn.addEventListener("click", ()=>{
      magOpenSpell(spell.id);
    }, {passive:true});

    list.appendChild(btn);
  });
}

function magOpenSpell(id){
  magEnsureSpells();
  const spell = (состояние.маг.заклинания || []).find(x=>x.id === id);
  if(!spell) return;

  const box = document.createElement("div");

  const name = document.createElement("div");
  name.style.fontWeight = "1000";
  name.style.marginBottom = "6px";
  name.textContent = spell.name || "Без названия";

  const lvl = document.createElement("div");
  lvl.style.color = "rgba(255,177,89,.85)";
  lvl.style.fontWeight = "900";
  lvl.style.marginBottom = "10px";
  lvl.textContent = magLevelLabel(spell.level);

  const desc = document.createElement("div");
  desc.textContent = spell.desc ? spell.desc : "Описание не задано.";

  box.appendChild(name);
  box.appendChild(lvl);
  box.appendChild(desc);

  const bClose = modalBtn("Закрыть");
  bClose.addEventListener("click", modalClose);

  const bDel = modalBtn("Удалить");
  bDel.style.borderColor = "rgba(255,43,22,.38)";
  bDel.addEventListener("click", ()=>{
    magConfirmDelete(spell.id);
  });

  modalOpen("Заклинание", box, [bClose, bDel]);
}

function magConfirmDelete(id){
  magEnsureSpells();
  const spell = (состояние.маг.заклинания || []).find(x=>x.id === id);
  if(!spell) return;

  const box = document.createElement("div");
  box.textContent = `Удалить «${spell.name || "Без названия"}»?`;

  const bNo = modalBtn("Отмена");
  bNo.addEventListener("click", modalClose);

  const bYes = modalBtn("Удалить");
  bYes.style.borderColor = "rgba(255,43,22,.38)";
  bYes.addEventListener("click", ()=>{
    if(состояние.locked) return;
    состояние.маг.заклинания = (состояние.маг.заклинания || []).filter(x=>x.id !== id);
    сохранить();
    modalClose();
    magRenderSpells();
  });

  modalOpen("Подтверждение", box, [bNo, bYes]);
}

// старт добавления (как в инвентаре: 3 шага)
function magStartAddSpell(){
  if(состояние.locked) return;
  magEnsureSpells();

  // 1) название
  const box = document.createElement("div");

  const label = document.createElement("div");
  label.textContent = "Название заклинания:";
  label.style.marginBottom = "6px";

  const input = document.createElement("input");
  input.className = "inv-modal__field";
  input.placeholder = "Например: Огненный снаряд";
  input.value = "";
  input.autocomplete = "off";

  box.appendChild(label);
  box.appendChild(input);

  const bCancel = modalBtn("Отмена");
  bCancel.addEventListener("click", modalClose);

  const bOk = modalBtn("Ок");
  bOk.addEventListener("click", ()=>{
    const name = (input.value || "").trim();
    if(!name) return;
    magAskLevel(name);
  });

  modalOpen("Добавить — название", box, [bCancel, bOk]);
  setTimeout(()=>input.focus(), 0);
}

function magAskLevel(name){
  // 2) уровень (колёсико-скролл как iOS)
  const box = document.createElement("div");

  const label = document.createElement("div");
  label.textContent = "Уровень заклинания:";
  label.style.marginBottom = "8px";

  const wheel = document.createElement("div");
  wheel.className = "mag-wheel";
  wheel.setAttribute("role","listbox");

  const topSp = document.createElement("div");
  topSp.className = "mag-wheel__spacer";
  wheel.appendChild(topSp);

  const levels = Array.from({length:10}, (_,i)=>i); // 0..9
  levels.forEach(n=>{
    const it = document.createElement("div");
    it.className = "mag-wheel__item";
    it.dataset.level = String(n);
    it.textContent = (n===0) ? "Заговор" : String(n);
    wheel.appendChild(it);
  });

  const botSp = document.createElement("div");
  botSp.className = "mag-wheel__spacer";
  wheel.appendChild(botSp);

  const frame = document.createElement("div");
  frame.className = "mag-wheel__frame";

  const wrapWheel = document.createElement("div");
  wrapWheel.style.position = "relative";
  wrapWheel.appendChild(wheel);
  wrapWheel.appendChild(frame);

  box.appendChild(label);
  box.appendChild(wrapWheel);

  let current = 1;

  const items = $$(".mag-wheel__item", wheel);

  const setActive = (n)=>{
    current = clampInt(n, 0, 9, 1);
    items.forEach(el=>{
      el.classList.toggle("is-active", Number(el.dataset.level) === current);
    });
  };

  const snapTo = (n)=>{
    const el = items.find(x=>Number(x.dataset.level) === n);
    if(!el) return;
    el.scrollIntoView({block:"center"});
  };

  setActive(current);

  // старт: проскроллить на 1
  setTimeout(()=>snapTo(current), 0);

  // выбор кликом
  wheel.addEventListener("click", (e)=>{
    const it = e.target.closest(".mag-wheel__item");
    if(!it) return;
    const n = clampInt(it.dataset.level, 0, 9, 1);
    setActive(n);
    snapTo(n);
  });

  // выбор скроллом: определяем элемент в центре
  let raf = 0;
  wheel.addEventListener("scroll", ()=>{
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=>{
      const rect = wheel.getBoundingClientRect();
      const cy = rect.top + rect.height/2;

      let best = null;
      let bestD = 1e9;
      items.forEach(el=>{
        const r = el.getBoundingClientRect();
        const ey = r.top + r.height/2;
        const d = Math.abs(ey - cy);
        if(d < bestD){ bestD = d; best = el; }
      });

      if(best){
        setActive(Number(best.dataset.level));
      }
    });
  });

  const bBack = modalBtn("Назад");
  bBack.addEventListener("click", magStartAddSpell);

  const bOk = modalBtn("Ок");
  bOk.addEventListener("click", ()=>{
    magAskDesc(name, current);
  });

  modalOpen("Добавить — уровень", box, [bBack, bOk]);
}

function magAskDesc(name, level){
  // 3) описание
  const box = document.createElement("div");

  const label = document.createElement("div");
  label.textContent = "Описание:";
  label.style.marginBottom = "6px";

  const ta = document.createElement("textarea");
  ta.className = "inv-modal__field inv-modal__textarea";
  ta.placeholder = "Опиши эффект, длительность, компоненты и т.д.";
  ta.value = "";

  box.appendChild(label);
  box.appendChild(ta);

  const bBack = modalBtn("Назад");
  bBack.addEventListener("click", ()=>magAskLevel(name));

  const bAdd = modalBtn("Добавить");
  bAdd.addEventListener("click", ()=>{
    if(состояние.locked) return;
    const desc = (ta.value || "").trim();
    if(!desc) return; // чтобы не было “кнопка не жмётся” — тут явное условие

    const spell = {
      id: String(Date.now()) + "_" + Math.random().toString(16).slice(2),
      name,
      level: clampInt(level, 0, 9, 1),
      desc
    };

    состояние.маг.заклинания = Array.isArray(состояние.маг.заклинания) ? состояние.маг.заклинания : [];
    состояние.маг.заклинания.push(spell);
    сохранить();
    modalClose();
    magRenderSpells();
  });

  modalOpen("Добавить — описание", box, [bBack, bAdd]);
  setTimeout(()=>ta.focus(), 0);
}

/* =========================
   УНИВЕРСАЛЬНАЯ МОДАЛКА
   ========================= */

function modalClose(){
  const m = $("#invModal");
  if(!m) return;
  m.classList.remove("is-open");
  m.setAttribute("aria-hidden","true");
}

function modalBtn(text){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn";
  b.textContent = text;
  return b;
}

function modalOpen(titleText, contentNode, actions=[]){
  const m = $("#invModal");
  if(!m) return;

  const t = $("#invModalTitle");
  const c = $("#invModalContent");
  const a = $("#invModalActions");

  if(t) t.textContent = titleText || "";
  if(c){
    c.innerHTML = "";
    if(contentNode) c.appendChild(contentNode);
  }
  if(a){
    a.innerHTML = "";
    actions.forEach(x=>a.appendChild(x));
  }

  m.classList.add("is-open");
  m.setAttribute("aria-hidden","false");
}

function openRules(){
  const wrap = document.createElement("div");
  wrap.className = "rules-list";

  const addRule = (name, formula, note="")=>{
    const r = document.createElement("div");
    r.className = "rule";

    const n = document.createElement("div");
    n.className = "rule__name";
    n.textContent = name;

    const f = document.createElement("div");
    f.className = "rule__formula";
    f.textContent = formula;

    r.appendChild(n);
    r.appendChild(f);

    if(note){
      const p = document.createElement("div");
      p.className = "rule__note";
      p.textContent = note;
      r.appendChild(p);
    }

    wrap.appendChild(r);
  };

  addRule("КД персонажа без доспеха", "10 + модификатор Ловкости");

  addRule("Безоружный удар", "1к20 + бонус мастерства + модификатор Силы");
  addRule("Урон безоружного удара", "1 + модификатор Силы");

  addRule(
    "Рукопашная атака оружием",
    "1к20 + бонус мастерства + модификатор Силы",
    "Для фехтовального оружия может использоваться Ловкость"
  );
  addRule(
    "Урон рукопашной атаки оружием",
    "Кость оружия + модификатор Силы",
    "Для фехтовального оружия может использоваться Ловкость"
  );

  addRule(
    "Дальнобойная атака оружием",
    "1к20 + бонус мастерства + модификатор Ловкости",
    "Для рукопашного оружия со свойством метательное используется тот же модификатор, что и для рукопашной атаки"
  );
  addRule(
    "Урон дальнобойной атаки оружием",
    "Кость оружия + модификатор Ловкости",
    "Для рукопашного оружия со свойством метательное используется тот же модификатор, что и для рукопашной атаки"
  );

  addRule(
    "Атака заклинанием",
    "1к20 + бонус мастерства + модификатор базовой характеристики заклинателя"
  );
  addRule("Урон заклинания", "Индивидуален для каждого заклинания");
  addRule(
    "Сложность спасброска от заклинания",
    "8 + модификатор базовой характеристики заклинания + бонус мастерства"
  );

  addRule("Порядок ходов в бою", "1к20 + Инициатива (модификатор Ловкости)");

  addRule(
    "Спасбросок",
    "1к20 + модификатор характеристики + бонус мастерства",
    "Если у вас есть владение спасброском"
  );
  addRule("Пассивное Восприятие", "10 + модификатор Мудрости (Восприятие)");
  addRule("Стабилизация умирающего", "1к20 + модификатор Мудрости (Медицина) Сл 10");
  addRule(
    "Применение инструментов",
    "1к20 + модификатор характеристики (скажет Мастер) + бонус мастерства",
    "Если есть владение инструментом"
  );

  const ok = modalBtn("Ок");
  ok.addEventListener("click", modalClose);

  modalOpen("Формулы", wrap, [ok]);
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
// ===== МАГИЯ: вкладки ЯЧЕЙКИ / ЗАКЛИНАНИЯ =====
const magTabs = $("#magTabs");
if(magTabs){
  magTabs.addEventListener("click", (e)=>{
    const btn = e.target.closest(".mag-tab");
    if(!btn) return;

    const tab = btn.dataset.magTab; // slots | spells
    состояние.маг.активная = tab;
    сохранить();

    // кнопки
    $$("#magTabs .mag-tab").forEach(b=>b.classList.remove("is-active"));
    btn.classList.add("is-active");

    // страницы
    $$("#page-mag .mag-page").forEach(p=>p.classList.remove("is-active"));
    if(tab === "slots"){
      $("#magPageSlots").classList.add("is-active");
    }else{
      $("#magPageSpells").classList.add("is-active");
    }

    // ✅ дорисовать UI + список заклинаний
    magRenderUI();
    applyLock();
  });
}

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

  // таблица опыта (кнопка "?")
  const xpBtn = $("#xpHelpBtn");
  if(xpBtn){
    xpBtn.addEventListener("click", ()=>{
      showXpTable();
    }, {passive:true});
  }

  // формулы (кнопка rules слева)
  const rulesBtn = $("#rulesBtn");
  if(rulesBtn){
    rulesBtn.addEventListener("click", ()=>{
      showRulesModal();
    }, {passive:true});
  }

  // ===== Инвентарь =====
  const invTabs = $("#invTabs");
  if(invTabs){
    invTabs.addEventListener("click", (e)=>{
      const btn = e.target.closest(".inv-tab");
      if(!btn) return;

      const key = btn.dataset.invTab;
      if(!key) return;

      // визуально активная кнопка
      $$("#invTabs .inv-tab").forEach(x=>x.classList.remove("is-active"));
      btn.classList.add("is-active");

      состояние.инв.активная = key;
      сохранить();
      invRender();
    });
  }

  const addBtn = $("#invAddBtn");
  if(addBtn){
    addBtn.addEventListener("click", ()=>{
      if(состояние.locked) return;
      invStartAdd();
    });
  }
  const magAdd = $("#magAddSpellBtn");
  if(magAdd){
    magAdd.addEventListener("click", ()=>{
      if(состояние.locked) return;
      magStartAddSpell();
    });
  }

  const modal = $("#invModal");
  if(modal){
    modal.addEventListener("click", (e)=>{
      if(e.target && e.target.hasAttribute && e.target.hasAttribute("data-inv-close")){
        invCloseModal();
      }
    });

    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape"){
        invCloseModal();
      }
    });
  }

$("#хп_тек").addEventListener("input", e=>{ состояние.хп.тек = clampInt(e.target.value, 0, 999, состояние.хп.тек); сохранить(); });
  $("#хп_макс").addEventListener("input", e=>{ состояние.хп.макс = clampInt(e.target.value, 0, 999, состояние.хп.макс); сохранить(); });
  $("#хп_врем").addEventListener("input", e=>{ состояние.хп.врем = clampInt(e.target.value, 0, 999, состояние.хп.врем); сохранить(); });
  $("#кд").addEventListener("input", e=>{ состояние.кд = clampInt(e.target.value, 0, 99, состояние.кд); сохранить(); });
  $("#скорость").addEventListener("input", e=>{ состояние.скорость = clampInt(e.target.value, 0, 999, состояние.скорость); сохранить(); });
  $("#вдохновение").addEventListener("input", e=>{ состояние.вдохновение = clampInt(e.target.value, 0, 99, состояние.вдохновение); сохранить(); });

// длинный отдых = хп тек = хп макс + восстановить ячейки
$("#длинный_отдых").addEventListener("click", ()=>{
  if(состояние.locked) return;

  состояние.хп.тек = clampInt(состояние.хп.макс, 0, 999, состояние.хп.тек);

  // магия: сбрасываем "использована" на всех уровнях
  if(состояние.маг && состояние.маг.слоты){
    for(let lvl=1; lvl<=9; lvl++){
      const arr = состояние.маг.слоты[lvl];
      if(Array.isArray(arr)){
        состояние.маг.слоты[lvl] = arr.map(()=>false);
      }
    }
  }

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

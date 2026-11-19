/* ==========================================================================
   js/promotions.js — Quản lý khuyến mãi: tạo, lên lịch, theo dõi hiệu lực
   --------------------------------------------------------------------------
   LƯU TRỮ: localStorage khóa 'applevn_promotions_v1' (dữ liệu của trình duyệt
   quản trị đang dùng). Máy chủ Supabase của bản này chưa có bảng promotions,
   nên khuyến mãi KHÔNG tự đồng bộ giữa các máy. Tab 🎁 Khuyến mãi có sẵn
   Xuất / Nhập JSON để chuyển dữ liệu hoặc sao lưu.

   Không ghi đè dữ liệu khác: chỉ đọc/ghi đúng khóa trên. Lần chạy đầu tiên
   khóa chưa có thì khởi tạo từ PROMOS (danh sách gốc trong js/data.js).

   TRẠNG THÁI được suy ra từ thời gian và công tắc bật/tắt, không lưu cứng:
     active    đang thực hiện      (trong khoảng thời gian, còn lượt)
     scheduled sắp diễn ra         (chưa tới startAt)
     ended     đã kết thúc         (quá endAt)
     paused    tạm dừng            (quản trị tắt công tắc)
     depleted  hết lượt            (usedCount >= usageLimit)
   ========================================================================== */

const PROMO_STORE_KEY = 'applevn_promotions_v1';
const PROMO_DAY = 86400000;

let promotions = [];
let promoFilter = 'all';
let promoEditingId = null;

/* Mẫu khuyến mãi tạo nhanh (thương mại điện tử) */
const PROMO_PRESETS = [
  {label:'Flash sale 24 giờ', name:'Flash sale 24 giờ', code:'FLASH24', type:'percent', value:15, minOrder:5000000, maxDiscount:2000000, days:1, desc:'Giảm sâu trong 24 giờ cho đơn từ 5 triệu.'},
  {label:'Cuối tuần miễn phí ship', name:'Miễn phí vận chuyển cuối tuần', code:'WEEKEND', type:'ship', value:0, minOrder:0, maxDiscount:0, days:3, desc:'Miễn phí giao hàng cho mọi đơn trong dịp cuối tuần.'},
  {label:'Khách hàng mới', name:'Ưu đãi khách hàng mới', code:'NEWBIE', type:'amount', value:300000, minOrder:2000000, maxDiscount:0, days:30, desc:'Giảm trực tiếp cho đơn hàng đầu tiên.'},
  {label:'Trả góp 0%', name:'Ưu đãi trả góp 0%', code:'INSTALL0', type:'amount', value:1000000, minOrder:20000000, maxDiscount:0, days:14, desc:'Hỗ trợ thêm cho khách chọn trả góp qua thẻ tín dụng.'}
];

/* renderAdmin chỉ tồn tại ở trang quản trị; trang khách chỉ vẽ dải khuyến mãi */
function promoRefreshUI() {
  if (typeof renderAdmin === 'function' && document.getElementById('adminBox')) renderAdmin();
  renderPromoStrip();
}

/* ------------------------------------------------------------------ tiện ích */
const pad2 = n => String(n).padStart(2, '0');

function promoLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function promoFromInput(value) {
  const d = new Date(value);
  return isNaN(d) ? '' : d.toISOString();
}
function promoDateText(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
}
function promoCountdown(target, prefix) {
  const ms = Date.parse(target) - Date.now();
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'đã qua';
  const d = Math.floor(ms / PROMO_DAY);
  const h = Math.floor((ms % PROMO_DAY) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const span = d > 0 ? `${d} ngày ${h} giờ` : h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
  return `${prefix}${span}`;
}

/* ------------------------------------------------------------- nạp và lưu */
function promoNormalize(raw) {
  const now = Date.now();
  const p = raw || {};
  return {
    id: p.id || 'pm-' + Math.random().toString(36).slice(2, 9),
    code: String(p.code || '').toUpperCase().replace(/\s+/g, '').slice(0, 24),
    name: String(p.name || p.code || '').slice(0, 120),
    desc: String(p.desc || '').slice(0, 400),
    type: ['percent','amount','ship'].includes(p.type) ? p.type : 'percent',
    value: Number(p.value) || 0,
    minOrder: Number(p.minOrder) || 0,
    maxDiscount: Number(p.maxDiscount) || 0,
    scope: ['all','category','product'].includes(p.scope) ? p.scope : 'all',
    category: p.category || '',
    productIds: Array.isArray(p.productIds) ? p.productIds.map(Number) : [],
    startAt: p.startAt || new Date(now - PROMO_DAY).toISOString(),
    endAt: p.endAt || new Date(now + 30 * PROMO_DAY).toISOString(),
    usageLimit: Number(p.usageLimit) || 0,
    usedCount: Number(p.usedCount) || 0,
    enabled: p.enabled !== false,
    createdAt: p.createdAt || new Date().toISOString()
  };
}

function promoSeed() {
  /* Chuyển danh sách PROMOS gốc thành khuyến mãi đang chạy 30 ngày */
  return PROMOS.map((x, i) => promoNormalize({
    id: 'pm-seed-' + (i + 1),
    code: x.code,
    name: x.note,
    desc: x.note,
    type: x.type,
    value: x.value,
    minOrder: x.type === 'amount' ? 20000000 : 0,
    startAt: new Date(Date.now() - 7 * PROMO_DAY).toISOString(),
    endAt: new Date(Date.now() + 30 * PROMO_DAY).toISOString(),
    enabled: true
  }));
}

function loadPromotions() {
  let stored = null;
  try { stored = localStorage.getItem(PROMO_STORE_KEY); } catch (_) { stored = null; }
  if (stored === null) {
    promotions = promoSeed();
    savePromotions();
    return promotions;
  }
  let parsed = [];
  try { parsed = JSON.parse(stored); } catch (_) { parsed = []; }
  promotions = (Array.isArray(parsed) ? parsed : []).map(promoNormalize);
  return promotions;
}

function savePromotions() {
  try { localStorage.setItem(PROMO_STORE_KEY, JSON.stringify(promotions)); return true; }
  catch (_) { toast('Trình duyệt chặn lưu khuyến mãi (localStorage)'); return false; }
}

/* --------------------------------------------------------------- trạng thái */
function promoState(pr, now = Date.now()) {
  if (!pr) return 'ended';
  if (pr.enabled === false) return 'paused';
  if (pr.usageLimit > 0 && pr.usedCount >= pr.usageLimit) return 'depleted';
  const end = Date.parse(pr.endAt);
  const start = Date.parse(pr.startAt);
  if (Number.isFinite(end) && now > end) return 'ended';
  if (Number.isFinite(start) && now < start) return 'scheduled';
  return 'active';
}

const PROMO_STATE_META = {
  active:    {label:'Đang thực hiện', cls:'ps-active',   icon:'●'},
  scheduled: {label:'Sắp diễn ra',    cls:'ps-scheduled', icon:'🕑'},
  ended:     {label:'Đã kết thúc',    cls:'ps-ended',     icon:'—'},
  paused:    {label:'Tạm dừng',       cls:'ps-paused',    icon:'⏸'},
  depleted:  {label:'Hết lượt',       cls:'ps-depleted',  icon:'✓'}
};

function promoStatePill(pr) {
  const st = promoState(pr);
  const m = PROMO_STATE_META[st] || PROMO_STATE_META.ended;
  return `<span class="promo-pill ${m.cls}"><i>${m.icon}</i>${m.label}</span>`;
}

function promoSummary(pr) {
  const scopeText = pr.scope === 'category' ? ` · chỉ ngành hàng ${pr.category}`
    : pr.scope === 'product' ? ` · chỉ ${pr.productIds.length} sản phẩm` : '';
  let value = '';
  if (pr.type === 'percent') value = `Giảm ${pr.value}%` + (pr.maxDiscount > 0 ? ` (tối đa ${vnd(pr.maxDiscount)})` : '');
  else if (pr.type === 'amount') value = `Giảm ${vnd(pr.value)}`;
  else value = 'Miễn phí vận chuyển';
  const minText = pr.minOrder > 0 ? ` cho đơn từ ${vnd(pr.minOrder)}` : '';
  return `${value}${minText}${scopeText}`;
}

function promoTimeText(pr) {
  const st = promoState(pr);
  if (st === 'scheduled') return `${promoCountdown(pr.startAt, 'bắt đầu sau ')}`;
  if (st === 'active') return promoCountdown(pr.endAt, 'còn ');
  return `${promoDateText(pr.startAt)} → ${promoDateText(pr.endAt)}`;
}

/* ------------------------------------------------------- tính tiền giảm giá */
function promoCartLines() {
  return cart.map(c => ({id: c.id, qty: c.qty, price: linePrice(c)}));
}
function promoEligibleSubtotal(pr, lines) {
  return lines.reduce((sum, l) => {
    const x = p(l.id);
    if (!x) return sum;
    if (pr.scope === 'category' && x.cat !== pr.category) return sum;
    if (pr.scope === 'product' && !pr.productIds.includes(Number(l.id))) return sum;
    return sum + l.price * l.qty;
  }, 0);
}
function promoEvaluate(pr, lines) {
  const st = promoState(pr);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const base = promoEligibleSubtotal(pr, lines);
  if (st === 'paused') return {ok:false, reason:'Chương trình đang tạm dừng'};
  if (st === 'scheduled') return {ok:false, reason:'Chương trình chưa bắt đầu'};
  if (st === 'ended') return {ok:false, reason:'Chương trình đã kết thúc'};
  if (st === 'depleted') return {ok:false, reason:'Chương trình đã hết lượt'};
  if (!base) return {ok:false, reason:'Giỏ hàng không có sản phẩm phù hợp'};
  if (subtotal < pr.minOrder) return {ok:false, reason:`Cần đơn tối thiểu ${vnd(pr.minOrder)}`};
  let disc = 0, ship = 0;
  if (pr.type === 'percent') {
    disc = Math.round(base * pr.value / 100);
    if (pr.maxDiscount > 0) disc = Math.min(disc, pr.maxDiscount);
  } else if (pr.type === 'amount') {
    disc = Math.min(pr.value, base);
  } else {
    ship = SHIP_FEE;
  }
  return {ok:true, disc, ship, base};
}
function promoByCode(code) {
  const c = String(code || '').trim().toUpperCase();
  return promotions.find(x => x.code === c) || null;
}
/* Chọn khuyến mãi tốt nhất cho giỏ hiện tại (dùng khi khách chưa nhập mã) */
function promoBestFor(lines) {
  let best = null;
  for (const pr of promotions) {
    const r = promoEvaluate(pr, lines);
    if (!r.ok) continue;
    const gain = r.disc + r.ship;
    if (!best || gain > best.gain) best = {pr, gain, res:r};
  }
  return best;
}
function promoActiveList() {
  return promotions.filter(x => promoState(x) === 'active');
}
function promoStats() {
  const s = {active:0, scheduled:0, ended:0, paused:0, depleted:0, used:0};
  for (const pr of promotions) {
    const st = promoState(pr);
    s[st] = (s[st] || 0) + 1;
    s.used += pr.usedCount || 0;
  }
  return s;
}
function promoMarkUsed(code) {
  const pr = promoByCode(code);
  if (!pr) return;
  pr.usedCount = (pr.usedCount || 0) + 1;
  savePromotions();
}

/* ==========================================================================
   GIAO DIỆN KHÁCH HÀNG
   ========================================================================== */
function renderPromoStrip() {
  const box = document.getElementById('promoStrip');
  if (!box) return;
  const list = promoActiveList().filter(pr => pr.enabled !== false);
  if (!list.length) { box.innerHTML = ''; box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<div class="ps-head">🎁 Khuyến mãi đang chạy</div><div class="ps-items">${list.slice(0, 3).map(pr => `
    <div class="ps-card">
      <div class="ps-code">${esc(pr.code)}</div>
      <div class="ps-body"><b>${esc(pr.name)}</b><span>${esc(promoSummary(pr))}</span><small>⏳ ${esc(promoTimeText(pr))}</small></div>
      <button class="btn sm ghost" onclick="copyText('${esc(pr.code)}','Mã ${esc(pr.code)}')">Sao chép</button>
    </div>`).join('')}</div>`;
}

function copyText(text, label) {
  const done = () => toast(label ? label + ' đã được sao chép' : 'Đã sao chép');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(String(text)).then(done).catch(() => fallback());
  } else fallback();
  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = String(text); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (_) { toast('Không sao chép được, hãy chọn thủ công'); }
    ta.remove();
  }
}

/* ==========================================================================
   GIAO DIỆN QUẢN TRỊ — tab 🎁 Khuyến mãi
   ========================================================================== */
function renderPromotionsAdmin(box) {
  const stats = promoStats();
  const counts = {all: promotions.length, active:stats.active, scheduled:stats.scheduled, ended:stats.ended, paused:stats.paused + stats.depleted};
  const filters = [['all','Tất cả'],['active','Đang thực hiện'],['scheduled','Sắp đặt lịch'],['ended','Đã kết thúc'],['paused','Tạm dừng / hết lượt']];
  const list = promotions.filter(pr => {
    const st = promoState(pr);
    if (promoFilter === 'all') return true;
    if (promoFilter === 'paused') return st === 'paused' || st === 'depleted';
    return st === promoFilter;
  }).sort((a, b) => {
    const rank = {active:0, scheduled:1, paused:2, depleted:3, ended:4};
    return (rank[promoState(a)] - rank[promoState(b)]) || (Date.parse(b.startAt) - Date.parse(a.startAt));
  });

  box.innerHTML = `
   <div class="stats promo-stats">
    <div class="stat"><div class="lbl">🎯 Đang thực hiện</div><div class="val">${stats.active}</div><div class="hint">chương trình chạy hôm nay</div></div>
    <div class="stat"><div class="lbl">🕑 Sắp đặt lịch</div><div class="val">${stats.scheduled}</div><div class="hint">sẽ tự bật khi tới giờ</div></div>
    <div class="stat"><div class="lbl">✅ Lượt đã dùng</div><div class="val">${stats.used}</div><div class="hint">theo đơn đặt trên máy này</div></div>
    <div class="stat"><div class="lbl">📦 Tổng chương trình</div><div class="val">${promotions.length}</div><div class="hint">${stats.ended} đã kết thúc</div></div>
   </div>

   <div class="promo-toolbar">
    <div class="chips promo-filters">
     ${filters.map(([k, l]) => `<button class="chip ${promoFilter === k ? 'active' : ''}" onclick="promoFilter='${k}';renderAdmin()">${l} <b>${counts[k] ?? ''}</b></button>`).join('')}
    </div>
    <div class="promo-actions">
     <button class="btn" onclick="promoForm()">＋ Tạo khuyến mãi</button>
     <button class="btn ghost sm" onclick="promoExport()">⬇ Xuất JSON</button>
     <label class="btn ghost sm" style="cursor:pointer">⬆ Nhập JSON<input type="file" accept="application/json,.json" hidden onchange="promoImport(this)"></label>
    </div>
   </div>

   <p class="promo-store-note">💾 Khuyến mãi lưu trên <b>trình duyệt quản trị này</b> (khóa <code>applevn_promotions_v1</code>) vì máy chủ Supabase chưa có bảng promotions. Dùng Xuất/Nhập JSON để sao lưu hoặc chuyển sang máy khác.</p>

   <div class="promo-list">
    ${list.map(promoAdminCard).join('') || '<div class="panel empty"><div class="big">🎁</div>Không có chương trình nào trong nhóm này.<br><br><button class="btn" onclick="promoForm()">Tạo khuyến mãi đầu tiên</button></div>'}
   </div>`;
}

function promoAdminCard(pr) {
  const st = promoState(pr);
  const limit = pr.usageLimit > 0 ? Math.min(100, Math.round(pr.usedCount / pr.usageLimit * 100)) : (pr.usedCount ? 8 : 0);
  return `<div class="promo-card ${st === 'active' ? 'is-active' : ''}">
   <div class="promo-card-top">
    <div class="promo-code-chip">${esc(pr.code)}</div>
    ${promoStatePill(pr)}
   </div>
   <h4>${esc(pr.name)}</h4>
   <div class="promo-summary">${esc(promoSummary(pr))}</div>
   <div class="promo-time"><span>📅 ${promoDateText(pr.startAt)} → ${promoDateText(pr.endAt)}</span><b>${esc(promoTimeText(pr))}</b></div>
   <div class="promo-usage">
    <div class="promo-usage-bar"><span style="width:${limit}%"></span></div>
    <small>${pr.usageLimit > 0 ? `${pr.usedCount}/${pr.usageLimit} lượt` : `${pr.usedCount} lượt sử dụng`}${pr.minOrder > 0 ? ` · đơn từ ${vnd(pr.minOrder)}` : ''}</small>
   </div>
   <div class="promo-card-actions">
    <button class="btn sm ghost" onclick="promoForm('${esc(pr.id)}')">Sửa</button>
    <button class="btn sm ghost" onclick="promoToggle('${esc(pr.id)}')">${pr.enabled === false ? '▶ Chạy lại' : '⏸ Tạm dừng'}</button>
    <button class="btn sm ghost" onclick="promoDuplicate('${esc(pr.id)}')">Nhân bản</button>
    <button class="btn sm ghost danger-text" onclick="promoDelete('${esc(pr.id)}')">Xoá</button>
   </div>
  </div>`;
}

function promoForm(id) {
  if (!curAdmin()) return;
  loadPromotions();
  const pr = id ? promotions.find(x => x.id === id) : null;
  promoEditingId = pr ? pr.id : null;
  const now = Date.now();
  const draft = pr || {
    code:'', name:'', desc:'', type:'percent', value:10, minOrder:0, maxDiscount:0,
    scope:'all', category:'', productIds:[], usageLimit:0, usedCount:0, enabled:true,
    startAt:new Date(now).toISOString(), endAt:new Date(now + 7 * PROMO_DAY).toISOString()
  };
  const isShip = draft.type === 'ship';
  const modal = document.getElementById('modalBox');
  modal.className = 'modal wide';
  modal.innerHTML = `
   <h2 class="sec" style="font-size:22px">${pr ? '✏️ Sửa khuyến mãi' : '🎁 Tạo khuyến mãi'}</h2>
   <div class="promo-presets">
    ${PROMO_PRESETS.map((x, i) => `<button type="button" class="promo-preset" onclick="promoApplyPreset(${i})">${x.label}</button>`).join('')}
   </div>
   <div class="form-grid">
    <div class="field"><label for="pfName">Tên chương trình *</label><input id="pfName" value="${esc(draft.name)}" placeholder="VD: Flash sale cuối tuần" maxlength="120"></div>
    <div class="field"><label for="pfCode">Mã khuyến mãi *</label><input id="pfCode" value="${esc(draft.code)}" placeholder="VD: FLASH24" maxlength="24" style="text-transform:uppercase" ${pr ? '' : ''}></div>
   </div>
   <div class="field" style="margin-top:12px"><label for="pfDesc">Mô tả hiển thị cho khách</label><input id="pfDesc" value="${esc(draft.desc)}" placeholder="VD: Giảm 15% cho đơn từ 5 triệu" maxlength="400"></div>

   <h4 class="promo-form-title">Mức giảm</h4>
   <div class="promo-type-row">
    ${[['percent','% Giảm theo phần trăm'],['amount','₫ Giảm số tiền'],['ship','🚚 Miễn phí vận chuyển']].map(([k, l]) => `
      <button type="button" class="promo-type ${draft.type === k ? 'active' : ''}" data-type="${k}" onclick="promoSetType('${k}')">${l}</button>`).join('')}
   </div>
   <div class="form-grid" style="margin-top:12px">
    <div class="field" id="pfValueWrap" ${isShip ? 'hidden' : ''}><label for="pfValue">${draft.type === 'amount' ? 'Số tiền giảm (₫)' : 'Phần trăm giảm (%)'}</label><input id="pfValue" type="number" min="1" value="${draft.value}"></div>
    <div class="field" id="pfMaxWrap" ${draft.type === 'percent' ? '' : 'hidden'}><label for="pfMaxDiscount">Giảm tối đa (₫, 0 = không giới hạn)</label><input id="pfMaxDiscount" type="number" min="0" value="${draft.maxDiscount}"></div>
    <div class="field"><label for="pfMinOrder">Đơn tối thiểu (₫)</label><input id="pfMinOrder" type="number" min="0" value="${draft.minOrder}"></div>
    <div class="field"><label for="pfUsageLimit">Giới hạn lượt dùng (0 = không giới hạn)</label><input id="pfUsageLimit" type="number" min="0" value="${draft.usageLimit}"></div>
   </div>

   <div class="field" style="margin-top:12px"><label for="pfScope">Phạm vi áp dụng</label>
    <select id="pfScope" class="sel" style="width:100%" onchange="promoScopeChange()">
     <option value="all" ${draft.scope === 'all' ? 'selected' : ''}>Toàn bộ sản phẩm</option>
     <option value="category" ${draft.scope === 'category' ? 'selected' : ''}>Theo ngành hàng</option>
     <option value="product" ${draft.scope === 'product' ? 'selected' : ''}>Theo sản phẩm</option>
    </select></div>
   <div class="field" id="pfCategoryWrap" style="margin-top:12px" ${draft.scope === 'category' ? '' : 'hidden'}><label for="pfCategory">Ngành hàng</label>
    <select id="pfCategory" class="sel" style="width:100%">${CATS.slice(1).map(c => `<option ${c === draft.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
   <div class="field" id="pfProductWrap" style="margin-top:12px" ${draft.scope === 'product' ? '' : 'hidden'}><label for="pfProduct">Sản phẩm</label>
    <select id="pfProduct" class="sel" style="width:100%">${PRODUCTS.map(x => `<option value="${x.id}" ${draft.productIds.includes(Number(x.id)) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
    <p class="image-help">Chọn một sản phẩm cho mỗi chương trình; tạo thêm chương trình nếu cần nhiều sản phẩm.</p></div>

   <h4 class="promo-form-title">Thời gian & trạng thái</h4>
   <div class="form-grid">
    <div class="field"><label for="pfStart">Bắt đầu</label><input id="pfStart" type="datetime-local" value="${promoLocalInput(draft.startAt)}"></div>
    <div class="field"><label for="pfEnd">Kết thúc</label><input id="pfEnd" type="datetime-local" value="${promoLocalInput(draft.endAt)}"></div>
   </div>
   <label class="promo-switch"><input type="checkbox" id="pfEnabled" ${draft.enabled !== false ? 'checked' : ''}><span>Cho phép áp dụng (bật/tắt chương trình)</span></label>
   <p class="image-help" style="margin-top:10px">Trạng thái được tính tự động theo giờ bắt đầu/kết thúc: chưa tới giờ là «Sắp diễn ra», quá giờ là «Đã kết thúc».</p>

   <button class="btn" style="width:100%;margin-top:16px" onclick="promoSave()">${pr ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}</button>
   ${pr ? `<button class="btn danger" style="width:100%;margin-top:10px" onclick="promoDelete('${esc(pr.id)}')">Xoá chương trình</button>` : ''}`;
  document.getElementById('modalBg').classList.add('open');
}

function promoSetType(type) {
  document.querySelectorAll('.promo-type').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  const valueWrap = document.getElementById('pfValueWrap');
  const maxWrap = document.getElementById('pfMaxWrap');
  if (type === 'ship') {
    if (valueWrap) valueWrap.hidden = true;
    if (maxWrap) maxWrap.hidden = true;
  } else {
    if (valueWrap) { valueWrap.hidden = false; const l = valueWrap.querySelector('label'); if (l) l.textContent = type === 'amount' ? 'Số tiền giảm (₫)' : 'Phần trăm giảm (%)'; }
    if (maxWrap) maxWrap.hidden = type !== 'percent';
  }
}
function promoScopeChange() {
  const scope = document.getElementById('pfScope').value;
  const cat = document.getElementById('pfCategoryWrap');
  const prod = document.getElementById('pfProductWrap');
  if (cat) cat.hidden = scope !== 'category';
  if (prod) prod.hidden = scope !== 'product';
}
function promoApplyPreset(index) {
  const preset = PROMO_PRESETS[index];
  if (!preset) return;
  promoSetType(preset.type);
  document.getElementById('pfName').value = preset.name;
  document.getElementById('pfDesc').value = preset.desc;
  document.getElementById('pfMinOrder').value = preset.minOrder;
  if (document.getElementById('pfValue')) document.getElementById('pfValue').value = preset.value || 1;
  if (document.getElementById('pfMaxDiscount')) document.getElementById('pfMaxDiscount').value = preset.maxDiscount || 0;
  document.getElementById('pfStart').value = promoLocalInput(new Date().toISOString());
  document.getElementById('pfEnd').value = promoLocalInput(new Date(Date.now() + preset.days * PROMO_DAY).toISOString());
  /* Mã gợi ý: thêm hậu tố ngẫu nhiên để không trùng */
  const base = preset.code;
  let code = base, n = 2;
  while (promotions.some(x => x.code === code)) { code = base + n; n += 1; }
  document.getElementById('pfCode').value = code;
  toast('Đã điền mẫu «' + preset.label + '»');
}

function promoSave() {
  const code = document.getElementById('pfCode').value.trim().toUpperCase().replace(/\s+/g, '');
  const name = document.getElementById('pfName').value.trim();
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return toast('Mã chỉ gồm A-Z, 0-9, _ hoặc -, dài 3–24 ký tự');
  if (!name) return toast('Vui lòng nhập tên chương trình');
  if (promotions.some(x => x.code === code && x.id !== promoEditingId)) return toast('Mã ' + code + ' đã tồn tại');
  const type = document.querySelector('.promo-type.active')?.dataset.type || 'percent';
  const value = type === 'ship' ? 0 : +document.getElementById('pfValue').value;
  if (type === 'percent' && (!(value > 0) || value > 100)) return toast('Phần trăm giảm phải từ 1 đến 100');
  if (type === 'amount' && !(value > 0)) return toast('Số tiền giảm phải lớn hơn 0');
  const startAt = promoFromInput(document.getElementById('pfStart').value);
  const endAt = promoFromInput(document.getElementById('pfEnd').value);
  if (!startAt || !endAt) return toast('Chọn thời gian bắt đầu và kết thúc');
  if (Date.parse(endAt) <= Date.parse(startAt)) return toast('Thời gian kết thúc phải sau thời gian bắt đầu');

  const scope = document.getElementById('pfScope').value;
  const productSelect = document.getElementById('pfProduct');
  const draft = promoNormalize({
    id: promoEditingId || undefined,
    code, name,
    desc: document.getElementById('pfDesc').value.trim() || name,
    type, value,
    maxDiscount: +document.getElementById('pfMaxDiscount')?.value || 0,
    minOrder: +document.getElementById('pfMinOrder').value || 0,
    usageLimit: +document.getElementById('pfUsageLimit').value || 0,
    scope,
    category: document.getElementById('pfCategory')?.value || '',
    productIds: scope === 'product' && productSelect ? [Number(productSelect.value)] : [],
    startAt, endAt,
    enabled: document.getElementById('pfEnabled').checked,
    usedCount: promoEditingId ? (promotions.find(x => x.id === promoEditingId)?.usedCount || 0) : 0,
    createdAt: promoEditingId ? (promotions.find(x => x.id === promoEditingId)?.createdAt) : undefined
  });

  if (promoEditingId) {
    const index = promotions.findIndex(x => x.id === promoEditingId);
    if (index >= 0) promotions[index] = draft; else promotions.push(draft);
  } else {
    promotions.push(draft);
  }
  if (!savePromotions()) return;
  const st = promoState(draft);
  closeModal();
  toast('Đã lưu khuyến mãi ' + draft.code + ' · ' + (PROMO_STATE_META[st]?.label || ''));
  promoRefreshUI();
}

function promoToggle(id) {
  const pr = promotions.find(x => x.id === id);
  if (!pr) return;
  pr.enabled = pr.enabled === false;
  if (pr.enabled && Date.parse(pr.endAt) < Date.now()) {
    pr.endAt = new Date(Date.now() + 7 * PROMO_DAY).toISOString();
    toast('Chương trình đã hết hạn — đã gia hạn thêm 7 ngày');
  }
  savePromotions();
  promoRefreshUI();
}

function promoDuplicate(id) {
  const pr = promotions.find(x => x.id === id);
  if (!pr) return;
  let code = pr.code + 'COPY', n = 2;
  while (promotions.some(x => x.code === code)) { code = pr.code + 'COPY' + n; n += 1; }
  const copy = promoNormalize({...pr, id: undefined, code, name: pr.name + ' (bản sao)', usedCount: 0,
    startAt: new Date().toISOString(), endAt: new Date(Date.now() + 7 * PROMO_DAY).toISOString()});
  promotions.push(copy);
  savePromotions();
  promoRefreshUI();
  toast('Đã nhân bản thành mã ' + code);
}

function promoDelete(id) {
  const pr = promotions.find(x => x.id === id);
  if (!pr) return;
  if (!confirm(`Xoá chương trình ${pr.code}? Khách sẽ không dùng được mã này nữa.`)) return;
  promotions = promotions.filter(x => x.id !== id);
  savePromotions();
  closeModal();
  promoRefreshUI();
  toast('Đã xoá chương trình ' + pr.code);
}

function promoExport() {
  downloadJSON({
    format:'applevn-promotions-v1',
    exportedAt:new Date().toISOString(),
    promotions
  }, 'applevn-khuyen-mai-' + new Date().toISOString().slice(0, 10) + '.json');
  toast('Đã xuất ' + promotions.length + ' chương trình');
}

async function promoImport(input) {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return toast('Tệp tối đa 5 MB');
  let data;
  try {
    data = JSON.parse(await file.text());
    if (data.format !== 'applevn-promotions-v1' || !Array.isArray(data.promotions)) throw new Error('Chọn tệp applevn-khuyen-mai-*.json xuất từ mục này');
  } catch (e) { return toast(e.message || 'Tệp không hợp lệ'); }
  const incoming = data.promotions.map(promoNormalize);
  const before = promotions.length;
  /* Gộp theo id: giữ dữ liệu hiện có, chỉ thêm mới hoặc cập nhật đúng id trong tệp */
  for (const item of incoming) {
    const index = promotions.findIndex(x => x.id === item.id || x.code === item.code);
    if (index >= 0) promotions[index] = {...promotions[index], ...item, usedCount: Math.max(promotions[index].usedCount || 0, item.usedCount || 0)};
    else promotions.push(item);
  }
  savePromotions();
  promoRefreshUI();
  toast(`Đã nhập ${incoming.length} chương trình (trước đó ${before})`);
}

/* ==========================================================================
   js/upload.js — Ảnh sản phẩm và BỘ SƯU TẬP ẢNH THẬT theo màu / theo phiên bản
   --------------------------------------------------------------------------
   • Ảnh đại diện sản phẩm (product.image): một ảnh, dùng chung mọi biến thể.
   • Ảnh thật theo màu (colors[].images) và theo phiên bản (configs[].images):
     mỗi mục có NHIỀU ảnh, lưu thành mảng URL trong product.variants (jsonb).
   • Khi chọn tệp, ảnh chỉ được đọc thành data URL trong bộ nhớ (bản nháp).
     Việc tải lên Supabase Storage và ghi URL thật chỉ diễn ra khi bấm Lưu
     sản phẩm — không có ảnh base64 nào được ghi vào cơ sở dữ liệu.
   ========================================================================== */

let pendingProductImage = '';
let productImageLoading = false;
let productImageVersion = 0;

/* Bản nháp ảnh thật: { colors:{[slug]:[url]}, configs:{[slug]:[url]} } */
let photoDraft = { colors: {}, configs: {} };
let photoDraftBusy = false;

const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const PHOTO_MAX_BYTES = 500 * 1024;
const PHOTO_PER_ITEM = 12;

function setProductImageLoading(value) {
  productImageLoading = value;
  const button = document.getElementById('saveProductBtn');
  if (button) button.disabled = value || photoDraftBusy;
}

function resetProductImage(image = '') {
  productImageVersion++;
  pendingProductImage = image;
  setProductImageLoading(false);
}

function showProductImagePreview() {
  const box = document.getElementById('uploadPreview');
  if (!box) return;
  box.innerHTML = pendingProductImage
    ? `<img src="${esc(pendingProductImage)}" alt="Ảnh xem trước">`
    : '<span>Chưa có ảnh — đang dùng emoji của sản phẩm</span>';
}

/* Đọc một tệp ảnh thành data URL (chỉ trong bộ nhớ, chưa tải lên) */
function readPhotoFile(file) {
  return new Promise(resolve => {
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) return resolve('');
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onabort = () => resolve('');
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve('');
      image.onload = () => resolve(String(reader.result));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function uploadProductImage(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!PHOTO_TYPES.includes(file.type)) { input.value = ''; return toast('Chỉ nhận PNG, JPEG hoặc WebP'); }
  if (file.size > PHOTO_MAX_BYTES) { input.value = ''; return toast('Ảnh phải nhỏ hơn hoặc bằng 500 KB'); }
  const version = ++productImageVersion;
  setProductImageLoading(true);
  const fail = () => {
    if (version !== productImageVersion) return;
    setProductImageLoading(false);
    input.value = '';
    showProductImagePreview();
    toast('Không đọc được ảnh, vui lòng chọn ảnh khác');
  };
  readPhotoFile(file).then(url => {
    if (version !== productImageVersion) return;
    if (!url) return fail();
    pendingProductImage = url;
    setProductImageLoading(false);
    showProductImagePreview();
  }).catch(fail);
}

function clearProductImage() {
  resetProductImage();
  showProductImagePreview();
  const input = document.getElementById('productImageInput');
  if (input) input.value = '';
}

/* ---------------------------------------------------------------------------
   Bộ sưu tập ảnh thật theo màu / theo phiên bản
   --------------------------------------------------------------------------- */

function photoDraftStore(kind) {
  return kind === 'color' ? photoDraft.colors : photoDraft.configs;
}

function photoDraftList(kind, key, create) {
  const store = photoDraftStore(kind);
  if (!Array.isArray(store[key]) && create) store[key] = [];
  return Array.isArray(store[key]) ? store[key] : [];
}

function photoDraftTotal() {
  const sum = store => Object.values(store).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
  return sum(photoDraft.colors) + sum(photoDraft.configs);
}

/* Sản phẩm tạm dựng từ chính các ô đang nhập, để danh sách màu/phiên bản
   trong trình sửa ảnh luôn khớp với tên, danh mục và giá hiện tại. */
function photoDraftProduct() {
  const id = editingProduct || 0;
  const base = (typeof p === 'function' && p(id)) || {};
  const nameField = document.getElementById('fmName');
  const catField = document.getElementById('fmCat');
  const priceField = document.getElementById('fmPrice');
  return {
    ...base,
    id,
    name: (nameField ? nameField.value : base.name || '').trim(),
    cat: (catField ? catField.value : base.cat) || 'iPhone',
    price: Number(priceField ? priceField.value : base.price) || 0
  };
}

/* Nạp bản nháp từ ảnh đã lưu của sản phẩm */
function startPhotoDraft(x) {
  photoDraft = { colors: {}, configs: {} };
  photoDraftBusy = false;
  if (!x || typeof productVariants !== 'function') return;
  const variants = productVariants(x);
  variants.colors.forEach(c => {
    const list = pdpImageList(c.images);
    if (list.length) photoDraft.colors[c.key] = list.slice();
  });
  variants.configs.forEach(c => {
    const list = pdpImageList(c.images);
    if (list.length) photoDraft.configs[c.key] = list.slice();
  });
}

function setPhotoDraftBusy(value) {
  photoDraftBusy = value;
  const button = document.getElementById('saveProductBtn');
  if (button) button.disabled = value || productImageLoading;
  const editor = document.getElementById('photoEditor');
  if (editor) editor.classList.toggle('busy', value);
}

function photoRow(item, kind) {
  const key = String(item.key || '');
  const list = photoDraftList(kind, key, false);
  const label = kind === 'color'
    ? String(item.label || '')
    : `${item.label || ''}${Number.isFinite(Number(item.price)) ? ' · ' + vnd(item.price) : ''}`;
  const mark = kind === 'color'
    ? `<span class="pe-swatch" style="background:${esc(item.hex || '#c8ccd2')}"></span>`
    : '<span class="pe-tag">▣</span>';
  const thumbs = list.map((url, i) => `<span class="pe-thumb">
      <img src="${esc(url)}" alt="${esc(label)} — ảnh ${i + 1}" loading="lazy">
      <button type="button" class="pe-del" title="Xóa ảnh này" aria-label="Xóa ảnh ${i + 1}" onclick="removeVariantPhoto('${kind}','${esc(key)}',${i})">×</button>
      <span class="pe-move"><button type="button" title="Đưa lên trước" aria-label="Đưa ảnh ${i + 1} lên trước" onclick="moveVariantPhoto('${kind}','${esc(key)}',${i},-1)" ${i === 0 ? 'disabled' : ''}>‹</button><button type="button" title="Đưa ra sau" aria-label="Đưa ảnh ${i + 1} ra sau" onclick="moveVariantPhoto('${kind}','${esc(key)}',${i},1)" ${i === list.length - 1 ? 'disabled' : ''}>›</button></span>
    </span>`).join('') || '<span class="pe-empty">Chưa có ảnh riêng</span>';
  return `<div class="pe-row">
    ${mark}<span class="pe-label">${esc(label)}</span>
    <div class="pe-thumbs">${thumbs}</div>
    <label class="pe-add">＋ Ảnh<input type="file" multiple accept="image/png,image/jpeg,image/webp" onchange="addVariantPhotos(this,'${kind}','${esc(key)}')"></label>
  </div>`;
}

function renderPhotoEditor() {
  const box = document.getElementById('photoEditor');
  if (!box) return;
  const variants = typeof productVariants === 'function' ? productVariants(photoDraftProduct()) : null;
  if (!variants) { box.innerHTML = '<p class="image-help">Chưa xác định được màu và phiên bản cho sản phẩm này.</p>'; return; }
  const known = new Set([
    ...variants.colors.map(c => 'colors:' + c.key),
    ...variants.configs.map(c => 'configs:' + c.key)
  ]);
  const orphans = [
    ...Object.keys(photoDraft.colors).filter(k => !known.has('colors:' + k)).map(k => 'màu ' + k),
    ...Object.keys(photoDraft.configs).filter(k => !known.has('configs:' + k)).map(k => 'phiên bản ' + k)
  ];
  box.innerHTML = `
    <div class="pe-head"><b>📸 Ảnh thật theo màu và theo phiên bản</b><span class="pe-total">${photoDraftTotal()} ảnh đang chọn</span></div>
    <p class="image-help">Mỗi màu và mỗi phiên bản có thể có nhiều ảnh. Khách xem ảnh của đúng màu và đúng phiên bản trước, rồi chuyển tiếp bằng mũi tên ‹ › hoặc chấm tròn trong galerie. PNG/JPEG/WebP, tối đa 500 KB mỗi ảnh.</p>
    <div class="pe-group">
      <h5>🎨 Ảnh theo màu <small>(${variants.colors.length} màu)</small></h5>
      ${variants.colors.map(c => photoRow(c, 'color')).join('')}
    </div>
    <div class="pe-group">
      <h5>📦 Ảnh theo phiên bản <small>(${variants.configs.length} phiên bản)</small></h5>
      ${variants.configs.map(c => photoRow(c, 'config')).join('')}
    </div>
    ${orphans.length ? `<p class="pe-warn">⚠ ${orphans.length} mục không còn khớp với tên sản phẩm hiện tại (${esc(orphans.join(', '))}); ảnh của các mục này sẽ không được lưu.</p>` : ''}`;
}

async function addVariantPhotos(input, kind, key) {
  const files = [...(input.files || [])];
  input.value = '';
  if (!files.length) return;
  const list = photoDraftList(kind, key, true);
  const room = PHOTO_PER_ITEM - list.length;
  if (room <= 0) return toast(`Mỗi mục tối đa ${PHOTO_PER_ITEM} ảnh`);
  setPhotoDraftBusy(true);
  let added = 0, rejected = 0;
  for (const file of files.slice(0, room)) {
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) { rejected++; continue; }
    const url = await readPhotoFile(file);
    if (url) { list.push(url); added++; } else rejected++;
  }
  setPhotoDraftBusy(false);
  renderPhotoEditor();
  if (!added) return toast('Chỉ nhận PNG/JPEG/WebP tối đa 500 KB mỗi ảnh');
  toast(`Đã thêm ${added} ảnh${rejected ? ` · bỏ ${rejected} tệp không hợp lệ` : ''} — bấm Lưu để tải lên máy chủ`);
}

function removeVariantPhoto(kind, key, index) {
  const list = photoDraftList(kind, key, false);
  if (!list.length) return;
  list.splice(Number(index), 1);
  if (!list.length) delete photoDraftStore(kind)[key];
  renderPhotoEditor();
}

function moveVariantPhoto(kind, key, index, dir) {
  const list = photoDraftList(kind, key, false);
  const from = Number(index);
  const to = from + Number(dir);
  if (!list.length || from < 0 || from >= list.length || to < 0 || to >= list.length) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  renderPhotoEditor();
}

/* Số ảnh thật đã lưu của một sản phẩm (dùng cho danh sách quản trị) */
function productPhotoCount(x) {
  if (!x || typeof productVariants !== 'function') return 0;
  const variants = productVariants(x);
  let total = 0;
  variants.colors.forEach(c => { total += pdpImageList(c.images).length; });
  variants.configs.forEach(c => { total += pdpImageList(c.images).length; });
  return total;
}

/* ---------------------------------------------------------------------------
   Ghi ảnh khi lưu: mọi ảnh data URL được tải lên Storage TRƯỚC, chỉ URL công
   khai mới đi vào cơ sở dữ liệu.

   Ảnh được ghi vào product.variants.photos (colors/configs → mảng URL) chứ
   KHÔNG ghi lại colors[]/configs[]: hai mảng đó chứa giá, ghi lại sẽ làm đóng
   băng bảng giá suy ra từ tên sản phẩm. Ảnh đã lưu trước đây trong
   colors[].images / configs[].images / variants.shots được giữ nguyên.
   --------------------------------------------------------------------------- */
async function buildVariantsPayload(previous) {
  if (typeof productVariants !== 'function') return null;
  const raw = previous && previous.variants && typeof previous.variants === 'object' ? previous.variants : null;
  if (!photoDraftTotal() && !raw) return null;

  const total = photoDraftTotal();
  let done = 0;
  const upload = async list => {
    const out = [];
    for (const url of Array.isArray(list) ? list : []) {
      const value = String(url || '').trim();
      if (!value) continue;
      let publicUrl = value;
      if (/^data:/i.test(value)) {
        done++;
        if (typeof cloudStatus === 'function') cloudStatus(`☁ Đang tải ảnh ${done}/${total} lên Storage…`);
        publicUrl = String(await uploadImage(value));
      }
      if (publicUrl && !out.includes(publicUrl)) out.push(publicUrl);
    }
    return out;
  };

  /* Chỉ những mục còn tồn tại trong bản nháp mới được ghi */
  const photos = { colors: {}, configs: {} };
  for (const [key, list] of Object.entries(photoDraft.colors)) {
    const urls = await upload(list);
    if (urls.length) photos.colors[key] = urls;
  }
  for (const [key, list] of Object.entries(photoDraft.configs)) {
    const urls = await upload(list);
    if (urls.length) photos.configs[key] = urls;
  }

  const payload = { ...(raw || {}) };
  const isEmpty = !Object.keys(photos.colors).length && !Object.keys(photos.configs).length;
  if (isEmpty) delete payload.photos; else payload.photos = photos;
  return payload;
}

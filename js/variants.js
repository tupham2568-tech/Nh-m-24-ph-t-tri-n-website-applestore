/* ==========================================================================
   js/variants.js — Biến thể sản phẩm: phiên bản (dung lượng) × màu sắc
   --------------------------------------------------------------------------
   Giá gốc vẫn là product.price lấy từ Supabase. Các mức giá biến thể được
   suy ra từ bảng chênh lệch bên dưới, và luôn giữ ĐÚNG giá của phiên bản đang
   ghi trong tên sản phẩm (ví dụ "iPhone 15 Pro 128 GB" → 128 GB = 25.990.000₫).

   Quản trị có thể ghi đè hoàn toàn danh sách biến thể bằng product.variants
   (nằm trong cột jsonb data của bảng products, không cần đổi schema):
     { configs:[{label:'256 GB', price:29990000, old:33990000}],
       colors:[{label:'Titan Đen', hex:'#3a3b3d', delta:0}] }

   Lựa chọn màu/phiên bản của khách chỉ là trạng thái giao diện, được nhớ trong
   localStorage khóa 'applevn_choices' (khóa mới, không ghi đè dữ liệu cũ).
   ========================================================================== */

/* Các nấc cấu hình theo từng dòng sản phẩm */
const PDP_LADDERS = {
  iphonePro: ['128 GB', '256 GB', '512 GB', '1 TB'],
  iphone15: ['128 GB', '256 GB', '512 GB'],
  iphone14: ['128 GB', '256 GB'],
  ipadPro: ['256 GB', '512 GB', '1 TB', '2 TB'],
  ipadMini: ['128 GB', '256 GB', '512 GB'],
  ipad: ['64 GB', '128 GB', '256 GB'],
  macbook: ['256 GB', '512 GB', '1 TB'],
  macDesktop: ['256 GB', '512 GB', '1 TB'],
  watch: ['41 mm', '45 mm'],
  watchUltra: ['49 mm'],
  airpods: ['Tiêu chuẩn'],
  accessory: ['Tiêu chuẩn']
};

/* Chênh lệch giá (VND) của từng nấc so với nấc nhỏ nhất trong cùng dòng */
const PDP_LADDER_DELTA = {
  iphonePro: { '128 GB': 0, '256 GB': 3000000, '512 GB': 7000000, '1 TB': 12000000 },
  iphone15: { '128 GB': 0, '256 GB': 3000000, '512 GB': 7000000 },
  iphone14: { '128 GB': 0, '256 GB': 3000000 },
  ipadPro: { '256 GB': 0, '512 GB': 6000000, '1 TB': 11000000, '2 TB': 20000000 },
  ipadMini: { '128 GB': 0, '256 GB': 2000000, '512 GB': 6000000 },
  ipad: { '64 GB': 0, '128 GB': 2000000, '256 GB': 6000000 },
  macbook: { '256 GB': 0, '512 GB': 4000000, '1 TB': 9000000 },
  macDesktop: { '256 GB': 0, '512 GB': 4000000, '1 TB': 9000000 },
  watch: { '41 mm': 0, '45 mm': 2000000 },
  watchUltra: { '49 mm': 0 },
  airpods: { 'Tiêu chuẩn': 0 },
  accessory: { 'Tiêu chuẩn': 0 }
};

/* Bảng màu theo dòng sản phẩm. delta = chênh lệch giá của màu đó (VND). */
const PDP_COLORS = {
  iphonePro: [
    { key: 'titan-tu-nhien', label: 'Titan Tự Nhiên', hex: '#b8ada0' },
    { key: 'titan-xanh', label: 'Titan Xanh', hex: '#4b5f72', delta: -500000 },
    { key: 'titan-trang', label: 'Titan Trắng', hex: '#eae7e2' },
    { key: 'titan-den', label: 'Titan Đen', hex: '#3a3b3d' }
  ],
  iphone15: [
    { key: 'hong', label: 'Hồng', hex: '#f6c9d3' },
    { key: 'vang', label: 'Vàng', hex: '#f2e4b8', delta: -300000 },
    { key: 'xanh-la', label: 'Xanh Lá', hex: '#cfdcd1' },
    { key: 'xanh-duong', label: 'Xanh Dương', hex: '#c6d9ea' },
    { key: 'den', label: 'Đen', hex: '#303032' }
  ],
  iphone14: [
    { key: 'tim', label: 'Tím', hex: '#cbb8d6' },
    { key: 'xanh-duong', label: 'Xanh Dương', hex: '#a8c3d9' },
    { key: 'do', label: 'Đỏ', hex: '#b9222b' },
    { key: 'den', label: 'Đen', hex: '#2b2b2d' },
    { key: 'trang', label: 'Trắng', hex: '#f2f1ee' }
  ],
  ipadPro: [
    { key: 'xam-khong-gian', label: 'Xám Không Gian', hex: '#6f7377' },
    { key: 'bac', label: 'Bạc', hex: '#e4e5e7' }
  ],
  ipadMini: [
    { key: 'xam-khong-gian', label: 'Xám Không Gian', hex: '#6f7377' },
    { key: 'tim', label: 'Tím', hex: '#c9bcd8' },
    { key: 'xanh-duong', label: 'Xanh Dương', hex: '#a9c3dd', delta: -200000 },
    { key: 'starlight', label: 'Starlight', hex: '#efe6d8' }
  ],
  ipad: [
    { key: 'xam-khong-gian', label: 'Xám Không Gian', hex: '#6f7377' },
    { key: 'bac', label: 'Bạc', hex: '#e4e5e7' },
    { key: 'xanh-duong', label: 'Xanh Dương', hex: '#a9c3dd', delta: -200000 },
    { key: 'hong', label: 'Hồng', hex: '#f2cfd2' },
    { key: 'vang', label: 'Vàng', hex: '#f0e3c2' }
  ],
  macbook: [
    { key: 'xam-khong-gian', label: 'Xám Không Gian', hex: '#6b6f74' },
    { key: 'bac', label: 'Bạc', hex: '#e6e7e9' },
    { key: 'midnight', label: 'Midnight', hex: '#2f3541' },
    { key: 'starlight', label: 'Starlight', hex: '#efe6d8' }
  ],
  macDesktop: [
    { key: 'bac', label: 'Bạc', hex: '#e6e7e9' },
    { key: 'xam-khong-gian', label: 'Xám Không Gian', hex: '#6b6f74' }
  ],
  watch: [
    { key: 'den', label: 'Đen', hex: '#26282b' },
    { key: 'bac', label: 'Bạc', hex: '#dfe1e3' },
    { key: 'vang-hong', label: 'Vàng Hồng', hex: '#e9c7b5' },
    { key: 'xanh-duong', label: 'Xanh Dương', hex: '#35507a' }
  ],
  watchUltra: [
    { key: 'titan-tu-nhien', label: 'Titan Tự Nhiên', hex: '#b6ab9c' },
    { key: 'titan-den', label: 'Titan Đen', hex: '#3b3b3d' }
  ],
  airpods: [{ key: 'trang', label: 'Trắng', hex: '#f3f4f6' }],
  accessory: [
    { key: 'trang', label: 'Trắng', hex: '#f3f4f6' },
    { key: 'den', label: 'Đen', hex: '#2f2f31' }
  ]
};

/* Lựa chọn đã lưu của khách: { [productId]: { config, color } } */
let pdpChoices = (function () {
  try {
    const raw = JSON.parse(localStorage.getItem('applevn_choices') || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch (_) {
    return {};
  }
})();

function pdpSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'muc';
}

function pdpFamily(x) {
  const name = String(x?.name || '').toLowerCase();
  const cat = String(x?.cat || '');
  if (cat === 'iPhone') {
    if (/pro/.test(name)) return 'iphonePro';
    const gen = Number((name.match(/iphone\s*(\d+)/) || [])[1] || 0);
    return gen && gen <= 14 ? 'iphone14' : 'iphone15';
  }
  if (cat === 'iPad') {
    if (/pro/.test(name)) return 'ipadPro';
    if (/mini/.test(name)) return 'ipadMini';
    return 'ipad';
  }
  if (cat === 'Mac') return /macbook/.test(name) ? 'macbook' : 'macDesktop';
  if (cat === 'Watch') return /ultra/.test(name) ? 'watchUltra' : 'watch';
  if (cat === 'AirPods') return 'airpods';
  return 'accessory';
}

function pdpFlat(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, '');
}

function pdpBaseOption(name, ladder) {
  const flat = pdpFlat(name);
  for (const option of ladder) {
    if (flat.includes(pdpFlat(option))) return option;
  }
  return ladder[0];
}

/* ---------------------------------------------------------------------------
   ẢNH THẬT THEO BIẾN THỂ
   Mỗi màu và mỗi phiên bản có thể có NHIỀU ảnh thật (mảng URL).
   Hai cách ghi, đều nằm trong product.variants (jsonb) — không đổi schema:
     colors:[{ label:'Titan Đen', hex:'#3a3b3d', images:['https://…'] }]
     configs:[{ label:'256 GB', price:…, images:['https://…'] }]
     photos:{ colors:{'titan-den':['https://…']}, configs:{'256-gb':['https://…']} }
     shots:[{ url:'https://…', color:'titan-den', config:'256-gb' }]  // ảnh đúng màu + phiên bản
   `photos` là cách trang quản trị lưu bộ sưu tập ảnh: nó KHÔNG chứa giá, nên
   thêm ảnh không làm đóng băng bảng giá suy ra từ tên sản phẩm.
   Ảnh cấp sản phẩm (dùng chung mọi màu) nằm ở product.images / product.image.
   --------------------------------------------------------------------------- */

/* Chuẩn hoá nhiều dạng dữ liệu ảnh thành mảng URL sạch, không trùng */
function pdpImageList(value) {
  const out = [];
  const push = url => {
    if (typeof url !== 'string') return;
    const clean = url.trim();
    if (!clean || out.includes(clean)) return;
    if (!/^(https?:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(clean)) return;
    out.push(clean);
  };
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') push(item);
      else if (item && typeof item === 'object') {
        push(item.url || item.src || item.image);
        if (Array.isArray(item.images)) item.images.forEach(push);
      }
    }
  } else if (typeof value === 'string') {
    push(value);
  }
  return out;
}

/* Bộ sưu tập ảnh quản trị lưu riêng trong product.variants.photos */
function pdpPhotoMap(raw) {
  const map = { colors: {}, configs: {} };
  const src = raw && typeof raw === 'object' ? raw.photos : null;
  if (!src || typeof src !== 'object') return map;
  for (const kind of ['colors', 'configs']) {
    const group = src[kind];
    if (!group || typeof group !== 'object') continue;
    for (const [key, value] of Object.entries(group)) {
      const list = pdpImageList(value);
      if (list.length) map[kind][pdpSlug(key)] = list;
    }
  }
  return map;
}

/* Ghép hai nguồn ảnh của cùng một mục, bỏ trùng, giữ thứ tự */
function pdpMergeImages(a, b) {
  const out = [];
  for (const url of [...pdpImageList(a), ...pdpImageList(b)]) if (!out.includes(url)) out.push(url);
  return out;
}

/* Ghi đè do quản trị nhập trong product.variants (nếu có) */
function pdpOverride(x) {
  const raw = x?.variants;
  if (!raw || typeof raw !== 'object') return null;
  const configs = Array.isArray(raw.configs)
    ? raw.configs.filter(c => c && Number.isFinite(Number(c.price)) && Number(c.price) >= 0)
    : [];
  if (!configs.length) return null;
  const photos = pdpPhotoMap(raw);
  const colors = Array.isArray(raw.colors) && raw.colors.length ? raw.colors : PDP_COLORS.accessory;
  return {
    configs: configs.map((c, i) => ({
      key: pdpSlug(c.key || c.label || 'phien-ban-' + (i + 1)),
      label: String(c.label || c.key || 'Phiên bản ' + (i + 1)),
      price: Math.round(Number(c.price)),
      old: Number.isFinite(Number(c.old)) && Number(c.old) > 0 ? Math.round(Number(c.old)) : null,
      images: pdpMergeImages(c.images ?? c.image, photos.configs[pdpSlug(c.key || c.label || '')])
    })),
    colors: colors.map((c, i) => ({
      key: pdpSlug(c.key || c.label || 'mau-' + (i + 1)),
      label: String(c.label || c.key || 'Màu ' + (i + 1)),
      hex: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(c.hex || '')) ? String(c.hex) : '#d0d4da',
      delta: Number.isFinite(Number(c.delta)) ? Math.round(Number(c.delta)) : 0,
      images: pdpMergeImages(c.images ?? c.image, photos.colors[pdpSlug(c.key || c.label || '')])
    })),
    shots: Array.isArray(raw.shots)
      ? raw.shots
          .filter(s => s && typeof s === 'object' && pdpImageList([s.url]).length)
          .map(s => ({ url: pdpImageList([s.url])[0], color: pdpSlug(s.color || ''), config: pdpSlug(s.config || '') }))
      : []
  };
}

/* Danh sách biến thể của một sản phẩm: { configs, colors, baseKey } */
function productVariants(x) {
  const over = pdpOverride(x);
  if (over) return { ...over, baseKey: over.configs[0].key };

  const family = pdpFamily(x);
  const ladder = PDP_LADDERS[family] || PDP_LADDERS.accessory;
  const deltaMap = PDP_LADDER_DELTA[family] || {};
  const baseOption = pdpBaseOption(x?.name, ladder);
  const baseDelta = deltaMap[baseOption] ?? 0;
  const basePrice = Math.max(0, Math.round(Number(x?.price) || 0));
  const baseOld = Number.isFinite(Number(x?.old)) && Number(x.old) > 0 ? Math.round(Number(x.old)) : null;
  /* Ảnh quản trị đã lưu (variants.photos) vẫn dùng được khi chưa có configs */
  const photos = pdpPhotoMap(x?.variants);

  const configs = ladder.map(option => {
    const diff = (deltaMap[option] ?? 0) - baseDelta;
    return {
      key: pdpSlug(option),
      label: option,
      price: Math.max(0, basePrice + diff),
      old: baseOld ? Math.max(0, baseOld + diff) : null,
      images: pdpMergeImages([], photos.configs[pdpSlug(option)])
    };
  });
  const colors = (PDP_COLORS[family] || PDP_COLORS.accessory).map(c => ({
    key: c.key,
    label: c.label,
    hex: c.hex,
    delta: c.delta || 0,
    images: pdpMergeImages(c.images, photos.colors[c.key])
  }));
  return { configs, colors, shots: [], baseKey: pdpSlug(baseOption) };
}

function pdpChoice(id) {
  const value = pdpChoices[Number(id)];
  return value && typeof value === 'object' ? value : {};
}

/* Titre affiché : la capacité choisie remplace celle du nom d'origine
   (« iPhone 15 Pro 128 GB » + 256 GB → « iPhone 15 Pro 256 GB »). */
function pdpTitle(x, selection) {
  const name = String(x?.name || '');
  const base = selection?.variants?.configs?.find(c => c.key === selection.variants.baseKey);
  const chosen = selection?.config;
  if (!chosen) return name;
  if (/^tiêu chuẩn$/i.test(chosen.label)) return name;
  if (base && base.key === chosen.key) return name;
  const baseLabel = base?.label || '';
  if (baseLabel && pdpFlat(name).includes(pdpFlat(baseLabel))) {
    const escaped = baseLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return name.replace(new RegExp(escaped, 'i'), chosen.label).replace(/\s+/g, ' ').trim();
  }
  return (name + ' ' + chosen.label).replace(/\s+/g, ' ').trim();
}

/* Lựa chọn hiện tại của sản phẩm (đã kiểm tra hợp lệ) */
function pdpSelection(x) {
  const variants = productVariants(x);
  const chosen = pdpChoice(x?.id);
  const config = variants.configs.find(c => c.key === chosen.config)
    || variants.configs.find(c => c.key === variants.baseKey)
    || variants.configs[0];
  const color = variants.colors.find(c => c.key === chosen.color) || variants.colors[0];
  const price = Math.max(0, config.price + (color.delta || 0));
  const old = config.old ? Math.max(config.price, config.old + (color.delta || 0)) : null;
  return { config, color, price, old, variants };
}

/* Giá thấp nhất trong toàn bộ biến thể (dùng cho thẻ sản phẩm) */
function minVariantPrice(x) {
  const variants = productVariants(x);
  let min = Infinity;
  for (const config of variants.configs) {
    for (const color of variants.colors) {
      min = Math.min(min, Math.max(0, config.price + (color.delta || 0)));
    }
  }
  return Number.isFinite(min) ? min : Math.max(0, Number(x?.price) || 0);
}

/* Offre la plus basse réellement disponible : { price, old, configs, colors } */
function minVariantOffer(x) {
  const variants = productVariants(x);
  let best = null;
  for (const config of variants.configs) {
    for (const color of variants.colors) {
      const price = Math.max(0, config.price + (color.delta || 0));
      if (!best || price < best.price) {
        best = {
          price,
          old: config.old ? Math.max(price, config.old + (color.delta || 0)) : null
        };
      }
    }
  }
  if (!best) best = { price: Math.max(0, Number(x?.price) || 0), old: null };
  return { ...best, variants };
}

/* Giá của một dòng giỏ hàng, theo biến thể khách đã chọn */
function linePrice(line) {
  const product = typeof p === 'function' ? p(line?.id) : null;
  return product ? pdpSelection(product).price : 0;
}

/* Libellé d'une ligne de commande : "Titan Đen · 256 GB" */
function lineVariantLabel(line) {
  const product = typeof p === 'function' ? p(line?.id) : null;
  if (!product) return '';
  const selection = pdpSelection(product);
  const config = /^tiêu chuẩn$/i.test(selection.config.label) ? '' : selection.config.label;
  return [selection.color.label, config].filter(Boolean).join(' · ');
}

/* Màu nền nhạt theo mã màu, dùng cho khung ảnh */
function pdpTint(hex, alpha) {
  const a = Number.isFinite(alpha) ? alpha : 0.16;
  const raw = String(hex || '').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  const value = parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(value)) return 'rgba(0,113,227,' + a + ')';
  return 'rgba(' + ((value >> 16) & 255) + ',' + ((value >> 8) & 255) + ',' + (value & 255) + ',' + a + ')';
}

/* Trả góp 0% chia đều 10 tháng, làm tròn nghìn đồng (chỉ để tham khảo) */
function pdpInstallment(price) {
  const months = 10;
  const per = Math.round(Number(price || 0) / months / 1000) * 1000;
  return { months, per };
}

/* ---------------------------------------------------------------------------
   Lien profond vers une fiche produit : index.html#sp-2 ou index.html?sp=2
   Dữ liệu sản phẩm tải bất đồng bộ từ Supabase nên phải thử lại vài lần.
   --------------------------------------------------------------------------- */
function pdpDeepLinkId() {
  const fromHash = (location.hash.match(/^#sp-(\d+)$/) || [])[1];
  const fromQuery = new URLSearchParams(location.search || '').get('sp');
  const raw = fromHash || fromQuery || '';
  return /^\d+$/.test(raw) ? Number(raw) : 0;
}

function openDeepLink(attempt) {
  const id = pdpDeepLinkId();
  if (!id) return;
  const tries = Number.isFinite(attempt) ? attempt : 0;
  const product = typeof p === 'function' ? p(id) : null;
  if (product) {
    openDetail(id);
    return;
  }
  if (tries < 40) setTimeout(() => openDeepLink(tries + 1), 300);
}

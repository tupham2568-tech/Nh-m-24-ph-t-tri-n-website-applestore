/* ==========================================================================
   js/pdp-visual.js — Hình sản phẩm DÙNG CHUNG cho galerie, dải thumbnail và
   thẻ chọn màu, để ba chỗ luôn là CÙNG một hình và CÙNG một màu.
   --------------------------------------------------------------------------
   Vẽ MẶT LƯNG thiết bị: phần thân chiếm gần hết khung nên màu sắc hiện rõ ở
   mọi kích thước (kể cả thumbnail 60px), tránh tình trạng các màu trông giống
   nhau vì bị màn hình đen che mất.

   Thứ tự ưu tiên của một "khung hình":
   1. Ảnh riêng của màu (quản trị nhập colors[].image) → dùng ảnh đó.
   2. Sản phẩm chỉ có MỘT màu và có ảnh thật → dùng ảnh thật.
   3. Còn lại → thiết bị SVG tô đúng mã màu đang chọn.
   ========================================================================== */

let pdpVisualSeq = 0;

function pdpRgb(hex) {
  const raw = String(hex || '').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return [200, 204, 210];
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* Làm sáng (amount > 0) hoặc tối (amount < 0) một mã màu, 0..1 */
function pdpShade(hex, amount) {
  const [r, g, b] = pdpRgb(hex);
  const t = Math.max(-1, Math.min(1, Number(amount) || 0));
  const mix = c => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t));
  const hex2 = c => c.toString(16).padStart(2, '0');
  return '#' + hex2(mix(r)) + hex2(mix(g)) + hex2(mix(b));
}

/* Gradient dùng chung: thân máy, cụm camera, vệt sáng */
function pdpDefs(uid, base) {
  return `
    <defs>
      <linearGradient id="b${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${pdpShade(base, 0.30)}"/>
        <stop offset=".3" stop-color="${pdpShade(base, 0.10)}"/>
        <stop offset=".62" stop-color="${pdpShade(base, -0.08)}"/>
        <stop offset="1" stop-color="${pdpShade(base, -0.36)}"/>
      </linearGradient>
      <linearGradient id="m${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${pdpShade(base, -0.06)}"/>
        <stop offset="1" stop-color="${pdpShade(base, -0.30)}"/>
      </linearGradient>
      <linearGradient id="s${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity=".5"/>
        <stop offset=".4" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="l${uid}" cx=".35" cy=".3" r=".75">
        <stop offset="0" stop-color="#2b3446"/>
        <stop offset="1" stop-color="#05070c"/>
      </radialGradient>
    </defs>`;
}

/* Cụm kính camera sau */
function pdpCameraCluster(uid, x, y, size, lenses) {
  const r = size * 0.16;
  const cell = size / 2;
  const dot = (cx, cy) => `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#l${uid})" stroke="rgba(0,0,0,.55)" stroke-width=".8"/>
    <circle cx="${cx - r * 0.25}" cy="${cy - r * 0.28}" r="${r * 0.3}" fill="rgba(150,190,255,.45)"/>`;
  const positions = lenses >= 3
    ? [[x + cell * 0.55, y + cell * 0.5], [x + cell * 1.45, y + cell * 0.5], [x + cell * 0.55, y + cell * 1.4]]
    : [[x + cell * 0.6, y + cell], [x + cell * 1.4, y + cell]];
  return `
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.26}"
          fill="url(#m${uid})" stroke="rgba(0,0,0,.22)" stroke-width="1"/>
    ${positions.map(p => dot(p[0], p[1])).join('')}
    <circle cx="${x + size * 0.82}" cy="${y + size * 0.2}" r="${size * 0.055}" fill="#f8e6b8" opacity=".9"/>`;
}

/* Logo tròn giữa mặt lưng */
function pdpLogo(cx, cy, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.38)" stroke-width="1"/>`;
}

/* Thiết bị vẽ bằng SVG — MẶT LƯNG, thân máy tô theo đúng mã màu hex */
function pdpDeviceSvg(cat, hex, name) {
  const uid = ++pdpVisualSeq;
  const base = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(hex || '')) ? String(hex) : '#c8ccd2';
  const defs = pdpDefs(uid, base);
  const body = `url(#b${uid})`;
  const edge = pdpShade(base, -0.52);
  const gloss = `url(#s${uid})`;
  const label = name ? `<title>${esc(name)}</title>` : '';
  const shadow = `<ellipse cx="50%" cy="97%" rx="32%" ry="2.6%" fill="rgba(12,20,32,.16)"/>`;
  const wrap = (viewBox, inner) => `<svg class="dev" viewBox="${viewBox}" role="img" aria-hidden="true" focusable="false">${label}${defs}${shadow}${inner}</svg>`;

  if (cat === 'iPad') {
    return wrap('0 0 220 290', `
      <rect x="24" y="12" width="172" height="254" rx="18" fill="${body}" stroke="${edge}" stroke-width="1.6"/>
      <rect x="24" y="12" width="172" height="254" rx="18" fill="${gloss}"/>
      ${pdpCameraCluster(uid, 36, 24, 46, 1)}
      ${pdpLogo(110, 139, 20)}
      <rect x="20" y="40" width="3.4" height="26" rx="1.7" fill="${edge}"/>`);
  }

  if (cat === 'Mac') {
    if (/macbook|air|pro/i.test(name || '')) {
      return wrap('0 0 300 210', `
        <rect x="52" y="14" width="196" height="140" rx="14" fill="${body}" stroke="${edge}" stroke-width="1.6"/>
        <rect x="52" y="14" width="196" height="140" rx="14" fill="${gloss}"/>
        ${pdpLogo(150, 84, 24)}
        <path d="M20 154h260l12 18a4 4 0 0 1-3.4 6H11.4a4 4 0 0 1-3.4-6z"
              fill="${pdpShade(base, -0.22)}" stroke="${edge}" stroke-width="1.2"/>
        <rect x="130" y="160" width="40" height="4" rx="2" fill="rgba(255,255,255,.45)"/>`);
    }
    return wrap('0 0 200 200', `
      <rect x="28" y="34" width="144" height="144" rx="30" fill="${body}" stroke="${edge}" stroke-width="1.6"/>
      <rect x="28" y="34" width="144" height="144" rx="30" fill="${gloss}"/>
      ${pdpLogo(100, 106, 22)}`);
  }

  if (cat === 'Watch') {
    const ultra = /ultra/i.test(name || '');
    const w = ultra ? 104 : 92;
    const x = (150 - w) / 2;
    const rx = ultra ? 26 : 32;
    return wrap('0 0 150 270', `
      <rect x="53" y="4" width="44" height="76" rx="12" fill="${pdpShade(base, -0.34)}" stroke="${edge}" stroke-width="1.1"/>
      <rect x="53" y="190" width="44" height="76" rx="12" fill="${pdpShade(base, -0.34)}" stroke="${edge}" stroke-width="1.1"/>
      <rect x="${x}" y="72" width="${w}" height="126" rx="${rx}" fill="${body}" stroke="${edge}" stroke-width="1.6"/>
      <rect x="${x}" y="72" width="${w}" height="126" rx="${rx}" fill="${gloss}"/>
      ${pdpLogo(75, 135, ultra ? 16 : 14)}
      <rect x="${x + w - 1}" y="108" width="9" height="26" rx="4.5" fill="${pdpShade(base, -0.42)}" stroke="${edge}" stroke-width=".8"/>
      <rect x="${x - 8}" y="118" width="9" height="18" rx="4.5" fill="${pdpShade(base, -0.30)}" stroke="${edge}" stroke-width=".8"/>`);
  }

  if (cat === 'AirPods') {
    return wrap('0 0 200 200', `
      <rect x="46" y="44" width="108" height="116" rx="40" fill="${body}" stroke="${edge}" stroke-width="1.6"/>
      <rect x="46" y="44" width="108" height="116" rx="40" fill="${gloss}"/>
      <path d="M46 96h108" stroke="${edge}" stroke-opacity=".5" stroke-width="2"/>
      <circle cx="100" cy="74" r="4" fill="${pdpShade(base, -0.25)}" stroke="${edge}" stroke-width=".8"/>
      ${pdpLogo(100, 128, 11)}`);
  }

  if (cat === 'iPhone') {
    return wrap('0 0 150 300', `
      <rect x="14" y="8" width="122" height="272" rx="30" fill="${body}" stroke="${edge}" stroke-width="1.6"/>
      <rect x="14" y="8" width="122" height="272" rx="30" fill="${gloss}"/>
      ${pdpCameraCluster(uid, 26, 22, 56, 3)}
      ${pdpLogo(75, 158, 15)}
      <rect x="10.5" y="66" width="3.6" height="20" rx="1.8" fill="${edge}"/>
      <rect x="10.5" y="94" width="3.6" height="34" rx="1.8" fill="${edge}"/>
      <rect x="136" y="84" width="3.6" height="46" rx="1.8" fill="${edge}"/>`);
  }

  return wrap('0 0 200 200', `
    <rect x="40" y="40" width="120" height="120" rx="28" fill="${body}" stroke="${edge}" stroke-width="1.6"/>
    <rect x="40" y="40" width="120" height="120" rx="28" fill="${gloss}"/>
    ${pdpLogo(100, 100, 18)}`);
}

/* ---------------------------------------------------------------------------
   ẢNH THẬT THEO BIẾN THỂ — thứ tự ưu tiên
   1. Ảnh chụp đúng màu + đúng phiên bản (variants.shots)
   2. Ảnh ĐẦU TIÊN của màu (colors[].images[0]) — ảnh chính luôn đúng màu
   3. Ảnh riêng của phiên bản (configs[].images) — đổi phiên bản là thấy ngay
   4. Các ảnh còn lại của màu
   5. Ảnh chụp theo màu, không gắn phiên bản
   6. Ảnh chung của sản phẩm (product.images / product.image)
   7. Không có ảnh thật → thiết bị SVG tô theo mã màu
   Toàn bộ danh sách được khử trùng lặp và giữ đúng thứ tự.
   --------------------------------------------------------------------------- */

function pdpGallery(x, selection) {
  const variants = (selection && selection.variants) || productVariants(x);
  const color = (selection && selection.color) || variants.colors[0];
  const config = (selection && selection.config) || variants.configs[0];
  const shots = Array.isArray(variants.shots) ? variants.shots : [];
  const own = pdpImageList(color?.images);
  const out = [];
  const add = list => {
    for (const url of pdpImageList(list)) if (!out.includes(url)) out.push(url);
  };
  add(shots.filter(s => s.color === color?.key && s.config === config?.key).map(s => s.url));
  add(own.slice(0, 1));
  add(config?.images);
  add(own.slice(1));
  add(shots.filter(s => s.color === color?.key && !s.config).map(s => s.url));
  add(x?.images);
  add(x?.image);
  return out;
}

/* Ảnh đại diện của một màu (dùng cho dải thumbnail và thẻ chọn màu) */
function pdpColorPhoto(x, color, variants) {
  const shots = Array.isArray(variants?.shots) ? variants.shots : [];
  const own = pdpImageList(color?.images);
  if (own.length) return own[0];
  const shot = shots.find(s => s.color === color?.key);
  return shot ? shot.url : '';
}

/* Hình hiển thị cho một màu: ảnh thật của màu nếu có, ngược lại thiết bị SVG.
   Galerie, thumbnail và thẻ màu đều gọi hàm này nên luôn khớp nhau. */
function pdpVisual(x, color, opts) {
  const options = opts || {};
  const colorCount = Number.isFinite(options.colorCount) ? options.colorCount : 1;
  const photo = options.url
    || pdpColorPhoto(x, color, options.variants)
    || (colorCount <= 1 ? (pdpImageList(x?.images)[0] || pdpImageList(x?.image)[0] || '') : '');
  if (photo) {
    return `<img class="pdp-photo" src="${esc(photo)}" alt="${esc(options.alt || (x && x.name) || '')}" loading="lazy">`;
  }
  return pdpDeviceSvg(x && x.cat, color && color.hex, x && x.name);
}

/* Zoom theo vị trí con trỏ (tính năng xem gần như mẫu) */
function pdpZoom(event) {
  const target = event.currentTarget;
  const wrap = target && target.classList && target.classList.contains('pdp-zoom-wrap')
    ? target
    : (target && target.querySelector ? target.querySelector('.pdp-zoom-wrap') : null);
  if (!wrap) return;
  const box = wrap.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const x = Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100));
  const y = Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100));
  wrap.style.setProperty('--ox', x.toFixed(1) + '%');
  wrap.style.setProperty('--oy', y.toFixed(1) + '%');
}

/* Dải thumbnail: cuộn ngang như mẫu */
function pdpScrollThumbs(id, dir) {
  const strip = document.getElementById('pdpThumbs' + id);
  if (!strip) return;
  strip.scrollBy({ left: dir * Math.max(140, strip.clientWidth * 0.7), behavior: 'smooth' });
}

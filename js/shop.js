let activeCat='Tất cả';
function renderChips(){
  document.getElementById('chips').innerHTML=CATS.map(c=>`<button class="chip ${c===activeCat?'active':''}" onclick="activeCat='${c}';renderChips();renderGrid()">${c}</button>`).join('');
}
function renderGrid(){
  const q=(document.getElementById('q')?.value||'').toLowerCase();
  let list=PRODUCTS.filter(x=>x.show!==false);
  if(activeCat!=='Tất cả')list=list.filter(x=>x.cat===activeCat);
  if(q)list=list.filter(x=>x.name.toLowerCase().includes(q)||x.desc.toLowerCase().includes(q));
  const s=document.getElementById('sort').value;
  if(s==='asc')list.sort((a,b)=>minVariantPrice(a)-minVariantPrice(b)); if(s==='desc')list.sort((a,b)=>minVariantPrice(b)-minVariantPrice(a));
  document.getElementById('grid').innerHTML=list.map(x=>{
    const rv=reviews[x.id]||[];const star=rv.length?(rv.reduce((s,r)=>s+r.star,0)/rv.length).toFixed(1):'—';
    const offer=minVariantOffer(x);const variants=productVariants(x);
    const from=offer.price;
    const disc=offer.old?Math.round((1-from/offer.old)*100):0;
    const hasRange=variants.configs.length>1||variants.colors.some(c=>c.delta);
    return `<div class="card" onclick="openDetail(${x.id})">
      ${disc>0?`<span class="tag">-${disc}%</span>`:x.isNew?'<span class="tag new">Mới</span>':''}
      <div class="thumb">${pdpVisual(x,variants.colors[0],{colorCount:variants.colors.length})}</div>
      <div class="body"><div class="cat">${esc(x.cat)}${x.verified?' <span class="verified">✓ Xác minh</span>':''}</div><h3>${esc(x.name)}</h3>
      <div class="stars" style="font-size:12px">★ ${star} <span style="color:var(--muted)">(${rv.length})</span></div>
      <div class="swatch-row">${variants.colors.slice(0,5).map(c=>`<span class="swatch" style="background:${esc(c.hex)}" title="${esc(c.label)}"></span>`).join('')}${variants.configs.length>1?`<span class="swatch-more">${variants.configs.length} phiên bản</span>`:''}</div>
      <div style="margin-top:6px"><span class="price" title="Giá tham khảo apple.com/vn">${hasRange?'Từ ':''}${vnd(from)}</span>${disc>0?`<span class="old">${vnd(offer.old)}</span>`:''}</div></div></div>`;
  }).join('')||'<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div>Không tìm thấy sản phẩm phù hợp.</div>';
}

/* ---------------------------------------------------------------------------
   Hình sản phẩm: galerie, dải thumbnail và thẻ màu cùng dùng pdpVisual()
   (js/pdp-visual.js) nên luôn là CÙNG một hình và CÙNG một màu.
   --------------------------------------------------------------------------- */

function pdpToggleZoom(wrap){
  if(!wrap)return;
  const on=wrap.classList.toggle('zoomed');
  if(!on){wrap.style.removeProperty('--ox');wrap.style.removeProperty('--oy')}
}

/* Vị trí ảnh đang xem của từng sản phẩm (chỉ là trạng thái giao diện) */
let pdpPhotoIndex={};

function pdpCurrentPhotos(x,sel){
  const list=pdpGallery(x,sel);
  return list;
}
function pdpPhotoGo(id,index){
  const x=p(id);if(!x)return;
  pdpPhotoIndex[Number(id)]=Math.max(0,Number(index)||0);
  openDetail(id);
}
function pdpPhotoStep(id,dir){
  const x=p(id);if(!x)return;
  const sel=pdpSelection(x);
  const photos=pdpGallery(x,sel);
  if(photos.length<2)return pdpCycle(id,dir);
  const cur=Math.min(pdpPhotoIndex[Number(id)]||0,photos.length-1);
  pdpPhotoGo(id,(cur+dir+photos.length)%photos.length);
}
function pdpPhotoStrip(id){
  return document.getElementById('pdpThumbs'+id);
}

function pdpPick(id,kind,key){
  const x=p(id);if(!x)return;
  const keepQty=document.getElementById('qty'+id)?.value||'1';
  pdpChoices[Number(id)]={...pdpChoice(id),[kind]:key};
  /* Đổi màu hoặc phiên bản thì quay về ảnh đầu tiên của biến thể mới */
  pdpPhotoIndex[Number(id)]=0;
  try{localStorage.setItem('applevn_choices',JSON.stringify(pdpChoices))}catch(_){}
  openDetail(id);
  const field=document.getElementById('qty'+id);if(field)field.value=keepQty;
}
function pdpCycle(id,step){
  const x=p(id);if(!x)return;
  const sel=pdpSelection(x);const list=sel.variants.colors;
  const index=list.findIndex(c=>c.key===sel.color.key);
  pdpPick(id,'color',list[(index+step+list.length)%list.length].key);
}

function pdpPromoNotices(x,sel){
  const disc=sel.old?Math.round((1-sel.price/sel.old)*100):0;
  const notes=[];
  if(disc>0)notes.push(`Giảm <b>${disc}%</b> so với giá niêm yết — tiết kiệm ${vnd(sel.old-sel.price)}.`);
  notes.push('Trả góp <b>0%</b> qua thẻ tín dụng, kỳ hạn 6–12 tháng (thủ tục tại cửa hàng).');
  if(sel.price>=20000000)notes.push(`Tặng <b>phiếu mua hàng ${vnd(500000)}</b> cho đơn từ 20 triệu.`);
  notes.push('Miễn phí giao hàng toàn quốc, kiểm tra hàng trước khi nhận.');
  return notes;
}

function pdpCommitments(x){
  const items=[
    'Hàng chính hãng, nguyên seal, đầy đủ hoá đơn VAT.',
    'Bảo hành 12 tháng theo tiêu chuẩn nhà sản xuất.',
    '1 đổi 1 trong 30 ngày nếu lỗi do nhà sản xuất.',
    'Hỗ trợ trả góp 0% và thu cũ đổi mới.'
  ];
  if(x.cat==='Phụ kiện')items[1]='Bảo hành 6 tháng theo tiêu chuẩn nhà sản xuất.';
  return `<div class="pdp-commit"><h3>Cam kết sản phẩm</h3><ul>${items.map(t=>`<li><span class="tick">✓</span>${esc(t)}</li>`).join('')}</ul></div>`;
}

function openDetail(id){
  const x=p(id);if(!x||x.show===false)return toast('Sản phẩm không còn được bán');
  window.activeDetailId=Number(id);
  const rv=reviews[id]||[];
  const avg=rv.length?(rv.reduce((s,r)=>s+r.star,0)/rv.length):0;
  const sel=pdpSelection(x);
  const {configs,colors}=sel.variants;
  const inst=pdpInstallment(sel.price);
  const outOfStock=x.stock<=0;
  const displayName=pdpTitle(x,sel);
  const notes=pdpPromoNotices(x,sel);
  /* Danh sách ảnh thật của đúng màu + đúng phiên bản đang chọn */
  const photos=pdpGallery(x,sel);
  const photoIndex=photos.length?Math.min(Math.max(0,pdpPhotoIndex[Number(id)]||0),photos.length-1):0;
  const currentPhoto=photos[photoIndex]||'';
  const hasPhotos=photos.length>0;
  const mainVisual=pdpVisual(x,sel.color,{colorCount:colors.length,url:currentPhoto,variants:sel.variants,alt:displayName});

  document.getElementById('detailBox').innerHTML=`
   <div class="pdp-crumbs"><a href="javascript:go('home')">‹ Tiếp tục mua sắm</a><span>/</span><span>${esc(x.cat)}</span><span>/</span><span>${esc(x.name)}</span></div>

   <div class="pdp">
    <div class="pdp-left">
     <div class="pdp-media">
      <div class="pdp-stage" style="--tint:${pdpTint(sel.color.hex,0.18)}">
       <button class="pdp-arrow prev" aria-label="${hasPhotos?'Ảnh trước':'Màu trước'}" onclick="pdpPhotoStep(${x.id},-1)">‹</button>
       <div class="pdp-zoom-wrap ${hasPhotos?'has-photo':''}" role="img" aria-label="${esc(displayName)} — ${esc(sel.color.label)}${hasPhotos?` — ảnh ${photoIndex+1}/${photos.length}`:''}" onclick="pdpToggleZoom(this)" onmousemove="pdpZoom(event)">
        ${mainVisual}
       </div>
       <button class="pdp-arrow next" aria-label="${hasPhotos?'Ảnh tiếp theo':'Màu tiếp theo'}" onclick="pdpPhotoStep(${x.id},1)">›</button>
       <span class="pdp-zoom-hint">🔍 Nhấn để xem gần</span>
       ${hasPhotos?`<span class="pdp-photo-count">${photoIndex+1}/${photos.length} ảnh thật</span>`:''}
      </div>
      ${hasPhotos?`<div class="pdp-photo-dots" role="tablist" aria-label="Ảnh sản phẩm">
        ${photos.map((url,i)=>`<button role="tab" class="dot ${i===photoIndex?'active':''}" aria-selected="${i===photoIndex}" aria-label="Ảnh ${i+1}" onclick="pdpPhotoGo(${x.id},${i})"></button>`).join('')}
      </div>`:''}
      <div class="pdp-thumbs-wrap">
       <button class="pdp-thumb-nav prev" aria-label="Xem trước" onclick="pdpScrollThumbs(${x.id},-1)">‹</button>
       <div class="pdp-thumbs" role="list" id="pdpThumbs${x.id}">
        ${colors.map(c=>{const thumb=pdpVisual(x,c,{colorCount:colors.length,variants:sel.variants,alt:c.label});return `<button role="listitem" class="pdp-thumb ${c.key===sel.color.key?'active':''}" title="${esc(c.label)}" aria-label="${esc(c.label)}" aria-pressed="${c.key===sel.color.key}" onclick="pdpPick(${x.id},'color','${esc(c.key)}')">${thumb}</button>`}).join('')}
       </div>
       <button class="pdp-thumb-nav next" aria-label="Xem tiếp" onclick="pdpScrollThumbs(${x.id},1)">›</button>
      </div>
     </div>
     ${pdpCommitments(x)}
    </div>

    <div class="pdp-right">
     <div class="pdp-head">
      <span class="pdp-brand">${esc(x.cat)}${x.verified?' · <span class="verified">✓ Giá xác minh apple.com/vn</span>':''}</span>
      <h1 class="pdp-title">${esc(displayName)} <span class="pdp-official">| Chính hãng</span></h1>
     </div>

     <div class="pdp-meta">
      <span class="pdp-stars">★ ${avg?avg.toFixed(1):'—'}</span>
      <a href="javascript:void(0)" onclick="document.getElementById('pdpReviews').scrollIntoView({behavior:'smooth'})">${rv.length} đánh giá</a>
      <span class="pdp-dot">•</span>
      <span class="${outOfStock?'pdp-stock out':'pdp-stock'}">${outOfStock?'Tạm hết hàng':'Còn '+x.stock+' sản phẩm'}</span>
     </div>

     <div class="pdp-actions-line">
      <a href="javascript:void(0)" onclick="toast('Đã thêm vào danh sách yêu thích trên thiết bị này')">🤍 Yêu thích</a>
      <a href="javascript:void(0)" onclick="toast('Khung hỏi đáp sẽ được kết nối sau')">💬 Hỏi đáp</a>
      <a href="javascript:void(0)" onclick="document.getElementById('pdpSpecs').scrollIntoView({behavior:'smooth'})">📋 Thông số</a>
      <a href="javascript:void(0)" onclick="toast('Chọn thêm sản phẩm khác để so sánh')">⇄ So sánh</a>
     </div>

     <div class="pdp-price-card">
      <div class="pdp-price-row">
       <span class="pdp-price">${vnd(sel.price)}</span>
       ${sel.old?`<span class="pdp-old">${vnd(sel.old)}</span>`:''}
       ${sel.old?`<span class="pdp-off">-${Math.round((1-sel.price/sel.old)*100)}%</span>`:''}
      </div>
      <div class="pdp-price-sub">Giá đã bao gồm VAT · ${esc(sel.color.label)}${/^tiêu chuẩn$/i.test(sel.config.label)?'':` · ${esc(sel.config.label)}`}</div>
      <div class="pdp-install">
       <span>Trả góp <b>${vnd(inst.per)}</b>/tháng</span>
       <span>Hoặc ${vnd(sel.price)} khi nhận hàng</span>
       <span class="pdp-install-note">${inst.months} tháng, lãi suất 0% »</span>
      </div>
     </div>

     <div class="pdp-block">
      <h3 class="pdp-label">Phiên bản</h3>
      <div class="pdp-opts">
       ${configs.map(c=>`<button class="pdp-opt ${c.key===sel.config.key?'active':''}" onclick="pdpPick(${x.id},'config','${esc(c.key)}')" aria-pressed="${c.key===sel.config.key}"><span>${esc(c.label)}</span><small>${vnd(c.price)}</small></button>`).join('')}
      </div>
     </div>

     <div class="pdp-block">
      <h3 class="pdp-label">Màu sắc</h3>
      <div class="pdp-colors">
       ${colors.map(c=>{const price=Math.max(0,sel.config.price+(c.delta||0));return `<button class="pdp-color ${c.key===sel.color.key?'active':''}" onclick="pdpPick(${x.id},'color','${esc(c.key)}')" aria-pressed="${c.key===sel.color.key}">
         <span class="pdp-color-thumb">${pdpVisual(x,c,{colorCount:colors.length,variants:sel.variants,alt:c.label})}</span>
         <span class="pdp-color-text"><b>${esc(c.label)}</b><small>${vnd(price)}</small>${pdpImageList(c.images).length?`<i class="pdp-color-count">${pdpImageList(c.images).length} ảnh</i>`:''}</span></button>`}).join('')}
      </div>
     </div>

     <div class="pdp-promo">
      <div class="pdp-promo-head">🎁 Khuyến mãi đi kèm</div>
      <ul>${notes.map((t,i)=>`<li><span class="num">${i+1}</span><span>${t}</span></li>`).join('')}</ul>
     </div>

     <div class="pdp-buy">
      <div class="qty"><button onclick="dq(${x.id})" aria-label="Giảm số lượng">−</button><input id="qty${x.id}" value="1" readonly aria-label="Số lượng"><button onclick="iq(${x.id})" aria-label="Tăng số lượng">+</button></div>
      <button class="btn" ${outOfStock?'disabled':''} onclick="addToCart(${x.id})">🛒 Thêm vào giỏ hàng</button>
      <button class="btn pdp-buy-now" ${outOfStock?'disabled':''} onclick="buyNow(${x.id})">Mua ngay</button>
     </div>
     <p class="pdp-hint">Gọi <b>1900 0000</b> để được tư vấn · Giao trong 2 giờ tại nội thành</p>

     <div class="pdp-desc"><p>${esc(x.desc)}</p></div>
    </div>
   </div>

   <div class="pdp-extra">
    <div class="panel" id="pdpSpecs">
     <h3 class="sec" style="margin-top:0">Thông số nổi bật</h3>
     <table class="tbl"><tr><th>Thuộc tính</th><th>Thông tin</th></tr>
      <tr><td>Danh mục</td><td>${esc(x.cat)}</td></tr>
      <tr><td>Phiên bản đang chọn</td><td>${esc(sel.config.label)}</td></tr>
      <tr><td>Màu sắc đang chọn</td><td>${esc(sel.color.label)}</td></tr>
      <tr><td>Tồn kho</td><td>${x.stock} sản phẩm</td></tr>
      <tr><td>Giá niêm yết</td><td>${vnd(sel.price)}</td></tr>
     </table>
    </div>
    <div class="panel" id="pdpReviews">
     <h3 class="sec" style="margin-top:0">Đánh giá sản phẩm</h3>
     ${rv.map(r=>`<div class="review"><div class="stars" style="font-size:13px">${'★'.repeat(r.star)}${'☆'.repeat(5-r.star)}</div><div class="who">${esc(r.user)} · <span style="color:var(--muted);font-weight:400">${r.date}</span></div>${r.text?`<div>${esc(r.text)}</div>`:''}</div>`).join('')||'<p style="color:var(--muted);font-size:14px">Chưa có đánh giá — mua và là người đầu tiên đánh giá!</p>'}
     <button class="btn sm ghost" style="margin-top:12px" onclick="reviewModal(${x.id})">✍️ Viết đánh giá</button>
    </div>
   </div>

   <div class="pdp-bar">
    <div class="pdp-bar-price"><b>${vnd(sel.price)}</b><small>${esc(sel.color.label)}${/^tiêu chuẩn$/i.test(sel.config.label)?'':' · '+esc(sel.config.label)}</small></div>
    <button class="btn pdp-buy-now" ${outOfStock?'disabled':''} onclick="addToCart(${x.id})">Thêm vào giỏ</button>
   </div>`;
  go('detail');
}
function dq(id){const el=document.getElementById('qty'+id);el.value=Math.max(1,+el.value-1)}
function iq(id){const el=document.getElementById('qty'+id);el.value=Math.min(p(id).stock,+el.value+1)}

async function buyNow(id){if(await addToCart(id))go('cart')}

function updateBadge(){const n=cart.reduce((s,c)=>s+c.qty,0);const b=document.getElementById('cartBadge');if(!b)return;b.textContent=n;b.style.display=n?'block':'none'}
function renderCart(){
  cart=loadCart();updateBadge();const box=document.getElementById('cartBox');
  if(!cart.length){box.innerHTML='<div class="panel empty"><div class="big">🛒</div>Giỏ hàng của bạn đang trống.<br><br><button class="btn" onclick="go(\'home\')">Mua sắm ngay</button></div>';return}
  const sub=cart.reduce((s,c)=>s+linePrice(c)*c.qty,0);
  box.innerHTML=`<h2 class="sec">🛒 Giỏ hàng của bạn</h2>
  <div class="panel">
   ${cart.map(c=>{const x=p(c.id);const variant=lineVariantLabel(c);const picked=pdpSelection(x);return `<div class="cart-line">
     <div class="thumb" onclick="openDetail(${x.id})">${pdpVisual(x,picked.color,{colorCount:picked.variants.colors.length})}</div>
     <div class="grow"><b>${esc(x.name)}</b>${variant?`<div class="cart-variant">${esc(variant)}</div>`:''}<div style="color:var(--muted);font-size:13px">${esc(x.cat)}${x.verified?' <span class="verified">✓</span>':''}</div>
      <div class="qty" style="margin-top:8px;width:110px"><button onclick="cartQty(${x.id},-1)">−</button><input value="${c.qty}" readonly><button onclick="cartQty(${x.id},1)">+</button></div></div>
     <div style="text-align:right"><div class="line-total">${vnd(linePrice(c)*c.qty)}</div><a href="javascript:void(0)" style="font-size:13px" onclick="removeCart(${x.id})">Xóa</a></div></div>`}).join('')}
   <div style="max-width:360px;margin-left:auto;margin-top:16px">
    <div class="sum-row"><span>Tạm tính</span><b>${vnd(sub)}</b></div>
    <div class="sum-row"><span>Phí vận chuyển (tạm tính)</span><b>${vnd(SHIP_FEE)}</b></div>
    <div class="sum-row total"><span>Tổng cộng</span><span>${vnd(sub+SHIP_FEE)}</span></div>
    <button class="btn" style="width:100%;margin-top:14px" onclick="go('checkout')">Tiến hành đặt hàng →</button>
   </div></div>`;
}


let payMethod='COD';let appliedPromo=null;let checkoutDraft={};
let promoInputDraft='';
function rememberCheckout(){for(const id of ['ckName','ckPhone','ckAddr','ckNote']){const el=document.getElementById(id);if(el)checkoutDraft[id]=el.value}}
/* ---------------------------------------------------------------------------
   BƯỚC 2 — PHƯƠNG THỨC THANH TOÁN: thẻ chọn theo nhóm, mỗi nhóm có mô tả và
   thời gian xử lý. Chọn nhóm nào thì khối hướng dẫn của nhóm đó hiện ra.
   --------------------------------------------------------------------------- */
function pickPayMethod(key){
  rememberCheckout();
  payMethod=key;
  renderCheckout();
  toast('Đã chọn: '+payInfo(key).label);
}

function payMethodCards(){
  return Object.entries(PAY_GROUPS).map(([group,title])=>{
    const list=PAY_METHODS.filter(m=>m.group===group);
    if(!list.length)return '';
    return `<div class="pay-group">
      <div class="pay-group-title">${esc(title)}</div>
      <div class="pay-grid">${list.map(m=>`
        <button type="button" class="pay-card ${payMethod===m.key?'active':''}" onclick="pickPayMethod('${m.key}')" aria-pressed="${payMethod===m.key}">
          <span class="pay-ico" aria-hidden="true">${m.icon}</span>
          <span class="pay-text"><b>${esc(m.label)}</b><small>${esc(m.desc)}</small></span>
          ${m.badge?`<span class="pay-badge">${esc(m.badge)}</span>`:''}
          <span class="pay-check" aria-hidden="true">✓</span>
        </button>`).join('')}</div>
    </div>`;
  }).join('');
}

function payDetailPanel(){
  const m=payInfo(payMethod);
  const head=`<div class="pay-detail-head"><span class="pay-detail-ico">${m.icon}</span><div><b>${esc(m.label)}</b><small>⏱ ${esc(m.eta)}</small></div></div>`;
  let body='';
  if(m.key==='BANK'){
    body=`<div class="bank-box">
      <div class="bank-row"><span>Ngân hàng</span><b>${esc(STORE_BANK.bank)}</b></div>
      <div class="bank-row"><span>Số tài khoản</span><b class="mono">${esc(STORE_BANK.account)}</b></div>
      <div class="bank-row"><span>Chủ tài khoản</span><b>${esc(STORE_BANK.holder)}</b></div>
      <div class="bank-row"><span>Nội dung CK</span><b class="mono">Mã đơn hàng (xem sau khi đặt)</b></div>
      <p class="pay-note">Sau khi đặt hàng, mã đơn và số tiền chính xác sẽ hiện ở màn hình <b>Kết quả thanh toán</b> để bạn sao chép khi chuyển khoản.</p>
    </div>`;
  }else if(m.key==='INSTALLMENT'){
    body=`<div class="install-grid">
      ${[3,6,9,12].map(n=>`<div class="install-cell"><b>${n} tháng</b><small>≈ ${vnd(Math.round(cart.reduce((s,c)=>s+linePrice(c)*c.qty,0)/n))}/tháng</small></div>`).join('')}
      </div>
      <p class="pay-note">Cửa hàng sẽ gọi xác nhận hồ sơ và hạn mức thẻ trước khi giao. Bản mô phỏng chưa nối cổng trả góp.</p>`;
  }else if(m.group==='card'){
    body=`<p class="pay-note">Bản mô phỏng <b>không nhập số thẻ</b> trên trang này. Đơn sẽ ở trạng thái «Chờ xác minh» và cửa hàng liên hệ để hoàn tất thanh toán an toàn.</p>`;
  }else if(m.group==='wallet'){
    body=`<p class="pay-note">Bản mô phỏng chưa mở ứng dụng ví. Đơn được ghi ở trạng thái «Chờ xác minh»; quản trị xác nhận trong mục <b>Đơn hàng</b>.</p>`;
  }else{
    body=`<p class="pay-note">Bạn chỉ trả tiền khi nhận hàng. Nhân viên giao hàng thu đúng số tiền ở khung bên phải.</p>`;
  }
  return `<div class="pay-detail">${head}${body}</div>`;
}

/* ---------------------------------------------------------------------------
   BƯỚC 3 — KHUYẾN MÃI: gợi ý mã tốt nhất cho giỏ hiện tại và danh sách mã
   đang chạy. Điều kiện được kiểm tra bằng chính bộ máy promotions.
   --------------------------------------------------------------------------- */
function promoSectionHtml(){
  if(typeof promotions==='undefined'||!Array.isArray(promotions))return '';
  const lines=promoCartLines();
  const best=promoBestFor(lines);
  const active=promoActiveList();
  const suggest=(best&&(!appliedPromo||appliedPromo.code!==best.pr.code))?`<div class="promo-suggest">
      <span class="promo-suggest-ico">✨</span>
      <div><b>Gợi ý tốt nhất cho giỏ này: ${esc(best.pr.code)}</b><small>${esc(promoSummary(best.pr))} · tiết kiệm ${vnd(best.gain)}</small></div>
      <button class="btn sm" onclick="usePromo('${esc(best.pr.code)}')">Dùng mã</button>
    </div>`:'';
  return `<h3 class="sec">3. Mã khuyến mãi</h3>
    ${suggest}
    <div class="promo-input-row">
      <input id="promoInput" placeholder="Nhập mã giảm giá…" value="${esc(appliedPromo?appliedPromo.code:promoInputDraft)}" oninput="promoInputDraft=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault();applyPromo()}">
      <button class="btn ghost" onclick="applyPromo()">Áp dụng</button>
    </div>
    ${appliedPromo?`<div class="promo-applied"><span>🎁 <b>${esc(appliedPromo.code)}</b> — ${esc(promoSummary(appliedPromo))}</span><button class="btn sm ghost" onclick="clearPromo()">Bỏ mã</button></div>`:''}
    ${appliedPromo&&!PROMOS.some(x=>x.code===appliedPromo.code)?`<p class="pay-note">⚠️ Mã này mới tạo trong trang quản trị nên chỉ có hiệu lực trên giao diện. Hàm <code>place_order</code> trên Supabase chỉ chấp nhận những mã đã đăng ký trong cơ sở dữ liệu — hãy thêm mã vào Supabase trước khi dùng thật.</p>`:''}
    ${active.length?`<div class="promo-available"><div class="promo-available-head">Mã đang chạy (${active.length})</div>${active.map(pr=>{
      const res=promoEvaluate(pr,lines);
      return `<div class="promo-avail-row ${res.ok?'ok':'no'}">
        <div class="promo-avail-code">${esc(pr.code)}</div>
        <div class="promo-avail-body"><b>${esc(pr.name)}</b><small>${esc(promoSummary(pr))}</small>
          <i>${res.ok?`✓ Dùng được · giảm ${vnd(res.disc+res.ship)}`:esc(res.reason)}</i></div>
        <button class="btn sm ghost" ${res.ok?'':'disabled'} onclick="usePromo('${esc(pr.code)}')">Dùng</button>
      </div>`}).join('')}</div>`:'<p class="pay-note">Hiện chưa có chương trình khuyến mãi nào đang chạy.</p>'}`;
}

function renderCheckout(){
  cart=loadCart();updateBadge();
  const box=document.getElementById('checkoutBox');const u=cur();
  if(!u){box.innerHTML='<div class="panel">Vui lòng đăng nhập để đặt hàng và theo dõi đơn trên mọi thiết bị.<br><br><button class="btn" onclick="go(\'login\')">Đăng nhập</button></div>';return}
  if(!cart.length){box.innerHTML='<div class="panel empty"><div class="big">🛒</div>Giỏ hàng trống.</div>';return}
  const sub=cart.reduce((s,c)=>s+linePrice(c)*c.qty,0);
  const variantDeviation=cart.some(c=>p(c.id)&&linePrice(c)!==p(c.id).price);
  const info=payInfo(payMethod);
  box.innerHTML=`<div class="ck-head"><h2 class="sec">💳 Thanh toán</h2><span class="ck-step">Bước 2/2 · Xác nhận đơn</span></div>
  <div class="ck-grid">
   <div class="panel ck-main">
    <h3 class="sec" style="margin-top:0">1. Thông tin nhận hàng</h3>
    <div class="form-grid">
     <div class="field"><label>Họ tên người nhận *</label><input id="ckName" value="${esc(u?u.name:'')}"></div>
     <div class="field"><label>Số điện thoại *</label><input id="ckPhone" value="${esc(u?u.phone||'':'')}"></div>
     <div class="field" style="grid-column:1/-1"><label>Địa chỉ giao hàng *</label><input id="ckAddr" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" value="${esc(u?u.address||'':'')}"></div>
     <div class="field" style="grid-column:1/-1"><label>Ghi chú giao hàng</label><textarea id="ckNote" rows="2" placeholder="VD: Giao giờ hành chính"></textarea></div>
    </div>

    <h3 class="sec">2. Phương thức thanh toán</h3>
    <p class="ck-hint">Chọn cách bạn muốn trả tiền. Trạng thái thanh toán của đơn được hiển thị lại ở bước kết quả.</p>
    ${payMethodCards()}
    ${payDetailPanel()}

    ${promoSectionHtml()}
   </div>

   <aside class="panel ck-summary">
    <h3 class="sec" style="margin-top:0">Đơn hàng của bạn</h3>
    <div class="ck-lines">
    ${cart.map(c=>{const x=p(c.id),variant=lineVariantLabel(c);return `<div class="ck-line"><span>${esc(x.emoji)} ${esc(x.name)}${variant?` <span class="cart-variant">${esc(variant)}</span>`:''} <b class="ck-qty">×${c.qty}</b></span><b>${vnd(linePrice(c)*c.qty)}</b></div>`}).join('')}
    </div>
    <div class="sum-row"><span>Tạm tính</span><b>${vnd(sub)}</b></div>
    <div class="sum-row" id="promoRow">${appliedPromo?`<span>Mã <b>${appliedPromo.code}</b> ✓</span><b id="promoVal"></b>`:'<span>Giảm giá</span><b id="promoVal">—</b>'}</div>
    <div class="sum-row" id="shipRow"><span>Vận chuyển</span><b id="shipVal">${vnd(SHIP_FEE)}</b></div>
    <div class="sum-row total"><span>Tổng thanh toán</span><span id="grandTotal"></span></div>
    <div class="ck-pay-badge">${info.icon} ${esc(info.short)} · ${esc(PAY_STATUS[info.initial].label)}</div>
    ${variantDeviation?'<p class="pdp-hint" style="margin-top:10px">Giá hiển thị theo phiên bản/màu đã chọn là giá tham khảo; máy chủ xác nhận lại tổng tiền khi đặt hàng.</p>':''}
    <button class="btn" style="width:100%;margin-top:14px" onclick="placeOrder()">✓ Xác nhận đặt hàng</button>
    <p class="ck-legal">Bằng việc đặt hàng bạn đồng ý để cửa hàng liên hệ xác nhận. Đây là bản mô phỏng: <b>chưa có cổng thanh toán thật</b>, đơn chưa được coi là đã thanh toán.</p>
   </aside>
  </div>`;
  for(const [id,value] of Object.entries(checkoutDraft)){const el=document.getElementById(id);if(el)el.value=value}
  recalcTotals(sub);
}

function usePromo(code){
  const pr=promoByCode(code);
  if(!pr)return toast('Mã giảm giá không hợp lệ');
  const res=promoEvaluate(pr,promoCartLines());
  if(!res.ok)return toast('Không dùng được: '+res.reason);
  rememberCheckout();
  appliedPromo=pr;
  promoInputDraft=pr.code;
  toast('Đã áp dụng '+pr.code+' · giảm '+vnd(res.disc+res.ship));
  renderCheckout();
}
function applyPromo(){
  const input=document.getElementById('promoInput');
  const code=(input?input.value:promoInputDraft||'').trim().toUpperCase();
  if(!code)return toast('Nhập mã khuyến mãi');
  usePromo(code);
}
function clearPromo(){
  rememberCheckout();
  appliedPromo=null;promoInputDraft='';
  renderCheckout();
  toast('Đã bỏ mã khuyến mãi');
}

function recalcTotals(sub){
  let disc=0,ship=SHIP_FEE,invalid=false;
  if(appliedPromo){
    const res=promoEvaluate(appliedPromo,promoCartLines());
    if(res.ok){disc=res.disc;ship=SHIP_FEE-res.ship}
    else invalid=true;
  }
  const promoVal=document.getElementById('promoVal');
  if(promoVal&&appliedPromo){
    promoVal.textContent=invalid?'Không đủ điều kiện':(disc?'-'+vnd(disc):(ship<SHIP_FEE?'Miễn ship':'—'));
    promoVal.classList.toggle('is-invalid',invalid);
  }
  const shipEl=document.getElementById('shipVal');
  if(shipEl)shipEl.textContent=ship?vnd(ship):'Miễn phí';
  const totalEl=document.getElementById('grandTotal');
  if(totalEl)totalEl.textContent=vnd(sub-disc+ship);
  return {disc,ship,invalid};
}

/* ==========================================================================
   KẾT QUẢ THANH TOÁN — màn hình sau khi đặt hàng
   Hiển thị đúng 4 thông tin cốt lõi (mã đơn, số tiền, phương thức, trạng thái
   thanh toán) nhưng có thêm: trạng thái trực quan, các bước tiếp theo theo
   từng phương thức, nút sao chép nội dung chuyển khoản và lối tắt sang đơn.
   ========================================================================== */
let lastPlacedOrder = null;

function paymentResultStatus(order){
  if(!order)return {key:'pending',meta:PAY_STATUS.pending};
  if(order.status===ORDER_CANCELLED)return {key:'cancelled',meta:PAY_STATUS.cancelled};
  const info=payInfo(order.payment);
  return {key:info.initial,meta:PAY_STATUS[info.initial]||PAY_STATUS.pending};
}

/* Nội dung chuyển khoản: chỉ gồm mã đơn để đối chiếu, không có dữ liệu thừa */
function bankContent(order){return 'TT ' + order.id;}

function renderPaymentResult(order){
  const box=document.getElementById('confirmBox');
  if(!box)return;
  const o=order||lastPlacedOrder;
  if(!o){box.innerHTML='<div class="panel empty"><div class="big">🧾</div>Chưa có đơn hàng để hiển thị.</div>';return}
  const info=payInfo(o.payment);
  const {key,meta}=paymentResultStatus(o);
  const displayTotal=o.total||o.totalFallback||0;
  const items=Array.isArray(o.items)?o.items:[];

  let nextSteps='';
  if(o.payment==='BANK'){
    nextSteps=`<div class="result-block">
      <h3>🏦 Thông tin chuyển khoản</h3>
      <div class="bank-box">
       <div class="bank-row"><span>Ngân hàng</span><b>${esc(STORE_BANK.bank)}</b></div>
       <div class="bank-row"><span>Số tài khoản</span><b class="mono">${esc(STORE_BANK.account)}</b></div>
       <div class="bank-row"><span>Chủ tài khoản</span><b>${esc(STORE_BANK.holder)}</b></div>
       <div class="bank-row"><span>Số tiền</span><b class="mono">${vnd(displayTotal)}</b></div>
       <div class="bank-row"><span>Nội dung chuyển khoản</span><b class="mono">${esc(bankContent(o))}</b>
         <button class="btn sm ghost" onclick="copyText('${esc(bankContent(o))}','Nội dung chuyển khoản')">Sao chép</button></div>
      </div>
      <p class="pay-note">Chuyển đúng nội dung để cửa hàng khớp đơn tự động. Đơn chỉ được đóng gói sau khi nhận tiền.</p>
    </div>`;
  }else if(o.payment==='INSTALLMENT'){
    nextSteps=`<div class="result-block"><h3>📆 Bước tiếp theo cho hồ sơ trả góp</h3>
      <ol class="step-list">
        <li>Cửa hàng gọi xác nhận trong <b>1 ngày làm việc</b> qua ${esc(o.phone||'số điện thoại đã đặt')}.</li>
        <li>Chuẩn bị CCCD và thẻ tín dụng còn hạn mức.</li>
        <li>Ký hồ sơ trả góp khi nhận hàng hoặc tại cửa hàng.</li>
      </ol></div>`;
  }else if(o.payment==='COD'){
    nextSteps=`<div class="result-block"><h3>💵 Bạn thanh toán khi nhận hàng</h3>
      <p class="pay-note">Chuẩn bị <b>${vnd(displayTotal)}</b> tiền mặt. Bạn được kiểm tra sản phẩm trước khi trả tiền.</p></div>`;
  }else{
    nextSteps=`<div class="result-block"><h3>⏳ Đơn đang chờ xác minh thanh toán</h3>
      <p class="pay-note">Cửa hàng kiểm tra giao dịch ${esc(info.short)} rồi cập nhật trạng thái sang «Thành công». Đơn chỉ được giao sau khi xác minh.</p></div>`;
  }

  box.innerHTML=`
   <div class="result-head">
    <div class="result-ico ${meta.tone}">${meta.icon}</div>
    <div>
      <h2 class="sec" style="margin:0">Kết quả thanh toán</h2>
      <p class="result-sub">Đơn <b>#${esc(o.id)}</b> đã được ghi nhận lúc ${esc(o.created||'')}.</p>
    </div>
   </div>

   <div class="result-grid">
    <div class="panel result-main">
      <div class="result-rows">
        <div class="result-row"><span>Mã đơn hàng</span><b class="mono">${esc(o.id)}</b></div>
        <div class="result-row"><span>Số tiền</span><b class="strong">${vnd(displayTotal)}</b></div>
        <div class="result-row"><span>Phương thức</span><b>${info.icon} ${esc(info.label)}</b></div>
        <div class="result-row"><span>Trạng thái thanh toán</span><b>${payStatusPill(key)}</b></div>
        ${o.promo?`<div class="result-row"><span>Khuyến mãi</span><b>🎁 ${esc(o.promo)}</b></div>`:''}
        <div class="result-row"><span>Người nhận</span><b>${esc(o.name||'')}${o.phone?` · ${esc(o.phone)}`:''}</b></div>
        <div class="result-row"><span>Giao đến</span><b>${esc(o.addr||'')}</b></div>
      </div>

      <div class="result-note ${meta.tone}">${meta.icon} <b>${meta.label}</b> — ${esc(meta.hint)}</div>

      ${items.length?`<div class="result-block"><h3>🧾 Sản phẩm</h3>
        ${items.map(i=>`<div class="result-item"><span>${esc(i.emoji||'📦')} ${esc(i.name)}${i.variant?` <i class="cart-variant">${esc(i.variant)}</i>`:''}</span><span>×${i.qty} · <b>${vnd(i.price*i.qty)}</b></span></div>`).join('')}
      </div>`:''}

      ${nextSteps}

      <div class="result-actions">
        <button class="btn" onclick="go('orders')">Xem đơn hàng</button>
        <button class="btn ghost" onclick="go('home')">Tiếp tục mua sắm</button>
      </div>
    </div>

    <aside class="panel result-side">
      <h3 class="sec" style="margin-top:0">Tiến trình đơn hàng</h3>
      <div class="timeline vertical">
        ${ORDER_FLOW.map((s,i)=>`<div class="tl-step ${i===0?'done':''}"><div class="dot">${i===0?'✓':i+1}</div>${s}</div>`).join('')}
      </div>
      <p class="ck-legal">Trạng thái đơn cập nhật bởi cửa hàng. Trạng thái thanh toán do quản trị xác minh — <b>đơn đã đặt không đồng nghĩa đã thanh toán</b>.</p>
    </aside>
   </div>`;
}


function renderOrders(){
  const box=document.getElementById('ordersBox');
  let list=orders.filter(canAccessOrder);
  if(!list.length){box.innerHTML='<div class="panel empty"><div class="big">📦</div>Chưa có đơn hàng nào.<br><br><button class="btn" onclick="go(\'home\')">Mua sắm ngay</button></div>';return}
  box.innerHTML=`<h2 class="sec">📦 Đơn hàng của tôi</h2>`+list.slice().reverse().map(orderCard).join('');
}
function canAccessOrder(o){const u=cur();return u?o.email===u.email:o.email==='khach-le'&&LS.get('guestOrders',[]).includes(o.id)}
function orderCard(o){
  const idx=ORDER_FLOW.indexOf(o.status);const canceled=o.status===ORDER_CANCELLED;
  const info=payInfo(o.pay);
  const payStatus=orderPayStatus(o);
  return `<div class="panel order-card" style="margin-bottom:16px">
   <div class="order-card-head">
    <b>📦 #${esc(o.id)}</b>
    <span class="order-card-pills"><span class="status-pill st-${statusClass(o.status)}">${o.status}</span>${payStatusPill(payStatus)}</span></div>
   <div class="order-card-meta">${esc(o.created)} · ${info.icon} ${esc(info.label)} · ${o.items.reduce((s,i)=>s+i.qty,0)} sản phẩm</div>
   ${canceled?'':`<div class="timeline">${ORDER_FLOW.map((s,i)=>`<div class="tl-step ${i<=idx?'done':''}"><div class="dot">${i<=idx?'✓':i+1}</div>${s}</div>`).join('')}</div>`}
   ${o.items.map(i=>`<div style="font-size:14px;padding:3px 0">${esc(i.emoji)} ${esc(i.name)} ×${i.qty}</div>`).join('')}
   <div class="sum-row total"><span>Tổng tiền</span><span>${vnd(o.total)}</span></div>
   <div class="order-card-payinfo">${payStatusPill(payStatus)} <small>${esc(orderAmountHint(o))}</small></div>
   <div class="order-card-actions">
    <button class="btn sm ghost" onclick="trackOrder('${esc(o.id)}')">Theo dõi đơn</button>
    ${['Đặt hàng','Đã xác nhận'].includes(o.status)?`<button class="btn sm danger" onclick="cancelOrder('${esc(o.id)}')">Hủy đơn hàng</button>`:''}
   </div>
  </div>`;
}
function trackOrder(id){go('orders');setTimeout(()=>{const el=[...document.querySelectorAll('#ordersBox b')].find(b=>b.textContent.includes(id));el?.scrollIntoView({behavior:'smooth',block:'center'})},100)}


function reviewModal(pid){
  if(!cur())return toast('Vui lòng đăng nhập để đánh giá sản phẩm');
  document.getElementById('modalBox').innerHTML=`<h2 class="sec" style="font-size:22px">✍️ Đánh giá sản phẩm</h2>
   <div class="field" style="margin-bottom:12px"><label>Số sao</label>
   <select id="rvStar" class="sel" style="width:100%"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div>
   <div class="field" style="margin-bottom:16px"><label>Nhận xét</label><textarea id="rvText" rows="3" placeholder="Sản phẩm tốt, giao hàng nhanh…"></textarea></div>
   <button class="btn" style="width:100%" onclick="submitReview(${pid})">Gửi đánh giá</button>`;
  document.getElementById('modalBg').classList.add('open');
}

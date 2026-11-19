let adminTab='report';
let adminOrderFilter='all';
function renderAdmin(){
  const u=curAdmin();const box=document.getElementById('adminBox');
  document.getElementById('adminLogin').classList.toggle('active',!u);document.getElementById('adminPanel').classList.toggle('active',!!u);
  document.getElementById('adminUser').textContent=u?u.name:'Khách';document.getElementById('adminLogoutBtn').style.display=u?'':'none';
  if(!u){box.innerHTML='';renderAdminLogin();return}
  if(!u||u.role!=='admin'){box.innerHTML='<div class="panel empty"><div class="big">🔒</div>Trang quản lý dành cho admin.<br>Vui lòng đăng nhập bằng tài khoản <b>tài khoản đã được cấp quyền</b>.</div>';return}
  if(typeof loadPromotions==='function')loadPromotions();
  const rev=orders.filter(o=>o.status!=='Đã hủy').reduce((s,o)=>s+o.total,0);
  const byCat={};PRODUCTS.forEach(x=>{byCat[x.cat]=(byCat[x.cat]||0)+x.stock});
  const pendingPay=orders.filter(o=>['pending'].includes(orderPayStatus(o))).length;
  box.innerHTML=`<h2 class="sec">⚙️ Quản lý cửa hàng</h2>
  <div class="tabs admin-tabs">
   ${[['report','📊 Báo cáo kinh doanh'],['prod','📦 Sản phẩm'],['ord','🧾 Đơn hàng'],['promo','🎁 Khuyến mãi'],['cus','👥 Khách hàng'],['storage','☁️ Dữ liệu & đồng bộ']].map(([k,l])=>`<button class="chip ${adminTab===k?'active':''}" onclick="adminTab='${k}';renderAdmin()">${l}${k==='ord'&&pendingPay?` <b class="tab-count">${pendingPay}</b>`:''}</button>`).join('')}
  </div>
  <div id="adminBody"></div>`;
  const b=document.getElementById('adminBody');
  if(adminTab==='report'){
    const max=Math.max(1,...Object.values(byCat));
    b.innerHTML=`<div class="stats">
      <div class="stat"><div class="lbl">Doanh thu (đơn hiệu lực)</div><div class="val">${vnd(rev)}</div></div>
      <div class="stat"><div class="lbl">Tổng đơn hàng</div><div class="val">${orders.length}</div></div>
      <div class="stat"><div class="lbl">Chờ xác minh thanh toán</div><div class="val">${pendingPay}</div></div>
      <div class="stat"><div class="lbl">Khách đã đăng ký</div><div class="val">${users.filter(x=>x.role!=='admin').length}</div></div></div>
     <h3 class="sec">Tồn kho theo danh mục</h3>
     <div class="panel"><div class="bar-chart">${Object.entries(byCat).map(([c,n])=>`<div class="bar-w"><div class="bar" style="height:${n/max*100}%" title="${n}"></div><div class="bar-lbl">${c} (${n})</div></div>`).join('')}</div></div>
     <h3 class="sec">Đơn hàng mới nhất</h3>
     <div style="overflow:auto">${ordersTable(orders.slice(-5).reverse())}</div>`;
  }
  if(adminTab==='prod'){
    b.innerHTML=`<button class="btn" style="margin-bottom:14px" onclick="productModal()">＋ Thêm sản phẩm mới</button>
     <div style="overflow:auto"><table class="tbl"><tr><th>Ảnh</th><th>Sản phẩm</th><th>Danh mục</th><th>Giá (₫)</th><th>Tồn kho</th><th>Hiển thị</th><th>Nguồn</th><th>Thao tác</th></tr>
     ${PRODUCTS.map(x=>{const pc=productPhotoCount(x);return `<tr><td><div class="admin-product-thumb">${productThumb(x)}</div>${pc?`<div class="admin-photo-badge">📸 ${pc} ảnh</div>`:''}</td><td><b>${esc(x.name)}</b></td><td>${esc(x.cat)}</td><td>${vnd(x.price)}</td><td>${x.stock}</td>
      <td><button class="btn sm ghost" onclick="toggleShow(${x.id})">${x.show===false?'🚫 Đang ẩn':'👁 Đang bán'}</button></td>
      <td>${x.verified?'<span class="verified">✓ apple.com/vn</span>':'—'}</td>
      <td><button class="btn sm ghost" onclick="productModal(${x.id})">Sửa</button> <button class="btn sm ghost" onclick="productModal(${x.id})">📸 Ảnh màu/phiên bản</button></td></tr>`}).join('')}</table></div>`;
  }
  if(adminTab==='ord'){renderOrdersAdmin(b);}
  if(adminTab==='promo'){
    if(typeof renderPromotionsAdmin==='function')renderPromotionsAdmin(b);
    else b.innerHTML='<div class="panel empty">Chưa tải được mô-đun khuyến mãi (js/promotions.js).</div>';
  }
  if(adminTab==='storage'){renderStoragePanel(b);}
  if(adminTab==='cus'){
    b.innerHTML=`<div style="overflow:auto"><table class="tbl"><tr><th>Khách hàng</th><th>Email</th><th>Điện thoại</th><th>Số đơn</th><th>Chi tiêu</th></tr>
     ${users.filter(x=>x.role!=='admin').map(x=>{const os=orders.filter(o=>o.email===x.email);return `<tr><td><b>${esc(x.name)}</b></td><td>${x.email}</td><td>${esc(x.phone||'—')}</td><td>${os.length}</td><td>${vnd(os.reduce((s,o)=>s+o.total,0))}</td></tr>`}).join('')}</table></div>`;
  }
}
function ordersTable(list,manage){
  return `<table class="tbl"><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Tổng tiền</th><th>Trạng thái</th>${manage?'<th>Cập nhật</th>':''}</tr>
  ${list.map(o=>`<tr><td><b>#${esc(o.id)}</b></td><td>${esc(o.name)}<div style="color:var(--muted);font-size:12px">${esc(o.email)}</div></td><td>${esc(o.created)}</td><td>${vnd(o.total)}</td>
   <td><span class="status-pill st-${statusClass(o.status)}">${o.status}</span></td>
   ${manage?`<td><select class="sel" style="padding:6px" onchange="setOrderStatus('${esc(o.id)}',this.value)">
     ${[...ORDER_FLOW,'Đã hủy'].map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select></td>`:''}</tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--muted)">Chưa có đơn hàng</td></tr>'}</table>`;
}


function productModal(id){
  if(!curAdmin())return;
  resetProductImage(id?p(id)?.image||'':'');
  editingProduct=id||null;
  editingVersion=id?p(id)?.version||1:0;
  const x=id?p(id):{name:'',cat:'iPhone',price:0,stock:0,emoji:'📦',desc:''};

    startPhotoDraft(id?p(id):null);
  document.getElementById('modalBox').className='modal wide';
  document.getElementById('modalBox').innerHTML=`<h2 class="sec" style="font-size:22px">${id?'✏️ Sửa sản phẩm':'＋ Thêm sản phẩm'}</h2>
   <div class="field" style="margin-bottom:10px"><label>Tên sản phẩm</label><input id="fmName" value="${esc(x.name)}" oninput="syncPhotoEditor()"></div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
    <div class="field"><label>Danh mục</label><select id="fmCat" class="sel" style="width:100%" onchange="syncPhotoEditor()">${CATS.slice(1).map(c=>`<option ${c===x.cat?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Emoji</label><input id="fmEmoji" value="${esc(x.emoji)}"></div>
    <div class="field"><label>Giá (VND)</label><input id="fmPrice" type="number" value="${x.price}" oninput="syncPhotoEditor()"></div>
    <div class="field"><label>Tồn kho</label><input id="fmStock" type="number" value="${x.stock}"></div></div>
   <div class="field" style="margin-bottom:16px"><label>Mô tả</label><textarea id="fmDesc" rows="2">${esc(x.desc)}</textarea></div>
   <div class="field product-image-field"><label for="productImageInput">📷 Ảnh đại diện sản phẩm</label><p class="image-help">Ảnh chung, dùng khi màu đang chọn chưa có ảnh riêng. Chọn PNG, JPEG hoặc WebP, tối đa 500 KB. Ảnh được tải lên Supabase Storage khi lưu sản phẩm.</p><input id="productImageInput" type="file" accept="image/png,image/jpeg,image/webp" onchange="uploadProductImage(this)"><div id="uploadPreview" class="upload-preview" aria-live="polite">${x.image?`<img src="${esc(x.image)}" alt="Ảnh sản phẩm">`:'<span>Chưa có ảnh — đang dùng emoji của sản phẩm</span>'}</div><button type="button" class="btn sm ghost" onclick="clearProductImage()">Bỏ ảnh</button></div>
   <div class="photo-editor" id="photoEditor"></div>
   <button class="btn" style="width:100%" id="saveProductBtn" onclick="saveProduct()">${id?'Lưu thay đổi':'Thêm sản phẩm'}</button>
   ${id?`<button class="btn danger" style="width:100%;margin-top:10px" onclick="deleteProduct(${id})">Xóa sản phẩm</button>`:''}`;
  renderPhotoEditor();
  document.getElementById('modalBg').classList.add('open');
}


function syncPhotoEditor(){
 const box=document.getElementById('photoEditor');
 if(box)renderPhotoEditor();
}



const ORDER_STATUS_TONE = {
  'Đặt hàng':'moi','Đã xác nhận':'xacnhan','Đang giao':'giao','Hoàn thành':'hoanthanh','Đã hủy':'huy'
};
const ORDER_STATUS_ICON = {
  'Đặt hàng':'🆕','Đã xác nhận':'✅','Đang giao':'🚚','Hoàn thành':'🎉','Đã hủy':'🚫'
};

function renderOrdersAdmin(box){
  const counts = {all: orders.length};
  for (const s of ORDER_ALL) counts[s] = orders.filter(o => o.status === s).length;
  const pendingPay = orders.filter(o => orderPayStatus(o) === 'pending').length;

  const list = orders.filter(o => adminOrderFilter === 'all' || o.status === adminOrderFilter).slice().reverse();

  box.innerHTML = `
   <div class="ord-toolbar">
    <div class="chips ord-filters">
     <button class="chip ${adminOrderFilter === 'all' ? 'active' : ''}" onclick="adminOrderFilter='all';renderAdmin()">Tất cả <b>${counts.all}</b></button>
     ${ORDER_ALL.map(s => `<button class="chip ${adminOrderFilter === s ? 'active' : ''}" onclick="adminOrderFilter='${esc(s)}';renderAdmin()">${ORDER_STATUS_ICON[s]} ${s} <b>${counts[s]}</b></button>`).join('')}
    </div>
   </div>

   ${pendingPay ? `<div class="ord-alert">⏳ <b>${pendingPay} đơn đang chờ xác minh thanh toán.</b> Kiểm tra giao dịch rồi cập nhật trạng thái thanh toán trong bảng bên dưới.</div>` : ''}

   <div class="ord-hint">💾 Trạng thái đơn được lưu trên máy chủ Supabase. <b>Trạng thái thanh toán và ghi chú</b> lưu trên trình duyệt quản trị này (máy chủ chưa có cột tương ứng).</div>

   <div class="ord-table-wrap">
    <table class="tbl ord-table">
     <tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái đơn</th><th>Thao tác</th></tr>
     ${list.map(o => {
        const payStatus = orderPayStatus(o);
        return `<tr>
         <td><b class="mono">#${esc(o.id)}</b></td>
         <td>${esc(o.name)}<div class="ord-sub">${esc(o.email)}</div></td>
         <td class="ord-date">${esc(o.created)}</td>
         <td><b>${vnd(o.total)}</b></td>
         <td class="ord-pay-cell">
           ${payMethodShort(o.pay)}
           <div class="ord-pay-status">
             <select class="sel ord-pay-select ${payStatus === 'pending' ? 'needs-check' : ''}" onchange="adminSetPayStatus('${esc(o.id)}',this.value)" aria-label="Trạng thái thanh toán đơn ${esc(o.id)}">
              ${PAY_STATUS_KEYS.map(k => `<option value="${k}" ${k === payStatus ? 'selected' : ''}>${PAY_STATUS[k].label}</option>`).join('')}
             </select>
           </div>
         </td>
         <td><span class="status-pill st-${statusClass(o.status)}">${ORDER_STATUS_ICON[o.status] || ''} ${esc(o.status)}</span></td>
         <td class="ord-actions">
           <button class="btn sm ghost" onclick="orderStatusModal('${esc(o.id)}')">Trạng thái</button>
           ${o.status !== ORDER_CANCELLED && o.status !== 'Hoàn thành' ? `<button class="btn sm ghost" onclick="orderAdvance('${esc(o.id)}')">Bước tiếp</button>` : ''}
         </td></tr>`;
     }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:26px">Chưa có đơn hàng trong nhóm này</td></tr>'}
    </table>
   </div>`;
}


const PAY_STATUS_KEYS = ['pending', 'cod', 'paid', 'failed', 'refunded', 'cancelled'];


function nextOrderStatus(current) {
  const i = ORDER_FLOW.indexOf(current);
  if (i < 0) return ORDER_FLOW[0];
  return ORDER_FLOW[i + 1] || 'Hoàn thành';
}

function orderStatusModal(id) {
  if (!curAdmin()) return;
  const o = orders.find(x => String(x.id) === String(id));
  if (!o) return toast('Không tìm thấy đơn hàng');
  const meta = orderMeta(o.id);
  const payStatus = orderPayStatus(o);
  const suggested = nextOrderStatus(o.status);
  const history = Array.isArray(meta.history) ? meta.history.slice().reverse() : [];

  const modal = document.getElementById('modalBox');
  modal.className = 'modal wide';
  modal.innerHTML = `
   <h2 class="sec" style="font-size:22px">🧾 Quản lý trạng thái đơn hàng</h2>
   <p class="ord-modal-sub">Cập nhật bước xử lý và xác minh thanh toán cho đơn <b class="mono">#${esc(o.id)}</b>.</p>

   <div class="ord-form">
    <div class="ord-field"><label>Mã đơn hàng</label><div class="ord-readonly mono">#${esc(o.id)}</div></div>
    <div class="ord-field"><label>Khách hàng</label><div class="ord-readonly">${esc(o.name)} · ${esc(o.phone || 'chưa có SĐT')}</div></div>
    <div class="ord-field"><label>Trạng thái hiện tại</label><div class="ord-readonly"><span class="status-pill st-${statusClass(o.status)}">${ORDER_STATUS_ICON[o.status] || ''} ${esc(o.status)}</span></div></div>
    <div class="ord-field"><label for="osNext">Trạng thái kế tiếp</label>
      <select id="osNext" class="sel" style="width:100%">
       ${ORDER_ALL.map(s => `<option value="${esc(s)}" ${s === suggested ? 'selected' : ''}>${ORDER_STATUS_ICON[s]} ${s}</option>`).join('')}
      </select>
      <p class="image-help" style="margin:6px 0 0">Gợi ý: ${ORDER_STATUS_ICON[suggested]} <b>${suggested}</b></p>
    </div>
    <div class="ord-field"><label for="osPay">Trạng thái thanh toán</label>
      <select id="osPay" class="sel" style="width:100%">
       ${PAY_STATUS_KEYS.map(k => `<option value="${k}" ${k === payStatus ? 'selected' : ''}>${PAY_STATUS[k].icon} ${PAY_STATUS[k].label}</option>`).join('')}
      </select>
      <p class="image-help" style="margin:6px 0 0">Phương thức: ${payMethodShort(o.pay)} · ${vnd(o.total)}</p>
    </div>
    <div class="ord-field ord-field-full"><label for="osNote">Ghi chú xử lý</label>
      <textarea id="osNote" rows="3" placeholder="VD: Đã xác nhận đơn qua điện thoại, chuẩn bị đóng gói">${esc(meta.note || '')}</textarea>
      <p class="image-help" style="margin:6px 0 0">Ghi chú chỉ lưu trên trình duyệt này, dùng để bàn giao ca trực.</p>
    </div>
   </div>

   <div class="ord-modal-note">⚠️ Trạng thái đơn được ghi lên máy chủ. Ghi chú và trạng thái thanh toán lưu cục bộ trên trình duyệt quản trị này vì cơ sở dữ liệu chưa có cột tương ứng.</div>

   ${history.length ? `<div class="ord-history"><b>Lịch sử trên máy này</b><ul>${history.slice(0, 8).map(h => `<li><span>${esc(h.text || '')}</span><i>${new Date(h.at).toLocaleString('vi-VN')}</i></li>`).join('')}</ul></div>` : ''}

   <div class="ord-modal-actions">
    <button class="btn" onclick="adminSaveOrderStatus('${esc(o.id)}')">LƯU THAY ĐỔI</button>
    ${o.status !== ORDER_CANCELLED ? `<button class="btn danger sm" onclick="adminCancelOrder('${esc(o.id)}')">Hủy đơn</button>` : ''}
    <button class="btn ghost sm" onclick="closeModal()">Đóng</button>
   </div>`;
  document.getElementById('modalBg').classList.add('open');
}

async function adminSaveOrderStatus(id) {
  const o = orders.find(x => String(x.id) === String(id));
  if (!o) return;
  const next = document.getElementById('osNext').value;
  const payNext = document.getElementById('osPay').value;
  const note = document.getElementById('osNote').value.trim().slice(0, 500);


    const prevPay = orderPayStatus(o);
  setOrderMeta(o.id, {note, payStatus: payNext});
  if (payNext !== prevPay) {
    appendOrderHistory(o.id, {type: 'pay', text: `Thanh toán: ${PAY_STATUS[prevPay].label} → ${PAY_STATUS[payNext].label}`});
  }
  if (note) appendOrderHistory(o.id, {type: 'note', text: 'Ghi chú: ' + note.slice(0, 120)});

  if (next !== o.status) {
    const ok = await setOrderStatus(o.id, next);
    appendOrderHistory(o.id, {type: 'status', text: `Trạng thái đơn: ${o.status} → ${next}`, synced: ok !== false});
  }
  closeModal();
  renderAdmin();
  toast('Đã lưu đơn #' + o.id);
}

async function adminCancelOrder(id) {
  if (!confirm('Hủy đơn hàng này? Tồn kho sẽ được hoàn lại trên máy chủ.')) return;
  setOrderMeta(id, {payStatus: 'cancelled'});
  appendOrderHistory(id, {type: 'status', text: 'Đơn bị hủy bởi quản trị'});
  await cancelOrder(id);
  closeModal();
  renderAdmin();
}

function adminSetPayStatus(id, value) {
  if (!PAY_STATUS[value]) return;
  const o = orders.find(x => String(x.id) === String(id));
  const prev = o ? orderPayStatus(o) : '';
  setOrderMeta(id, {payStatus: value});
  if (value !== prev) appendOrderHistory(id, {type: 'pay', text: `Thanh toán: ${PAY_STATUS[prev]?.label || '—'} → ${PAY_STATUS[value].label}`});
  toast('Đơn #' + id + ' · thanh toán: ' + PAY_STATUS[value].label);
  renderAdmin();
}

async function orderAdvance(id) {
  const o = orders.find(x => String(x.id) === String(id));
  if (!o) return;
  const next = nextOrderStatus(o.status);
  if (!next || next === o.status) return toast('Đơn đã ở bước cuối');
  appendOrderHistory(id, {type: 'status', text: `Trạng thái đơn: ${o.status} → ${next}`});
  await setOrderStatus(id, next);
  renderAdmin();
}


function renderAdminLogin(){
 document.getElementById('adminLoginBox').innerHTML=`<div class="panel admin-login-card"><h1>Đăng nhập quản trị</h1><p>Tài khoản khách hàng không dùng tại khu vực này.</p><form onsubmit="event.preventDefault();adminLogin()"><div class="field"><label for="adEmail">Email quản trị</label><input id="adEmail" type="email" autocomplete="username" required></div><div class="field"><label for="adPass">Mật khẩu</label><input id="adPass" type="password" autocomplete="current-password" required></div><button class="btn" type="submit">Đăng nhập quản trị</button></form><p class="demo-note">Dùng tài khoản đã được cấp quyền quản trị trên máy chủ.</p><a href="index.html">← Về trang khách hàng</a></div>`;
}


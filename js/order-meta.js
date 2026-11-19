/* ==========================================================================
   js/order-meta.js — Ghi chú xử lý và trạng thái thanh toán của đơn hàng
   --------------------------------------------------------------------------
   TRẠNG THÁI ĐƠN (o.status) đi qua RPC set_order_status trên Supabase nên dùng
   chung mọi thiết bị. Hai thứ còn lại — GHI CHÚ nội bộ và TRẠNG THÁI THANH
   TOÁN — chưa có cột tương ứng trên máy chủ, nên được lưu trong localStorage
   của trình duyệt đang dùng, khóa 'applevn_order_notes_v1', và giao diện luôn
   ghi rõ «lưu trên trình duyệt này» để không gây hiểu nhầm là đã đồng bộ.

   Không xóa hay đổi khóa lưu trữ nào đang có: chỉ đọc/ghi đúng khóa trên,
   gộp theo id đơn hàng nên dữ liệu cũ của đơn khác không bị mất.
   ========================================================================== */

const ORDER_META_KEY = 'applevn_order_notes_v1';

function loadOrderMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDER_META_KEY));
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch (_) { return {}; }
}
function saveOrderMeta(all) {
  try { localStorage.setItem(ORDER_META_KEY, JSON.stringify(all)); return true; }
  catch (_) { toast('Trình duyệt chặn lưu ghi chú đơn hàng'); return false; }
}
function orderMeta(id) {
  const all = loadOrderMeta();
  return all[String(id)] || {note:'', payStatus:'', history:[], updatedAt:''};
}
function setOrderMeta(id, patch) {
  const all = loadOrderMeta();
  const key = String(id);
  const current = all[key] || {note:'', payStatus:'', history:[], updatedAt:''};
  all[key] = {...current, ...patch, updatedAt:new Date().toISOString()};
  saveOrderMeta(all);
  return all[key];
}
function appendOrderHistory(id, entry) {
  const current = orderMeta(id);
  const history = Array.isArray(current.history) ? current.history.slice(-30) : [];
  history.push({...entry, at:new Date().toISOString()});
  return setOrderMeta(id, {history});
}

/* Trạng thái thanh toán hiển thị: quản trị đã đặt > trạng thái gốc của phương thức */
function orderPayStatus(o) {
  if (!o) return 'pending';
  const manual = orderMeta(o.id).payStatus;
  if (manual && PAY_STATUS[manual]) return manual;
  if (o.status === ORDER_CANCELLED) return 'cancelled';
  const info = payInfo(o.pay);
  return info.initial === 'cod' ? 'cod' : 'pending';
}

function payStatusPill(status) {
  const meta = PAY_STATUS[status] || PAY_STATUS.pending;
  return `<span class="pay-pill pay-${meta.tone}"><i>${meta.icon}</i>${meta.label}</span>`;
}

function payMethodLabel(key) {
  const info = payInfo(key);
  return `${info.icon} ${info.label}`;
}
function payMethodShort(key) {
  const info = payInfo(key);
  return `${info.icon} ${info.short}`;
}

/* Số tiền khách phải trả khi nhận hàng / khi chuyển khoản */
function orderAmountHint(o) {
  const status = orderPayStatus(o);
  if (status === 'paid') return 'Đã thanh toán đủ';
  if (status === 'refunded') return 'Đã hoàn tiền cho khách';
  if (status === 'cod') return 'Thu tiền mặt khi giao hàng';
  if (status === 'cancelled') return 'Đơn đã hủy, không thu tiền';
  return 'Chờ cửa hàng xác nhận thanh toán';
}

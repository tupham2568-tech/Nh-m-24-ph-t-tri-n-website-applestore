const VND = new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0});
const vnd = n => VND.format(n);

const CATS = ['Tất cả','iPhone','iPad','Mac','Watch','AirPods','Phụ kiện'];
let PRODUCTS = [
 {id:1, name:'iPhone 15 Pro Max 256 GB', cat:'iPhone', price:29990000, old:33990000, emoji:'📱', stock:25, isNew:false, verified:false, desc:'Khung titan siêu nhẹ, chip A17 Pro, camera 48MP, màn hình Super Retina XDR 6,7 inch. Hàng chính hãng VN/A.'},
 {id:2, name:'iPhone 15 Pro 128 GB', cat:'iPhone', price:25990000, old:null, emoji:'📱', stock:30, isNew:false, verified:false, desc:'Chip A17 Pro, khung titan, cổng USB-C. Hiệu năng chuyên nghiệp trong thân hình nhỏ gọn.'},
 {id:3, name:'iPhone 15 Plus 128 GB', cat:'iPhone', price:22990000, old:null, emoji:'📱', stock:22, isNew:false, verified:false, desc:'Màn hình 6,7 inch lớn, chip A16, pin dùng cả ngày. Camera 48MP.'},
 {id:4, name:'iPhone 15 128 GB', cat:'iPhone', price:19990000, old:22990000, emoji:'📱', stock:40, isNew:false, verified:false, desc:'Dynamic Island, camera 48MP, cổng USB-C. Màu sắc thời thượng.'},
 {id:5, name:'iPhone 14 128 GB', cat:'iPhone', price:15490000, old:null, emoji:'📱', stock:15, isNew:false, verified:false, desc:'Chip A15 Bionic, camera kép 12MP, màn hình 6,1 inch Super Retina XDR.'},
 {id:6, name:'iPad Pro M4 11" 256 GB Wi-Fi', cat:'iPad', price:35590000, old:null, emoji:'🖥️', stock:10, isNew:true, verified:false, source:'apple.com/vn', desc:'Chip M4 mới nhất, màn hình Ultra Retina XDR tandem OLED, hỗ trợ Apple Pencil Pro. Dành cho sáng tạo chuyên nghiệp.'},
 {id:7, name:'iPad Air M2 11" 128 GB Wi-Fi', cat:'iPad', price:16990000, old:null, emoji:'🖥️', stock:22, isNew:true, verified:false, source:'apple.com/vn', desc:'Chip M2 mạnh mẽ, màn hình Liquid Retina, nhiều màu sắc trẻ trung. Lựa chọn hoàn hảo cho học tập & làm việc.'},
 {id:8, name:'iPad (Gen 10) 64 GB Wi-Fi', cat:'iPad', price:12790000, old:null, emoji:'🖥️', stock:30, isNew:false, verified:false, source:'apple.com/vn', desc:'iPad màn hình toàn phần, đủ màu sắc. Cho mọi tác vụ hằng ngày.'},
 {id:9, name:'iPad mini A17 Pro 128 GB Wi-Fi', cat:'iPad', price:16490000, old:null, emoji:'🖥️', stock:18, isNew:true, verified:false, source:'apple.com/vn', desc:'Trải nghiệm trọn vẹn iPad trong một thiết kế siêu gọn nhẹ. Chip A17 Pro.'},
 {id:10, name:'MacBook Air 13" M3 8 GB / 256 GB', cat:'Mac', price:27990000, old:30990000, emoji:'💻', stock:18, isNew:false, verified:false, desc:'Siêu mỏng, pin 18 giờ, chip Apple M3. Chiếc laptop không quạt êm ái nhất.'},
 {id:11, name:'MacBook Pro 14" M3 8 GB / 512 GB', cat:'Mac', price:39990000, old:null, emoji:'💻', stock:9, isNew:true, verified:false, desc:'Chip M3, màn hình Liquid Retina XDR, hiệu năng đỉnh cao cho lập trình viên và creator.'},
 {id:12, name:'Mac mini M2 8 GB / 256 GB', cat:'Mac', price:14490000, old:null, emoji:'🗜️', stock:14, isNew:false, verified:false, desc:'Máy tính để bàn nhỏ gọn, chip M2 vượt trội — giải pháp tiết kiệm cho văn phòng.'},
 {id:13, name:'Apple Watch Series 9 GPS 41 mm', cat:'Watch', price:10990000, old:12490000, emoji:'⌚', stock:30, isNew:false, verified:false, desc:'Màn hình sáng gấp đôi, cú nhấp đúp tay, theo dõi sức khỏe toàn diện.'},
 {id:14, name:'Apple Watch Ultra 2', cat:'Watch', price:22990000, old:null, emoji:'⌚', stock:6, isNew:false, verified:false, desc:'Vỏ titan 49 mm, màn hình 3000 nits, GPS chuẩn xác — dành cho vận động viên khắt khe.'},
 {id:15, name:'AirPods Pro 2 (USB-C)', cat:'AirPods', price:5990000, old:6490000, emoji:'🎧', stock:50, isNew:false, verified:false, desc:'Chống ồn chủ động tốt nhất, Âm thanh Thích ứng, hộp sạc MagSafe USB-C.'},
 {id:16, name:'AirPods 4', cat:'AirPods', price:3990000, old:null, emoji:'🎧', stock:45, isNew:true, verified:false, desc:'Thiết kế mới, Âm thanh không gian cá nhân hóa, chống nước IPX4.'},
 {id:17, name:'Apple Pencil (thế hệ 2)', cat:'Phụ kiện', price:2590000, old:null, emoji:'🖊️', stock:60, isNew:false, verified:false, desc:'Bút cảm ứng áp lực, sạc từ tính — cặp đôi hoàn hảo với iPad Pro/Air.'},
 {id:18, name:'AirTag (1 cái)', cat:'Phụ kiện', price:790000, old:990000, emoji:'📍', stock:100, isNew:false, verified:false, desc:'Định vị đồ vật chính xác bằng mạng Find My của Apple.'},
 {id:19, name:'MagSafe Charger 1 m', cat:'Phụ kiện', price:1290000, old:null, emoji:'🔋', stock:45, isNew:false, verified:false, desc:'Sạc không dây 15 W gắn từ tính tiện lợi cho iPhone 12 trở lên.'},
 {id:20, name:'Magic Mouse', cat:'Phụ kiện', price:1990000, old:null, emoji:'🖱️', stock:20, isNew:false, verified:false, desc:'Multi-Touch surface, sạc Lightning, thiết kế liền khối.'}
];
/* Bộ mã khuyến mãi gốc: chỉ dùng làm dữ liệu khởi tạo cho js/promotions.js.
   Từ bản này, khuyến mãi được quản lý trong mục 🎁 Khuyến mãi của trang quản trị. */
const PROMOS = [
 {code:'APPLE10', type:'percent', value:10, note:'Giảm 10% toàn bộ đơn hàng'},
 {code:'FREESHIP', type:'ship', value:0, note:'Miễn phí vận chuyển'},
 {code:'IPHONE500', type:'amount', value:500000, note:'Giảm 500.000₫ cho đơn từ 20 triệu'}
];
const SHIP_FEE = 30000;

/* ---------------------------------------------------------------------------
   Vòng đời đơn hàng — giữ đúng 4 bước mà hàm set_order_status trên Supabase
   đang chấp nhận, cộng trạng thái kết thúc «Đã hủy».
   --------------------------------------------------------------------------- */
const ORDER_FLOW = ['Đặt hàng','Đã xác nhận','Đang giao','Hoàn thành'];
const ORDER_CANCELLED = 'Đã hủy';
const ORDER_ALL = [...ORDER_FLOW, ORDER_CANCELLED];

/* ---------------------------------------------------------------------------
   Phương thức thanh toán thương mại điện tử điển hình.
   `initial` là trạng thái thanh toán ban đầu của đơn:
     • cod     → trả tiền khi nhận hàng (chưa thu tiền)
     • pending → chờ cửa hàng xác minh (chuyển khoản, ví, thẻ…)
   Bản mô phỏng này CHƯA nối cổng thanh toán thật, nên không phương thức nào
   tự báo «thành công»: quản trị xác nhận trong mục Đơn hàng.
   --------------------------------------------------------------------------- */
const PAY_GROUPS = {
 cod:'Thanh toán khi nhận hàng',
 transfer:'Chuyển khoản ngân hàng',
 wallet:'Ví điện tử & QR',
 card:'Thẻ quốc tế',
 installment:'Trả góp'
};
const PAY_METHODS = [
 {key:'COD', group:'cod', icon:'💵', short:'COD', badge:'Phổ biến nhất',
  label:'Thanh toán khi nhận hàng (COD)',
  desc:'Trả tiền mặt cho nhân viên giao hàng ngay khi nhận. Không cần thẻ, kiểm tra hàng trước khi trả tiền.',
  eta:'Đơn được xử lý ngay sau khi xác nhận', initial:'cod'},
 {key:'BANK', group:'transfer', icon:'🏦', short:'Chuyển khoản', badge:'Miễn phí',
  label:'Chuyển khoản ngân hàng / VietQR',
  desc:'Chuyển khoản trước vào tài khoản cửa hàng, nội dung là mã đơn hàng. Đơn được đóng gói sau khi nhận tiền.',
  eta:'Xác minh trong 15–30 phút giờ hành chính', initial:'pending'},
 {key:'VNPAY', group:'wallet', icon:'🏧', short:'VNPay',
  label:'VNPay — ATM nội địa & QR ngân hàng',
  desc:'Thanh toán bằng thẻ ATM nội địa hoặc quét QR qua cổng VNPay trên ứng dụng ngân hàng.',
  eta:'Cần xác minh thủ công ở bản mô phỏng', initial:'pending'},
 {key:'MOMO', group:'wallet', icon:'🟣', short:'MoMo',
  label:'Ví điện tử MoMo',
  desc:'Quét QR hoặc xác nhận thanh toán ngay trong ứng dụng MoMo.',
  eta:'Cần xác minh thủ công ở bản mô phỏng', initial:'pending'},
 {key:'ZALOPAY', group:'wallet', icon:'🔷', short:'ZaloPay',
  label:'Ví điện tử ZaloPay',
  desc:'Thanh toán bằng số dư ví ZaloPay hoặc thẻ ngân hàng đã liên kết.',
  eta:'Cần xác minh thủ công ở bản mô phỏng', initial:'pending'},
 {key:'CARD', group:'card', icon:'💳', short:'Thẻ quốc tế',
  label:'Thẻ quốc tế Visa / Mastercard / JCB',
  desc:'Thanh toán bằng thẻ quốc tế; xác thực 3-D Secure qua ngân hàng phát hành.',
  eta:'Cần xác minh thủ công ở bản mô phỏng', initial:'pending'},
 {key:'APPLEPAY', group:'wallet', icon:'📱', short:'Apple Pay',
  label:'Apple Pay / Google Pay',
  desc:'Thanh toán một chạm bằng thẻ đã lưu trong Apple Wallet hoặc Google Wallet.',
  eta:'Cần xác minh thủ công ở bản mô phỏng', initial:'pending'},
 {key:'INSTALLMENT', group:'installment', icon:'📆', short:'Trả góp 0%', badge:'Cần duyệt hồ sơ',
  label:'Trả góp 0% qua thẻ tín dụng',
  desc:'Chia nhỏ thanh toán 3–12 tháng, lãi suất 0% với thẻ tín dụng đối tác. Cửa hàng gọi xác nhận hồ sơ.',
  eta:'Duyệt hồ sơ trong 1 ngày làm việc', initial:'pending'}
];
const payInfo = key => PAY_METHODS.find(m => m.key === key) || PAY_METHODS[0];

/* Trạng thái thanh toán hiển thị trên «Kết quả thanh toán» và trong quản trị */
const PAY_STATUS = {
 cod:       {label:'Thanh toán khi nhận hàng', tone:'info', icon:'💵', hint:'Chưa thu tiền — thu khi giao hàng'},
 pending:   {label:'Chờ xác minh',             tone:'warn', icon:'⏳', hint:'Cửa hàng kiểm tra rồi xác nhận'},
 paid:      {label:'Thành công',               tone:'ok',   icon:'✓',  hint:'Cửa hàng đã xác nhận thanh toán'},
 failed:    {label:'Thất bại',                 tone:'bad',  icon:'✕',  hint:'Giao dịch không hoàn tất'},
 refunded:  {label:'Đã hoàn tiền',             tone:'info', icon:'↩',  hint:'Tiền đã trả lại cho khách'},
 cancelled: {label:'Đã hủy — chưa thu tiền',   tone:'bad',  icon:'—',  hint:'Đơn hủy trước khi thanh toán'}
};

/* Thông tin nhận chuyển khoản. Thay bằng số tài khoản thật của cửa hàng
   trước khi dùng thật — đây chỉ là giá trị mẫu, không phải tài khoản có thật. */
const STORE_BANK = {
  bank:'TÊN NGÂN HÀNG (cập nhật trong js/data.js)',
  account:'0000000000',
  holder:'APPLE STORE VN',
  branch:'Chi nhánh (tuỳ chọn)'
};

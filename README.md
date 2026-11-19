# Apple Store VN — Cửa hàng trực tuyến (static + Supabase)

Site statique HTML/CSS/JS (không cần build) cho cửa hàng Apple Store VN, dữ liệu
nghiệp vụ lưu trên Supabase (PostgreSQL + Auth + Storage).

## Trang vào

| Đường dẫn | Mô tả |
| --- | --- |
| `index.html` | Cửa hàng khách hàng: danh sách, chi tiết sản phẩm, giỏ, thanh toán, đơn hàng, tài khoản |
| `index.html#sp-2` hoặc `index.html?sp=2` | Mở thẳng fiche produit theo `id` (dùng cho link chia sẻ/quảng cáo) |
| `admin.html` | Khu vực quản trị: báo cáo, sản phẩm, đơn hàng, **khuyến mãi**, khách hàng, dữ liệu & đồng bộ |
| `HUONG-DAN.html` | Hướng dẫn cài đặt Supabase / triển khai |
| `KIEM-THU.html` | Báo cáo kiểm thử kỹ thuật của bộ mã nguồn cloud |

## Cấu trúc tệp

```
index.html, admin.html        giao diện
css/style.css                 toàn bộ kiểu, gồm cả fiche produit « kiểu CellphoneS »
js/config.js                  SUPABASE_URL + PUBLISHABLE_KEY (2 giá trị cần điền)
js/data.js                    dữ liệu mẫu ban đầu (LEGACY_PRODUCTS), PAY_METHODS, PAY_STATUS, PROMOS, SHIP_FEE
js/store.js                   bộ nhớ giao diện; PRODUCTS rỗng cho tới khi cloud tải xong
js/ui.js                      toast, modal, esc(), điều hướng go()
js/order-meta.js              ghi chú xử lý + trạng thái thanh toán của đơn
js/auth.js                    đăng nhập/đăng ký/tài khoản
js/variants.js                biến thể: phiên bản × màu sắc
js/pdp-visual.js              MỘT nguồn hình duy nhất cho galerie/thumbnail/thẻ màu
js/shop.js                    danh sách, fiche produit, giỏ, thanh toán, kết quả thanh toán, đơn
js/promotions.js              quản lý khuyến mãi: tạo, lên lịch, trạng thái, tính giảm giá
js/upload.js                  đọc ảnh + bộ sưu tập ảnh nhiều tấm theo màu/phiên bản (admin)
js/admin.js                   bảng điều khiển quản trị + quản lý trạng thái đơn hàng
js/cloud.js                   Supabase: đăng nhập, đọc/ghi, polling 15 giây
js/supabase.min.js            SDK đặt sẵn trong mã nguồn
```

## Fiche produit « kiểu CellphoneS » (đã hoàn thành)

Yêu cầu: điều chỉnh giao diện chi tiết sản phẩm giống mẫu CellphoneS — nhiều màu
để chọn, nhiều mức giá theo màu và theo cấu hình.

Đã làm:

- Bố cục 2 cột: **galerie** bên trái (khung ảnh lớn, mũi tên ‹ › đổi màu, dải
  thumbnail màu có badge ✓ đỏ) + khối **Cam kết sản phẩm**; cột phải là thông tin.
- Tiêu đề `... | Chính hãng`, dòng đánh giá + tồn kho, hàng link nhanh
  (Yêu thích / Hỏi đáp / Thông số / So sánh).
- Khối giá kiểu CellphoneS: giá đỏ lớn, giá gạch, badge `-x%`, dòng trả góp
  `x/tháng`, màu + phiên bản đang chọn.
- **Phiên bản** (dung lượng / kích thước): nút có giá riêng, viền đỏ + ✓ khi chọn.
- **Màu sắc**: thẻ gồm chip màu, tên màu và **giá riêng từng màu**, viền đỏ + ✓.
- Khối **Khuyến mãi đi kèm** với danh sách đánh số; nút **Thêm vào giỏ hàng** (xanh)
  và **Mua ngay** (đỏ); thanh mua dính đáy trên điện thoại.
- Hai panel dưới: **Thông số nổi bật** và **Đánh giá sản phẩm**.

### Quy tắc giá biến thể (`js/variants.js`)

- Giá gốc vẫn là `product.price` trong Supabase. Giá từng phiên bản suy ra từ bảng
  chênh lệch `PDP_LADDER_DELTA`, và **luôn giữ đúng giá của dung lượng ghi trong
  tên sản phẩm** (ví dụ `iPhone 15 Pro 128 GB` → 128 GB = 25.990.000₫).
- Một số màu có chênh lệch (âm/dương) qua `delta`, nên mỗi màu có một mức giá.
- Thẻ sản phẩm hiển thị `Từ <giá thấp nhất>` + `n phiên bản` + các chấm màu.
- Giỏ hàng, thanh toán, tổng tiền dùng `linePrice()` và `lineVariantLabel()` nên
  dòng giỏ hiện đúng biến thể và đúng giá.

### Ghi đè biến thể từ quản trị

`product.variants` được đọc nếu có (nằm trong cột jsonb `data`, **không cần đổi schema**):

```json
{ "configs": [{ "label": "256 GB", "price": 29990000, "old": 33990000 }],
  "colors":  [{ "label": "Titan Đen", "hex": "#3a3b3d", "delta": 0 }] }
```

Khi có `variants.configs`, danh sách này thay hoàn toàn bảng suy ra mặc định.

## Ảnh thật: nhiều ảnh theo màu và theo phiên bản (đã hoàn thành)

Yêu cầu: thêm được **nhiều ảnh thực tế theo màu** và **nhiều ảnh theo từng phiên bản**.

### Quản trị nhập ảnh

`admin.html` → tab **📦 Sản phẩm** → nút **Sửa** (hoặc **📸 Ảnh màu/phiên bản**).
Trong hộp thoại sản phẩm có khối:

- **🎨 Ảnh theo màu** — mỗi màu một dòng (chip màu + tên màu).
- **📦 Ảnh theo phiên bản** — mỗi dung lượng/kích thước một dòng (kèm giá).

Mỗi dòng cho phép:

- **＋ Ảnh**: chọn một lúc nhiều file (tối đa 12 ảnh/dòng, PNG/JPEG/WebP ≤ 500 KB mỗi ảnh);
- xem thumbnail, nút **×** để xoá từng ảnh;
- nút **‹ ›** để đổi thứ tự ảnh.

Ảnh chọn xong chỉ nằm trong bộ nhớ trình duyệt. Khi bấm **Lưu**, mỗi ảnh được tải lên
Supabase Storage rồi URL công khai mới được ghi vào `product.variants.photos`.
Không có ảnh Base64 nào đi vào database.

### Cấu trúc dữ liệu ảnh

```json
"variants": {
  "photos": {
    "colors":  { "titan-xanh": ["https://…/a.jpg", "https://…/b.jpg"] },
    "configs": { "512gb": ["https://…/c.jpg"] }
  }
}
```

Ngoài ra vẫn hỗ trợ các dạng đã có: `colors[].images`, `configs[].images`,
`product.images`, và `variants.shots` (`[{ url, color, capacity }]`) để gắn một ảnh
vào đúng cặp màu + phiên bản. Tất cả được chuẩn hoá qua `pdpImageList()`.

`variants.photos` cố ý **không chứa giá**: nếu ghi cả mảng `configs`/`colors` thì bảng
giá suy ra từ tên sản phẩm sẽ bị "đóng băng" và các sản phẩm cùng dòng mất tính nhất quán.

### Thứ tự ảnh hiển thị

`pdpGallery()` (trong `js/pdp-visual.js`, dùng dữ liệu từ `js/variants.js`) chọn ảnh theo thứ tự:

1. ảnh gắn đúng màu **và** đúng phiên bản (`shots`);
2. ảnh đầu tiên của màu đang chọn;
3. ảnh của phiên bản đang chọn;
4. các ảnh còn lại của màu;
5. ảnh chung của sản phẩm;
6. nếu chưa có ảnh thật → hình thiết bị SVG tô đúng mã màu.

### Trải nghiệm khách (fiche produit)

- Khung ảnh lớn hiện đúng ảnh thật của màu + phiên bản đang chọn.
- Badge `2/5 ảnh thật` ở góc dưới phải; chấm tròn bên dưới để nhảy tới từng ảnh.
- Mũi tên **‹ ›** chuyển giữa các ảnh thật (chỉ còn đổi màu khi mục đó chưa có ảnh).
- Thẻ chọn màu hiện thêm badge `3 ảnh` khi màu đó có ảnh riêng.
- Đổi màu hoặc đổi phiên bản → quay về ảnh đầu tiên của biến thể mới.


## Lưu trữ dữ liệu

| Dữ liệu | Nơi lưu |
| --- | --- |
| Sản phẩm (gồm `variants`), đơn hàng, hồ sơ, đánh giá | Supabase PostgreSQL |
| Ảnh sản phẩm và ảnh theo màu/phiên bản | Supabase Storage, bucket `product-images` (URL công khai ghi vào `product.variants.photos`) |
| Tài khoản / mật khẩu | Supabase Auth |
| Giỏ đã đăng nhập | Supabase (RPC `save_cart`, có kiểm tra phiên bản) |
| Giỏ khách chưa đăng nhập | `localStorage` khóa `applevn_cart_guest` |
| **Lựa chọn màu/phiên bản của khách** | `localStorage` khóa `applevn_choices` (khóa mới, chỉ là trạng thái giao diện) |
| **Khuyến mãi** (tạo/sửa/lên lịch) | `localStorage` khóa `applevn_promotions_v1` — **chưa có bảng trên máy chủ**; xuất/nhập JSON để sao lưu |
| **Ghi chú xử lý đơn + trạng thái thanh toán** | `localStorage` khóa `applevn_order_notes_v1` — **chưa có cột trên máy chủ** |
| **Trạng thái đơn** | Supabase (RPC `set_order_status`) — dùng chung mọi thiết bị |

Lựa chọn biến thể **không** ghi vào cơ sở dữ liệu và không đụng tới dữ liệu cũ:
không xóa, không đổi khóa lưu trữ nào đang có.

## Thanh toán và kết quả thanh toán (đã hoàn thành)

Yêu cầu: tinh chỉnh giao diện **kết quả thanh toán** và **quản lý trạng thái đơn
hàng**, đồng thời thêm các phương thức thanh toán thương mại điện tử điển hình.

### Phương thức thanh toán (`PAY_METHODS` trong `js/data.js`)

Tám phương thức, nhóm theo cách khách trả tiền:

| Nhóm | Phương thức | Trạng thái khởi tạo |
| --- | --- | --- |
| Thanh toán khi nhận hàng | COD | `cod` (chưa thu tiền) |
| Chuyển khoản ngân hàng | BANK / VietQR | `pending` |
| Ví điện tử & QR | VNPay, MoMo, ZaloPay, Apple Pay / Google Pay | `pending` |
| Thẻ quốc tế | Visa / Mastercard / JCB | `pending` |
| Trả góp | Trả góp 0% qua thẻ tín dụng | `pending` |

Mỗi phương thức có mô tả, thời gian xử lý và badge. Chọn phương thức nào thì
khối hướng dẫn tương ứng hiện ra (thông tin chuyển khoản, bảng chia tiền trả góp
3/6/9/12 tháng, hoặc ghi chú chờ xác minh).

**Không phương thức nào tự báo «thành công»**: đây là bản mô phỏng, chưa nối cổng
thanh toán. Đơn vào trạng thái «Chờ xác minh» (hoặc «Thanh toán khi nhận hàng»)
và quản trị xác nhận sau.

### Trạng thái thanh toán (`PAY_STATUS`)

`pending` (Chờ xác minh) · `cod` (Thanh toán khi nhận hàng) · `paid` (Thành công)
· `failed` (Thất bại) · `refunded` (Đã hoàn tiền) · `cancelled` (Đã hủy — chưa thu tiền).

### Giao diện

- **Thanh toán** (`index.html#checkout`): 2 cột — cột trái là thông tin nhận hàng,
  thẻ phương thức theo nhóm và khối khuyến mãi; cột phải là tóm tắt đơn dính
  (sticky) với badge phương thức đang chọn. Điện thoại: 1 cột.
- **Kết quả thanh toán** (`#v-confirm`): mã đơn, số tiền, phương thức, **trạng thái
  thanh toán dạng nhãn màu** + câu giải thích; danh sách sản phẩm; các bước tiếp
  theo riêng cho từng phương thức (nội dung chuyển khoản có nút sao chép, hồ sơ
  trả góp, COD, chờ xác minh); tiến trình đơn dạng dọc bên phải.
- **Đơn hàng của tôi**: mỗi thẻ đơn hiện thêm nhãn trạng thái thanh toán và câu
  giải thích số tiền phải trả.

### Quản lý trạng thái đơn hàng (`admin.html` → 🧾 Đơn hàng)

- Chip lọc theo trạng thái kèm số lượng; badge đỏ trên tab khi có đơn chờ xác minh.
- Bảng có cột **Thanh toán** với ô chọn trạng thái ngay trên dòng.
- Nút **Trạng thái** mở hộp thoại: mã đơn, khách, trạng thái hiện tại, trạng thái
  kế tiếp (gợi ý sẵn), trạng thái thanh toán, ghi chú xử lý, và lịch sử thay đổi.
- Nút **Bước tiếp** đẩy đơn sang bước sau trong `ORDER_FLOW`.

Trạng thái đơn ghi lên Supabase; ghi chú và trạng thái thanh toán lưu cục bộ trên
trình duyệt quản trị (giao diện ghi rõ điều này ở đầu trang).

## Quản lý khuyến mãi (đã hoàn thành)

`admin.html` → 🎁 Khuyến mãi.

- **Tạo** chương trình với mẫu nhanh (Flash sale 24 giờ, Cuối tuần miễn phí ship,
  Khách hàng mới, Trả góp 0%).
- **Ba kiểu giảm**: theo % (có mức giảm tối đa), số tiền cố định, miễn phí vận chuyển.
- **Điều kiện**: đơn tối thiểu, giới hạn lượt dùng, phạm vi (toàn bộ / ngành hàng /
  một sản phẩm).
- **Lên lịch**: thời gian bắt đầu và kết thúc; trạng thái suy ra tự động:
  `active` (đang thực hiện) · `scheduled` (sắp diễn ra) · `ended` (đã kết thúc)
  · `paused` (tạm dừng) · `depleted` (hết lượt).
- **Quản lý**: lọc theo trạng thái, tạm dừng/chạy lại, nhân bản, xoá, thanh tiến
  trình lượt đã dùng, xuất/nhập JSON.
- **Phía khách**: dải 🎁 Khuyến mãi đang chạy ở trang chủ (nút sao chép mã), và ở
  bước thanh toán có gợi ý mã tốt nhất cho giỏ hiện tại cùng danh sách mã dùng được
  (mã không đủ điều kiện bị mờ và ghi rõ lý do).

Mã đã áp dụng **không đủ điều kiện** sẽ hiện «Không đủ điều kiện» thay vì âm thầm
tính sai tiền: `promoEvaluate()` kiểm tra lại mỗi lần vẽ tổng tiền.

## Đã kiểm tra

- Cú pháp và luồng biến thể: 8 sản phẩm mẫu × toàn bộ phiên bản/màu, chọn
  `1 TB + Titan Xanh` cho iPhone 15 Pro → 37.490.000₫, tiêu đề đổi thành
  `iPhone 15 Pro 1 TB`, nhãn giỏ `Titan Xanh · 1 TB`.
- Giỏ hàng 2 dòng khác biến thể: tạm tính 80.970.000₫ + ship 30.000₫ = 81.000.000₫.
- Ảnh chụp desktop và mobile: bố cục 1 cột trên điện thoại, thẻ màu 2 cột, không
  tràn ngang, thanh mua dính đáy; console không có lỗi.
- **Ảnh nhiều tấm theo biến thể** (kiểm thử tự động trong trình duyệt thật):
  galerie khử trùng lặp đúng, ảnh 1 luôn là ảnh của màu đang chọn, ảnh riêng của
  phiên bản chen ngay sau, `pdpPhotoStep` chạy vòng qua các ảnh thật, `pdpPick`
  đưa về ảnh đầu tiên, thẻ màu hiện `3 ảnh` / `2 ảnh`.
- **Sau khi lưu ảnh**: `payload.photos` chứa URL Storage, không còn chuỗi `data:`
  nào trong dữ liệu gửi lên; `variants.shots` của quản trị được giữ nguyên;
  bảng giá suy ra **không bị đóng băng** (giá từng phiên bản trước và sau khi
  thêm ảnh giống hệt nhau).
- Ảnh chụp hộp thoại quản trị: đủ 2 nhóm (màu / phiên bản), thumbnail đã lưu
  hiện đúng, nút × và ‹ › không bị cắt, không tràn ngang ở 390px.

## Việc còn lại / gợi ý

- **Khuyến mãi chưa có bảng trên Supabase**: dữ liệu nằm trong `localStorage` của
  trình duyệt quản trị (`applevn_promotions_v1`) nên **không tự đồng bộ giữa các
  máy**. Muốn dùng thật, cần tạo bảng `promotions` + RLS rồi thay `loadPromotions`/
  `savePromotions` bằng truy vấn Supabase. Dùng Xuất/Nhập JSON để sao lưu ngay.
- **Mã khuyến mãi mới tạo chỉ có hiệu lực ở giao diện**: hàm RPC `place_order` chỉ
  chấp nhận những mã đã đăng ký trong cơ sở dữ liệu. Giao diện đã hiển thị cảnh báo
  khi khách áp dụng mã mới; cần thêm mã vào Supabase trước khi bán thật.
- **Ghi chú đơn và trạng thái thanh toán** lưu cục bộ (chưa có cột trên máy chủ).
  Muốn đồng bộ đa thiết bị cần thêm cột vào bảng `orders` hoặc bảng riêng.
- **Chưa nối cổng thanh toán thật**: không có VNPay/MoMo/ZaloPay/Stripe, không
  webhook, không xác minh giao dịch. Mọi phương thức đều ở «Chờ xác minh» và do
  quản trị xác nhận tay. Đơn được tạo **không** đồng nghĩa đã nhận tiền.
- `STORE_BANK` trong `js/data.js` là giá trị mẫu: **phải thay** bằng số tài khoản
  thật của cửa hàng trước khi dùng.
- Chưa có ô nhập `variants.configs` (JSON) trong form sản phẩm: muốn đặt giá
  từng biến thể thủ công thì sửa trực tiếp `product.variants` trong Supabase.
- Tồn kho hiện theo sản phẩm, chưa theo từng biến thể (schema chưa có cột riêng).
- Ảnh đã tải lên Storage nhưng bỏ khỏi sản phẩm thì **không tự xoá** khỏi bucket
  (tránh xoá nhầm ảnh còn dùng); dọn thủ công trong Storage khi cần.
- Giá và thông số là dữ liệu tham khảo, cần xác minh trước khi bán.
- Chưa triển khai (Hosted Deploy): mọi thay đổi mới đang nằm trong mã nguồn.

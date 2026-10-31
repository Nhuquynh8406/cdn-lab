# Lời thoại TV2 - giao diện tiếng Việt

Đọc theo thao tác thực, không đọc số liệu mẫu. Giữ tên kỹ thuật HIT/MISS, TTFB, Cache-Control, purge và versioning, kèm giải thích. Phần TV2 dự kiến 6-7 phút; cả video nhóm không quá 20 phút.

## Lý thuyết, khoảng 2 phút

“Trong CDN Lab có hai lớp cache khác nhau: bộ nhớ đệm trình duyệt và shared cache tại CDN. Ảnh tải nhanh chưa đủ chứng minh CDN vừa trả HIT, vì trình duyệt có thể dùng bản local. Trang đo sẽ tạo yêu cầu mạng và đọc metadata thật.

Tài nguyên công khai đặt max-age 60 giây và s-maxage 30 ngày. HTML, API và quản trị dùng no-store. no-cache yêu cầu xác thực trước khi dùng lại, còn no-store yêu cầu không lưu.

Có ba cách cập nhật: chờ hết thời gian tươi, purge URL đang dùng, hoặc phát hành URL phiên bản mới. Query phiên bản chỉ tạo khóa khác khi CDN giữ query trong cache key. Demo dùng hash banner; khi triển khai thực tế nên dùng file fingerprint bất biến và giữ các bản cũ.”

## Demo, khoảng 4 phút

“Giao diện TV2 dùng tiếng Việt, nền hồng loang bằng CSS. Thư viện ảnh tải 30 JPEG bằng đường dẫn tương đối. Mở cùng trang qua hai hostname giữ nguyên bộ nội dung nhưng thay đường phân phối.”

Mở gallery qua origin và CDN thật, chỉ rõ URL. Nếu vẫn local, nói rõ chưa là phép so sánh CDN.

“Trang Đo hiệu năng lấy mẫu bốn tài nguyên. TTFB tính từ requestStart đến responseStart; tổng thời gian tính đến khi đọc hết body. Timing không đọc được hiện N/A. CSV giữ lượt thành công, lỗi và lượt đầu tiên.”

Chọn 3-5 lượt, chạy và đọc số liệu thật, xuất CSV. Nêu mạng/thời điểm thử; không nói đây là tốc độ cố định của nhà cung cấp.

“Ba ảnh quản trị là origin, CDN URL giữ nguyên và CDN URL có phiên bản. Trước khi upload em xác nhận URL CDN đã HIT. Upload chỉ đổi file origin. Nếu edge giữ bản tươi, URL cũ có thể vẫn trả ảnh cũ. URL phiên bản mới yêu cầu khóa khác theo cấu hình cache.”

Warm URL thật, upload banner-b.jpg, so sánh ảnh/header, thử bật tắt phiên bản. Nếu chưa có HIT hoặc token thì giải thích giới hạn, không diễn như đã purge thành công.

“Khi nhấn Purge URL banner, browser gọi backend có xác thực. Backend giữ token rồi gọi Cloudflare. Acknowledgement xác nhận yêu cầu được nhận; em tải lại để kiểm tra phản hồi thực. Purge toàn bộ có xác nhận riêng vì ảnh hưởng cả zone.”

Thực hiện purge và đọc log/header thật. Giải thích đoạn ngắn của server.js/lib/cloudflare.js; không hiện .env hoặc API token.

## Kết luận

“Thay nội dung origin, cache trình duyệt và cache edge cần được quan sát riêng. Giao diện giúp người xem hiểu yêu cầu đi đâu, khi nào bản cũ còn được dùng và bằng chứng nào đủ để xác nhận đã cập nhật.”

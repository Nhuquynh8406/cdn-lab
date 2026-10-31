# Bàn giao phần TV2

> **Cập nhật theo đề gốc:** giao diện đã chuyển sang tiếng Việt và nền hồng loang. Xem `doi-chieu-de-goc.md` và `video-script-TV2-vi.md`. Đề gốc không bắt buộc tiếng Anh; những nhận định ngôn ngữ/template ở phần bàn giao ban đầu bên dưới đã được thay thế bằng căn cứ mới. Báo cáo Word/PDF hiện được duy trì riêng từ bản người dùng đã chỉnh trong `04_BAO_CAO_CDN_LAB`, không dùng generator cũ ghi đè.

Đã đọc toàn bộ kế hoạch. Phần TV2 được triển khai trong chính thư mục `C:\xampp\htdocs\cdn-lab`.

## Mở bài

1. Cài Node.js 20 trở lên. Mở terminal tại thư mục dự án, chạy `npm ci`.
2. PowerShell: `Copy-Item .env.example .env`.
3. Chạy `npm start`, mở http://localhost:3000.
4. Vào `/admin`, dùng **admin / cdnlab-local-demo** cho máy local.
5. Thử upload `docs/demo-assets/banner-b.jpg`; so sánh với banner-a.jpg.

Máy local không có CDN: ba ảnh có thể đổi cùng lúc, không có HIT/MISS thật và không purge được nếu thiếu token. Đây là trạng thái đúng, không phải lỗi.

## Những gì đã chuẩn bị

- Source Express, HTML/CSS/JS; gallery 30 JPEG 300-600 KB; cache headers, CORS và Timing-Allow-Origin.
- Benchmark đo thật, biểu đồ Chart.js, chế độ URL lặp/query riêng, hủy chạy, xuất CSV và jsDelivr tùy chọn.
- Admin Basic Auth; kiểm tra JPEG thật; upload thay banner; purge URL/toàn zone; bật/tắt query version; log và ba preview.
- README tiếng Anh, cấu hình mẫu và hướng dẫn phối hợp triển khai.
- Nội dung báo cáo tiếng Anh mục 2.4-2.5, phần use case/sequence Chương 4 và ứng dụng Chương 5; bản Markdown và Word trong deliverables.
- Bốn sơ đồ Mermaid chỉnh sửa được, SVG và PNG.
- Slide PowerPoint 20 trang dùng chung; phần kết quả TV3 ghi rõ cần bổ sung bằng dữ liệu thật.
- Kịch bản tiếng Anh của TV2 và hướng dẫn quay/dựng video; checklist chụp màn hình và nghiệm thu.

## Những điểm phải biết khi nộp

Kế hoạch có mâu thuẫn: đầu file ghi báo cáo/video tiếng Việt, cuối file và checklist ghi tiếng Anh. Bộ bài dùng tiếng Anh theo checklist cuối; nên đối chiếu đề gốc với giảng viên. Template Khoa không có trong tài liệu, nên Word chưa được tuyên bố đúng template. TV1 cần ghép nội dung và dùng Insert Caption để đánh số hình/bảng theo toàn bài.

Bộ ảnh là texture JPEG tổng hợp tự tạo, không phải ảnh chụp Unsplash/Pexels như gợi ý trong kế hoạch. Nếu giảng viên yêu cầu ảnh chụp, cần thay bằng ảnh có giấy phép/nguồn rõ ràng và đồng bộ cả ba đường tải. File vendor là lodash đầy đủ, khoảng 530 KB, khác gợi ý 200-300 KB; có giữ giấy phép.

TV1 cần cung cấp domain thực, VM, HTTPS, Cache/Transform/WAF rules, CF_ZONE_ID và token giới hạn zone. Chỉ đặt token trong `.env` trên server, không gửi vào source công khai. Đặt mật khẩu admin riêng khi production và ghi thông tin thực trong bản README nộp riêng. Chưa tạo repo GitHub hoặc PR vì chưa có tài khoản/repo đích; không bịa link commit hay bảng phần trăm đóng góp.

TV3 cần đưa chính bộ static lên repo public và gắn release bất biến; đặt JSDELIVR_URL; đo chính thức và kiểm tra cài sạch. Kết quả benchmark local không dùng thay cho số liệu origin Mỹ/CDN tại Việt Nam.

Video thật cần đủ ba người xuất hiện và nói. Tài liệu kịch bản không thay thế được MP4. Dùng OBS/Meet quay; ghép trong CapCut, chèn tên thật người nói, xuất 1080p và kiểm tra thời lượng không quá 20 phút. Chưa có footage nên không có video giả được tạo.

## Gói để gửi nhóm

`deliverables/TV2_Report.docx` và `TV2_Report.pdf`: nội dung báo cáo; `deliverables/CDN_Lab_Slides.pptx`: slide. PDF được in từ cùng nội dung qua HTML/Chrome nên phân trang khác bản Word. Source nằm trong thư mục gốc; gói `deliverables/TV2_Source.zip` loại node_modules và .env. Gói `TV2_Full.zip` gồm source, báo cáo và slide để gửi nhóm. Xem `docs/verification.txt` cho kết quả kiểm tra local và `docs/acceptance.md` cho các bước còn cần domain thật.

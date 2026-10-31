# Kiểm tra bản tiếng Việt và hồng loang - 31/10/2026

- `npm test`: 8 test/subtest đạt, không lỗi. Đã kiểm tra xác thực, no-store, static/CORS/timing, conditional 304, upload JPEG, version và payload/lỗi purge với transport giả lập.
- `node tools/browser-check.js`: đạt. 30 JPEG tải thành công; 8 dòng tổng hợp local cho 4 asset × 2 nhãn tuyến; không lỗi yêu cầu; tải CSV được; preview hoạt động và purge bị khóa khi chưa cấu hình.
- Cả năm trang có `lang=vi`, kiểm tra chiều rộng 390px không tràn ngang toàn trang; không có ngoại lệ JavaScript trên các trang đã mở.
- Ảnh mới ở `docs/screenshots/` là chụp local. Biểu đồ tắt animation để ảnh chụp hiển thị giá trị hoàn chỉnh, cùng dữ liệu của bảng. Màu nền dùng CSS gradient; không thêm ảnh nền vào gallery.
- Không có `.env`, API token hoặc node_modules trong thay đổi gửi GitHub. Chính sách cache và luồng API giữ chức năng, chỉ đổi thông báo hiển thị sang tiếng Việt.

Giới hạn: kiểm tra trên một máy Windows/Chrome; không phải cài sạch của TV3. Chưa xác nhận Cloudflare thật, purge lan truyền, WAF hoặc tăng tốc CDN. Đối chiếu yêu cầu còn thiếu trong doi-chieu-de-goc.md.

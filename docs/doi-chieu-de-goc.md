# Đối chiếu đề gốc 503073-Midterm.pdf

Đã đọc tài liệu 11 trang do người dùng cung cấp ngày 31/10/2026. Dùng đề này làm căn cứ thay cho những suy diễn trong kế hoạch phân công trước đó.

## Phạm vi và ngôn ngữ

- Chủ đề 8, trang 5: CDN, caching points, edge servers, invalidation; hiệu năng, availability, scalability, DDoS; Cloudflare, Akamai, AWS CloudFront.
- Demo gợi ý: cùng tài nguyên tĩnh qua CDN, so sánh trước/sau; minh họa invalidation hoặc custom rules.
- Đề không bắt buộc tiếng Anh hoặc màu giao diện. Bản này dùng tiếng Việt và nền hồng loang bằng CSS; mã HTTP/header giữ nguyên.
- Không có yêu cầu ERD, Waterfall hoặc Scrum riêng cho đề tài CDN. Tuy nhiên trang 11 vẫn yêu cầu nội dung phân tích yêu cầu, thiết kế hệ thống, kết quả và so sánh. Với CDN Lab, trình bày bằng kiến trúc web, luồng HTTP, policy cache và đường triển khai.

## Yêu cầu và bằng chứng

| Yêu cầu | Thể hiện trong CDN Lab | Trạng thái |
| --- | --- | --- |
| Giải thích lý thuyết CDN | Báo cáo Chương 2, trang Cách hoạt động | Có nội dung; nhóm rà lại khi nộp |
| So sánh cách tiếp cận | Origin/CDN, pull/push, TTL/purge/versioning, ba nhà cung cấp | Có phân tích; số đo thật còn cần hạ tầng |
| Demo website hoạt động | Gallery, Benchmark, Admin, hướng dẫn | Đã kiểm tra local |
| Đo trước/sau CDN | Bốn asset, chart và raw CSV | Công cụ có; local không chứng minh tăng tốc CDN |
| Invalidation/custom rules | Upload, URL version, Purge API, đọc headers | Cần domain/token/rules thật để nghiệm thu edge |
| Báo cáo Word và PDF | Bản riêng được giữ từ tài liệu người dùng đã sửa | Đã cập nhật theo mẫu và Heading |
| 20-60 trang không kể bìa/phụ lục | Cập nhật mục lục và xuất PDF qua Word | Kiểm số trang trước nộp |
| Source + dependency + README | Repo, package-lock và hướng dẫn local | Có; cần TV3 thử cài trên máy sạch |
| Video có tiếng, tối đa 20 phút | Cả ba người trình bày lý thuyết, demo, kiến trúc, code chính | Cần tự quay; không có video giả |

## Chấm điểm và phần còn thiếu

Báo cáo 6 điểm: lý thuyết 2, so sánh 1, ứng dụng/cài đặt 1, bố cục/trình bày 2. Demo 4 điểm: phạm vi 2, trình diễn rõ ràng 1, kỹ năng video 1. Theo đề, thiếu video có âm thanh hoặc thiếu source kèm hướng dẫn cài sẽ khiến phần Demo bằng 0.

Chưa có bộ số liệu hạ tầng CDN thật trong lần cập nhật này. Không dùng chênh lệch giữa hai nhãn tuyến cùng localhost làm số liệu “trước/sau CDN”. Cần TV1 xác nhận domain/HTTPS, cache key và token; TV3 thu số đo, ảnh dashboard và logs. Link video phải kiểm tra được và mọi thành viên phải tham gia.

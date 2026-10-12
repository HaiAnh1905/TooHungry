# Checklist [LOẠI CHECKLIST]: [TÊN TÍNH NĂNG]

**Mục đích**: [Mô tả ngắn gọn về những gì checklist này bao quát]
**Ngày tạo**: [DATE]
**Tính năng**: [Liên kết đến spec.md hoặc tài liệu liên quan]

**Lưu ý**: Checklist tùy chỉnh này được tạo bởi lệnh `/speckit.checklist` dựa trên bối cảnh và yêu cầu của tính năng.
**Quyền sở hữu Đánh giá (Review Ownership)**: Checklist này là một tạo tác đánh giá chất lượng yêu cầu do người đánh giá (reviewer) sở hữu. Chỉ đánh dấu `[x]` vào một mục khi người đánh giá xác định rằng tiêu chí chất lượng yêu cầu đã được đáp ứng.
**Ngữ nghĩa của Đánh dấu**: `[x]` có nghĩa là tiêu chí đã được đánh giá và thỏa mãn về mặt chất lượng yêu cầu. Nó KHÔNG có nghĩa là công việc lập trình/triển khai đã hoàn tất.

<!--
  ============================================================================
  QUAN TRỌNG: Các mục checklist dưới đây CHỈ LÀ CÁC MỤC MẪU nhằm mục đích minh họa.

  Lệnh /speckit.checklist BẮT BUỘC PHẢI thay thế chúng bằng các mục thực tế dựa trên:
  - Yêu cầu checklist cụ thể của người dùng
  - Các yêu cầu tính năng từ spec.md
  - Bối cảnh kỹ thuật từ plan.md
  - Chi tiết triển khai từ tasks.md

  KHÔNG ĐƯỢC giữ lại các mục mẫu này trong file checklist được tạo ra.
  ============================================================================
-->

## [Danh mục 1]

- [ ] CHK001 Mục checklist đầu tiên với hành động rõ ràng
- [ ] CHK002 Mục checklist thứ hai
- [ ] CHK003 Mục checklist thứ ba

## [Danh mục 2]

- [ ] CHK004 Một mục thuộc danh mục khác
- [ ] CHK005 Mục với các tiêu chí cụ thể
- [ ] CHK006 Mục cuối cùng trong danh mục này

## Ghi chú

- Chỉ đánh dấu `[x]` vào các mục sau khi đánh giá xác nhận rằng tiêu chí chất lượng yêu cầu đã được đáp ứng
- Bỏ trống các mục khi chúng vẫn cần làm rõ, chỉnh sửa, hoặc cần người đánh giá xem xét
- Lệnh `/speckit.implement` đọc trạng thái của hộp kiểm trong checklist như một cổng chặn (gate) và không được sửa đổi các đánh dấu
- `checklists/requirements.md` có một vòng đời tích hợp riêng được duy trì bởi `/speckit.specify` và `/speckit.clarify`
- Thêm bình luận hoặc phát hiện ngay trong dòng (inline)
- Liên kết đến các tài nguyên hoặc tài liệu liên quan
- Các mục được đánh số thứ tự tuần tự để dễ dàng tham chiếu

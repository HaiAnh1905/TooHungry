const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'angular/src/app/dining-area/dining-area.component.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const replacements = [
  ['Tổng số khu vực', "{{ '::TotalAreas' | abpLocalization }}"],
  ['Tổng bàn phân bổ', "{{ '::TotalAllocatedTables' | abpLocalization }}"],
  ['Khu vực nhiều bàn nhất', "{{ '::BusiestArea' | abpLocalization }}"],
  ['({{ busiestArea()?.tableCount }} bàn)', "({{ busiestArea()?.tableCount }} {{ '::TableCount' | abpLocalization }})"],
  ['placeholder="Tìm kiếm theo tên khu vực, mô tả..."', "[placeholder]=\"'::SearchAreaPlaceholder' | abpLocalization\""],
  ['<h4 class="empty-title">Không tìm thấy khu vực nào</h4>', '<h4 class="empty-title">{{ \'::NoAreasFound\' | abpLocalization }}</h4>'],
  ['<p class="empty-desc">Thử thay đổi từ khóa tìm kiếm hoặc nhấn "+ Thêm khu vực mới" để tạo khu vực bàn ăn đầu tiên.</p>', '<p class="empty-desc">{{ \'::NoAreasFoundDesc\' | abpLocalization }}</p>'],
  ['<span>Thêm khu vực ngay</span>', "<span>{{ '::AddAreaNow' | abpLocalization }}</span>"],
  ["{{ area.isActive ? 'Hoạt động' : 'Tạm ngưng' }}", "{{ (area.isActive ? '::Active' : '::Inactive') | abpLocalization }}"],
  ['{{ area.tableCount }} bàn ăn', "{{ area.tableCount }} {{ '::TableCountText' | abpLocalization }}"],
  ["{{ area.description || 'Chưa có mô tả chi tiết cho khu vực này.' }}", "{{ area.description || ('::NoAreaDescription' | abpLocalization) }}"],
  ['title="Xem danh sách bàn trong khu vực này"', "[title]=\"'::ViewAreaTablesTooltip' | abpLocalization\""],
  ['Xem bàn', "{{ '::ViewTables' | abpLocalization }}"],
  ['title="Chỉnh sửa khu vực"', "[title]=\"'::EditArea' | abpLocalization\""],
  ["[title]=\"area.isActive ? 'Vô hiệu hóa khu vực' : 'Kích hoạt lại khu vực'\"", "[title]=\"(area.isActive ? '::DisableArea' : '::EnableArea') | abpLocalization\""],
  ["{{ selectedItem.id ? 'Chỉnh sửa Khu vực bàn' : 'Thêm Khu vực bàn mới' }}", "{{ (selectedItem.id ? '::EditDiningArea' : '::AddNewDiningArea') | abpLocalization }}"],
  ['placeholder="VD: Tầng 1, Khu VIP, Sân vườn, Ban công..."', "[placeholder]=\"'::AreaNameExample' | abpLocalization\""],
  ['Vui lòng nhập tên khu vực bàn ăn!', "{{ '::AreaNameRequired' | abpLocalization }}"],
  ['Tên khu vực không được vượt quá 128 ký tự!', "{{ '::AreaNameMaxLength' | abpLocalization }}"],
  ['Mô tả / Ghi chú đặc điểm', "{{ '::AreaDescription' | abpLocalization }}"],
  ['placeholder="VD: Khu vực yên tĩnh, có điều hòa riêng, phù hợp tiếp khách sang trọng..."', "[placeholder]=\"'::AreaDescriptionExample' | abpLocalization\""],
  ['Mô tả giúp nhân viên phục vụ nắm rõ đặc trưng của từng không gian bàn ăn.', "{{ '::AreaDescriptionHint' | abpLocalization }}"],
  ['Khu vực đang hoạt động (Khả dụng đón khách)', "{{ '::AreaIsActive' | abpLocalization }}"],
  ['Hủy bỏ', "{{ '::Cancel' | abpLocalization }}"],
  ['<span>Đang lưu...</span>', "<span>{{ '::Saving' | abpLocalization }}</span>"],
  ["<span>{{ selectedItem.id ? 'Lưu thay đổi' : 'Tạo khu vực' }}</span>", "<span>{{ (selectedItem.id ? '::SaveChanges' : '::CreateArea') | abpLocalization }}</span>"],
  ['Tên khu vực', "{{ '::AreaName' | abpLocalization }}"],
  ['khu vực', "{{ '::AreaCountText' | abpLocalization }}"],
  ['bàn ăn', "{{ '::TableCountText' | abpLocalization }}"]
];

// Sort replacements by length descending to replace larger strings first
replacements.sort((a, b) => b[0].length - a[0].length);

replacements.forEach(([search, replace]) => {
  html = html.split(search).join(replace);
});

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Success HTML update');

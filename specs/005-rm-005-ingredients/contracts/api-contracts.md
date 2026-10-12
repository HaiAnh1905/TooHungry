# Giai đoạn 1: Hợp đồng API

**Tính năng**: Quản lý thành phần (003 thành phần)

## API công khai (Dịch vụ ứng dụng)

Tất cả các API đều được `Acme.TooHungry.HttpApi.Host` hiển thị và được bảo vệ bởi các quyền ABP.

### API đơn vị (`/api/app/unit`)
- **GET** `/api/app/unit`: Lấy danh sách các đơn vị được phân trang.
  - Query: `SkipCount`, `MaxResultCount`, `Sorting`, `Filter`
  - Returns: `PagedResultDto<UnitDto>`
- **GET** `/api/app/unit/{id}`: Nhận thông tin chi tiết về đơn vị.
- **POST** `/api/app/unit`: Tạo đơn vị mới.
  - Body: `CreateUpdateUnitDto` (Name, Abbreviation, IsActive)
- **PUT** `/api/app/unit/{id}`: Cập nhật đơn vị hiện có.
  - Body: `CreateUpdateUnitDto`
- **DELETE** `/api/app/unit/{id}`: Xóa đơn vị (xóa mềm qua ABP).

### API danh mục thành phần (`/api/app/ingredient-category`)
- Các điểm cuối CRUD tương tự như Unit. Trả về `IngredientCategoryDto`.

### API thành phần (`/api/app/ingredient`)
- **GET** `/api/app/ingredient`: Lấy danh sách được phân trang.
- **GET** `/api/app/ingredient/{id}`: Nhận thông tin chi tiết.
- **POST** `/api/app/ingredient`: Tạo thành phần mới.
  - Body: `CreateUpdateIngredientDto`
- **PUT** `/api/app/ingredient/{id}`: Cập nhật thành phần.
  - Body: `CreateUpdateIngredientDto` (Validation applies for restricted fields)
- **DELETE** `/api/app/ingredient/{id}`: Xóa thành phần.

## DTO

###`UnitDto`
- `Id`: `Guid`
- `Name`: `string`
- `Abbreviation`: `string`
- `IsActive`: `bool`

###`IngredientDto`
- `Id`: `Guid`
- `Name`: `string`
- `CategoryId`: `Guid?`
- `CategoryName`: `string`
- `PurchaseUnitId`: `Guid`
- `PurchaseUnitName`: `string`
- `UsageUnitId`: `Guid`
- `UsageUnitName`: `string`
- `ConversionFactor`: `decimal`
- `IsActive`: `bool`

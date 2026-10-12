# Hợp đồng API: Món ăn, Danh mục & Liên kết Công thức

**Tính năng**: `002-dishes-and-dish-categories`
**Focus**: Mục 3 - Liên kết Công thức định lượng (Recipe & RecipeIngredient)  
**Ngày**: 24-09-2026

---

## 1. Hợp đồng dịch vụ ứng dụng món ăn (`IDishAppService`)

**Tuyến cơ sở**: `/api/app/dish`

### 1.1. `GET /api/app/dish`
Lấy danh sách món ăn có phân trang, tìm kiếm từ khóa, lọc theo danh mục và lọc theo Tab trạng thái phục vụ.

- **Truy vấn yêu cầu (`GetDishListDto`)**:
  ```json
  {
    "filter": "phở bò",
    "dishCategoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "isActive": true, 
    "sorting": "Price ASC",
    "skipCount": 0,
    "maxResultCount": 10
  }
  ```
  *(Ghi chú: `isActive = null` để lấy tất cả, `true` cho tab "Đang phục vụ", `false` cho tab "Tạm ngưng")*

- **Phản hồi (`PagedResultDto<DishDto>`)**:
  ```json
  {
    "totalCount": 1,
    "items": [
      {
        "id": "e3a1f819-3bfb-486e-9226-44470bc552ab",
        "name": "Phở Bò Đặc Biệt",
        "description": "Nước dùng hầm xương 24h, kèm thịt bò tái lăn",
        "price": 65000.0,
        "imageUrl": "https://res.cloudinary.com/demo/image/upload/pho_bo.jpg",
        "isActive": true,
        "dishCategoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "dishCategoryName": "Món chính",
        "hasRecipe": true,
        "recipeId": "8b5f3a12-68c1-4b13-9114-118e7e174b21"
      }
    ]
  }
  ```

---

### 1.2. `GET /api/app/dish/{id}`
Lấy chi tiết món ăn kèm thông tin công thức tóm tắt.

- **Phản hồi (`DishDetailDto`)**:
  ```json
  {
    "id": "e3a1f819-3bfb-486e-9226-44470bc552ab",
    "name": "Phở Bò Đặc Biệt",
    "description": "Nước dùng hầm xương 24h",
    "price": 65000.0,
    "imageUrl": "https://res.cloudinary.com/demo/image/upload/pho_bo.jpg",
    "isActive": true,
    "dishCategoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "dishCategoryName": "Món chính",
    "recipe": {
      "id": "8b5f3a12-68c1-4b13-9114-118e7e174b21",
      "name": "Công thức Phở Bò Chuẩn Bếp",
      "ingredientCount": 3
    }
  }
  ```

---

### 1.3. `POST /api/app/dish`
Tạo mới món ăn (không bắt buộc tạo công thức ngay).

- **Nội dung yêu cầu (`CreateDishDto`)**:
  ```json
  {
    "name": "Trà Đào Cam Sả",
    "description": "Đào ngâm, cam vàng và sả tươi thanh mát",
    "price": 35000.0,
    "imageUrl": "https://res.cloudinary.com/demo/image/upload/tra_dao.jpg",
    "dishCategoryId": "a1b2c3d4-0000-0000-0000-000000000001",
    "isActive": true
  }
  ```

---

### 1.4. `PUT /api/app/dish/{id}`
Cập nhật thông tin món ăn.

- **Nội dung yêu cầu (`UpdateDishDto`)**:
  ```json
  {
    "name": "Trà Đào Cam Sả",
    "description": "Đào ngâm, cam vàng và sả tươi",
    "price": 38000.0,
    "imageUrl": "https://res.cloudinary.com/demo/image/upload/tra_dao_new.jpg",
    "dishCategoryId": "a1b2c3d4-0000-0000-0000-000000000001",
    "isActive": true
  }
  ```

---

### 1.5. `PUT /api/app/dish/{id}/toggle-active`
Bật/Tắt nhanh trạng thái phục vụ kinh doanh (`IsActive`).

- **Response (`DishDto`)**: Món ăn sau khi chuyển trạng thái.

---

### 1.6. `POST /api/app/dish/bulk-toggle-active`
Cập nhật trạng thái kinh doanh hàng loạt cho danh sách món ăn đã chọn.

- **Nội dung yêu cầu (`BulkToggleActiveDishDto`)**:
  ```json
  {
    "dishIds": [
      "e3a1f819-3bfb-486e-9226-44470bc552ab",
      "a1b2c3d4-5555-6666-7777-888899990000"
    ],
    "isActive": false
  }
  ```
- **Phản hồi (`BulkActionResultDto`)**:
  ```json
  {
    "success": true,
    "updatedCount": 2,
    "message": "Đã cập nhật trạng thái cho 2 món ăn"
  }
  ```

---

### 1.7. `DELETE /api/app/dish/{id}`
Xóa mềm món ăn kèm lý do xóa kiểm toán.

- **Nội dung yêu cầu (`DeleteDishDto`)**:
  ```json
  {
    "deletionReason": "Ngừng kinh doanh do nhà cung cấp dừng cung ứng nguyên liệu"
  }
  ```
- **Phản hồi**: `204 No Content`.

---

## 2. Recipe Application Service Contract (`IRecipeAppService` - Liên kết RM-007)

**Tuyến cơ sở**: `/api/app/recipe`

### 2.1. `GET /api/app/recipe/by-dish/{dishId}`
Lấy công thức định lượng chi tiết của món ăn kèm danh sách nguyên liệu.

- **Phản hồi (`RecipeDetailDto`)**:
  ```json
  {
    "id": "8b5f3a12-68c1-4b13-9114-118e7e174b21",
    "dishId": "e3a1f819-3bfb-486e-9226-44470bc552ab",
    "dishName": "Phở Bò Đặc Biệt",
    "name": "Công thức Phở Bò Bát Đá",
    "description": "Định lượng cho 1 tô tiêu chuẩn",
    "instructions": "1. Trần bánh phở 10s\n2. Xếp 150g thịt bò\n3. Chan nước dùng sôi 95 độ C",
    "ingredients": [
      {
        "id": "11111111-2222-3333-4444-555555555555",
        "ingredientId": "9a8b7c6d-1111-2222-3333-444455556666",
        "ingredientName": "Bánh phở tươi",
        "unitName": "Kilogram",
        "unitAbbreviation": "kg",
        "quantity": 0.2,
        "note": "Bánh phở sợi nhỏ"
      },
      {
        "id": "22222222-3333-4444-5555-666666666666",
        "ingredientId": "8b7c6d5e-2222-3333-4444-555566667777",
        "ingredientName": "Thịt bò tái thăn",
        "unitName": "Kilogram",
        "unitAbbreviation": "kg",
        "quantity": 0.15,
        "note": "Thái mỏng ngang thớ"
      }
    ]
  }
  ```

---

### 2.2. `POST /api/app/recipe/save-for-dish/{dishId}`
Tạo mới hoặc cập nhật toàn bộ công thức định lượng cho món ăn (Idempotent).

- **Nội dung yêu cầu (`CreateOrUpdateRecipeDto`)**:
  ```json
  {
    "name": "Công thức Phở Bò Bát Đá",
    "description": "Định lượng cho 1 tô tiêu chuẩn",
    "instructions": "1. Trần bánh phở\n2. Xếp thịt\n3. Chan nước dùng",
    "ingredients": [
      {
        "ingredientId": "9a8b7c6d-1111-2222-3333-444455556666",
        "quantity": 0.2,
        "note": "Bánh phở tươi"
      },
      {
        "ingredientId": "8b7c6d5e-2222-3333-4444-555566667777",
        "quantity": 0.15,
        "note": "Thịt bò thăn thái mỏng"
      }
    ]
  }
  ```

---

### 2.3. `DELETE /api/app/recipe/by-dish/{dishId}`
Gỡ bỏ công thức khỏi món ăn.

- **Phản hồi**: `204 No Content`.

---

## 3. Hợp đồng dịch vụ danh mục món ăn (`IDishCategoryAppService`)

**Tuyến cơ sở**: `/api/app/dish-category`

- `GET /api/app/dish-category`: Lấy danh sách danh mục (sắp xếp theo `displayOrder ASC, name ASC`, kèm đếm số món ăn).
  - Phản hồi item:
    ```json
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Khai vị",
      "description": "Các món ăn nhẹ trước bữa",
      "displayOrder": 1,
      "dishCount": 5
    }
    ```
- `POST /api/app/dish-category`: Tạo mới danh mục (kiểm tra trùng tên, nhận `name`, `description`, `displayOrder`).
- `PUT /api/app/dish-category/{id}`: Cập nhật thông tin danh mục (`name`, `description`, `displayOrder`).
- `DELETE /api/app/dish-category/{id}`: Xóa danh mục (chặn nếu `Dishes.Any()`, báo lỗi thân thiện kèm số lượng món đang phụ thuộc).

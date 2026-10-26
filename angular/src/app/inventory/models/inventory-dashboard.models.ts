import { StorageType, InventoryAlertDto } from '../../proxy/inventories/models';

/**
 * Định nghĩa 3 Tab chính của màn hình Quản lý kho, đồng bộ qua query param `?tab=`
 */
export type InventoryTabType = 'ingredients' | 'batches' | 'transactions';

/**
 * Phân loại trạng thái hạn sử dụng và vòng đời của lô hàng theo nguyên tắc FEFO
 */
export enum BatchFefoStatus {
  Safe = 'Safe',                   // Còn hạn an toàn (> 7 ngày)
  ExpiringSoon = 'ExpiringSoon',   // Cận date (1 - 7 ngày)
  Expired = 'Expired',             // Đã hết hạn (<= 0 ngày, cần xuất hủy)
  Locked = 'Locked'                // Đang bị khóa tạm ngưng (RM-013)
}

/**
 * Phân loại mức độ tồn kho của mặt hàng nguyên liệu so với định mức tồn an toàn
 */
export enum StockLevelStatus {
  Safe = 'Safe',         // Tồn an toàn (>= 100% định mức tối thiểu)
  Low = 'Low',           // Tồn thấp (50% - < 100% định mức)
  Critical = 'Critical'  // Cạn kiệt / Nguy cấp (< 50% định mức hoặc bằng 0)
}

/**
 * Bộ lọc theo điều kiện bảo quản nhiệt độ của nguyên liệu
 */
export enum StorageFilterType {
  All = 'All',           // Tất cả điều kiện
  Chilled = 'Chilled',   // Bảo quản mát (0°C - 4°C)
  Frozen = 'Frozen',     // Bảo quản đông (-18°C)
  Dry = 'Dry'            // Bảo quản khô ráo / Nhiệt độ phòng
}

/**
 * Tổng hợp 4 chỉ số KPI Bento hiển thị đầu trang `/inventory`
 */
export interface DashboardInventoryKpiSummary {
  totalIngredients: number;
  safeIngredients: number;
  lowStockIngredients: number;
  expiredBatchesCount: number;
  estimatedTotalValue?: number;
}

/**
 * Dữ liệu đề xuất bổ sung kho liên kết từ Kế hoạch mua hàng Dự báo (RM-014)
 */
export interface ReplenishmentSuggestionItem {
  ingredientId: string;
  ingredientName: string;
  unitName: string;
  currentStock: number;
  forecastDemand: number;
  suggestedQuantity: number;
  estimatedUnitPrice: number;
  storageType?: StorageType;
}

/**
 * Mô hình hiển thị một dòng lô hàng với đầy đủ thông tin FEFO và thao tác 1 chạm
 */
export interface BatchViewItem {
  id: string;
  batchCode: string;
  ingredientId: string;
  ingredientName: string;
  unitName: string;
  inboundDate: string;
  expirationDate: string;
  initialQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  fefoStatus: BatchFefoStatus;
  daysRemaining: number;
  elapsedPercentage: number;
  isActive: boolean;
  deactivationReason?: string;
  storageType?: StorageType;
}

/**
 * Trạng thái của Băng rôn Cảnh báo ghim đầu trang
 */
export interface InventoryAlertBannerState {
  alerts: InventoryAlertDto[];
  topAlert: InventoryAlertDto | null;
  isExpanded: boolean;
  isDismissed: boolean;
  isLoading: boolean;
  totalAlertCount: number;
}

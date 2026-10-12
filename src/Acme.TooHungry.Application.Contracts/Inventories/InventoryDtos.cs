using System;
using System.Collections.Generic;
using Acme.TooHungry.Ingredients;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Inventories;

public class InventoryBatchDto : FullAuditedEntityDto<Guid>
{
    public Guid IngredientId { get; set; }

    public string IngredientName { get; set; } = string.Empty;

    public string BatchCode { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal InitialQuantity => Quantity;

    public decimal RemainingQuantity { get; set; }

    public string PurchaseUnit { get; set; } = string.Empty;

    public decimal ConversionFactor { get; set; }

    public DateTime ReceivedAt { get; set; }

    public DateTime ExpiryDate { get; set; }

    public Guid? SupplierId { get; set; }

    public decimal UnitCost { get; set; }

    public decimal UnitPrice => UnitCost;

    public StorageType StorageType { get; set; }

    public bool IsExpired => ExpiryDate < DateTime.UtcNow;

    public bool IsExpiringToday => !IsExpired && ExpiryDate <= DateTime.UtcNow.AddHours(24);

    public bool IsNearExpiry => !IsExpired && !IsExpiringToday && ExpiryDate <= DateTime.UtcNow.AddDays(3);

    public bool IsActive { get; set; }

    public string? DeactivationReason { get; set; }
}

public class DeactivateBatchDto
{
    public string? ReasonCode { get; set; }

    public string Reason { get; set; } = string.Empty;
}

public class DiscardBatchInputDto
{
    public string Reason { get; set; } = string.Empty;
}

public class CreateInventoryBatchDto
{
    public Guid IngredientId { get; set; }

    public string BatchCode { get; set; } = string.Empty;

    public decimal PurchaseQuantity { get; set; }

    public decimal? InitialQuantity { get; set; }

    public string? PurchaseUnit { get; set; }

    public decimal ConversionFactor { get; set; } = 1.0m;

    public DateTime? ExpiryDate { get; set; }

    public Guid? SupplierId { get; set; }

    public decimal UnitCost { get; set; }

    public decimal? UnitPrice { get; set; }

    public StorageType? StorageType { get; set; }
}

public class GetInventoryBatchesInput : PagedAndSortedResultRequestDto
{
    public Guid? IngredientId { get; set; }

    public bool OnlyAvailable { get; set; } = true;

    public bool? IsActive { get; set; }

    public string? Filter { get; set; }
}

public class BatchDeductionItemDto
{
    public Guid BatchId { get; set; }

    public decimal DeductQuantity { get; set; }

    public decimal Quantity
    {
        get => DeductQuantity;
        set => DeductQuantity = value;
    }
}

public class StockAdjustmentRequestDto
{
    public Guid IngredientId { get; set; }

    public decimal ActualQuantity { get; set; }

    public string Reason { get; set; } = string.Empty;

    public List<BatchDeductionItemDto>? BatchDeductions { get; set; }
}

public class InventoryAlertDto
{
    public string AlertType { get; set; } = string.Empty; // "EXPIRED", "EXPIRING_SOON", "OUT_OF_STOCK", "SHORTAGE"
    public string Type
    {
        get => AlertType switch
        {
            "EXPIRED" => "EXPIRED_FRESH",
            "EXPIRING_SOON" => "NEAR_EXPIRY",
            _ => AlertType
        };
        set => AlertType = value;
    }

    public string Severity { get; set; } = "warning"; // "danger", "warning", "info"

    public Guid IngredientId { get; set; }

    public string IngredientName { get; set; } = string.Empty;

    public Guid? BatchId { get; set; }

    public string? BatchCode { get; set; }

    public string Message { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class InventoryTransactionDto : CreationAuditedEntityDto<Guid>
{
    public Guid IngredientId { get; set; }

    public string IngredientName { get; set; } = string.Empty;

    public Guid? BatchId { get; set; }

    public string? BatchCode { get; set; }

    public InventoryTransactionType TransactionType { get; set; }

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string? ReferenceId { get; set; }
}

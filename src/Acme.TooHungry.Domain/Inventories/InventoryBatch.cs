using System;
using Acme.TooHungry.Ingredients;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Inventories;

public class InventoryBatch : FullAuditedAggregateRoot<Guid>
{
    public Guid IngredientId { get; set; }

    public string BatchCode { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal RemainingQuantity { get; set; }

    public string PurchaseUnit { get; set; } = string.Empty;

    public decimal ConversionFactor { get; set; } = 1.0m;

    public DateTime ReceivedAt { get; set; }

    public DateTime ExpiryDate { get; set; }

    public Guid? SupplierId { get; set; }

    public decimal UnitCost { get; set; }

    public bool IsActive { get; set; } = true;

    public string? DeactivationReason { get; set; }

    // Navigation property
    public Ingredient? Ingredient { get; set; }

    public InventoryBatch()
    {
    }

    public InventoryBatch(
        Guid id,
        Guid ingredientId,
        string batchCode,
        decimal quantity,
        decimal remainingQuantity,
        string purchaseUnit,
        decimal conversionFactor,
        DateTime receivedAt,
        DateTime expiryDate,
        Guid? supplierId = null,
        decimal unitCost = 0,
        bool isActive = true)
        : base(id)
    {
        IngredientId = ingredientId;
        SetBatchCode(batchCode);
        Quantity = quantity >= 0 ? quantity : throw new BusinessException("InventoryBatch:QuantityMustBeNonNegative");
        RemainingQuantity = remainingQuantity >= 0 ? remainingQuantity : throw new BusinessException("InventoryBatch:RemainingQuantityMustBeNonNegative");
        SetPurchaseUnit(purchaseUnit);
        ConversionFactor = conversionFactor > 0 ? conversionFactor : 1.0m;
        ReceivedAt = receivedAt;
        ExpiryDate = expiryDate;
        SupplierId = supplierId;
        UnitCost = unitCost >= 0 ? unitCost : 0;
        IsActive = isActive;
    }

    public void SetBatchCode(string batchCode)
    {
        Check.NotNullOrWhiteSpace(batchCode, nameof(batchCode));
        BatchCode = batchCode.Trim();
    }

    public void SetPurchaseUnit(string purchaseUnit)
    {
        Check.NotNullOrWhiteSpace(purchaseUnit, nameof(purchaseUnit));
        PurchaseUnit = purchaseUnit.Trim();
    }

    /// <summary>
    /// Khấu trừ số lượng từ lô hàng. Trả về lượng thực tế đã trừ.
    /// Không bao giờ làm RemainingQuantity âm (nếu trừ vượt quá thì trừ về 0).
    /// </summary>
    public decimal DeductQuantity(decimal amount)
    {
        if (amount <= 0)
        {
            return 0;
        }

        if (amount >= RemainingQuantity)
        {
            var actualDeducted = RemainingQuantity;
            RemainingQuantity = 0;
            return actualDeducted;
        }
        else
        {
            RemainingQuantity -= amount;
            return amount;
        }
    }

    public void IncreaseQuantity(decimal amount)
    {
        if (amount > 0)
        {
            RemainingQuantity += amount;
        }
    }

    public void Discard()
    {
        RemainingQuantity = 0;
        IsActive = false;
    }

    public void Deactivate(string reason)
    {
        Check.NotNullOrWhiteSpace(reason, nameof(reason));
        Check.Length(reason, nameof(reason), 500);
        IsActive = false;
        DeactivationReason = reason.Trim();
    }

    public void Reactivate()
    {
        IsActive = true;
        DeactivationReason = null;
    }
}

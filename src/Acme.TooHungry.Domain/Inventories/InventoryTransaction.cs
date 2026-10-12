using System;
using Acme.TooHungry.Ingredients;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Inventories;

public class InventoryTransaction : CreationAuditedEntity<Guid>
{
    public Guid IngredientId { get; set; }

    public Guid? BatchId { get; set; }

    public InventoryTransactionType TransactionType { get; set; }

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string? ReferenceId { get; set; }

    // Navigation properties
    public Ingredient? Ingredient { get; set; }

    public InventoryBatch? Batch { get; set; }

    public InventoryTransaction()
    {
    }

    public InventoryTransaction(
        Guid id,
        Guid ingredientId,
        Guid? batchId,
        InventoryTransactionType transactionType,
        decimal quantity,
        string reason,
        string? referenceId = null,
        decimal unitCost = 0)
        : base(id)
    {
        IngredientId = ingredientId;
        BatchId = batchId;
        TransactionType = transactionType;
        Quantity = quantity;
        SetReason(reason);
        ReferenceId = referenceId;
        UnitCost = unitCost >= 0 ? unitCost : 0;
    }

    public void SetReason(string reason)
    {
        Check.NotNullOrWhiteSpace(reason, nameof(reason));
        Reason = reason.Trim();
    }
}

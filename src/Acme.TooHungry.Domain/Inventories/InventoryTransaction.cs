using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Inventories;

public class InventoryTransaction : FullAuditedAggregateRoot<Guid>
{
    public Guid InventoryId { get; set; }

    public Inventory? Inventory { get; set; }

    public decimal Quantity { get; set; }

    public InventoryTransactionType TransactionType { get; set; }

    public DateTime TransactionDate { get; set; }

    public string? Note { get; set; }
}

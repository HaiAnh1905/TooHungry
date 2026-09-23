using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Inventories;

public class InventoryBatch : FullAuditedAggregateRoot<Guid>
{
    public Guid InventoryId { get; set; }

    public Inventory? Inventory { get; set; }

    public string BatchNumber { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public DateTime ReceivedDate { get; set; }

    public DateTime? ExpiryDate { get; set; }
}

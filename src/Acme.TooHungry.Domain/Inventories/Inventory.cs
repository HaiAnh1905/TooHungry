using System;
using System.Collections.Generic;
using Acme.TooHungry.Ingredients;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Inventories;

public class Inventory : FullAuditedAggregateRoot<Guid>
{
    public Guid IngredientId { get; set; }

    public Ingredient? Ingredient { get; set; }

    public decimal CurrentStock { get; set; }

    public decimal MinimumStock { get; set; }

    public ICollection<InventoryBatch> Batches { get; set; } = new List<InventoryBatch>();

    public ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
}

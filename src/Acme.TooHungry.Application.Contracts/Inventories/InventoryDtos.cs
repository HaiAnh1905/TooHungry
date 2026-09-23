using System;
using System.Collections.Generic;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Inventories;

public class InventoryBatchDto : AuditedEntityDto<Guid>
{
    public Guid InventoryId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime ReceivedDate { get; set; }
}

public class CreateUpdateInventoryBatchDto
{
    public Guid InventoryId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime ReceivedDate { get; set; } = DateTime.Now;
}

public class InventoryTransactionDto : AuditedEntityDto<Guid>
{
    public Guid InventoryId { get; set; }
    public decimal Quantity { get; set; }
    public InventoryTransactionType TransactionType { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? Note { get; set; }
}

public class CreateInventoryTransactionDto
{
    public Guid InventoryId { get; set; }
    public decimal Quantity { get; set; }
    public InventoryTransactionType TransactionType { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.Now;
    public string? Note { get; set; }
}

public class InventoryDto : AuditedEntityDto<Guid>
{
    public Guid IngredientId { get; set; }
    public string? IngredientName { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal MinimumStock { get; set; }
}

public class CreateUpdateInventoryDto
{
    public Guid IngredientId { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal MinimumStock { get; set; }
}

using System;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Tables;

public class TableDto : FullAuditedEntityDto<Guid>
{
    public string Name { get; set; } = string.Empty;

    public int Capacity { get; set; }

    public TableStatus Status { get; set; }

    public Guid? DiningAreaId { get; set; }

    public string? DiningAreaName { get; set; }

    public string? Location { get; set; }

    // Reservation info
    public string? ReservedCustomerName { get; set; }
    public string? ReservedCustomerPhone { get; set; }
    public DateTime? ReservedTime { get; set; }
    public int? ReservedGuestCount { get; set; }
    public string? ReservedNote { get; set; }

    // Active order info
    public Guid? ActiveOrderId { get; set; }
    public bool HasActiveOrder { get; set; }

    /// <summary>
    /// Thời điểm bàn bắt đầu chuyển sang Occupied (có khách)
    /// </summary>
    public DateTime? OccupiedTime { get; set; }
}

public class CreateUpdateTableDto
{
    public string Name { get; set; } = string.Empty;

    public int Capacity { get; set; } = 4;

    public TableStatus Status { get; set; } = TableStatus.Available;

    public Guid? DiningAreaId { get; set; }

    public string? Location { get; set; }

    // Reservation info
    public string? ReservedCustomerName { get; set; }
    public string? ReservedCustomerPhone { get; set; }
    public DateTime? ReservedTime { get; set; }
    public int? ReservedGuestCount { get; set; }
    public string? ReservedNote { get; set; }

    public DateTime? OccupiedTime { get; set; }
}

public class GetTablesInput : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }
    public TableStatus? Status { get; set; }
    public Guid? DiningAreaId { get; set; }
}

public class ChangeTableStatusDto
{
    public TableStatus Status { get; set; }
}

public class TransferTableInputDto
{
    public Guid SourceTableId { get; set; }
    public Guid TargetTableId { get; set; }
    public string? Note { get; set; }
}

public class MergeTablesInputDto
{
    public Guid PrimaryTableId { get; set; }
    public Guid SecondaryTableId { get; set; }
    public string? Note { get; set; }
}


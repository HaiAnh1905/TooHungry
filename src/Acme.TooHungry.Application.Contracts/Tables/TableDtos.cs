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
}

public class GetTablesInput : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }
    public TableStatus? Status { get; set; }
    public Guid? DiningAreaId { get; set; }
}

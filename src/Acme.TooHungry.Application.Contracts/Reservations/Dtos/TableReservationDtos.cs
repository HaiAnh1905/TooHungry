using System;
using System.ComponentModel.DataAnnotations;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Reservations;

public class CreateTableReservationDto
{
    [Required]
    public Guid TableId { get; set; }

    [Required]
    [StringLength(128)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [StringLength(20, MinimumLength = 8)]
    public string CustomerPhone { get; set; } = string.Empty;

    [Required]
    public DateTime ReservationTime { get; set; }

    [Required]
    [Range(1, 100)]
    public int GuestCount { get; set; }

    [StringLength(512)]
    public string? Note { get; set; }
}

public class UpdateTableReservationDto
{
    [Required]
    [StringLength(128)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [StringLength(20, MinimumLength = 8)]
    public string CustomerPhone { get; set; } = string.Empty;

    [Required]
    public DateTime ReservationTime { get; set; }

    [Required]
    [Range(1, 100)]
    public int GuestCount { get; set; }

    [StringLength(512)]
    public string? Note { get; set; }
}

public class TableReservationDto : FullAuditedEntityDto<Guid>
{
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public DateTime ReservationTime { get; set; }
    public int GuestCount { get; set; }
    public string? Note { get; set; }
    public ReservationStatus Status { get; set; }
}

public class GetTableReservationsInput : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }
    public Guid? TableId { get; set; }
    public ReservationStatus? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

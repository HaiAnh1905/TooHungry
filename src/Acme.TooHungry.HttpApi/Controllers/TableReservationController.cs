using System;
using System.Threading.Tasks;
using Acme.TooHungry.Reservations;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app/table-reservations")]
public class TableReservationController : TooHungryController, ITableReservationAppService
{
    private readonly ITableReservationAppService _reservationAppService;

    public TableReservationController(ITableReservationAppService reservationAppService)
    {
        _reservationAppService = reservationAppService;
    }

    [HttpPost]
    public virtual Task<TableReservationDto> CreateAsync(CreateTableReservationDto input)
    {
        return _reservationAppService.CreateAsync(input);
    }

    [HttpGet("{id}")]
    public virtual Task<TableReservationDto> GetAsync(Guid id)
    {
        return _reservationAppService.GetAsync(id);
    }

    [HttpGet("by-table/{tableId}")]
    public virtual Task<TableReservationDto?> GetActiveByTableIdAsync(Guid tableId)
    {
        return _reservationAppService.GetActiveByTableIdAsync(tableId);
    }

    [HttpPut("{id}")]
    public virtual Task<TableReservationDto> UpdateAsync(Guid id, UpdateTableReservationDto input)
    {
        return _reservationAppService.UpdateAsync(id, input);
    }

    [HttpPost("{id}/check-in")]
    public virtual Task<TableReservationDto> CheckInAsync(Guid id)
    {
        return _reservationAppService.CheckInAsync(id);
    }

    [HttpPost("{id}/cancel")]
    public virtual Task<TableReservationDto> CancelAsync(Guid id)
    {
        return _reservationAppService.CancelAsync(id);
    }

    [HttpGet]
    public virtual Task<PagedResultDto<TableReservationDto>> GetListAsync(GetTableReservationsInput input)
    {
        return _reservationAppService.GetListAsync(input);
    }
}

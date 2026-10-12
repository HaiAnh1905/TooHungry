using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Reservations;

public interface ITableReservationAppService : IApplicationService
{
    Task<TableReservationDto> CreateAsync(CreateTableReservationDto input);

    Task<TableReservationDto> GetAsync(Guid id);

    Task<TableReservationDto?> GetActiveByTableIdAsync(Guid tableId);

    Task<TableReservationDto> UpdateAsync(Guid id, UpdateTableReservationDto input);

    Task<TableReservationDto> CheckInAsync(Guid id);

    Task<TableReservationDto> CancelAsync(Guid id);

    Task<PagedResultDto<TableReservationDto>> GetListAsync(GetTableReservationsInput input);
}

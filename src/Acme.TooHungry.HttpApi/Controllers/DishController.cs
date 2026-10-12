using System;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app/dish")]
public class DishController : TooHungryController, IDishAppService
{
    private readonly IDishAppService _dishAppService;

    public DishController(IDishAppService dishAppService)
    {
        _dishAppService = dishAppService;
    }

    [HttpGet("{id:guid}")]
    public virtual Task<DishDto> GetAsync(Guid id)
    {
        return _dishAppService.GetAsync(id);
    }

    [HttpGet]
    public virtual Task<PagedResultDto<DishDto>> GetListAsync([FromQuery] GetDishesInput input)
    {
        return _dishAppService.GetListAsync(input);
    }

    [HttpPost]
    public virtual Task<DishDto> CreateAsync(CreateUpdateDishDto input)
    {
        return _dishAppService.CreateAsync(input);
    }

    [HttpPut("{id:guid}")]
    public virtual Task<DishDto> UpdateAsync(Guid id, CreateUpdateDishDto input)
    {
        return _dishAppService.UpdateAsync(id, input);
    }

    [HttpPost("{id:guid}/toggle-active")]
    public virtual Task<DishDto> ToggleActiveAsync(Guid id)
    {
        return _dishAppService.ToggleActiveAsync(id);
    }

    [HttpPost("bulk-toggle-active")]
    public virtual Task<BulkActionResultDto> BulkToggleActiveAsync(BulkToggleActiveDishDto input)
    {
        return _dishAppService.BulkToggleActiveAsync(input);
    }

    [HttpDelete("{id:guid}")]
    public virtual Task DeleteAsync(Guid id)
    {
        return _dishAppService.DeleteAsync(id);
    }

    [HttpDelete("{id:guid}/with-reason")]
    public virtual Task DeleteWithReasonAsync(Guid id, [FromBody] DeleteDishDto input)
    {
        return _dishAppService.DeleteWithReasonAsync(id, input);
    }

    [HttpGet("menu-for-pos")]
    public virtual Task<ListResultDto<DishDto>> GetMenuForPosAsync()
    {
        return _dishAppService.GetMenuForPosAsync();
    }
}

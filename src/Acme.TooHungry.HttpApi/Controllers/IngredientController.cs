using System;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app/ingredient")]
[Authorize(TooHungryPermissions.Ingredients.Default)]
public class IngredientController : TooHungryController
{
    private readonly IIngredientAppService _ingredientAppService;

    public IngredientController(IIngredientAppService ingredientAppService)
    {
        _ingredientAppService = ingredientAppService;
    }

    [HttpGet("{id:guid}")]
    public virtual Task<IngredientDto> GetAsync(Guid id)
    {
        return _ingredientAppService.GetAsync(id);
    }

    [HttpGet]
    public virtual Task<PagedResultDto<IngredientDto>> GetListAsync([FromQuery] GetIngredientsInput input)
    {
        return _ingredientAppService.GetListAsync(input);
    }

    [HttpPost]
    [Authorize(TooHungryPermissions.Ingredients.Create)]
    public virtual Task<IngredientDto> CreateAsync([FromBody] CreateIngredientDto input)
    {
        return _ingredientAppService.CreateAsync(input);
    }

    [HttpPut("{id:guid}")]
    [Authorize(TooHungryPermissions.Ingredients.Edit)]
    public virtual Task<IngredientDto> UpdateAsync(Guid id, [FromBody] UpdateIngredientDto input)
    {
        return _ingredientAppService.UpdateAsync(id, input);
    }

    [HttpPost("{id:guid}/smart-restore")]
    [Authorize(TooHungryPermissions.Ingredients.Edit)]
    public virtual Task<IngredientDto> SmartRestoreAsync(Guid id, [FromBody] SmartRestoreDto input)
    {
        return _ingredientAppService.SmartRestoreAsync(id, input);
    }

    public class DeactivateInput
    {
        public string Reason { get; set; } = string.Empty;
    }

    [HttpPost("{id:guid}/deactivate")]
    [Authorize(TooHungryPermissions.Inventories.Edit)]
    public virtual Task<IngredientDto> DeactivateAsync(Guid id, [FromBody] DeactivateInput input)
    {
        return _ingredientAppService.DeactivateAsync(id, input?.Reason ?? string.Empty);
    }

    [HttpPost("{id:guid}/reactivate")]
    [Authorize(TooHungryPermissions.Inventories.Edit)]
    public virtual Task<IngredientDto> ReactivateAsync(Guid id)
    {
        return _ingredientAppService.ReactivateAsync(id);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(TooHungryPermissions.Ingredients.Delete)]
    public virtual Task DeleteAsync(Guid id)
    {
        return _ingredientAppService.DeleteAsync(id);
    }
}

using System;
using System.Threading.Tasks;
using Acme.TooHungry.Permissions;
using Acme.TooHungry.Recipes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app/recipe")]
public class RecipeController : TooHungryController
{
    private readonly IRecipeAppService _recipeAppService;

    public RecipeController(IRecipeAppService recipeAppService)
    {
        _recipeAppService = recipeAppService;
    }

    [HttpGet("{id:guid}")]
    [Authorize(TooHungryPermissions.Recipes.Default)]
    public virtual Task<RecipeDto> GetAsync(Guid id)
    {
        return _recipeAppService.GetAsync(id);
    }

    [HttpGet]
    [Authorize(TooHungryPermissions.Recipes.Default)]
    public virtual Task<PagedResultDto<RecipeDto>> GetListAsync([FromQuery] RecipeFilterDto input)
    {
        return _recipeAppService.GetListAsync(input);
    }

    [HttpGet("by-dish/{dishId:guid}")]
    [Authorize(TooHungryPermissions.Recipes.Default)]
    public virtual Task<RecipeDto?> GetActiveByDishIdAsync(Guid dishId)
    {
        return _recipeAppService.GetActiveByDishIdAsync(dishId);
    }

    [HttpGet("history/{dishId:guid}")]
    [Authorize(TooHungryPermissions.Recipes.Default)]
    public virtual Task<System.Collections.Generic.List<RecipeDto>> GetHistoryByDishIdAsync(Guid dishId)
    {
        return _recipeAppService.GetHistoryByDishIdAsync(dishId);
    }

    [HttpPost]
    [Authorize(TooHungryPermissions.Recipes.Create)]
    public virtual Task<RecipeDto> CreateAsync([FromBody] CreateRecipeDto input)
    {
        return _recipeAppService.CreateAsync(input);
    }

    [HttpPost("create-or-update")]
    [Authorize(TooHungryPermissions.Recipes.Edit)]
    public virtual Task<RecipeDto> CreateOrUpdateAsync([FromBody] CreateOrUpdateRecipeDto input)
    {
        return _recipeAppService.CreateOrUpdateAsync(input);
    }

    [HttpPut("{id:guid}")]
    [Authorize(TooHungryPermissions.Recipes.Edit)]
    public virtual Task<RecipeDto> UpdateAsync(Guid id, [FromBody] UpdateRecipeDto input)
    {
        return _recipeAppService.UpdateAsync(id, input);
    }

    public class DeactivateInput
    {
        public string? Reason { get; set; }
    }

    [HttpPost("{id:guid}/deactivate")]
    [Authorize(TooHungryPermissions.Recipes.Edit)]
    public virtual Task<RecipeDto> DeactivateAsync(Guid id, [FromQuery] string? reason = null, [FromBody] DeactivateInput? input = null)
    {
        var finalReason = !string.IsNullOrWhiteSpace(reason) ? reason : (input?.Reason ?? string.Empty);
        return _recipeAppService.DeactivateAsync(id, finalReason);
    }

    [HttpPost("{id:guid}/reactivate")]
    [Authorize(TooHungryPermissions.Recipes.Edit)]
    public virtual Task<RecipeDto> ReactivateAsync(Guid id)
    {
        return _recipeAppService.ReactivateAsync(id);
    }
}

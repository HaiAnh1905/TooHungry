using System;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Acme.TooHungry.Ingredients;

public class Ingredient : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string BaseUnit { get; set; } = string.Empty;

    public decimal MinStock { get; set; }

    public decimal EstimatedPrice { get; set; }

    public StorageType StorageType { get; set; } = StorageType.SHORT_TERM;

    public ConsumptionMethod ConsumptionMethod { get; set; } = ConsumptionMethod.RECIPE;

    public bool IsActive { get; set; } = true;

    public string? DeactivationReason { get; set; }

    public Ingredient()
    {
    }

    public Ingredient(
        Guid id,
        string name,
        string baseUnit,
        decimal minStock,
        StorageType storageType,
        ConsumptionMethod consumptionMethod = ConsumptionMethod.RECIPE,
        decimal estimatedPrice = 0)
        : base(id)
    {
        SetName(name);
        SetBaseUnit(baseUnit);
        MinStock = minStock >= 0 ? minStock : throw new BusinessException("Ingredient:InvalidMinStock");
        SetEstimatedPrice(estimatedPrice);
        StorageType = storageType;
        ConsumptionMethod = consumptionMethod;
        IsActive = true;
    }

    public void SetName(string name)
    {
        Check.NotNullOrWhiteSpace(name, nameof(name));
        Name = name.Trim();
    }

    public void SetBaseUnit(string baseUnit)
    {
        Check.NotNullOrWhiteSpace(baseUnit, nameof(baseUnit));
        BaseUnit = baseUnit.Trim();
    }

    public void SetEstimatedPrice(decimal price)
    {
        if (price < 0)
        {
            throw new BusinessException("Ingredient:InvalidEstimatedPrice");
        }
        EstimatedPrice = price;
    }

    public void Update(
        string name,
        string baseUnit,
        decimal minStock,
        decimal estimatedPrice,
        StorageType storageType,
        ConsumptionMethod consumptionMethod)
    {
        SetName(name);
        SetBaseUnit(baseUnit);
        MinStock = minStock >= 0 ? minStock : throw new BusinessException("Ingredient:InvalidMinStock");
        SetEstimatedPrice(estimatedPrice);
        StorageType = storageType;
        ConsumptionMethod = consumptionMethod;
    }

    public void Deactivate(string reason)
    {
        Check.NotNullOrWhiteSpace(reason, nameof(reason));
        IsActive = false;
        DeactivationReason = reason.Trim();
    }

    public void Reactivate()
    {
        IsActive = true;
        DeactivationReason = null;
    }

    public void Restore(decimal newMinStock)
    {
        IsActive = true;
        DeactivationReason = null;
        if (newMinStock >= 0)
        {
            MinStock = newMinStock;
        }
    }
}

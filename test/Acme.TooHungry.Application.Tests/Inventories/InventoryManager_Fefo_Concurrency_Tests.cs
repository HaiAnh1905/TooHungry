using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Ingredients;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Modularity;
using Xunit;

namespace Acme.TooHungry.Inventories;

public abstract class InventoryManager_Fefo_Concurrency_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;

    protected InventoryManager_Fefo_Concurrency_Tests()
    {
        _ingredientRepository = GetRequiredService<IRepository<Ingredient, Guid>>();
        _batchRepository = GetRequiredService<IRepository<InventoryBatch, Guid>>();
        _transactionRepository = GetRequiredService<IRepository<InventoryTransaction, Guid>>();
    }

    [Fact]
    public async Task DeductFefoAsync_Concurrent_Deductions_Should_Never_Result_In_Negative_Inventory()
    {
        // 1. Khởi tạo nguyên liệu và 1 lô kho duy nhất có đúng 10.0 đơn vị
        var ingredient = await _ingredientRepository.InsertAsync(new Ingredient(
            Guid.NewGuid(),
            $"Thịt Bò Concurrency {Guid.NewGuid():N}"[..18],
            "kg",
            5.0m,
            StorageType.SHORT_TERM,
            ConsumptionMethod.RECIPE,
            200000m
        ), autoSave: true);

        var batch = await _batchRepository.InsertAsync(new InventoryBatch(
            Guid.NewGuid(),
            ingredient.Id,
            $"BATCH-CONC-{Guid.NewGuid():N}"[..18],
            10.0m,
            10.0m,
            "kg",
            1.0m,
            DateTime.UtcNow,
            DateTime.UtcNow.AddDays(15),
            null,
            unitCost: 250000m
        ), autoSave: true);

        // 2. Chạy 4 tác vụ cạnh tranh đồng thời, mỗi tác vụ cố gắng khấu trừ 3.0 đơn vị (Tổng = 12.0 > 10.0)
        var deductionResults = new ConcurrentBag<DeductionResult>();
        var errors = new ConcurrentBag<Exception>();

        await RunConcurrentScopesAsync(4, async (sp, workerIndex) =>
        {
            var uowManager = sp.GetRequiredService<Volo.Abp.Uow.IUnitOfWorkManager>();
            var manager = sp.GetRequiredService<InventoryManager>();
            try
            {
                using var uow = uowManager.Begin(new Volo.Abp.Uow.AbpUnitOfWorkOptions { IsTransactional = true }, requiresNew: true);
                var result = await manager.DeductFefoAsync(
                    ingredient.Id,
                    3.0m,
                    $"CONC-TX-{workerIndex}-{Guid.NewGuid():N}"[..20]
                );
                await uow.CompleteAsync();
                deductionResults.Add(result);
            }
            catch (Exception ex)
            {
                errors.Add(ex);
            }
        });

        // 3. Khẳng định số dư tồn kho: Tuyệt đối KHÔNG BAO GIỜ bị âm
        await WithUnitOfWorkAsync(async () =>
        {
            var reloadedBatch = await _batchRepository.GetAsync(batch.Id);
            reloadedBatch.RemainingQuantity.ShouldBeGreaterThanOrEqualTo(0.0m);
            reloadedBatch.RemainingQuantity.ShouldBeLessThanOrEqualTo(10.0m);

            // 4. Khẳng định tổng số lượng đã khấu trừ được ghi nhận vào InventoryTransaction khớp với thực tế
            var txQuery = await _transactionRepository.GetQueryableAsync();
            var transactions = txQuery
                .Where(x => x.BatchId == batch.Id && x.TransactionType == InventoryTransactionType.OUT)
                .ToList();

            var totalDeductedInTx = transactions.Sum(x => x.Quantity);
            var expectedDeducted = 10.0m - reloadedBatch.RemainingQuantity;

            totalDeductedInTx.ShouldBe(expectedDeducted);

            // 5. Nếu có kết quả thành công, tổng TotalDeducted của các kết quả phải bằng expectedDeducted
            var totalReportedDeductions = deductionResults.Sum(r => r.TotalDeducted);
            totalReportedDeductions.ShouldBe(expectedDeducted);
        });
    }
}

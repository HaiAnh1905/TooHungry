using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.Permissions;

namespace Acme.TooHungry.Inventories;

[Authorize]
public class InventoryAppService : ApplicationService, IInventoryAppService
{
    private readonly IRepository<Inventory, Guid> _inventoryRepository;

    public InventoryAppService(IRepository<Inventory, Guid> repository)
    {
        _inventoryRepository = repository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết tồn kho theo Id (kèm thông tin nguyên liệu)
    /// </summary>
    /// <param name="id">Id bản ghi tồn kho</param>
    /// <returns>Thông tin tồn kho DTO</returns>
    public virtual async Task<InventoryDto> GetAsync(Guid id)
    {
        var queryable = await _inventoryRepository.WithDetailsAsync(x => x.Ingredient!);
        var entity = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (entity == null)
        {
            throw new EntityNotFoundException(typeof(Inventory), id);
        }

        return ObjectMapper.Map<Inventory, InventoryDto>(entity);
    }

    /// <summary>
    /// Lấy danh sách tồn kho có phân trang và sắp xếp
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách tồn kho phân trang</returns>
    public virtual async Task<PagedResultDto<InventoryDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _inventoryRepository.WithDetailsAsync(x => x.Ingredient!);
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(Inventory.Id) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<Inventory>, List<InventoryDto>>(items);
        return new PagedResultDto<InventoryDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một bản ghi tồn kho
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới tồn kho</param>
    /// <returns>Thông tin tồn kho vừa tạo</returns>
    public virtual async Task<InventoryDto> CreateAsync(CreateUpdateInventoryDto input)
    {
        var entity = ObjectMapper.Map<CreateUpdateInventoryDto, Inventory>(input);
        var inserted = await _inventoryRepository.InsertAsync(entity, autoSave: true);
        return await GetAsync(inserted.Id);
    }

    /// <summary>
    /// Cập nhật thông tin số lượng tồn kho
    /// </summary>
    /// <param name="id">Id bản ghi tồn kho cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin tồn kho sau khi cập nhật</returns>
    public virtual async Task<InventoryDto> UpdateAsync(Guid id, CreateUpdateInventoryDto input)
    {
        var entity = await _inventoryRepository.GetAsync(id);
        ObjectMapper.Map(input, entity);
        await _inventoryRepository.UpdateAsync(entity, autoSave: true);
        return await GetAsync(id);
    }

    /// <summary>
    /// Xóa một bản ghi tồn kho khỏi hệ thống
    /// </summary>
    /// <param name="id">Id bản ghi tồn kho cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _inventoryRepository.DeleteAsync(id);
    }
}

public class InventoryBatchAppService : ApplicationService, IInventoryBatchAppService
{
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;

    public InventoryBatchAppService(IRepository<InventoryBatch, Guid> repository)
    {
        _batchRepository = repository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một lô hàng nguyên liệu theo Id
    /// </summary>
    /// <param name="id">Id lô hàng</param>
    /// <returns>Thông tin lô hàng DTO</returns>
    public virtual async Task<InventoryBatchDto> GetAsync(Guid id)
    {
        var entity = await _batchRepository.GetAsync(id);
        return ObjectMapper.Map<InventoryBatch, InventoryBatchDto>(entity);
    }

    /// <summary>
    /// Lấy danh sách lô hàng nguyên liệu có phân trang, sắp xếp theo ngày nhập mới nhất
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách lô hàng phân trang</returns>
    public virtual async Task<PagedResultDto<InventoryBatchDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _batchRepository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(InventoryBatch.ReceivedDate) + " desc" : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<InventoryBatch>, List<InventoryBatchDto>>(items);
        return new PagedResultDto<InventoryBatchDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một lô hàng nguyên liệu nhập kho
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới lô hàng</param>
    /// <returns>Thông tin lô hàng vừa tạo</returns>
    public virtual async Task<InventoryBatchDto> CreateAsync(CreateUpdateInventoryBatchDto input)
    {
        var entity = ObjectMapper.Map<CreateUpdateInventoryBatchDto, InventoryBatch>(input);
        var inserted = await _batchRepository.InsertAsync(entity, autoSave: true);
        return ObjectMapper.Map<InventoryBatch, InventoryBatchDto>(inserted);
    }

    /// <summary>
    /// Cập nhật thông tin một lô hàng nguyên liệu
    /// </summary>
    /// <param name="id">Id lô hàng cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin lô hàng sau khi cập nhật</returns>
    public virtual async Task<InventoryBatchDto> UpdateAsync(Guid id, CreateUpdateInventoryBatchDto input)
    {
        var entity = await _batchRepository.GetAsync(id);
        ObjectMapper.Map(input, entity);
        await _batchRepository.UpdateAsync(entity, autoSave: true);
        return ObjectMapper.Map<InventoryBatch, InventoryBatchDto>(entity);
    }

    /// <summary>
    /// Xóa một lô hàng nguyên liệu khỏi hệ thống
    /// </summary>
    /// <param name="id">Id lô hàng cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _batchRepository.DeleteAsync(id);
    }
}

public class InventoryTransactionAppService : ApplicationService, IInventoryTransactionAppService
{
    private readonly IRepository<InventoryTransaction, Guid> _transactionRepository;

    public InventoryTransactionAppService(IRepository<InventoryTransaction, Guid> repository)
    {
        _transactionRepository = repository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một giao dịch xuất / nhập kho theo Id
    /// </summary>
    /// <param name="id">Id giao dịch kho</param>
    /// <returns>Thông tin giao dịch kho DTO</returns>
    public virtual async Task<InventoryTransactionDto> GetAsync(Guid id)
    {
        var entity = await _transactionRepository.GetAsync(id);
        return ObjectMapper.Map<InventoryTransaction, InventoryTransactionDto>(entity);
    }

    /// <summary>
    /// Lấy danh sách các giao dịch kho có phân trang, sắp xếp theo thời gian giao dịch
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách giao dịch kho phân trang</returns>
    public virtual async Task<PagedResultDto<InventoryTransactionDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _transactionRepository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(InventoryTransaction.TransactionDate) + " desc" : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<InventoryTransaction>, List<InventoryTransactionDto>>(items);
        return new PagedResultDto<InventoryTransactionDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một giao dịch kho (nhập kho, xuất kho chế biến, hủy hàng hỏng)
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới giao dịch</param>
    /// <returns>Thông tin giao dịch kho vừa tạo</returns>
    public virtual async Task<InventoryTransactionDto> CreateAsync(CreateInventoryTransactionDto input)
    {
        var entity = ObjectMapper.Map<CreateInventoryTransactionDto, InventoryTransaction>(input);
        var inserted = await _transactionRepository.InsertAsync(entity, autoSave: true);
        return ObjectMapper.Map<InventoryTransaction, InventoryTransactionDto>(inserted);
    }

    /// <summary>
    /// Cập nhật thông tin giao dịch kho
    /// </summary>
    /// <param name="id">Id giao dịch cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin giao dịch kho sau khi cập nhật</returns>
    public virtual async Task<InventoryTransactionDto> UpdateAsync(Guid id, CreateInventoryTransactionDto input)
    {
        var entity = await _transactionRepository.GetAsync(id);
        ObjectMapper.Map(input, entity);
        await _transactionRepository.UpdateAsync(entity, autoSave: true);
        return ObjectMapper.Map<InventoryTransaction, InventoryTransactionDto>(entity);
    }

    /// <summary>
    /// Xóa một giao dịch kho khỏi hệ thống
    /// </summary>
    /// <param name="id">Id giao dịch cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _transactionRepository.DeleteAsync(id);
    }
}

using System;
using System.Threading.Tasks;
using Acme.TooHungry.Tables;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Units;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.PermissionManagement;
using Volo.Abp.Identity;
using Volo.Abp.Guids;

namespace Acme.TooHungry;

public class TooHungryDataSeederContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IPermissionDataSeeder _permissionDataSeeder;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<DiningArea, Guid> _diningAreaRepository;
    private readonly IRepository<Acme.TooHungry.Dishes.Dish, Guid> _dishRepository;
    private readonly IRepository<Acme.TooHungry.Dishes.DishCategory, Guid> _dishCategoryRepository;
    private readonly IdentityRoleManager _roleManager;
    private readonly IGuidGenerator _guidGenerator;

    private readonly IPermissionDefinitionManager _permissionDefinitionManager;
    private readonly IPermissionManager _permissionManager;

    public TooHungryDataSeederContributor(
        IPermissionDataSeeder permissionDataSeeder,
        IRepository<RestaurantTable, Guid> tableRepository,
        IRepository<DiningArea, Guid> diningAreaRepository,
        IRepository<Acme.TooHungry.Dishes.Dish, Guid> dishRepository,
        IRepository<Acme.TooHungry.Dishes.DishCategory, Guid> dishCategoryRepository,
        IdentityRoleManager roleManager,
        IGuidGenerator guidGenerator,
        IPermissionDefinitionManager permissionDefinitionManager,
        IPermissionManager permissionManager)
    {
        _permissionDataSeeder = permissionDataSeeder;
        _tableRepository = tableRepository;
        _diningAreaRepository = diningAreaRepository;
        _dishRepository = dishRepository;
        _dishCategoryRepository = dishCategoryRepository;
        _roleManager = roleManager;
        _guidGenerator = guidGenerator;
        _permissionDefinitionManager = permissionDefinitionManager;
        _permissionManager = permissionManager;
    }

    public async Task SeedAsync(DataSeedContext context)
    {
        var roles = new[] { "Manager", "InventoryStaff", "Waiter", "Cashier" };
        foreach (var roleName in roles)
        {
            if (await _roleManager.FindByNameAsync(roleName) == null)
            {
                var role = new IdentityRole(
                    _guidGenerator.Create(),
                    roleName,
                    context.TenantId
                )
                {
                    IsStatic = true,
                    IsPublic = true
                };
                await _roleManager.CreateAsync(role);
            }
        }

        // Hợp nhất: Xóa Administrator rác nếu có, rồi đổi tên admin thành Administrator
        var existingAdministrator = await _roleManager.FindByNameAsync("Administrator");
        var systemAdmin = await _roleManager.FindByNameAsync("admin");

        if (existingAdministrator != null && systemAdmin != null && existingAdministrator.Id != systemAdmin.Id)
        {
            // Gỡ cờ IsStatic để framework cho phép xóa/đổi tên
            existingAdministrator.IsStatic = false;
            await _roleManager.UpdateAsync(existingAdministrator);
            
            // Đổi tên tạm để tránh lỗi Unique Name constraint khi đổi tên admin thành Administrator ở bước sau
            await _roleManager.SetRoleNameAsync(existingAdministrator, "Admin_To_Delete_" + Guid.NewGuid().ToString().Substring(0,5));
            await _roleManager.UpdateAsync(existingAdministrator);
            
            await _roleManager.DeleteAsync(existingAdministrator);
        }

        if (systemAdmin != null)
        {
            systemAdmin.IsStatic = false;
            await _roleManager.UpdateAsync(systemAdmin);

            await _roleManager.SetRoleNameAsync(systemAdmin, "Administrator");
            systemAdmin.IsStatic = true;
            await _roleManager.UpdateAsync(systemAdmin);
        }

        // Grant ALL permissions to Administrator to recover lost access after rename
        var allPermissions = await _permissionDefinitionManager.GetPermissionsAsync();
        foreach (var permission in allPermissions)
        {
            try
            {
                await _permissionManager.SetForRoleAsync("Administrator", permission.Name, true);
            }
            catch (System.Exception)
            {
                // Skip permissions not compatible with the Role provider (like Client or User only)
            }
        }

        await _permissionDataSeeder.SeedAsync(
            RolePermissionValueProvider.ProviderName,
            "Administrator",
            new[]
            {
                "TooHungry.Dishes",
                "TooHungry.Dishes.Create",
                "TooHungry.Dishes.Edit",
                "TooHungry.Dishes.Delete",

                "TooHungry.DishCategories",
                "TooHungry.DishCategories.Create",
                "TooHungry.DishCategories.Edit",
                "TooHungry.DishCategories.Delete",

                "TooHungry.Orders",
                "TooHungry.Orders.Create",
                "TooHungry.Orders.Edit",
                "TooHungry.Orders.Delete",
                "TooHungry.Orders.Cancel",

                "TooHungry.Units",
                "TooHungry.Units.Create",
                "TooHungry.Units.Edit",
                "TooHungry.Units.Delete",

                "TooHungry.Tables",
                "TooHungry.Tables.Create",
                "TooHungry.Tables.Edit",
                "TooHungry.Tables.Delete",
                "TooHungry.Tables.UpdateStatus",
                "TooHungry.Tables.Manage",

                "TooHungry.DiningAreas",
                "TooHungry.DiningAreas.Create",
                "TooHungry.DiningAreas.Edit",
                "TooHungry.DiningAreas.Delete",
                "TooHungry.DiningAreas.Manage",

                "TooHungry.Reservations",
                "TooHungry.Reservations.Create",
                "TooHungry.Reservations.Update",
                "TooHungry.Reservations.Cancel",
                "TooHungry.Reservations.CheckIn",

                "TooHungry.Forecasts",
                "TooHungry.Forecasts.Create",
                "TooHungry.Forecasts.Edit",
                "TooHungry.Forecasts.Delete",
                "TooHungry.Forecasts.Approve"
            },
            context.TenantId
        );

        await _permissionDataSeeder.SeedAsync(
            RolePermissionValueProvider.ProviderName,
            "Waiter",
            new[]
            {
                "TooHungry.DiningAreas",
                "TooHungry.Tables",
                "TooHungry.Tables.Create",
                "TooHungry.Tables.Edit",
                "TooHungry.Tables.Delete",
                "TooHungry.Tables.UpdateStatus",
                "TooHungry.Orders",
                "TooHungry.Orders.Create",
                "TooHungry.Orders.Edit",
                "TooHungry.Orders.Cancel",
                "TooHungry.Orders.Delete",
                "TooHungry.Reservations",
                "TooHungry.Reservations.Create",
                "TooHungry.Reservations.Update",
                "TooHungry.Reservations.Cancel",
                "TooHungry.Reservations.CheckIn"
            },
            context.TenantId
        );

        await _permissionDataSeeder.SeedAsync(
            RolePermissionValueProvider.ProviderName,
            "Manager",
            new[]
            {
                "TooHungry.Reservations",
                "TooHungry.Reservations.Create",
                "TooHungry.Reservations.Update",
                "TooHungry.Reservations.Cancel",
                "TooHungry.Reservations.CheckIn",
                "TooHungry.Tables.Manage",

                "TooHungry.Forecasts",
                "TooHungry.Forecasts.Create",
                "TooHungry.Forecasts.Edit",
                "TooHungry.Forecasts.Delete",
                "TooHungry.Forecasts.Approve"
            },
            context.TenantId
        );

        // Seed Dining Areas
        DiningArea? floor1 = await _diningAreaRepository.FirstOrDefaultAsync(x => x.Name == "Tầng 1");
        if (floor1 == null)
        {
            floor1 = await _diningAreaRepository.InsertAsync(new DiningArea { Name = "Tầng 1", Description = "Khu vực tầng trệt chính" }, autoSave: true);
        }

        DiningArea? floor2 = await _diningAreaRepository.FirstOrDefaultAsync(x => x.Name == "Tầng 2");
        if (floor2 == null)
        {
            floor2 = await _diningAreaRepository.InsertAsync(new DiningArea { Name = "Tầng 2", Description = "Khu vực tầng 2 yên tĩnh" }, autoSave: true);
        }

        DiningArea? vip = await _diningAreaRepository.FirstOrDefaultAsync(x => x.Name == "Phòng VIP");
        if (vip == null)
        {
            vip = await _diningAreaRepository.InsertAsync(new DiningArea { Name = "Phòng VIP", Description = "Phòng tiệc riêng tư sang trọng" }, autoSave: true);
        }

        DiningArea? outdoor = await _diningAreaRepository.FirstOrDefaultAsync(x => x.Name == "Sân vườn / Ngoài trời");
        if (outdoor == null)
        {
            outdoor = await _diningAreaRepository.InsertAsync(new DiningArea { Name = "Sân vườn / Ngoài trời", Description = "Không gian thoáng mát ngoài trời" }, autoSave: true);
        }

        if (await _tableRepository.GetCountAsync() == 0)
        {
            await _tableRepository.InsertAsync(new RestaurantTable { Name = "Bàn 01", Capacity = 4, Status = TableStatus.Available, DiningAreaId = floor1.Id, Location = "Tầng 1" });
            await _tableRepository.InsertAsync(new RestaurantTable { Name = "Bàn 02", Capacity = 2, Status = TableStatus.Available, DiningAreaId = floor1.Id, Location = "Tầng 1" });
            await _tableRepository.InsertAsync(new RestaurantTable { Name = "Bàn 03", Capacity = 6, Status = TableStatus.Occupied, DiningAreaId = floor2.Id, Location = "Tầng 2", OccupiedTime = DateTime.Now.AddMinutes(-35) });
            await _tableRepository.InsertAsync(new RestaurantTable { Name = "Bàn VIP 01", Capacity = 10, Status = TableStatus.Reserved, DiningAreaId = vip.Id, Location = "Phòng VIP" });
            await _tableRepository.InsertAsync(new RestaurantTable { Name = "Bàn Sân Vườn", Capacity = 4, Status = TableStatus.Available, DiningAreaId = outdoor.Id, Location = "Ngoài trời" });
        }
        else
        {
            // Link existing tables that don't have DiningAreaId yet or missing OccupiedTime
            var tables = await _tableRepository.GetListAsync();
            foreach (var table in tables)
            {
                var isModified = false;
                if (table.Status == TableStatus.Occupied && !table.OccupiedTime.HasValue)
                {
                    table.OccupiedTime = DateTime.Now.AddMinutes(-30);
                    isModified = true;
                }

                if (table.DiningAreaId == null)
                {
                    if (table.Location == "Tầng 1" || table.Name.Contains("01") || table.Name.Contains("02"))
                    {
                        table.DiningAreaId = floor1.Id;
                    }
                    else if (table.Location == "Tầng 2" || table.Name.Contains("03"))
                    {
                        table.DiningAreaId = floor2.Id;
                    }
                    else if (table.Location == "Phòng VIP" || table.Name.Contains("VIP"))
                    {
                        table.DiningAreaId = vip.Id;
                    }
                    else
                    {
                        table.DiningAreaId = outdoor.Id;
                    }
                    isModified = true;
                }

                if (isModified)
                {
                    await _tableRepository.UpdateAsync(table);
                }
            }
        }

        // Seed / Update Descriptions for Dishes
        var dishesWithoutDesc = await _dishRepository.GetListAsync(x => string.IsNullOrEmpty(x.Description));
        if (dishesWithoutDesc.Count > 0)
        {
            var descMap = new System.Collections.Generic.Dictionary<string, string>(System.StringComparer.OrdinalIgnoreCase)
            {
                { "Bruschetta", "Bánh mì nướng giòn kiểu Ý phủ cà chua bi, húng quế tươi, tỏi và dầu ô-liu nguyên chất." },
                { "Calamari Fritti", "Mực ống tươi cắt khoanh tẩm bột chiên vàng giòn rụm, dùng kèm sốt tartar chanh tươi." },
                { "Chicken Piccata", "Ức gà áp chảo sốt bơ chanh vàng và quả nụ bạch hoa thơm nồng, thanh nhẹ." },
                { "Garlic Bread", "Bánh mì baguette nướng thơm lừng bơ tỏi tía và ngò tây tươi băm nhuyễn." },
                { "Shrimp Cocktail", "Tôm sú tươi luộc ướp lạnh giòn ngọt, chấm cùng sốt cocktail chua ngọt cay nhẹ." },
                { "Spring Rolls", "Chả giò tôm thịt chiên giòn rụm với rau củ tươi, chấm nước mắm chua ngọt chuẩn vị." },
                { "Beef Short Ribs", "Sườn bò rút xương nướng chậm sốt BBQ đậm đà, mềm tan trong miệng." },
                { "Beef Stroganoff", "Thịt bò thăn thái lát xào cùng nấm tươi béo ngậy trong sốt kem chua smetana truyền thống." },
                { "Beef Tenderloin", "Thăn nội bò cao cấp nướng mềm ngọt mọng nước, dùng kèm măng tây và sốt tiêu đen." },
                { "Grilled Beef Steak", "Bít tết bò Mỹ nướng than hồng thơm phức, thưởng thức cùng sốt bơ tỏi thảo mộc." },
                { "Roast Beef", "Thịt bò nướng lò nguyên khối thái mỏng giữ trọn vị ngọt tự nhiên, ăn kèm sốt gravy đậm đà." },
                { "Cheese Bread", "Bánh mì nướng ngập phô mai mozzarella béo ngậy kéo sợi hấp dẫn." },
                { "Ciabatta", "Bánh mì Ý truyền thống vỏ ngoài giòn rụm, ruột xốp mềm xốp xốp thơm mùi ô-liu." },
                { "Focaccia", "Bánh mì dẹt nướng thảo mộc hương thảo Rosemary và dầu ô-liu thượng hạng." },
                { "French Baguette", "Bánh mì Baguette kiểu Pháp kinh điển vỏ vàng giòn rụm, ruột dẻo thơm." },
                { "Pretzel", "Bánh quy xoắn nướng vàng ươm rắc muối hạt giòn rụm thơm mùi men tự nhiên." },
                { "Chicken Alfredo", "Mì Ý sợi dẹt xào ức gà áp chảo phủ sốt kem bơ phô mai parmesan sánh mịn." },
                { "Chicken Parmesan", "Ức gà chiên xù phủ đẫm phô mai parmesan và sốt cà chua marinara đút lò thơm ngậy." },
                { "Grilled Chicken Breast", "Ức gà ướp gia vị thảo mộc nướng than hoa mềm mọng, ít béo lành mạnh." },
                { "Roast Chicken", "Gà quay nguyên con da giòn vàng óng, thịt ngọt mềm đậm vị thảo mộc." },
                { "Chocolate Lava Cake", "Bánh sô-cô-la núi lửa với lớp nhân socola đen nóng chảy ngọt ngào quyến rũ." },
                { "Chocolate Mousse", "Mousse sô-cô-la mềm mịn bồng bềnh, thơm béo vị kem tươi và cacao nguyên chất." },
                { "Crème Brûlée", "Bánh kem trứng nướng kiểu Pháp béo mịn với lớp đường caramen khò giòn tan trên mặt." },
                { "Fruit Tart", "Bánh tart giòn tan với lớp kem béo ngậy trang trí trái cây tươi mọng nước theo mùa." },
                { "Panna Cotta", "Thạch kem sữa Ý mềm tan mịn màng kết hợp lớp sốt quả mọng chua ngọt thanh mát." },
                { "Fettuccine Alfredo", "Mì dẹt Ý hòa quyện cùng sốt kem bơ béo ngậy và phô mai parmesan đậm đà." },
                { "Penne Arrabbiata", "Mì ống penne sốt cà chua cay nồng tỏi ớt truyền thống miền Nam nước Ý." },
                { "Seafood Linguine", "Mì dẹt hải sản gồm tôm, mực, nghêu xào sốt vang trắng và cà chua tươi." },
                { "Spaghetti Bolognese", "Mì Ý sợi truyền thống sốt thịt bò bằm hầm cà chua và gia vị thảo mộc đặc trưng." },
                { "Spaghetti Carbonara", "Mì Spaghetti sốt kem trứng, thịt ba chỉ xông khói giòn và tiêu đen thơm lừng." },
                { "Caesar Salad", "Xà lách Romaine tươi giòn trộn sốt Caesar đặc trưng, bánh mì giòn và phô mai parmesan." },
                { "Caprese Salad", "Salad Ý thanh mát từ phô mai tươi mozzarella, cà chua chín mọng và lá húng quế tươi." },
                { "Garden Salad", "Rau củ vườn tươi mát thanh giòn trộn sốt dầu giấm ô-liu thanh nhẹ tốt cho sức khỏe." },
                { "Greek Salad", "Salad Hy Lạp đặc trưng với dưa leo, cà chua, phô mai feta béo ngậy và quả ô-liu đen." },
                { "Tuna Salad", "Salad cá ngừ tươi ngon cùng rau củ giòn ngọt hòa quyện sốt mayonnaise thơm dịu." },
                { "Baked Lobster", "Tôm hùm tươi đút lò phô mai béo ngậy, thịt tôm săn chắc ngọt lịm." },
                { "Garlic Butter Shrimp", "Tôm sú tươi xào bơ tỏi tía thơm phức, sốt sánh vàng óng ánh đậm đà." },
                { "Grilled Calamari", "Mực nang tươi ướp gia vị nướng lửa hồng giòn ngọt sần sật, thơm mùi khói than." },
                { "Grilled Salmon", "Cá hồi phi-lê nướng bơ chanh da giòn rụm, thịt cá hồng tươi béo mềm mọng nước." },
                { "Seafood Paella", "Cơm chiên hải sản phong cách Tây Ban Nha nhuộm màu nghệ tây thơm ngào ngạt." },
                { "Grilled Eggplant", "Cà tím nướng sốt mỡ hành thơm nức, rắc hành phi giòn rụm ngọt bùi." },
                { "Mushroom Risotto", "Cơm Ý risotto nấu cùng nấm rừng tươi và phô mai parmesan béo ngậy thơm lừng." },
                { "Spinach & Ricotta Ravioli", "Bánh xếp Ý ravioli nhân rau chân vịt và phô mai ricotta béo bùi, sốt bơ xô thơm." },
                { "Stuffed Bell Pepper", "Ớt chuông nhồi rau củ tươi và nấm đút lò thơm ngọt tự nhiên." },
                { "Vegetable Ratatouille", "Món rau củ hầm kiểu Pháp trứ danh từ cà tím, bí ngòi, ớt chuông và sốt cà chua." },
                { "Cabernet Sauvignon", "Rượu vang đỏ đậm đà với hương quả mọng đen, gỗ sồi và tannin mượt mà tinh tế." },
                { "Chardonnay", "Rượu vang trắng thanh lịch với hương táo xanh, cam chanh và thoang thoảng mùi bơ béo." },
                { "Rosé Wine", "Rượu vang hồng tươi mát mang hương thơm dịu ngọt của dâu tây và hoa hồng mùa hè." },
                { "Sauvignon Blanc", "Rượu vang trắng tươi sáng nổi bật hương thảo mộc tươi và bưởi thanh mát sảng khoái." },
                { "Merlot", "Rượu vang đỏ mềm mại đằm thắm với hương mận chín, anh đào ngọt ngào và vani êm dịu." },
                { "Pho Bo", "Phở bò truyền thống nước dùng ninh xương đậm đà, bánh phở mềm cùng thịt bò tái chín thơm lừng thảo mộc." },
                { "Xôi", "Xôi nếp dẻo thơm lừng hành phi béo ngậy, ăn kèm chả lụa và ruốc thịt đậm đà." },
                { "AAA", "Món ăn đặc biệt tuyển chọn với nguyên liệu tươi ngon theo công thức độc quyền của nhà hàng." }
            };

            foreach (var dish in dishesWithoutDesc)
            {
                if (descMap.TryGetValue(dish.Name, out var desc))
                {
                    dish.Description = desc;
                }
                else
                {
                    dish.Description = "Món ăn thơm ngon, chế biến tươi mới từ nguyên liệu chọn lọc của nhà hàng.";
                }
                await _dishRepository.UpdateAsync(dish);
            }
        }

        // Seed / Update Dish Categories based on existing dishes
        var dishCategories = new (string Name, string Description)[]
        {
            ("Khai vị", "Món khai vị kích thích vị giác trước bữa chính"),
            ("Món Bò", "Các món thăn bò cao cấp, bít tết và sườn nướng BBQ"),
            ("Món Gà", "Các món gà quay, áp chảo sốt bơ chanh và nướng thảo mộc"),
            ("Hải sản", "Tôm hùm, cá hồi, mực nang đút lò và áp chảo tươi ngon"),
            ("Mì Ý & Cơm Ý", "Các món mì Spaghetti, Penne, Ravioli và cơm Ý Risotto"),
            ("Bánh mì & Nướng", "Bánh mì Baguette Pháp, Focaccia, Ciabatta nướng giòn"),
            ("Salad", "Xà lách tươi giòn hòa quyện các loại sốt đặc trưng"),
            ("Món chay & Rau củ", "Món chay thanh đạm từ rau củ, cà tím và nấm tươi"),
            ("Tráng miệng", "Bánh sô-cô-la núi lửa, panna cotta và món ngọt kiểu Âu"),
            ("Rượu vang & Đồ uống", "Vang đỏ, vang trắng và thức uống tuyển chọn hảo hạng"),
            ("Món ăn Việt Nam", "Các món ăn truyền thống mang đậm phong vị ẩm thực Việt")
        };

        var catDict = new System.Collections.Generic.Dictionary<string, Acme.TooHungry.Dishes.DishCategory>(System.StringComparer.OrdinalIgnoreCase);
        foreach (var c in dishCategories)
        {
            var cat = await _dishCategoryRepository.FirstOrDefaultAsync(x => x.Name.ToLower() == c.Name.ToLower());
            if (cat == null)
            {
                cat = await _dishCategoryRepository.InsertAsync(new Acme.TooHungry.Dishes.DishCategory
                {
                    Name = c.Name,
                    Description = c.Description
                }, autoSave: true);
            }
            catDict[c.Name] = cat;
        }

        // Map dishes to categories if not assigned or pointing to deleted/null
        var dishCategoryMap = new System.Collections.Generic.Dictionary<string, string>(System.StringComparer.OrdinalIgnoreCase)
        {
            { "Bruschetta", "Khai vị" },
            { "Calamari Fritti", "Khai vị" },
            { "Chicken Piccata", "Khai vị" },
            { "Garlic Bread", "Khai vị" },
            { "Shrimp Cocktail", "Khai vị" },
            { "Spring Rolls", "Khai vị" },

            { "Beef Short Ribs", "Món Bò" },
            { "Beef Stroganoff", "Món Bò" },
            { "Beef Tenderloin", "Món Bò" },
            { "Grilled Beef Steak", "Món Bò" },
            { "Roast Beef", "Món Bò" },

            { "Chicken Alfredo", "Món Gà" },
            { "Chicken Parmesan", "Món Gà" },
            { "Grilled Chicken Breast", "Món Gà" },
            { "Roast Chicken", "Món Gà" },

            { "Baked Lobster", "Hải sản" },
            { "Garlic Butter Shrimp", "Hải sản" },
            { "Grilled Calamari", "Hải sản" },
            { "Grilled Salmon", "Hải sản" },
            { "Seafood Paella", "Hải sản" },

            { "Fettuccine Alfredo", "Mì Ý & Cơm Ý" },
            { "Penne Arrabbiata", "Mì Ý & Cơm Ý" },
            { "Seafood Linguine", "Mì Ý & Cơm Ý" },
            { "Spaghetti Bolognese", "Mì Ý & Cơm Ý" },
            { "Spaghetti Carbonara", "Mì Ý & Cơm Ý" },
            { "Mushroom Risotto", "Mì Ý & Cơm Ý" },
            { "Spinach & Ricotta Ravioli", "Mì Ý & Cơm Ý" },

            { "Cheese Bread", "Bánh mì & Nướng" },
            { "Ciabatta", "Bánh mì & Nướng" },
            { "Focaccia", "Bánh mì & Nướng" },
            { "French Baguette", "Bánh mì & Nướng" },
            { "Pretzel", "Bánh mì & Nướng" },

            { "Caesar Salad", "Salad" },
            { "Caprese Salad", "Salad" },
            { "Garden Salad", "Salad" },
            { "Greek Salad", "Salad" },
            { "Tuna Salad", "Salad" },

            { "Grilled Eggplant", "Món chay & Rau củ" },
            { "Stuffed Bell Pepper", "Món chay & Rau củ" },
            { "Vegetable Ratatouille", "Món chay & Rau củ" },

            { "Chocolate Lava Cake", "Tráng miệng" },
            { "Chocolate Mousse", "Tráng miệng" },
            { "Crème Brûlée", "Tráng miệng" },
            { "Fruit Tart", "Tráng miệng" },
            { "Panna Cotta", "Tráng miệng" },

            { "Cabernet Sauvignon", "Rượu vang & Đồ uống" },
            { "Chardonnay", "Rượu vang & Đồ uống" },
            { "Rosé Wine", "Rượu vang & Đồ uống" },
            { "Sauvignon Blanc", "Rượu vang & Đồ uống" },
            { "Merlot", "Rượu vang & Đồ uống" },

            { "Pho Bo", "Món ăn Việt Nam" },
            { "Xôi", "Món ăn Việt Nam" },
            { "AAA", "Món ăn Việt Nam" }
        };

        var allDishes = await _dishRepository.GetListAsync();
        foreach (var dish in allDishes)
        {
            if (dishCategoryMap.TryGetValue(dish.Name, out var targetCatName) && catDict.TryGetValue(targetCatName, out var targetCat))
            {
                if (dish.DishCategoryId == null || dish.DishCategoryId != targetCat.Id)
                {
                    dish.DishCategoryId = targetCat.Id;
                    await _dishRepository.UpdateAsync(dish);
                }
            }
        }
    }
}
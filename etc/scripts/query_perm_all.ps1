$conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost\SQLEXPRESS;Database=TooHungry;Trusted_Connection=True;TrustServerCertificate=true');
$conn.Open();
$cmd = $conn.CreateCommand();

Write-Output "=== USERS & ROLES ==="
$cmd.CommandText = "SELECT u.UserName, r.Name as RoleName FROM AbpUsers u LEFT JOIN AbpUserRoles ur ON u.Id = ur.UserId LEFT JOIN AbpRoles r ON ur.RoleId = r.Id";
$r = $cmd.ExecuteReader();
while($r.Read()){
    Write-Output ($r['UserName'] + ' -> ' + $r['RoleName']);
}
$r.Close();

Write-Output "=== INSERTING MISSING PERMISSIONS ==="
$permsToGrant = @(
    # Administrator
    @{ Role = "Administrator"; Perm = "TooHungry.Reservations" },
    @{ Role = "Administrator"; Perm = "TooHungry.Reservations.Create" },
    @{ Role = "Administrator"; Perm = "TooHungry.Reservations.Update" },
    @{ Role = "Administrator"; Perm = "TooHungry.Reservations.Cancel" },
    @{ Role = "Administrator"; Perm = "TooHungry.Reservations.CheckIn" },
    @{ Role = "Administrator"; Perm = "TooHungry.Tables.Manage" },

    # Manager
    @{ Role = "Manager"; Perm = "TooHungry.Reservations" },
    @{ Role = "Manager"; Perm = "TooHungry.Reservations.Create" },
    @{ Role = "Manager"; Perm = "TooHungry.Reservations.Update" },
    @{ Role = "Manager"; Perm = "TooHungry.Reservations.Cancel" },
    @{ Role = "Manager"; Perm = "TooHungry.Reservations.CheckIn" },
    @{ Role = "Manager"; Perm = "TooHungry.Tables.Manage" },

    # Waiter
    @{ Role = "Waiter"; Perm = "TooHungry.Tables" },
    @{ Role = "Waiter"; Perm = "TooHungry.Tables.Create" },
    @{ Role = "Waiter"; Perm = "TooHungry.Tables.Edit" },
    @{ Role = "Waiter"; Perm = "TooHungry.Tables.Delete" },
    @{ Role = "Waiter"; Perm = "TooHungry.Tables.UpdateStatus" },
    @{ Role = "Waiter"; Perm = "TooHungry.Orders" },
    @{ Role = "Waiter"; Perm = "TooHungry.Orders.Create" },
    @{ Role = "Waiter"; Perm = "TooHungry.Orders.Edit" },
    @{ Role = "Waiter"; Perm = "TooHungry.Orders.Cancel" },
    @{ Role = "Waiter"; Perm = "TooHungry.Orders.Delete" },
    @{ Role = "Waiter"; Perm = "TooHungry.Reservations" },
    @{ Role = "Waiter"; Perm = "TooHungry.Reservations.Create" },
    @{ Role = "Waiter"; Perm = "TooHungry.Reservations.Update" },
    @{ Role = "Waiter"; Perm = "TooHungry.Reservations.Cancel" },
    @{ Role = "Waiter"; Perm = "TooHungry.Reservations.CheckIn" },
    @{ Role = "Waiter"; Perm = "TooHungry.Dishes" },
    @{ Role = "Waiter"; Perm = "TooHungry.DishCategories" },
    @{ Role = "Waiter"; Perm = "TooHungry.DiningAreas" }
)

foreach ($item in $permsToGrant) {
    $role = $item.Role
    $perm = $item.Perm
    $cmd.CommandText = "IF NOT EXISTS (SELECT 1 FROM AbpPermissionGrants WHERE ProviderName = 'R' AND ProviderKey = '$role' AND Name = '$perm') BEGIN INSERT INTO AbpPermissionGrants (Id, TenantId, Name, ProviderName, ProviderKey) VALUES (NEWID(), NULL, '$perm', 'R', '$role'); SELECT 1; END ELSE SELECT 0;"
    $inserted = $cmd.ExecuteScalar()
    if ($inserted -eq 1) {
        Write-Output "Granted $perm to $role"
    } else {
        Write-Output "Already has $perm ($role)"
    }
}

$conn.Close();
Write-Output "=== DONE ==="

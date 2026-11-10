using System;
using Microsoft.AspNetCore.Identity;
using Volo.Abp.DependencyInjection;
using AbpIdentityUser = Volo.Abp.Identity.IdentityUser;

namespace Acme.TooHungry.Security;

public interface IAntiTimingAttackDummyHasher
{
    void ExecuteDummyHash(string providedPassword);
}

public class AntiTimingAttackDummyHasher : IAntiTimingAttackDummyHasher, ISingletonDependency
{
    private readonly IPasswordHasher<AbpIdentityUser> _passwordHasher;
    private readonly AbpIdentityUser _dummyUser;
    private readonly string _dummyHashedPassword;

    public AntiTimingAttackDummyHasher(IPasswordHasher<AbpIdentityUser> passwordHasher)
    {
        _passwordHasher = passwordHasher;
        _dummyUser = new AbpIdentityUser(Guid.NewGuid(), "dummy_anti_timing", "dummy@security.internal");
        _dummyHashedPassword = _passwordHasher.HashPassword(_dummyUser, "DummyTimingDefenseSecret#2026!");
    }

    public void ExecuteDummyHash(string providedPassword)
    {
        // Executes PBKDF2/Argon2 verification on precomputed dummy hash
        // to consume identical CPU cycles (~100ms) when user is not found
        _passwordHasher.VerifyHashedPassword(_dummyUser, _dummyHashedPassword, providedPassword);
    }
}

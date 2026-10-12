using System;
using System.Reflection;
using System.Linq;

namespace ReflectionTest
{
    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                var assembly = Assembly.LoadFrom(@"C:\Users\duong\.nuget\packages\volo.abp.identity.application\10.6.0\lib\netstandard2.0\Volo.Abp.Identity.Application.dll");
                var type = assembly.GetType("Volo.Abp.Identity.IdentityUserAppService");
                var method = type.GetMethod("UpdateAsync");
                var methodBody = method.GetMethodBody();
                Console.WriteLine("UpdateAsync found!");
                
                // Print all methods called inside UpdateAsync
                // This is hard without Mono.Cecil, but we can check if it calls SetRolesAsync indirectly by checking for dependencies or just searching for the string "RoleNames" in the assembly metadata strings?
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
            }
        }
    }
}

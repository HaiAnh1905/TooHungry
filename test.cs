using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;

class Program
{
    static async Task Main()
    {
        // Login
        var client = new HttpClient();
        var content = new FormUrlEncodedContent(new[]
        {
            new System.Collections.Generic.KeyValuePair<string, string>("grant_type", "password"),
            new System.Collections.Generic.KeyValuePair<string, string>("username", "admin"),
            new System.Collections.Generic.KeyValuePair<string, string>("password", "123456aA@"),
            new System.Collections.Generic.KeyValuePair<string, string>("client_id", "TooHungry_App"),
            new System.Collections.Generic.KeyValuePair<string, string>("scope", "offline_access TooHungry")
        });
        var response = await client.PostAsync("https://localhost:44353/connect/token", content);
        var resString = await response.Content.ReadAsStringAsync();
        Console.WriteLine(resString);
    }
}

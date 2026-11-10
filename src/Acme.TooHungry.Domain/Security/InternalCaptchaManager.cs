using System;
using System.Security.Cryptography;
using System.Text;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Services;

namespace Acme.TooHungry.Security;

public interface IInternalCaptchaManager : IDomainService
{
    CaptchaChallengeResult GenerateChallenge();
    bool ValidateCaptchaAnswer(string challengeId, string answer, string signature, long timestamp);
}

public class CaptchaChallengeResult
{
    public string ChallengeId { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public long Timestamp { get; set; }
    public DateTimeOffset ExpiresAtUtc { get; set; }
}

public class InternalCaptchaManager : DomainService, IInternalCaptchaManager
{
    private static readonly byte[] HmacKey = Encoding.UTF8.GetBytes("TooHungry-Internal-Captcha-HMAC-Key-2026!#Secure");
    public const int ValiditySeconds = 120; // 2 minutes

    public CaptchaChallengeResult GenerateChallenge()
    {
        var random = Random.Shared;
        int a = random.Next(1, 20);
        int b = random.Next(1, 20);
        int answer = a + b;

        var challengeId = Guid.NewGuid().ToString("N");
        var now = DateTimeOffset.UtcNow;
        var timestamp = now.ToUnixTimeSeconds();
        var signature = ComputeSignature(challengeId, answer.ToString(), timestamp);

        return new CaptchaChallengeResult
        {
            ChallengeId = challengeId,
            Question = $"{a} + {b} = ?",
            Signature = signature,
            Timestamp = timestamp,
            ExpiresAtUtc = now.AddSeconds(ValiditySeconds)
        };
    }

    public bool ValidateCaptchaAnswer(string challengeId, string answer, string signature, long timestamp)
    {
        if (string.IsNullOrWhiteSpace(challengeId) || string.IsNullOrWhiteSpace(answer) || string.IsNullOrWhiteSpace(signature))
        {
            return false;
        }

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        // Expired or from future by more than 5s
        if (now - timestamp > ValiditySeconds || timestamp - now > 5)
        {
            return false;
        }

        var trimmedAnswer = answer.Trim();
        var expectedSignature = ComputeSignature(challengeId, trimmedAnswer, timestamp);

        var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);
        var actualBytes = Encoding.UTF8.GetBytes(signature);

        return CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    private static string ComputeSignature(string challengeId, string answer, long timestamp)
    {
        using var hmac = new HMACSHA256(HmacKey);
        var payload = $"{challengeId}:{answer}:{timestamp}";
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}


using System;
using System.Threading.RateLimiting;
using Acme.TooHungry.Security;
using Shouldly;
using Xunit;

namespace Acme.TooHungry.Security;

public class RateLimiting_Tests
{
    private readonly InternalCaptchaManager _captchaManager;

    public RateLimiting_Tests()
    {
        _captchaManager = new InternalCaptchaManager();
    }

    [Fact]
    public void Should_Allow_First_10_Requests_And_Block_11th_Request_From_Same_Ip()
    {
        var limiter = PartitionedRateLimiter.Create<string, string>(ip =>
            RateLimitPartition.GetSlidingWindowLimiter(ip, _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0
            }));

        var ip1 = "192.168.1.50";
        var ip2 = "192.168.1.51";

        // First 10 requests from IP 1 should succeed
        for (int i = 1; i <= 10; i++)
        {
            using var lease = limiter.AttemptAcquire(ip1);
            lease.IsAcquired.ShouldBeTrue($"Request #{i} from IP {ip1} should have been allowed.");
        }

        // 11th request from IP 1 should be blocked (HTTP 429)
        using (var blockedLease = limiter.AttemptAcquire(ip1))
        {
            blockedLease.IsAcquired.ShouldBeFalse("11th request from same IP should be blocked by Rate Limiter.");
        }

        // Distinct IP 2 should still be allowed
        using (var ip2Lease = limiter.AttemptAcquire(ip2))
        {
            ip2Lease.IsAcquired.ShouldBeTrue("Distinct IP should have its own separate rate limit partition.");
        }
    }

    [Fact]
    public void Should_Generate_And_Validate_Internal_Captcha_Correctly()
    {
        var challenge = _captchaManager.GenerateChallenge();
        challenge.ShouldNotBeNull();
        challenge.Question.ShouldEndWith("= ?");
        challenge.Signature.ShouldNotBeNullOrWhiteSpace();

        // Question format is "a + b = ?"
        var parts = challenge.Question.Replace("= ?", "").Split('+');
        int a = int.Parse(parts[0].Trim());
        int b = int.Parse(parts[1].Trim());
        int correctAnswer = a + b;

        // Correct answer should pass validation
        var valid = _captchaManager.ValidateCaptchaAnswer(challenge.ChallengeId, correctAnswer.ToString(), challenge.Signature, challenge.Timestamp);
        valid.ShouldBeTrue("Valid answer and signature must pass CAPTCHA validation.");

        // Wrong answer should fail
        var invalid = _captchaManager.ValidateCaptchaAnswer(challenge.ChallengeId, (correctAnswer + 99).ToString(), challenge.Signature, challenge.Timestamp);
        invalid.ShouldBeFalse("Wrong answer must fail CAPTCHA validation.");

        // Tampered signature should fail
        var tampered = _captchaManager.ValidateCaptchaAnswer(challenge.ChallengeId, correctAnswer.ToString(), "tampered_signature_hex", challenge.Timestamp);
        tampered.ShouldBeFalse("Tampered signature must fail CAPTCHA validation.");

        // Expired timestamp (> 120 seconds ago) should fail
        var expiredTimestamp = DateTimeOffset.UtcNow.AddSeconds(-130).ToUnixTimeSeconds();
        var expired = _captchaManager.ValidateCaptchaAnswer(challenge.ChallengeId, correctAnswer.ToString(), challenge.Signature, expiredTimestamp);
        expired.ShouldBeFalse("Expired CAPTCHA timestamp must fail validation.");
    }
}

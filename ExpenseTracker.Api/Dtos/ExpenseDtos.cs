namespace ExpenseTracker.Api.Dtos;

public record ExpenseCreateDto(
    DateTime OccurredAt,
    decimal Amount,
    string Category,
    string? Description
);

// BillImageUrl holds a relative path like /uploads/filename.ext if image exists.
public record ExpenseDto(
    int Id,
    DateTime OccurredAt,
    decimal Amount,
    string Currency,
    string Category,
    string? Description,
    string? BillImageUrl
);

public record OcrResultDto
{
    public bool Success { get; init; }
    public decimal? ExtractedAmount { get; init; }
    public List<decimal> PossibleAmounts { get; init; } = new();
    public string? ErrorMessage { get; init; }
}
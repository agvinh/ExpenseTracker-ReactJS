namespace ExpenseTracker.Api.Dtos;

public record ExpenseCreateDto(
    DateTime OccurredAt,
    decimal Amount,
    string Category,
    string? Description
);

public record ExpenseDto(
    int Id,
    DateTime OccurredAt,
    decimal Amount,
    string Currency,
    string Category,
    string? Description,
    string? BillImageUrl
);
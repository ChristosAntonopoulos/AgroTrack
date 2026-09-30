namespace OliveLifecycle.Core;

public static class FinancialCapabilities
{
    public const string ViewSummary = "view_summary";
    public const string ViewTransactions = "view_transactions";
    public const string ViewIncome = "view_income";
    public const string AddExpense = "add_expense";
    public const string AddIncome = "add_income";
    public const string EditOwnDraft = "edit_own_draft";
    public const string EditPosted = "edit_posted";
    public const string Void = "void";
    public const string ViewReceipts = "view_receipts";
    public const string Export = "export";

    public static readonly string[] OwnerAll =
    [
        ViewSummary,
        ViewTransactions,
        ViewIncome,
        AddExpense,
        AddIncome,
        EditOwnDraft,
        EditPosted,
        Void,
        ViewReceipts,
        Export
    ];

    public static readonly string[] CollaboratorExpenseOnly =
    [
        AddExpense,
        EditOwnDraft
    ];

    /// <summary>
    /// Family seat that keeps the grove books: can see and record income and expenses.
    /// Posted corrections and voids stay with the field admin.
    /// </summary>
    public static readonly string[] HouseholdBooks =
    [
        ViewSummary,
        ViewTransactions,
        ViewIncome,
        AddExpense,
        AddIncome,
        EditOwnDraft,
        ViewReceipts
    ];

    /// <summary>
    /// Family with money module at view depth — see household books, no writes.
    /// </summary>
    public static readonly string[] HouseholdViewOnly =
    [
        ViewSummary,
        ViewTransactions,
        ViewIncome,
        ViewReceipts
    ];
}

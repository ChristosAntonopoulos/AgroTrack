using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldWorkProfileServiceTests
{
    private readonly Mock<IFieldWorkProfileRepository> _profiles = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldWorkAuthorizationService> _auth = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FieldWorkProfileService _service;

    public FieldWorkProfileServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 3, 18, 10, 0, 0, DateTimeKind.Utc));
        _service = new FieldWorkProfileService(
            _profiles.Object,
            _fields.Object,
            _auth.Object,
            _clock.Object);
    }

    [Fact]
    public async Task CreateDraft_CreatesIndependentProfilePerField()
    {
        FieldWorkProfile? createdA = null;
        FieldWorkProfile? createdB = null;

        _fields.Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string id, CancellationToken _) => new Field
            {
                Id = id,
                OwnerId = "owner-1",
                Status = FieldStatus.Active
            });
        _profiles.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile?)null);
        _profiles.Setup(r => r.CreateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) =>
            {
                p.Id = $"profile-{p.FieldId}";
                if (p.FieldId == "field-a")
                {
                    createdA = p;
                }
                else
                {
                    createdB = p;
                }

                return p;
            });

        var a = await _service.CreateDraftAsync("field-a", new CreateFieldWorkProfileDto(), "owner-1", Roles.FieldOwner);
        var b = await _service.CreateDraftAsync("field-b", new CreateFieldWorkProfileDto(), "owner-1", Roles.FieldOwner);

        Assert.Equal("field-a", a.FieldId);
        Assert.Equal("field-b", b.FieldId);
        Assert.NotEqual(a.Id, b.Id);
        Assert.Equal("draft", a.Status);
        Assert.Equal("draft", b.Status);
        Assert.Equal("unknown", a.ProductionPurpose);
        Assert.Equal(PreferenceMode.Unknown, createdA!.Irrigation.PreferenceMode);
        Assert.Equal(PreferenceMode.Unknown, createdB!.Pruning.PreferenceMode);
        Assert.Equal(2026, a.ResultYearCreated);
    }

    [Fact]
    public async Task Activate_DraftField_ThrowsValidation()
    {
        _profiles.Setup(r => r.GetByFieldIdAsync("field-draft", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldWorkProfile
            {
                Id = "p1",
                FieldId = "field-draft",
                Status = FieldWorkProfileStatus.Draft
            });
        _auth.Setup(a => a.EnsureFieldEligibleForProfileActivationAsync("field-draft", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ValidationException("Draft fields cannot activate a field-work profile."));

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.ActivateAsync("field-draft", null, "owner-1", Roles.FieldOwner));
    }

    [Fact]
    public async Task Update_UnknownPreferenceMode_StaysUnknown()
    {
        var profile = new FieldWorkProfile
        {
            Id = "p1",
            FieldId = "field-1",
            Status = FieldWorkProfileStatus.Draft,
            ProfileVersion = 1,
            Pruning = new PruningProfile
            {
                PreferenceMode = PreferenceMode.Unknown,
                FrequencyType = FrequencyType.Unknown
            }
        };
        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        _profiles.Setup(r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) => p);

        var dto = await _service.UpdateAsync(
            "field-1",
            new UpdateFieldWorkProfileDto
            {
                Pruning = new UpdatePracticeProfileDto
                {
                    PreferenceMode = "unknown",
                    FrequencyType = "unknown",
                    Source = "user_declared_during_onboarding"
                },
                Irrigation = new UpdateIrrigationProfileDto
                {
                    PreferenceMode = "unknown",
                    Method = "unknown"
                }
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("unknown", dto.Pruning.PreferenceMode);
        Assert.Equal("Άγνωστο", dto.Pruning.PreferenceModeLabel);
        Assert.Equal("unknown", dto.Irrigation.PreferenceMode);
        Assert.Equal("unknown", dto.Irrigation.Method);
        Assert.Equal(2, dto.ProfileVersion);
        Assert.Equal("draft", dto.Status);
    }

    [Fact]
    public async Task Update_Resume_RestoresSavedAnswers_AndIncrementsVersion()
    {
        var profile = new FieldWorkProfile
        {
            Id = "p1",
            FieldId = "field-1",
            Status = FieldWorkProfileStatus.Draft,
            ProfileVersion = 1,
            ProductionPurpose = ProductionPurpose.Unknown
        };
        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        _profiles.Setup(r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) => p);

        var first = await _service.UpdateAsync(
            "field-1",
            new UpdateFieldWorkProfileDto
            {
                ProductionPurpose = "olive_oil",
                Pruning = new UpdatePracticeProfileDto
                {
                    PreferenceMode = "enabled",
                    FrequencyType = "every_n_years",
                    FrequencyValue = 2,
                    LastPerformedYear = 2025,
                    DatePrecision = "year",
                    Source = "user_declared_during_onboarding"
                },
                CurrentYearDeclaredWork =
                [
                    new CurrentYearDeclaredWorkDto
                    {
                        Category = "fertilisation",
                        ResultYear = 2026,
                        Completion = "yes",
                        ApproximateDate = new ApproximateDateDto
                        {
                            Year = 2026,
                            Month = 2,
                            Precision = "month"
                        },
                        Source = "user_declared_during_onboarding"
                    }
                ]
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("olive_oil", first.ProductionPurpose);
        Assert.Equal("Ελαιόλαδο", first.ProductionPurposeLabel);
        Assert.Equal("enabled", first.Pruning.PreferenceMode);
        Assert.Equal(2, first.Pruning.FrequencyValue);
        Assert.Equal(2025, first.Pruning.LastPerformedYear);
        Assert.Equal("year", first.Pruning.DatePrecision);
        Assert.Equal("user_declared_during_onboarding", first.Pruning.Source);
        Assert.Single(first.CurrentYearDeclaredWork);
        Assert.Equal("month", first.CurrentYearDeclaredWork[0].ApproximateDate!.Precision);
        Assert.Null(first.CurrentYearDeclaredWork[0].ApproximateDate!.Day);
        Assert.Equal(2, first.ProfileVersion);
        Assert.Equal("draft", first.Status);

        // Simulate get-after-resume by reading the mutated in-memory entity.
        var resumed = await _service.GetAsync("field-1", "owner-1", Roles.FieldOwner);
        Assert.NotNull(resumed);
        Assert.Equal("olive_oil", resumed!.ProductionPurpose);
        Assert.Equal(2, resumed.Pruning.FrequencyValue);
        Assert.Equal(2025, resumed.Pruning.LastPerformedYear);
        Assert.Equal("draft", resumed.Status);
    }

    [Fact]
    public async Task Activate_ActiveField_SetsActiveAndCompletedMetadata()
    {
        var profile = new FieldWorkProfile
        {
            Id = "p1",
            FieldId = "field-1",
            Status = FieldWorkProfileStatus.Draft,
            ProfileVersion = 3,
            ProductionPurpose = ProductionPurpose.Both
        };
        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        _profiles.Setup(r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) => p);

        var dto = await _service.ActivateAsync("field-1", null, "owner-1", Roles.FieldOwner);

        Assert.Equal("active", dto.Status);
        Assert.Equal("Ενεργό", dto.StatusLabel);
        Assert.Equal(4, dto.ProfileVersion);
        Assert.NotNull(dto.CompletedAt);
        Assert.Equal("owner-1", dto.CompletedByUserId);
        Assert.NotNull(dto.LastReviewedAt);
        _auth.Verify(a => a.EnsureFieldEligibleForProfileActivationAsync("field-1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateDraft_WhenProfileExists_Throws()
    {
        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldWorkProfile { Id = "existing", FieldId = "field-1" });

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateDraftAsync("field-1", new CreateFieldWorkProfileDto(), "owner-1", Roles.FieldOwner));
    }

    [Fact]
    public async Task Update_DoesNotCreateFieldTasks()
    {
        var profile = new FieldWorkProfile
        {
            Id = "p1",
            FieldId = "field-1",
            Status = FieldWorkProfileStatus.Draft,
            ProfileVersion = 1
        };
        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        _profiles.Setup(r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) => p);

        await _service.UpdateAsync(
            "field-1",
            new UpdateFieldWorkProfileDto
            {
                Irrigation = new UpdateIrrigationProfileDto
                {
                    PreferenceMode = "disabled",
                    FrequencyType = "unknown",
                    Source = "user_declared_during_onboarding"
                }
            },
            "owner-1",
            Roles.FieldOwner);

        // Profile service has no FieldTask repository — update only touches profile store.
        _profiles.Verify(r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()), Times.Once);
        _profiles.Verify(r => r.CreateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Update_ActiveProfile_StaysActive_AndPersistsDefaultAssignments()
    {
        var profile = new FieldWorkProfile
        {
            Id = "p1",
            FieldId = "field-1",
            Status = FieldWorkProfileStatus.Active,
            ProfileVersion = 4,
            CompletedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            CompletedByUserId = "owner-1"
        };
        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        _profiles.Setup(r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) => p);

        var dto = await _service.UpdateAsync(
            "field-1",
            new UpdateFieldWorkProfileDto
            {
                Pruning = new UpdatePracticeProfileDto { PreferenceMode = "enabled" },
                DefaultAssignments = new DefaultAssignmentsDto
                {
                    Entries =
                    [
                        new DefaultAssignmentEntryDto
                        {
                            Category = "pruning",
                            IsSelf = true
                        },
                        new DefaultAssignmentEntryDto
                        {
                            Category = "harvest",
                            IsSelf = false,
                            AssigneeUserId = "collab-1"
                        }
                    ]
                }
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("active", dto.Status);
        Assert.Equal(5, dto.ProfileVersion);
        Assert.Equal(2, dto.DefaultAssignments.Entries.Count);
        Assert.True(dto.DefaultAssignments.Entries[0].IsSelf);
        Assert.Equal("collab-1", dto.DefaultAssignments.Entries[1].AssigneeUserId);
    }

    [Fact]
    public async Task Copy_CreatesIndependentProfiles_WithoutIrrigationByDefault()
    {
        var source = new FieldWorkProfile
        {
            Id = "src",
            FieldId = "field-src",
            Status = FieldWorkProfileStatus.Active,
            ProductionPurpose = ProductionPurpose.OliveOil,
            Irrigation = new IrrigationProfile
            {
                PreferenceMode = PreferenceMode.Enabled,
                Method = IrrigationMethod.Drip,
                LastPerformedYear = 2025
            },
            Pruning = new PruningProfile
            {
                PreferenceMode = PreferenceMode.Enabled,
                FrequencyType = FrequencyType.EveryNYears,
                FrequencyValue = 2,
                LastPerformedYear = 2024
            },
            DefaultAssignments = new DefaultAssignments
            {
                Entries =
                [
                    new DefaultAssignmentEntry { Category = "pruning", IsSelf = true }
                ]
            }
        };

        FieldWorkProfile? created = null;
        _profiles.Setup(r => r.GetByFieldIdAsync("field-src", It.IsAny<CancellationToken>()))
            .ReturnsAsync(source);
        _profiles.Setup(r => r.GetByFieldIdAsync("field-b", It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile?)null);
        _fields.Setup(r => r.GetByIdAsync("field-b", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-b",
                OwnerId = "owner-1",
                Status = FieldStatus.Active
            });
        _profiles.Setup(r => r.CreateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) =>
            {
                p.Id = "profile-b";
                created = p;
                return p;
            });

        var result = await _service.CopyAsync(
            "field-src",
            new CopyFieldWorkProfileDto
            {
                TargetFieldIds = ["field-b"],
                CopyIrrigation = false,
                CopyLastPerformed = false,
                CopyAssignments = false
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.True(result.Results[0].Success);
        Assert.NotNull(created);
        Assert.Equal("field-b", created!.FieldId);
        Assert.Equal(FieldWorkProfileStatus.Draft, created.Status);
        Assert.Equal(ProductionPurpose.OliveOil, created.ProductionPurpose);
        Assert.Equal(PreferenceMode.Enabled, created.Pruning.PreferenceMode);
        Assert.Null(created.Pruning.LastPerformedYear);
        Assert.Equal(PreferenceMode.Unknown, created.Irrigation.PreferenceMode);
        Assert.Equal(IrrigationMethod.Unknown, created.Irrigation.Method);
        Assert.Empty(created.DefaultAssignments.Entries);
        Assert.NotEqual(source.Id, created.Id);
    }

    [Fact]
    public async Task Copy_WithIrrigationFlag_CopiesIrrigation_AndLastPerformedWhenRequested()
    {
        var source = new FieldWorkProfile
        {
            Id = "src",
            FieldId = "field-src",
            Status = FieldWorkProfileStatus.Active,
            Irrigation = new IrrigationProfile
            {
                PreferenceMode = PreferenceMode.Enabled,
                Method = IrrigationMethod.Drip,
                LastPerformedYear = 2025,
                DatePrecision = DatePrecision.Year
            },
            Pruning = new PruningProfile
            {
                PreferenceMode = PreferenceMode.Enabled,
                LastPerformedYear = 2023
            }
        };

        FieldWorkProfile? created = null;
        _profiles.Setup(r => r.GetByFieldIdAsync("field-src", It.IsAny<CancellationToken>()))
            .ReturnsAsync(source);
        _profiles.Setup(r => r.GetByFieldIdAsync("field-b", It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile?)null);
        _fields.Setup(r => r.GetByIdAsync("field-b", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-b", OwnerId = "owner-1", Status = FieldStatus.Active });
        _profiles.Setup(r => r.CreateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) =>
            {
                p.Id = "profile-b";
                created = p;
                return p;
            });

        await _service.CopyAsync(
            "field-src",
            new CopyFieldWorkProfileDto
            {
                TargetFieldIds = ["field-b"],
                CopyIrrigation = true,
                CopyLastPerformed = true
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal(PreferenceMode.Enabled, created!.Irrigation.PreferenceMode);
        Assert.Equal(IrrigationMethod.Drip, created.Irrigation.Method);
        Assert.Equal(2025, created.Irrigation.LastPerformedYear);
        Assert.Equal(2023, created.Pruning.LastPerformedYear);
    }

    [Fact]
    public async Task Copy_DraftTarget_IsRejected()
    {
        _profiles.Setup(r => r.GetByFieldIdAsync("field-src", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldWorkProfile
            {
                Id = "src",
                FieldId = "field-src",
                Status = FieldWorkProfileStatus.Active
            });
        _fields.Setup(r => r.GetByIdAsync("field-draft", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-draft",
                OwnerId = "owner-1",
                Status = FieldStatus.Draft
            });

        var result = await _service.CopyAsync(
            "field-src",
            new CopyFieldWorkProfileDto { TargetFieldIds = ["field-draft"] },
            "owner-1",
            Roles.FieldOwner);

        Assert.False(result.Results[0].Success);
        Assert.Equal("draft_field", result.Results[0].ErrorCode);
        _profiles.Verify(r => r.CreateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Copy_PermissionFailure_OnTarget_DoesNotCreate()
    {
        _profiles.Setup(r => r.GetByFieldIdAsync("field-src", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldWorkProfile
            {
                Id = "src",
                FieldId = "field-src",
                Status = FieldWorkProfileStatus.Active
            });
        _auth.Setup(a => a.EnsureCanEditWorkProfileAsync(
                "field-other", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ForbiddenException("You do not have permission to edit the field-work profile."));

        var result = await _service.CopyAsync(
            "field-src",
            new CopyFieldWorkProfileDto { TargetFieldIds = ["field-other"] },
            "owner-1",
            Roles.FieldOwner);

        Assert.False(result.Results[0].Success);
        Assert.Equal("permission", result.Results[0].ErrorCode);
        _profiles.Verify(r => r.CreateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Copy_Assignments_SkipsUsersWithoutTargetAccess()
    {
        var source = new FieldWorkProfile
        {
            Id = "src",
            FieldId = "field-src",
            Status = FieldWorkProfileStatus.Active,
            Pruning = new PruningProfile { PreferenceMode = PreferenceMode.Enabled },
            DefaultAssignments = new DefaultAssignments
            {
                Entries =
                [
                    new DefaultAssignmentEntry
                    {
                        Category = "pruning",
                        IsSelf = false,
                        AssigneeUserId = "outsider-1"
                    },
                    new DefaultAssignmentEntry
                    {
                        Category = "harvest",
                        IsSelf = true
                    }
                ]
            }
        };

        FieldWorkProfile? created = null;
        _profiles.Setup(r => r.GetByFieldIdAsync("field-src", It.IsAny<CancellationToken>()))
            .ReturnsAsync(source);
        _profiles.Setup(r => r.GetByFieldIdAsync("field-b", It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile?)null);
        _fields.Setup(r => r.GetByIdAsync("field-b", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-b",
                OwnerId = "owner-1",
                Status = FieldStatus.Active,
                Memberships = []
            });
        _profiles.Setup(r => r.CreateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) =>
            {
                p.Id = "profile-b";
                created = p;
                return p;
            });

        var result = await _service.CopyAsync(
            "field-src",
            new CopyFieldWorkProfileDto
            {
                TargetFieldIds = ["field-b"],
                CopyAssignments = true
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.True(result.Results[0].Success);
        Assert.Contains("outsider-1", result.Results[0].SkippedAssignmentUserIds);
        Assert.Contains(created!.DefaultAssignments.Entries, e => e.Category == "harvest" && e.IsSelf);
        Assert.Contains(
            created.DefaultAssignments.Entries,
            e => e.Category == "pruning" && e.AssigneeUserId is null && !e.IsSelf);
    }
}

public class FieldWorkProfileAuthorizationTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldAccessService> _fieldAccess = new();
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly FieldWorkAuthorizationService _service;

    public FieldWorkProfileAuthorizationTests()
    {
        _service = new FieldWorkAuthorizationService(
            _fields.Object,
            _fieldAccess.Object,
            _tasks.Object);
    }

    [Fact]
    public async Task Owner_CanEditWorkProfile_ServiceProviderCannot()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-1",
                OwnerId = "owner-1",
                Status = FieldStatus.Active
            });
        _fieldAccess.Setup(a => a.CanUserModifyFieldAsync("field-1", "owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var owner = await _service.ResolveAsync("field-1", "owner-1", Roles.FieldOwner);
        Assert.True(owner.CanEditWorkProfile);

        await _service.EnsureCanEditWorkProfileAsync("field-1", "owner-1", Roles.FieldOwner);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.EnsureCanEditWorkProfileAsync("field-1", "sp-1", Roles.ServiceProvider));
    }

    [Fact]
    public async Task DraftField_CannotActivateProfile()
    {
        _fields.Setup(r => r.GetByIdAsync("field-draft", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-draft",
                OwnerId = "owner-1",
                Status = FieldStatus.Draft
            });

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _service.EnsureFieldEligibleForProfileActivationAsync("field-draft"));
        Assert.Contains("Draft fields cannot activate", ex.Message);
    }
}

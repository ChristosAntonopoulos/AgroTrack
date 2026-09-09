using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Storage;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.ValueObjects;
using FieldEntity = OliveLifecycle.Core.Entities.Field;

namespace OliveLifecycle.Application.Services;

public class FieldService : IFieldService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly IActivityService _activityService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IFieldAreaCalculator _fieldAreaCalculator;
    private readonly IFieldAreaValidationService _fieldAreaValidationService;
    private readonly IGreekCadastrePdfParser _greekCadastrePdfParser;
    private readonly IKaekNormalizer _kaekNormalizer;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILifecycleService _lifecycleService;
    private readonly ILifecycleRepository _lifecycleRepository;
    private readonly IGeospatialJobQueue _geospatialJobQueue;
    private readonly IFamilyMemberRepository _familyMembers;
    private readonly ILogger<FieldService> _logger;

    public FieldService(
        IFieldRepository fieldRepository,
        ITaskRepository taskRepository,
        IUserRepository userRepository,
        IFieldAccessService fieldAccessService,
        IActivityService activityService,
        IDateTimeProvider dateTimeProvider,
        IFieldAreaCalculator fieldAreaCalculator,
        IFieldAreaValidationService fieldAreaValidationService,
        IGreekCadastrePdfParser greekCadastrePdfParser,
        IKaekNormalizer kaekNormalizer,
        IFileStorageService fileStorageService,
        ILifecycleService lifecycleService,
        ILifecycleRepository lifecycleRepository,
        IGeospatialJobQueue geospatialJobQueue,
        IFamilyMemberRepository familyMembers,
        ILogger<FieldService> logger)
    {
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
        _userRepository = userRepository;
        _fieldAccessService = fieldAccessService;
        _activityService = activityService;
        _dateTimeProvider = dateTimeProvider;
        _fieldAreaCalculator = fieldAreaCalculator;
        _fieldAreaValidationService = fieldAreaValidationService;
        _greekCadastrePdfParser = greekCadastrePdfParser;
        _kaekNormalizer = kaekNormalizer;
        _fileStorageService = fileStorageService;
        _lifecycleService = lifecycleService;
        _lifecycleRepository = lifecycleRepository;
        _geospatialJobQueue = geospatialJobQueue;
        _familyMembers = familyMembers;
        _logger = logger;
    }

    public async Task<FieldDto> CreateFieldAsync(string ownerId, CreateFieldDto createFieldDto, CancellationToken cancellationToken = default)
    {
        var now = _dateTimeProvider.UtcNow;
        var status = FieldMapper.ParseStatus(createFieldDto.Status);
        if (string.IsNullOrWhiteSpace(createFieldDto.Status))
        {
            status = createFieldDto.Boundary == null ? FieldStatus.Draft : FieldStatus.Active;
        }

        var field = new FieldEntity
        {
            OwnerId = ownerId,
            Name = createFieldDto.Name,
            CropType = string.IsNullOrWhiteSpace(createFieldDto.CropType) ? "Olive" : createFieldDto.CropType,
            LocationText = createFieldDto.LocationText,
            Area = createFieldDto.Area,
            Variety = createFieldDto.Variety,
            TreeAge = createFieldDto.TreeAge,
            TreeCount = createFieldDto.TreeCount,
            GroundType = createFieldDto.GroundType,
            SoilType = createFieldDto.SoilType ?? createFieldDto.GroundType,
            IrrigationStatus = createFieldDto.IrrigationStatus,
            IrrigationType = createFieldDto.IrrigationType ?? (createFieldDto.IrrigationStatus ? "Drip irrigation" : "Rainfed"),
            Slope = createFieldDto.Slope,
            AccessNotes = createFieldDto.AccessNotes,
            Color = NormalizeFieldColor(createFieldDto.Color) ?? PickDefaultFieldColor(createFieldDto.Name),
            Status = status,
            CurrentLifecycleYear = "low",
            CurrentLifecycleStage = OliveLifecycleStage.Dormancy,
            CreatedAt = now,
            UpdatedAt = now
        };

        if (createFieldDto.GreekCadastre != null)
        {
            field.GreekCadastre = FieldMapper.ToCadastreEntity(createFieldDto.GreekCadastre);
            if (!string.IsNullOrWhiteSpace(field.GreekCadastre.Kaek) &&
                _kaekNormalizer.TryNormalize(field.GreekCadastre.Kaek, out var normalized))
            {
                field.GreekCadastre.NormalizedKaek = normalized;
            }
        }

        if (createFieldDto.Boundary != null)
        {
            ApplyBoundary(field, FieldMapper.ToPolygonEntity(createFieldDto.Boundary));
        }
        else if (createFieldDto.Latitude.HasValue && createFieldDto.Longitude.HasValue)
        {
            field.Location = new Location
            {
                Latitude = createFieldDto.Latitude.Value,
                Longitude = createFieldDto.Longitude.Value
            };
            field.CenterPoint = new GeoJsonPoint
            {
                Type = "Point",
                Coordinates = new List<double> { createFieldDto.Longitude.Value, createFieldDto.Latitude.Value }
            };
        }

        if (!string.IsNullOrWhiteSpace(createFieldDto.ProducerUserId) &&
            !field.AssignedProducerIds.Contains(createFieldDto.ProducerUserId))
        {
            field.AssignedProducerIds.Add(createFieldDto.ProducerUserId);
        }

        var ownerCapacities = createFieldDto.WorksThisFieldMyself
            ? new List<string> { FieldCapacities.Own, FieldCapacities.Work }
            : new List<string> { FieldCapacities.Own };
        FieldMembershipSync.Upsert(field, ownerId, ownerCapacities, ownerId);
        if (!string.IsNullOrWhiteSpace(createFieldDto.ProducerUserId))
        {
            FieldMembershipSync.Upsert(field, createFieldDto.ProducerUserId, [FieldCapacities.Work], ownerId);
        }

        var createdField = await _fieldRepository.CreateAsync(field, cancellationToken);
        if (createdField.Boundary != null)
        {
            await QueueFieldIntelligenceAsync(createdField.Id, cancellationToken);
        }
        return FieldMapper.ToDto(createdField);
    }

    public async Task<FieldDto?> GetFieldByIdAsync(string id, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(id, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken);
        if (field == null)
        {
            return null;
        }

        var includeDocuments = await _fieldAccessService.CanUserAccessFieldDocumentsAsync(id, userId, userRole, cancellationToken);
        return FieldMapper.ToDto(field, includeDocuments);
    }

    public async Task<IEnumerable<FieldDto>> GetFieldsByOwnerAsync(string ownerId, CancellationToken cancellationToken = default)
    {
        var fields = await _fieldRepository.GetByOwnerIdAsync(ownerId, cancellationToken);
        return fields.Select(f => FieldMapper.ToDto(f));
    }

    public async Task<IEnumerable<FieldDto>> GetFieldsForUserAsync(string userId, string userRole, CancellationToken cancellationToken = default)
    {
        var fields = new List<FieldEntity>();

        if (userRole == Roles.Administrator)
        {
            fields.AddRange(await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken));
        }

        fields.AddRange(await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken));
        fields.AddRange(await _fieldRepository.GetByAssignedProducerIdAsync(userId, cancellationToken));
        fields.AddRange(await _fieldRepository.GetByMemberUserIdAsync(userId, cancellationToken));

        if (userRole == Roles.Producer)
        {
            var tasks = await _taskRepository.GetByAssignedToAsync(userId, cancellationToken);
            var fieldIds = tasks.Select(t => t.FieldId).Distinct().ToList();
            if (fieldIds.Count > 0)
            {
                fields.AddRange(await _fieldRepository.GetByIdsAsync(fieldIds, cancellationToken));
            }
        }

        var familyAccesses = await _familyMembers.GetActiveByLinkedUserIdAllAsync(userId, cancellationToken);
        foreach (var access in familyAccesses.Where(a =>
                     a.Modules.Any(m => string.Equals(m, FamilyModules.Fields, StringComparison.OrdinalIgnoreCase))))
        {
            fields.AddRange(await _fieldRepository.GetByOwnerIdAsync(access.OwnerUserId, cancellationToken));
        }

        var includeDocuments = userRole == Roles.FieldOwner || userRole == Roles.Administrator;
        return fields.DistinctBy(f => f.Id).Select(f =>
        {
            FieldMembershipSync.EnsureBackfilled(f);
            var familyDocs = familyAccesses.Any(a =>
                string.Equals(a.OwnerUserId, f.OwnerId, StringComparison.Ordinal)
                && a.Modules.Any(m => string.Equals(m, FamilyModules.Documents, StringComparison.OrdinalIgnoreCase)));
            return FieldMapper.ToDto(
                f,
                includeDocuments
                || FieldMembershipSync.HasCapacity(f, userId, FieldCapacities.Own)
                || familyDocs);
        });
    }

    public async Task<FieldDto> UpdateFieldAsync(string id, string userId, UpdateFieldDto updateFieldDto, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (field.OwnerId != userId)
        {
            throw new ForbiddenException("You do not have permission to update this field.");
        }

        ApplyUpdate(field, updateFieldDto);
        field.UpdatedAt = _dateTimeProvider.UtcNow;

        var updatedField = await _fieldRepository.UpdateAsync(field, cancellationToken);
        return FieldMapper.ToDto(updatedField);
    }

    public async Task<bool> DeleteFieldAsync(string id, string userId, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken);
        if (field == null)
        {
            return false;
        }

        if (field.OwnerId != userId)
        {
            throw new ForbiddenException("You do not have permission to delete this field.");
        }

        return await _fieldRepository.DeleteAsync(id, cancellationToken);
    }

    public async Task AssignProducerAsync(string fieldId, string ownerId, string producerId, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        FieldMembershipSync.EnsureBackfilled(field);
        if (!FieldMembershipSync.HasCapacity(field, ownerId, FieldCapacities.Own) && field.OwnerId != ownerId)
        {
            throw new ForbiddenException("You do not have permission to assign producers to this field.");
        }

        var producer = await _userRepository.GetByIdAsync(producerId, cancellationToken)
            ?? throw new ValidationException("User is not a valid producer.");

        FieldMembershipSync.Upsert(field, producerId, [FieldCapacities.Work], ownerId);
        await _fieldRepository.UpdateAsync(field, cancellationToken);
        await _activityService.RecordAsync(
            fieldId,
            "producer_assigned",
            "Producer assigned to field",
            ownerId,
            metadata: new Dictionary<string, string> { ["producerId"] = producerId },
            cancellationToken: cancellationToken);
        _logger.LogInformation("Producer {ProducerId} assigned to field {FieldId}", producerId, fieldId);
    }

    public async Task UnassignProducerAsync(string fieldId, string ownerId, string producerId, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        FieldMembershipSync.EnsureBackfilled(field);
        if (!FieldMembershipSync.HasCapacity(field, ownerId, FieldCapacities.Own) && field.OwnerId != ownerId)
        {
            throw new ForbiddenException("You do not have permission to unassign producers from this field.");
        }

        try
        {
            FieldMembershipSync.Remove(field, producerId);
        }
        catch (InvalidOperationException)
        {
            if (field.AssignedProducerIds.Remove(producerId))
            {
                await _fieldRepository.UpdateAsync(field, cancellationToken);
            }

            return;
        }

        await _fieldRepository.UpdateAsync(field, cancellationToken);
        await _activityService.RecordAsync(
            fieldId,
            "producer_unassigned",
            "Producer removed from field",
            ownerId,
            metadata: new Dictionary<string, string> { ["producerId"] = producerId },
            cancellationToken: cancellationToken);
        _logger.LogInformation("Producer {ProducerId} unassigned from field {FieldId}", producerId, fieldId);
    }

    public async Task<IEnumerable<string>> GetAssignedProducerIdsAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to view producer assignments.");
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        return field.AssignedProducerIds;
    }

    public async Task<ImportGreekCadastreFieldResponse> ImportGreekCadastreAsync(
        string ownerId,
        Stream kdFile,
        string kdFileName,
        Stream kfFile,
        string kfFileName,
        CancellationToken cancellationToken = default)
    {
        if (!kdFileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
            !kfFileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Both KD and KF files must be PDF documents.");
        }

        var parseResult = await _greekCadastrePdfParser.ParseAsync(kdFile, kfFile, cancellationToken);
        var now = _dateTimeProvider.UtcNow;

        var suggestedName = BuildSuggestedName(parseResult);
        var cadastre = new GreekCadastreInfo
        {
            Kaek = parseResult.Kaek,
            NormalizedKaek = parseResult.NormalizedKaek,
            OfficialAreaSqm = parseResult.OfficialAreaSqm,
            TitleAreaSqm = parseResult.TitleAreaSqm,
            TitleAreaRaw = parseResult.TitleAreaRaw,
            LocationFromCadastre = parseResult.LocationText,
            CadastralOffice = parseResult.CadastralOffice,
            Prefecture = parseResult.Prefecture,
            Municipality = parseResult.Municipality,
            PostalCode = parseResult.PostalCode,
            CoordinateSystem = parseResult.CoordinateSystem,
            MapScale = parseResult.MapScale,
            ExtractPrintDate = parseResult.ExtractPrintDate,
            Source = "UserUploadedPdf",
            VerificationStatus = "NeedsUserConfirmation"
        };

        var field = new FieldEntity
        {
            OwnerId = ownerId,
            Name = suggestedName,
            CropType = "Olive",
            LocationText = parseResult.LocationText,
            Status = FieldStatus.NeedsBoundaryConfirmation,
            GreekCadastre = cadastre,
            Area = parseResult.OfficialAreaSqm ?? 0,
            CurrentLifecycleYear = "low",
            CurrentLifecycleStage = OliveLifecycleStage.Dormancy,
            Color = PickDefaultFieldColor(suggestedName),
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _fieldRepository.CreateAsync(field, cancellationToken);

        if (kdFile.CanSeek)
        {
            kdFile.Position = 0;
        }

        if (kfFile.CanSeek)
        {
            kfFile.Position = 0;
        }

        var kdPath = await _fileStorageService.SaveFieldDocumentAsync(kdFile, created.Id, kdFileName, "application/pdf", cancellationToken);
        var kfPath = await _fileStorageService.SaveFieldDocumentAsync(kfFile, created.Id, kfFileName, "application/pdf", cancellationToken);

        created.Documents.Add(new FieldDocumentAttachment
        {
            Type = "GreekCadastreSpatialPdf",
            FileName = kdFileName,
            StoragePath = kdPath,
            UploadedAt = now
        });
        created.Documents.Add(new FieldDocumentAttachment
        {
            Type = "GreekCadastreDescriptivePdf",
            FileName = kfFileName,
            StoragePath = kfPath,
            UploadedAt = now
        });
        created = await _fieldRepository.UpdateAsync(created, cancellationToken);

        var duplicateIds = new List<string>();
        if (!string.IsNullOrWhiteSpace(parseResult.NormalizedKaek))
        {
            var duplicates = await _fieldRepository.GetByOwnerAndNormalizedKaekAsync(
                ownerId,
                parseResult.NormalizedKaek,
                cancellationToken);
            duplicateIds = duplicates.Where(f => f.Id != created.Id).Select(f => f.Id).ToList();
        }

        var warnings = new List<string>(parseResult.Warnings);
        if (duplicateIds.Count > 0)
        {
            warnings.Add("You already have a field with this KAEK. You can open the existing field or continue creating another operational field.");
        }

        return new ImportGreekCadastreFieldResponse
        {
            DraftFieldId = created.Id,
            SuggestedName = suggestedName,
            GreekCadastre = FieldMapper.ToCadastreDto(cadastre),
            Warnings = warnings,
            MissingRequiredConfirmation = new List<string> { "Boundary", "Crop details", "User confirmation" },
            DuplicateKaekFieldIds = duplicateIds
        };
    }

    public async Task<FieldDto> UpdateBoundaryAsync(
        string id,
        string userId,
        UpdateFieldBoundaryRequest request,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (field.OwnerId != userId)
        {
            throw new ForbiddenException("You do not have permission to update this field boundary.");
        }

        var polygon = FieldMapper.ToPolygonEntity(request.Boundary);
        ApplyBoundary(field, polygon);

        if (field.GreekCadastre?.OfficialAreaSqm is > 0 && field.AppMeasuredAreaSqm is > 0)
        {
            var validation = _fieldAreaValidationService.Validate(
                field.AppMeasuredAreaSqm.Value,
                field.GreekCadastre.OfficialAreaSqm,
                field.TreeCount);
            field.GreekCadastre.AreaDifferenceSqm = validation.DifferenceSqm;
            field.GreekCadastre.AreaDifferencePercent = validation.DifferencePercent;
            field.Status = validation.Severity == "Ok"
                ? FieldStatus.Draft
                : FieldStatus.NeedsAreaReview;
        }
        else if (field.Status == FieldStatus.NeedsBoundaryConfirmation)
        {
            field.Status = FieldStatus.Draft;
        }

        field.UpdatedAt = _dateTimeProvider.UtcNow;
        var updated = await _fieldRepository.UpdateAsync(field, cancellationToken);
        await QueueFieldIntelligenceAsync(updated.Id, cancellationToken);
        return FieldMapper.ToDto(updated);
    }

    public async Task<FieldAreaValidationResponse> ValidateAreaAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(id, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (field.AppMeasuredAreaSqm is not > 0)
        {
            throw new ValidationException("Field does not have a measured boundary area yet.");
        }

        return _fieldAreaValidationService.Validate(
            field.AppMeasuredAreaSqm.Value,
            field.GreekCadastre?.OfficialAreaSqm,
            field.TreeCount);
    }

    public async Task<ActivateFieldResponse> ActivateFieldAsync(
        string id,
        string userId,
        string userRole,
        ActivateFieldRequest request,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (field.OwnerId != userId)
        {
            throw new ForbiddenException("You do not have permission to activate this field.");
        }

        if (!request.BoundaryConfirmed)
        {
            throw new ValidationException("Boundary confirmation is required before activation.");
        }

        if (field.GreekCadastre != null && !request.CadastreReferenceAcknowledged)
        {
            throw new ValidationException("Cadastre reference acknowledgement is required before activation.");
        }

        if (string.IsNullOrWhiteSpace(field.Name))
        {
            throw new ValidationException("Field name is required.");
        }

        if (string.IsNullOrWhiteSpace(field.CropType))
        {
            throw new ValidationException("Crop type is required.");
        }

        if (field.Boundary == null)
        {
            throw new ValidationException("Boundary polygon is required before activation.");
        }

        field.Status = FieldStatus.Active;
        field.UpdatedAt = _dateTimeProvider.UtcNow;
        var updated = await _fieldRepository.UpdateAsync(field, cancellationToken);

        var lifecycleInitialized = false;
        var suggestLifecyclePlan = false;
        if (string.Equals(field.CropType, "Olive", StringComparison.OrdinalIgnoreCase))
        {
            var existingLifecycle = await _lifecycleRepository.GetByFieldIdAsync(id, cancellationToken);
            if (existingLifecycle == null)
            {
                await _lifecycleService.InitializeLifecycleAsync(id, userId, userRole, cancellationToken);
                lifecycleInitialized = true;
            }

            suggestLifecyclePlan = true;
        }

        await QueueFieldHistoryBackfillAsync(updated.Id, cancellationToken);

        return new ActivateFieldResponse
        {
            Field = FieldMapper.ToDto(updated),
            LifecycleInitialized = lifecycleInitialized,
            SuggestLifecyclePlan = suggestLifecyclePlan
        };
    }

    public async Task<FieldDto> UploadDocumentAsync(
        string id,
        string userId,
        string userRole,
        Stream file,
        string fileName,
        string documentType,
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldDocumentsAsync(id, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have permission to upload documents for this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        var isOwner = field.OwnerId == userId || userRole == Roles.Administrator;
        var familyCanUpload = await _fieldAccessService.CanFamilyWriteModuleAsync(
            id, userId, FamilyModules.Documents, requireCreateLevel: true, cancellationToken);
        if (!isOwner && !familyCanUpload)
        {
            throw new ForbiddenException("You do not have permission to upload documents for this field.");
        }

        var path = await _fileStorageService.SaveFieldDocumentAsync(file, id, fileName, "application/pdf", cancellationToken);
        field.Documents.Add(new FieldDocumentAttachment
        {
            Type = string.IsNullOrWhiteSpace(documentType) ? "Other" : documentType,
            FileName = fileName,
            StoragePath = path,
            UploadedAt = _dateTimeProvider.UtcNow
        });
        field.UpdatedAt = _dateTimeProvider.UtcNow;

        var updated = await _fieldRepository.UpdateAsync(field, cancellationToken);
        return FieldMapper.ToDto(updated);
    }

    private void ApplyBoundary(FieldEntity field, GeoJsonPolygon polygon)
    {
        var areaResult = _fieldAreaCalculator.Calculate(polygon);
        field.Boundary = polygon;
        field.AppMeasuredAreaSqm = areaResult.AreaSqm;
        field.Area = areaResult.AreaSqm;
        field.CenterPoint = areaResult.CenterPoint;
        field.Location = new Location
        {
            Latitude = areaResult.CenterPoint.Coordinates[1],
            Longitude = areaResult.CenterPoint.Coordinates[0]
        };
    }

    private void ApplyUpdate(FieldEntity field, UpdateFieldDto updateFieldDto)
    {
        if (!string.IsNullOrEmpty(updateFieldDto.Name))
        {
            field.Name = updateFieldDto.Name;
        }

        if (!string.IsNullOrWhiteSpace(updateFieldDto.CropType))
        {
            field.CropType = updateFieldDto.CropType;
        }

        if (updateFieldDto.LocationText != null)
        {
            field.LocationText = updateFieldDto.LocationText;
        }

        if (updateFieldDto.Area.HasValue)
        {
            field.Area = updateFieldDto.Area.Value;
            if (field.Boundary == null)
            {
                field.AppMeasuredAreaSqm = updateFieldDto.Area.Value;
            }
        }

        if (updateFieldDto.Variety != null)
        {
            field.Variety = updateFieldDto.Variety;
        }

        if (updateFieldDto.TreeAge.HasValue)
        {
            field.TreeAge = updateFieldDto.TreeAge;
        }

        if (updateFieldDto.TreeCount.HasValue)
        {
            field.TreeCount = updateFieldDto.TreeCount;
        }

        if (updateFieldDto.GroundType != null)
        {
            field.GroundType = updateFieldDto.GroundType;
            field.SoilType ??= updateFieldDto.GroundType;
        }

        if (updateFieldDto.SoilType != null)
        {
            field.SoilType = updateFieldDto.SoilType;
        }

        if (updateFieldDto.IrrigationStatus.HasValue)
        {
            field.IrrigationStatus = updateFieldDto.IrrigationStatus.Value;
        }

        if (updateFieldDto.IrrigationType != null)
        {
            field.IrrigationType = updateFieldDto.IrrigationType;
        }

        if (updateFieldDto.Slope != null)
        {
            field.Slope = updateFieldDto.Slope;
        }

        if (updateFieldDto.AccessNotes != null)
        {
            field.AccessNotes = updateFieldDto.AccessNotes;
        }

        if (updateFieldDto.Color != null)
        {
            field.Color = NormalizeFieldColor(updateFieldDto.Color) ?? field.Color;
        }

        if (updateFieldDto.GreekCadastre != null)
        {
            field.GreekCadastre = FieldMapper.ToCadastreEntity(updateFieldDto.GreekCadastre);
            if (!string.IsNullOrWhiteSpace(field.GreekCadastre.Kaek) &&
                _kaekNormalizer.TryNormalize(field.GreekCadastre.Kaek, out var normalized))
            {
                field.GreekCadastre.NormalizedKaek = normalized;
            }
        }

        if (updateFieldDto.Boundary != null)
        {
            ApplyBoundary(field, FieldMapper.ToPolygonEntity(updateFieldDto.Boundary));
        }
        else if (updateFieldDto.Latitude.HasValue && updateFieldDto.Longitude.HasValue)
        {
            field.Location = new Location
            {
                Latitude = updateFieldDto.Latitude.Value,
                Longitude = updateFieldDto.Longitude.Value
            };
            field.CenterPoint = new GeoJsonPoint
            {
                Type = "Point",
                Coordinates = new List<double> { updateFieldDto.Longitude.Value, updateFieldDto.Latitude.Value }
            };
        }
    }

    /// <summary>
    /// Queues terrain/weather/environment processing and a satellite search.
    /// Failures here must not fail the field save itself.
    /// </summary>
    private async Task QueueFieldIntelligenceAsync(string fieldId, CancellationToken cancellationToken)
    {
        try
        {
            await _geospatialJobQueue.EnqueueSpatialProfileAsync(fieldId, cancellationToken);
            await _geospatialJobQueue.EnqueueSatelliteProcessingAsync(fieldId, null, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Could not queue geospatial processing for field {FieldId}", fieldId);
        }
    }

    /// <summary>
    /// Starts the multi-year weather and satellite backfill only after activation
    /// terms have been accepted and the field add is complete.
    /// </summary>
    private async Task QueueFieldHistoryBackfillAsync(string fieldId, CancellationToken cancellationToken)
    {
        try
        {
            await _geospatialJobQueue.EnqueueFieldHistoryBackfillAsync(fieldId, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Could not queue history backfill for field {FieldId}", fieldId);
        }
    }

    private static readonly string[] DefaultFieldColors =
    {
        "#2F6B4F", "#3D6EA8", "#C47A1A", "#8B5E3C",
        "#5B7C99", "#6B8F3A", "#A65D4E", "#5C6B8A"
    };

    private static string? NormalizeFieldColor(string? color)
    {
        if (string.IsNullOrWhiteSpace(color))
        {
            return null;
        }

        var trimmed = color.Trim();
        return System.Text.RegularExpressions.Regex.IsMatch(trimmed, "^#[0-9A-Fa-f]{6}$")
            ? trimmed.ToUpperInvariant()
            : null;
    }

    private static string PickDefaultFieldColor(string? seed)
    {
        var hash = 0;
        foreach (var ch in seed ?? string.Empty)
        {
            hash = unchecked((hash * 31) + ch);
        }

        var index = Math.Abs(hash) % DefaultFieldColors.Length;
        return DefaultFieldColors[index];
    }

    private static string BuildSuggestedName(GreekCadastreParseResult parseResult)
    {
        var municipality = parseResult.Municipality?.Trim();
        var suffix = parseResult.NormalizedKaek?.Split('/').FirstOrDefault();
        suffix = suffix?.Length >= 3 ? suffix[^3..] : suffix;

        if (!string.IsNullOrWhiteSpace(municipality) && !string.IsNullOrWhiteSpace(suffix))
        {
            return $"Olive Field - {municipality} - {suffix}";
        }

        if (!string.IsNullOrWhiteSpace(municipality))
        {
            return $"Olive Field - {municipality}";
        }

        return "Olive Field - Cadastre Import";
    }
}

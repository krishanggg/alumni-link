<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AlumniPrivacy;
use App\Enums\ReportFormat;
use App\Enums\ReportLifecycleStatus;
use App\Enums\ReportType;
use App\Enums\ReportVisibility;
use App\Exceptions\BusinessRuleException;
use App\Http\Requests\Report\GenerateReportRequest;
use App\Http\Requests\Report\PreviewReportRequest;
use App\Http\Requests\Report\PublishedReportRequest;
use App\Http\Resources\ReportResource;
use App\Http\Resources\SchoolResource;
use App\Models\ActivityLog;
use App\Models\Report;
use App\Models\School;
use App\Notifications\ReportCompletedNotification;
use App\Services\ExpoPushService;
use App\Services\NotificationDispatchService;
use App\Services\ReportService;
use App\Support\Pagination;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly ReportService $reportService,
        private readonly NotificationDispatchService $notifications = new NotificationDispatchService(new ExpoPushService),
    ) {}

    public function types(): JsonResponse
    {
        $this->authorize('viewAny', Report::class);

        return response()->json(ReportType::labels());
    }

    public function generate(GenerateReportRequest $request): JsonResponse
    {
        $this->authorize('generate', Report::class);

        $reportType = $request->input('report_type');
        $format = $request->input('format', ReportFormat::Pdf);
        $filters = $this->scopedFilters($request->input('filters', []), $request);
        $title = trim((string) $request->input('title', ''));

        if ($title === '') {
            $title = $this->reportService->defaultTitle(ReportType::from($reportType)->label(), $filters);
        }

        // Title participates in the de-duplication match so that regenerating the
        // same report under a new name still produces a distinct report.
        $existing = Report::where('report_type', $reportType)
            ->where('format', $format)
            ->where('title', $title)
            ->where('generated_by', $request->user()?->id)
            ->where('created_at', '>=', now()->subMinutes(5))
            ->get()
            ->first(fn (Report $r) => ($r->filters ?? []) == $filters);

        if ($existing) {
            return response()->json([
                'report_id' => $existing->id,
                'report_type' => $existing->report_type,
                'title' => $existing->title,
                'format' => $existing->format,
                'download_url' => "/api/reports/{$existing->id}/download",
                'generated_at' => $existing->created_at->toIso8601String(),
            ], 200);
        }

        $data = $this->reportService->generateReportData($reportType, $filters);
        $data = $this->reportService->stripInternalColumns($data);
        $this->guardReportHasData($reportType, $data);

        $filePath = $this->reportService->storeReportFile($data, $reportType, $format, $title, $filters);

        $report = Report::create([
            'report_type' => $reportType,
            'title' => $title,
            'filters' => $filters,
            'format' => $format,
            'visibility' => ReportVisibility::AdminOnly,
            'lifecycle_status' => ReportLifecycleStatus::Active,
            'school_id' => $filters['school_id'] ?? null,
            'file_path' => $filePath,
            'file_size' => $filePath ? Storage::disk('local')->size($filePath) : null,
            'generated_by' => $request->user()?->id,
        ]);

        ActivityLog::log(
            $request->user()?->id,
            'report.generated',
            Report::class,
            $report->id,
            "Report '{$title}' generated",
            null,
            $request->ip(),
        );

        if ($request->user()) {
            $this->notifications->notify(
                $request->user(),
                'report_completion',
                new ReportCompletedNotification($report),
                'Report ready',
                "Your report \"{$title}\" is ready.",
            );
        }

        return response()->json([
            'report_id' => $report->id,
            'report_type' => $reportType,
            'title' => $title,
            'format' => $format,
            'download_url' => "/api/reports/{$report->id}/download",
            'generated_at' => now()->toIso8601String(),
        ], 201);
    }

    public function preview(PreviewReportRequest $request): JsonResponse
    {
        $this->authorize('preview', Report::class);

        $reportType = $request->input('report_type');
        $filters = $this->scopedFilters($request->input('filters', []), $request);

        $data = $this->reportService->generateReportData($reportType, $filters);
        $data = $this->reportService->stripInternalColumns($data);

        return response()->json([
            'report' => [
                'title' => $this->reportService->defaultTitle(ReportType::from($reportType)->label(), $filters),
                'report_type' => $reportType,
                'filters' => $filters,
                'created_at' => now()->toIso8601String(),
            ],
            'data' => $data,
            'school' => $this->schoolForFilters($filters),
        ]);
    }

    /**
     * Renders the branded PDF for the given selections on the fly (never
     * persisted) and returns it base64-encoded inside a JSON envelope rather
     * than as an application/pdf response — the latter gets hijacked by
     * download-manager browser extensions before the SPA can read it.
     */
    public function previewPdf(PreviewReportRequest $request): JsonResponse
    {
        $this->authorize('preview', Report::class);

        $reportType = $request->input('report_type');
        $filters = $this->scopedFilters($request->input('filters', []), $request);
        $title = $this->reportService->defaultTitle(ReportType::from($reportType)->label(), $filters);

        $data = $this->reportService->generateReportData($reportType, $filters);
        $data = $this->reportService->stripInternalColumns($data);
        $this->guardReportHasData($reportType, $data);

        return response()->json([
            'pdf' => base64_encode($this->reportService->renderPdf($data, $reportType, $title, $filters)),
        ]);
    }

    public function show(Report $report): JsonResponse
    {
        $this->authorize('view', $report);

        $filters = $report->filters ?? [];
        $data = $this->reportService->generateReportData($report->report_type, $filters);
        $data = $this->reportService->stripInternalColumns($data);

        return response()->json([
            'report' => new ReportResource($report),
            'data' => $data,
            'school' => $this->schoolForFilters($filters),
        ]);
    }

    private function schoolForFilters(array $filters): ?SchoolResource
    {
        if (empty($filters['school_id'])) {
            return null;
        }

        $school = School::find($filters['school_id']);

        return $school ? new SchoolResource($school) : null;
    }

    public function download(Request $request, Report $report): BinaryFileResponse|StreamedResponse|JsonResponse
    {
        try {
            $this->authorize('download', $report);
        } catch (AuthorizationException) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if (! $report->file_path || ! Storage::disk('local')->exists($report->file_path)) {
            return response()->json(['message' => 'Report file not found.'], 404);
        }

        if ($report->format === ReportFormat::Pdf) {
            $pdf = $this->reportService->renderPdfForRequest($report);

            return response()->streamDownload(
                static function () use ($pdf): void {
                    echo $pdf;
                },
                $this->reportService->filename($report),
                [
                    'Content-Type' => 'application/pdf',
                    'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                    'Pragma' => 'no-cache',
                    'Expires' => '0',
                ],
            );
        }

        return response()->download(
            Storage::disk('local')->path($report->file_path),
            $this->reportService->filename($report),
        );
    }

    /**
     * Returns the stored report file base64-encoded inside JSON (PDF only) —
     * the print-preview modal renders it client-side, and a real
     * application/pdf response would be hijacked by download-manager
     * extensions before the SPA could read it.
     */
    public function previewFile(Request $request, Report $report): JsonResponse|Response
    {
        try {
            $this->authorize('download', $report);
        } catch (AuthorizationException) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if (! $report->file_path || ! Storage::disk('local')->exists($report->file_path)) {
            return response()->json(['message' => 'Report file not found.'], 404);
        }

        if ($report->format === ReportFormat::Xlsx) {
            $spreadsheet = IOFactory::load(Storage::disk('local')->path($report->file_path));
            $writer = IOFactory::createWriter($spreadsheet, 'Html');
            $writer->setSheetIndex(0);
            ob_start();
            $writer->save('php://output');
            $html = (string) ob_get_clean();
            $spreadsheet->disconnectWorksheets();

            return response($html, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        if ($report->format !== ReportFormat::Pdf) {
            return response()->json(['message' => 'Preview is only available for PDF and Excel reports.'], 422);
        }

        return response()->json([
            'pdf' => base64_encode($this->reportService->renderPdfForRequest($report)),
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    public function history(Request $request): JsonResponse
    {
        $this->authorize('history', Report::class);

        $status = $request->input('status', ReportVisibility::AdminOnly->value);
        $query = Report::with('school');

        if ($request->user()?->isSchoolAdmin()) {
            $query->where('school_id', $request->user()->school_id);
        } elseif ($request->filled('school_id')) {
            $query->where('school_id', $request->input('school_id'));
        }

        match ($status) {
            ReportLifecycleStatus::Active->value => $query->where('lifecycle_status', ReportLifecycleStatus::Active),
            ReportVisibility::Published->value => $query->where('visibility', ReportVisibility::Published)->where('lifecycle_status', ReportLifecycleStatus::Active),
            ReportLifecycleStatus::Archived->value => $query->where('lifecycle_status', ReportLifecycleStatus::Archived),
            default => $query->where('visibility', ReportVisibility::AdminOnly)->where('lifecycle_status', ReportLifecycleStatus::Active),
        };

        $query->orderBy('created_at', 'desc');

        $results = $request->boolean('all')
            ? Pagination::boundedAll($query)
            : $query->paginate(Pagination::clampPerPage((int) $request->input('per_page', 15), 15));

        return response()->json(
            $results instanceof LengthAwarePaginator
                ? ReportResource::collection($results)->response()->getData(true)
                : $this->collectionResource($results, ReportResource::class),
        );
    }

    public function published(PublishedReportRequest $request): JsonResponse
    {
        $this->authorize('viewPublished', Report::class);

        $user = $request->user();
        $schoolId = $user->school_id;
        $reportType = $request->validated('report_type');

        $query = Report::where('visibility', ReportVisibility::Published)
            ->where('lifecycle_status', ReportLifecycleStatus::Active)
            ->where(function ($q) use ($schoolId) {
                $q->whereNull('school_id');

                if ($schoolId !== null) {
                    $q->orWhere('school_id', $schoolId);
                }
            });

        if ($reportType !== null) {
            $query->where('report_type', $reportType);
        }

        $reports = $query
            ->orderBy('published_at', 'desc')
            ->paginate(Pagination::clampPerPage((int) $request->input('per_page', 15), 15));

        return ReportResource::collection($reports)->response();
    }

    public function publish(Request $request, Report $report): JsonResponse
{
    $this->authorize('publish', $report);

    // Archived reports must be restored before publishing.
    if ($report->lifecycle_status === ReportLifecycleStatus::Archived) {
        return response()->json([
            'message' => 'Archived reports must be restored before they can be published.',
        ], 422);
    }

    // Do not publish or notify twice for an already-published report.
    if ($report->visibility === ReportVisibility::Published) {
        return response()->json([
            'message' => 'Report already published.',
        ]);
    }

    // Generate the latest report data.
    $data = $this->reportService->generateReportData(
        $report->report_type,
        $report->filters ?? []
    );

    // Remove fields that should not appear in a published report.
    $data = $this->reportService->filterReportDataForPublish($data);

    // Preserve the existing report privacy validation.
    if ($this->containsUnsafeFields($data)) {
        return response()->json([
            'message' => 'This report contains fields that are not safe to publish to alumni.',
        ], 422);
    }

    $oldPath = $report->file_path;

    // Generate the publishable report file.
    $newPath = $this->reportService->storeReportFile(
        $data,
        $report->report_type,
        $report->format,
        $report->title,
        $report->filters ?? []
    );

    // Mark the report as published.
    $report->update([
        'visibility' => ReportVisibility::Published,
        'published_at' => now(),
        'file_path' => $newPath,
        'file_size' => $newPath
            ? Storage::disk('local')->size($newPath)
            : null,
    ]);

    // Remove the previous file only when it has been replaced.
    if (
        $oldPath &&
        $oldPath !== $newPath &&
        Storage::disk('local')->exists($oldPath)
    ) {
        Storage::disk('local')->delete($oldPath);
    }

    // Record the publishing activity.
    ActivityLog::log(
        $request->user()?->id,
        'report.published',
        Report::class,
        $report->id,
        "Report '{$report->title}' published",
        null,
        $request->ip(),
    );

    // Refresh the report before selecting notification recipients.
    $report->refresh();

    /**
     * Notify only approved alumni matching the saved report filters.
     *
     * The notification service:
     * - Checks the report's school.
     * - Checks graduation year range.
     * - Checks section/strand.
     * - Checks gender.
     * - Respects Report Completion notification preferences.
     * - Sends an Expo push to registered devices.
     */
    try {
        app(\App\Services\PublishedReportNotificationService::class)
            ->notifyEligibleAlumni($report);
    } catch (\Throwable $exception) {
        // Notification failures must not undo a published report.
        \Illuminate\Support\Facades\Log::error(
            'Published report notification dispatch failed.',
            [
                'report_id' => $report->id,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]
        );
    }

    return response()->json([
        'message' => 'Report published.',
    ]);
}

    public function unpublish(Request $request, Report $report): JsonResponse
    {
        $this->authorize('unpublish', $report);

        $report->update(['visibility' => ReportVisibility::AdminOnly, 'published_at' => null]);

        ActivityLog::log(
            $request->user()?->id,
            'report.unpublished',
            Report::class,
            $report->id,
            "Report '{$report->title}' unpublished",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Report unpublished.']);
    }

    public function archive(Request $request, Report $report): JsonResponse
    {
        $this->authorize('archive', $report);

        $wasPublished = $report->visibility === ReportVisibility::Published;
        $report->update([
            'lifecycle_status' => ReportLifecycleStatus::Archived,
            'archived_at' => now(),
            'visibility' => ReportVisibility::AdminOnly,
        ]);

        $desc = $wasPublished
            ? "Report '{$report->title}' archived and unpublished"
            : "Report '{$report->title}' archived";

        ActivityLog::log(
            $request->user()?->id,
            'report.archived',
            Report::class,
            $report->id,
            $desc,
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Report archived.']);
    }

    public function restore(Request $request, Report $report): JsonResponse
    {
        $this->authorize('restore', $report);

        if ($report->lifecycle_status !== ReportLifecycleStatus::Archived) {
            return response()->json(['message' => 'Report is not archived.'], 422);
        }

        $report->update([
            'lifecycle_status' => ReportLifecycleStatus::Active,
            'archived_at' => null,
        ]);

        ActivityLog::log(
            $request->user()?->id,
            'report.restored',
            Report::class,
            $report->id,
            "Report '{$report->title}' restored from archive",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Report restored.']);
    }

    public function destroy(Request $request, Report $report): JsonResponse
    {
        $this->authorize('delete', $report);

        $desc = "Report '{$report->title}' deleted";

        if ($report->file_path && Storage::disk('local')->exists($report->file_path)) {
            Storage::disk('local')->delete($report->file_path);
        }

        $report->delete();

        ActivityLog::log(
            $request->user()?->id,
            'report.deleted',
            Report::class,
            null,
            $desc,
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Report deleted.']);
    }

    public function statsSummary(Request $request): JsonResponse
    {
        $this->authorize('statsSummary', Report::class);

        $query = Report::query();
        if ($request->user()?->isSchoolAdmin()) {
            $query->where('school_id', $request->user()->school_id);
        } elseif ($request->filled('school_id')) {
            $query->where('school_id', $request->input('school_id'));
        }

        $total = (clone $query)->count();
        $published = (clone $query)->where('visibility', ReportVisibility::Published)->where('lifecycle_status', ReportLifecycleStatus::Active)->count();
        $archived = (clone $query)->where('lifecycle_status', ReportLifecycleStatus::Archived)->count();

        return response()->json([
            'total_reports' => $total,
            'published_reports' => $published,
            'archived_reports' => $archived,
        ]);
    }

    /**
     * Safety net for publish(): recursively scans generated report data for field names that
     * must never reach approved alumni, per specs/00-implementation-decisions.md §8. All six
     * current report types are alumni-safe by construction (generateReportData() never selects
     * these columns), but this guards against a future report type accidentally including them.
     *
     * Also checks that no private-profile alumni appear in the data, catching any scenario
     * where the primary privacy filter in generateReportData() is bypassed.
     */
    private const UNSAFE_FIELDS = [
        'contact_number', 'contact_email', 'address', 'birthdate',
        'student_id', 'created_by', 'updated_by', 'deleted_at',
        'middle_name', 'suffix',
    ];

    private function containsUnsafeFields(array $data): bool
    {
        foreach ($data as $key => $value) {
            if (is_string($key) && in_array($key, self::UNSAFE_FIELDS, true)) {
                return true;
            }

            if (is_string($key) && $key === 'privacy' && $value === AlumniPrivacy::Private->value) {
                return true;
            }

            if (is_array($value) && $this->containsUnsafeFields($value)) {
                return true;
            }
        }

        return false;
    }

    private function scopedFilters(array $filters, Request $request): array
    {
        if ($request->user()?->isSchoolAdmin()) {
            $filters['school_id'] = $request->user()->school_id;
        }

        return $filters;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function guardReportHasData(string $reportType, array $data): void
    {
        if (! $this->reportService->hasReportData($reportType, $data)) {
            throw new BusinessRuleException(
                'This report has no alumni to show yet — no records match the selected filters.',
                422,
            );
        }
    }
}

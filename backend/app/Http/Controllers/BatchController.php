<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreCompareRequest;
use App\Http\Requests\UpdateBatchNoteRequest;
use App\Http\Resources\AlumniResource;
use App\Http\Resources\DirectoryResource;
use App\Models\Alumni;
use App\Services\BatchService;
use App\Services\ReportService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    public function __construct(
        private readonly BatchService $batchService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewBatchAny', Alumni::class);

        $batches = $this->batchService->list(
            $request->user(),
            $this->schoolScope($request),
            (string) $request->input('sort'),
            $request->filled('min_year') ? (int) $request->input('min_year') : null,
            $request->filled('max_year') ? (int) $request->input('max_year') : null,
        );

        return response()->json($batches);
    }

    public function show(Request $request, int $year): JsonResponse
    {
        $this->authorize('viewBatch', Alumni::class);

        $isAdmin = $request->user()->isAdmin();

        $results = $this->batchService->alumniForYear($year, $request->user(), $this->schoolScope($request), $request->all());

        $resourceClass = $isAdmin ? AlumniResource::class : DirectoryResource::class;

        if ($results instanceof LengthAwarePaginator) {
            return response()->json($resourceClass::collection($results)->response()->getData(true));
        }

        return response()->json($this->collectionResource($results, $resourceClass));
    }

    public function stats(Request $request, int $year): JsonResponse
    {
        $this->authorize('viewBatchStats', Alumni::class);

        $stats = $this->batchService->statsForYear($year, $request->user(), $this->schoolScope($request));

        return response()->json($stats);
    }

    public function compare(StoreCompareRequest $request): JsonResponse
    {
        $this->authorize('compareBatches', Alumni::class);

        $validated = $request->validated();
        $schoolId = $request->user()?->isSchoolAdmin()
            ? $request->user()->school_id
            : ($request->user()?->isSuperAdmin() ? ($validated['school_id'] ?? null) : null);

        $comparison = $this->batchService->compare($validated['years'], $schoolId);

        return response()->json($comparison);
    }

    public function notes(UpdateBatchNoteRequest $request, int $year): JsonResponse
    {
        $this->authorize('manageBatchNotes', Alumni::class);

        $note = $request->validated()['note'] ?? null;

        $schoolId = $this->schoolScope($request);
        if ($schoolId === null) {
            return response()->json([
                'message' => 'Select a school before editing a batch note.',
            ], 422);
        }

        $this->batchService->setNote($year, $schoolId, $note, $request->user()->id);

        return response()->json(['note' => $note]);
    }

    public function getNote(Request $request, int $year): JsonResponse
    {
        $this->authorize('manageBatchNotes', Alumni::class);

        $schoolId = $this->schoolScope($request);
        if ($schoolId === null) {
            return response()->json([
                'message' => 'Select a school before viewing a batch note.',
            ], 422);
        }

        return response()->json(['note' => $this->batchService->getNote($year, $schoolId)]);
    }

    public function export(Request $request, int $year, ReportService $reportService): JsonResponse
    {
        $this->authorize('exportBatch', Alumni::class);

        $schoolId = $this->schoolScope($request);
        $rows = $this->batchService->exportRows($year, $schoolId)->toArray();

        $csv = $reportService->arrayToCsv($rows);

        return response()->json([
            'data' => base64_encode($csv),
            'filename' => "batch_{$year}_export.csv",
        ]);
    }

    private function schoolScope(Request $request): ?int
    {
        $user = $request->user();

        if ($user?->isSchoolAdmin()) {
            return $user->school_id;
        }

        if ($user?->isSuperAdmin() && $request->filled('school_id')) {
            return (int) $request->input('school_id');
        }

        return null;
    }
}

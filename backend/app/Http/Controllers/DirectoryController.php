<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\DirectoryResource;
use App\Models\Alumni;
use App\Services\DirectoryService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DirectoryController extends Controller
{
    public function __construct(
        private readonly DirectoryService $directoryService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewDirectoryAny', Alumni::class);

        $alumni = $this->directoryService->list($request->all(), $request->user());

        return response()->json($this->paginatedResource($alumni, DirectoryResource::class));
    }

    public function show(Request $request, Alumni $alumnus): JsonResponse
    {
        try {
            $this->authorize('viewDirectory', $alumnus);
        } catch (AuthorizationException) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if ($alumnus->trashed()) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $alumnus->load('school');

        return response()->json(new DirectoryResource($alumnus));
    }

    public function sections(Request $request): JsonResponse
    {
        $this->authorize('viewDirectorySections', Alumni::class);

        $sections = $this->directoryService->sections($request->user());

        return response()->json(['data' => $sections]);
    }

    public function stats(Request $request): JsonResponse
    {
        $this->authorize('viewDirectoryStats', Alumni::class);

        $user = $request->user();
        $schoolId = $user?->isSuperAdmin() && $request->filled('school_id') ? (int) $request->input('school_id') : null;

        return response()->json($this->directoryService->stats($user, $schoolId));
    }
}

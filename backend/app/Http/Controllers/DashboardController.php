<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Alumni;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    public function admin(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Alumni::class);

        $isSchoolAdmin = $request->user()?->isSchoolAdmin() ?? false;
        $schoolId = $isSchoolAdmin
            ? $request->user()?->school_id
            : ($request->user()?->isSuperAdmin() && $request->filled('school_id') ? (int) $request->input('school_id') : null);

        return response()->json($this->dashboardService->admin($schoolId));
    }

    public function alumni(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Alumni::class);

        return response()->json($this->dashboardService->alumni($request->user()));
    }

    public function stats(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Alumni::class);

        $schoolId = $request->user()?->isSchoolAdmin()
            ? $request->user()->school_id
            : ($request->user()?->isSuperAdmin() && $request->filled('school_id') ? (int) $request->input('school_id') : null);

        return response()->json($this->dashboardService->stats($schoolId));
    }
}

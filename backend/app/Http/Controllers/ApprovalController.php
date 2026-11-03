<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Requests\Approval\ApproveAlumniRequest;
use App\Http\Requests\Approval\RejectAlumniRequest;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\ApprovalService;
use App\Services\DashboardCacheService;
use App\Support\Pagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalController extends Controller
{
    public function __construct(
        private readonly ApprovalService $approvalService,
        private readonly DashboardCacheService $dashboardCacheService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewPendingApprovals', User::class);

        $query = User::where('role', UserRole::Alumni)
            ->where('account_status', AccountStatus::Pending)
            ->with(['school', 'alumni.school']);

        if ($request->user()?->isSchoolAdmin()) {
            $query->where('school_id', $request->user()->school_id);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                    ->orWhereHas('alumni', function ($alumniQuery) use ($search) {
                        $alumniQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        if (! $request->user()?->isSchoolAdmin() && $request->filled('school_id')) {
            $query->where('school_id', $request->input('school_id'));
        }

        $query->orderBy('created_at', 'desc');

        $results = $request->boolean('all')
            ? Pagination::boundedAll($query)
            : $query->paginate(Pagination::clampPerPage((int) $request->input('per_page', 15), 15));

        return response()->json(
            $results instanceof LengthAwarePaginator
                ? $this->paginatedResource($results, UserResource::class)
                : $this->collectionResource($results, UserResource::class),
        );
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('viewPendingApprovals', User::class);

        $this->authorize('approve', $user);

        if ($user->account_status !== AccountStatus::Pending) {
            return response()->json(['message' => 'This user is not pending approval.'], 422);
        }

        $user->load(['school', 'alumni.school']);

        $duplicates = $this->approvalService->findDuplicates($user);

        return response()->json([
            'user' => new UserResource($user),
            'duplicates' => $duplicates,
        ]);
    }

    public function approve(ApproveAlumniRequest $request, User $user): JsonResponse
    {
        $this->authorize('approve', $user);

        if ($user->account_status !== AccountStatus::Pending) {
            return response()->json(['message' => 'This user is not pending approval.'], 422);
        }

        $this->approvalService->approve($user, $request->validated(), $request->user()?->id);

        ActivityLog::log(
            $request->user()?->id,
            'alumni.approved',
            User::class,
            $user->id,
            "Alumni registration '{$user->name}' approved",
            null,
            $request->ip(),
        );

        $this->dashboardCacheService->forget($user->school_id);

        return response()->json([
            'message' => 'Alumni registration approved successfully.',
            'user' => new UserResource($user->fresh(['alumni', 'school'])),
        ]);
    }

    public function reject(RejectAlumniRequest $request, User $user): JsonResponse
    {
        $this->authorize('reject', $user);

        if ($user->account_status !== AccountStatus::Pending) {
            return response()->json(['message' => 'This user is not pending approval.'], 422);
        }

        $this->approvalService->reject($user, $request->input('reason'));

        ActivityLog::log(
            $request->user()?->id,
            'alumni.rejected',
            User::class,
            $user->id,
            "Alumni registration '{$user->name}' rejected".($request->input('reason') ? ": {$request->input('reason')}" : ''),
            ['reason' => $request->input('reason')],
            $request->ip(),
        );

        return response()->json(['message' => 'Alumni registration rejected.']);
    }
}

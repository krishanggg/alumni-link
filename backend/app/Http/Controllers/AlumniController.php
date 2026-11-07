<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Alumni\CheckEmailAvailabilityRequest;
use App\Http\Requests\Alumni\DuplicateCheckRequest;
use App\Http\Requests\Alumni\StoreAlumniRequest;
use App\Http\Requests\Alumni\UpdateAlumniProfileRequest;
use App\Http\Requests\Alumni\UpdateAlumniRequest;
use App\Http\Requests\Alumni\UploadAlumniPhotoRequest;
use App\Http\Requests\Alumni\UploadProfilePhotoRequest;
use App\Http\Resources\AlumniListResource;
use App\Http\Resources\AlumniResource;
use App\Models\Alumni;
use App\Rules\UniqueEmailAddress;
use App\Services\AlumniService;
use App\Services\DashboardCacheService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlumniController extends Controller
{
    public function __construct(
        private readonly AlumniService $alumniService,
        private readonly DashboardCacheService $dashboardCacheService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Alumni::class);

        $results = $this->alumniService->list($request->all(), $request->user());

        return response()->json(
            $results instanceof LengthAwarePaginator
                ? $this->paginatedResource($results, AlumniListResource::class)
                : $this->collectionResource($results, AlumniListResource::class),
        );
    }

    public function show(Alumni $alumnus): JsonResponse
    {
        // Route-model binding bypasses the confirmed() scope, so a provisional
        // record's id would otherwise be directly reachable outside the
        // approval-review flow.
        abort_unless($alumnus->confirmed_at, 404);

        $this->authorize('view', $alumnus);

        $alumnus->load(['school', 'creator', 'updater']);

        return response()->json(new AlumniResource($alumnus));
    }

    public function store(StoreAlumniRequest $request): JsonResponse
    {
        $this->authorize('create', Alumni::class);

        $attributes = $request->validated();
        if ($request->user()?->isSchoolAdmin()) {
            $attributes['school_id'] = $request->user()->school_id;
        }

        $alumni = $this->alumniService->create($attributes, $request->user()?->id);
        $this->dashboardCacheService->forget($alumni->school_id);

        return response()->json(new AlumniResource($alumni->load(['school', 'creator', 'updater'])), 201);
    }

    public function update(UpdateAlumniRequest $request, Alumni $alumnus): JsonResponse
    {
        abort_unless($alumnus->confirmed_at, 404);

        $this->authorize('update', $alumnus);

        $attributes = $request->validated();
        if ($request->user()?->isSchoolAdmin()) {
            $attributes['school_id'] = $request->user()->school_id;
        }

        $previousSchoolId = $alumnus->school_id;
        $alumnus = $this->alumniService->update($alumnus, $attributes, $request->user()?->id);
        $changeNotifications = app(\App\Services\SchoolAdminChangeNotificationService::class);
        $summary = "Alumni record '{$alumnus->name}' was updated.";
        $changeNotifications->notify(
            $request->user(), $previousSchoolId, $summary,
        );
        if ($alumnus->school_id !== $previousSchoolId) {
            $changeNotifications->notify($request->user(), $alumnus->school_id, $summary);
        }
        $this->dashboardCacheService->forget($alumnus->school_id);

        return response()->json(new AlumniResource($alumnus->fresh(['school', 'creator', 'updater'])));
    }

    public function destroy(Request $request, Alumni $alumnus): JsonResponse
    {
        abort_unless($alumnus->confirmed_at, 404);

        $this->authorize('delete', $alumnus);

        app(\App\Services\SchoolAdminChangeNotificationService::class)->notify(
            $request->user(), $alumnus->school_id, "Alumni record '{$alumnus->name}' was archived.",
        );
        $this->alumniService->delete($alumnus, $request->user()?->id);
        $this->dashboardCacheService->forget($alumnus->school_id);

        return response()->json(['message' => 'Alumni record archived.']);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $alumni = Alumni::withTrashed()->findOrFail($id);

        abort_unless($alumni->confirmed_at, 404);

        $this->authorize('restore', $alumni);

        $alumni = $this->alumniService->restore($alumni, $request->user()?->id);
        app(\App\Services\SchoolAdminChangeNotificationService::class)->notify(
            $request->user(), $alumni->school_id, "Alumni record '{$alumni->name}' was restored.",
        );
        $this->dashboardCacheService->forget($alumni->school_id);

        return response()->json(new AlumniResource($alumni->load(['school', 'creator', 'updater'])));
    }

    public function forceDelete(Request $request, int $id): JsonResponse
    {
        $alumni = Alumni::withTrashed()->findOrFail($id);

        abort_unless($alumni->confirmed_at, 404);

        $this->authorize('forceDelete', $alumni);

        if (! $alumni->trashed()) {
            return response()->json(['message' => 'Only archived records can be permanently deleted.'], 422);
        }

        $schoolId = $alumni->school_id;
        app(\App\Services\SchoolAdminChangeNotificationService::class)->notify(
            $request->user(), $schoolId, "Alumni record '{$alumni->name}' was permanently deleted.",
        );
        $this->alumniService->forceDelete($alumni, $request->user()?->id);
        $this->dashboardCacheService->forget($schoolId);

        return response()->json(['message' => 'Alumni record permanently deleted.']);
    }

    public function updateProfile(UpdateAlumniProfileRequest $request): JsonResponse
    {
        $this->authorize('updateProfile', Alumni::class);

        $user = $request->user();

        if (! $user->alumni_id) {
            return response()->json(['message' => 'No linked alumni record.'], 422);
        }

        $alumni = $this->alumniService->updateSelfProfile($user, $request->validated());
        $this->dashboardCacheService->forget($alumni->school_id);

        return response()->json(new AlumniResource($alumni->load(['school'])));
    }

    public function uploadProfilePhoto(UploadProfilePhotoRequest $request): JsonResponse
    {
        $this->authorize('updateProfile', Alumni::class);

        $user = $request->user();

        if (! $user->alumni_id) {
            return response()->json(['message' => 'No linked alumni record.'], 422);
        }

        $alumni = $this->alumniService->uploadSelfProfilePhoto($user, $request->file('photo'));
        $this->dashboardCacheService->forget($alumni->school_id);

        return response()->json(new AlumniResource($alumni->load(['school'])));
    }

    public function uploadPhoto(UploadAlumniPhotoRequest $request, Alumni $alumnus): JsonResponse
    {
        abort_unless($alumnus->confirmed_at, 404);

        $this->authorize('uploadPhoto', $alumnus);

        $alumnus = $this->alumniService->uploadPhoto($alumnus, $request->file('photo'));
        app(\App\Services\SchoolAdminChangeNotificationService::class)->notify(
            $request->user(), $alumnus->school_id, "A photo for alumni record '{$alumnus->name}' was updated.",
        );
        $this->dashboardCacheService->forget($alumnus->school_id);

        return response()->json(new AlumniResource($alumnus->load(['school'])));
    }

    public function deletePhoto(Request $request, Alumni $alumnus): JsonResponse
    {
        abort_unless($alumnus->confirmed_at, 404);

        $this->authorize('uploadPhoto', $alumnus);

        $hadPhoto = (bool) $alumnus->profile_photo;
        if ($hadPhoto) {
            app(\App\Services\SchoolAdminChangeNotificationService::class)->notify(
                $request->user(), $alumnus->school_id, "A photo for alumni record '{$alumnus->name}' was removed.",
            );
        }
        $alumnus = $this->alumniService->deletePhoto($alumnus, $request->user()?->id);

        if ($hadPhoto) {
            $this->dashboardCacheService->forget($alumnus->school_id);
        }

        return response()->json(new AlumniResource($alumnus->load(['school'])));
    }

    public function duplicates(DuplicateCheckRequest $request): JsonResponse
    {
        $duplicates = $this->alumniService->findDuplicates($request->all(), $request->user());

        return response()->json($duplicates);
    }

    public function checkEmailAvailability(CheckEmailAvailabilityRequest $request): JsonResponse
    {
        $user = $request->user();
        $rule = new UniqueEmailAddress(
            'alumni',
            column: 'contact_email',
            ignoreId: $request->input('exclude_id'),
            schoolId: $user?->isSchoolAdmin() ? $user->school_id : null,
        );
        $available = true;

        $rule->validate('email', $request->input('email'), function () use (&$available): void {
            $available = false;
        });

        return response()->json(['available' => $available]);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Requests\Profile\UploadProfilePhotoRequest;
use App\Http\Resources\ProfileResource;
use App\Models\Alumni;
use App\Models\User;
use App\Services\AlumniService;
use App\Services\DashboardCacheService;
use App\Services\ImageService;
use App\Services\UserPasswordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function __construct(
        private readonly AlumniService $alumniService,
        private readonly DashboardCacheService $dashboardCacheService,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureApprovedUser($user);

        $user->load(['alumni.school', 'school']);

        return response()->json(new ProfileResource($user));
    }

    /**
     * Handles user-level fields (name, email, username) and alumni self-service
     * fields in a single request. The mobile app uses this endpoint; the legacy
     * AlumniController::updateProfile endpoint shares its rate limit and audit
     * behavior through AlumniService::updateSelfProfile().
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureApprovedUser($user);
        $validated = $request->validated();

        $userFields = ['email', 'username'];
        $userData = array_intersect_key($validated, array_flip($userFields));

        if (! empty($userData)) {
            $user->update($userData);
        }

        if ($user->isAlumni() && $user->alumni_id) {
            $alumniFields = [
                'contact_number', 'address', 'privacy', 'gender', 'contact_email', 'birthdate',
                'employment_status', 'company_name', 'position_in_company',
            ];
            $alumniData = array_intersect_key($validated, array_flip($alumniFields));

            if (! empty($alumniData)) {
                $alumni = $this->alumniService->updateSelfProfile($user, $alumniData);
                $this->dashboardCacheService->forget($alumni->school_id);
            }
        }

        $user->load(['alumni.school', 'school']);

        return response()->json(new ProfileResource($user));
    }

    public function uploadPhoto(UploadProfilePhotoRequest $request, ImageService $imageService): JsonResponse
    {
        $user = $request->user();
        $this->ensureActiveUser($user);

        $hasTarget = $user->isAlumni() && $user->alumni_id;

        if (! $hasTarget && ! $user->isAdmin()) {
            return response()->json(['message' => 'No profile photo target available.'], 422);
        }

        $schoolId = null;

        if ($hasTarget) {
            $alumni = $this->alumniService->uploadSelfProfilePhoto($user, $request->file('photo'));
            $schoolId = $alumni->school_id;
        } else {
            $path = $imageService->processUpload($request->file('photo'));

            if ($user->profile_photo) {
                Storage::disk('public')->delete($user->profile_photo);
            }

            $user->update(['profile_photo' => $path]);
        }

        $this->dashboardCacheService->forget($schoolId);

        $user->load(['alumni.school', 'school']);

        return response()->json(new ProfileResource($user));
    }

    public function deletePhoto(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureActiveUser($user);

        if ($user->isAlumni() && $user->alumni_id) {
            $alumni = Alumni::find($user->alumni_id);

            $hadPhoto = (bool) $alumni->profile_photo;
            $alumni = $this->alumniService->deletePhoto($alumni, $user->id);

            if ($hadPhoto) {
                $this->dashboardCacheService->forget($alumni->school_id);
            }
        } elseif ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
            $user->update(['profile_photo' => null]);
        }

        $user->load(['alumni.school', 'school']);

        return response()->json(new ProfileResource($user));
    }

    public function changePassword(ChangePasswordRequest $request, UserPasswordService $passwordService): JsonResponse
    {
        $user = $request->user();
        $this->ensureApprovedUser($user);
        $passwordService->change(
            $user,
            $request->input('new_password'),
            $request->input('current_password'),
        );

        return response()->json(['message' => 'Password changed successfully.']);
    }

    private function ensureApprovedUser(User $user): void
    {
        $this->ensureActiveUser($user);

        abort_unless($user->isAdmin() || $user->isApproved(), 403, 'Forbidden.');
    }

    private function ensureActiveUser(User $user): void
    {
        abort_unless($user->is_active, 403, 'Forbidden.');
    }
}

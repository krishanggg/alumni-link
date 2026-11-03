<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\User\LinkAlumniRequest;
use App\Http\Requests\User\SetUserPasswordRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserListResource;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\User;
use App\Notifications\PasswordResetNotification;
use App\Notifications\PasswordSetByAdminNotification;
use App\Services\PasswordResetTokenService;
use App\Services\UserPasswordService;
use App\Services\UserService;
use App\Support\Pagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        ['results' => $results, 'stats' => $stats] = $this->userService->list($request->all());

        $payload = $results instanceof LengthAwarePaginator
            ? $this->paginatedResource($results, UserListResource::class)
            : $this->collectionResource($results, UserListResource::class);

        return response()->json([...$payload, 'stats' => $stats]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        // Admin-created accounts are an authoritative action in their own right,
        // unlike self-service registration; they should not need a second approval
        // pass through the pending-approvals queue.
        $user = $this->userService->create($request->validated());

        ActivityLog::log(
            $request->user()?->id,
            'user.created',
            User::class,
            $user->id,
            "User '{$user->name}' created",
            null,
            $request->ip(),
        );

        return response()->json(new UserResource($user->load(['alumni', 'school'])), 201);
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        $user->load(['alumni', 'school']);

        return response()->json(new UserResource($user));
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $user = $this->userService->update($user, $request->validated());

        ActivityLog::log(
            $request->user()?->id,
            'user.updated',
            User::class,
            $user->id,
            "User '{$user->name}' updated",
            null,
            $request->ip(),
        );

        return response()->json(new UserResource($user->fresh(['alumni', 'school'])));
    }

    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        $this->authorize('toggleStatus', $user);

        $user = $this->userService->toggleStatus($user);

        $action = $user->is_active ? 'user.activated' : 'user.deactivated';
        $desc = $user->is_active ? "User '{$user->name}' activated" : "User '{$user->name}' deactivated";

        ActivityLog::log(
            $request->user()?->id,
            $action,
            User::class,
            $user->id,
            $desc,
            null,
            $request->ip(),
        );

        return response()->json(new UserResource($user));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $name = $user->name;

        $this->userService->delete($user);

        ActivityLog::log(
            $request->user()?->id,
            'user.deleted',
            User::class,
            null,
            "User '{$name}' deleted",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'User deleted successfully.']);
    }

    public function resetPassword(Request $request, User $user, PasswordResetTokenService $tokens): JsonResponse
    {
        $this->authorize('update', $user);

        $token = $tokens->issue($user->email);
        $resetUrl = $tokens->buildResetUrl($user->email, $token);
        $user->notify(new PasswordResetNotification($resetUrl));

        ActivityLog::log(
            $request->user()?->id,
            'user.password_reset',
            User::class,
            $user->id,
            "Password reset triggered for user '{$user->name}'",
            null,
            $request->ip(),
        );

        return response()->json([
            'message' => 'Password reset link emailed successfully.',
        ]);
    }

    public function setPassword(SetUserPasswordRequest $request, User $user, UserPasswordService $passwords): JsonResponse
    {
        $this->authorize('setPassword', $user);

        $newPassword = $request->string('password')->toString();
        $passwords->change($user, $newPassword);

        if ($request->boolean('notify')) {
            $user->notify(new PasswordSetByAdminNotification($newPassword));
        }

        ActivityLog::log(
            $request->user()?->id,
            'user.password_set',
            User::class,
            $user->id,
            "Password set directly for user '{$user->name}'".($request->boolean('notify') ? ' (emailed to the user)' : ''),
            null,
            $request->ip(),
        );

        $message = "Password updated for {$user->name}. Their other sessions have been signed out.";

        return response()->json([
            'message' => $request->boolean('notify') ? $message.' The new password has been emailed to them.' : $message,
        ]);
    }

    public function linkAlumni(LinkAlumniRequest $request, User $user): JsonResponse
    {
        $alumniId = $request->input('alumni_id');

        $user = $this->userService->linkAlumni($user, $alumniId);

        ActivityLog::log(
            $request->user()?->id,
            'user.linked_alumni',
            User::class,
            $user->id,
            "User '{$user->name}' linked to alumni #{$alumniId}",
            null,
            $request->ip(),
        );

        return response()->json(new UserResource($user->fresh(['alumni', 'school'])));
    }

    public function unlinkAlumni(Request $request, User $user): JsonResponse
    {
        $alumniId = $user->alumni_id;

        $user = $this->userService->unlinkAlumni($user);

        ActivityLog::log(
            $request->user()?->id,
            'user.unlinked_alumni',
            User::class,
            $user->id,
            "User '{$user->name}' unlinked from alumni #{$alumniId}",
            null,
            $request->ip(),
        );

        return response()->json(new UserResource($user->fresh(['alumni', 'school'])));
    }

    public function activity(Request $request, User $user): JsonResponse
    {
        $this->authorize('view', $user);

        $logs = ActivityLog::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(Pagination::clampPerPage((int) $request->input('per_page', 20), 20));

        return response()->json($logs);
    }
}

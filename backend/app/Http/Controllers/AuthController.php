<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Events\PendingApprovalCreated;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\CompleteAlumniProfileRequest;
use App\Http\Requests\Auth\NewPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\ResubmitRegistrationRequest;
use App\Http\Requests\Auth\StoreLoginRequest;
use App\Http\Requests\Auth\StoreRegistrationRequest;
use App\Models\ActivityLog;
use App\Models\Alumni;
use App\Models\User;
use App\Notifications\AccountActivityNotification;
use App\Notifications\PasswordResetNotification;
use App\Services\LoginAttemptService;
use App\Services\NotificationDispatchService;
use App\Services\PasswordResetTokenService;
use App\Services\RememberedDeviceService;
use App\Services\UserPasswordService;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\TransientToken;

class AuthController extends Controller
{
    public const MAX_MOBILE_TOKENS = 3;

    public function __construct(
        private readonly NotificationDispatchService $notifications,
        private readonly LoginAttemptService $loginAttempts,
    ) {}

    public function login(
    StoreLoginRequest $request,
    RememberedDeviceService $devices
): JsonResponse {
    $login = (string) $request->input('login');
    $password = (string) $request->input('password');
    $remember = $request->boolean('remember');
    $ipAddress = $request->ip() ?? 'unknown';

    $user = User::where('email', $login)
        ->orWhere('username', $login)
        ->first();

    $attemptKey = (string) ($user?->email ?? $login);

    // Preserve existing login rate limiting.
    if ($this->loginAttempts->isRateLimited($attemptKey, $ipAddress)) {
        return response()->json([
            'message' => 'Too many login attempts. Please try again in 15 minutes.',
        ], 429);
    }

    // Verify credentials.
    if (! $user || ! Hash::check($password, $user->password)) {
        $this->loginAttempts->recordFailure($attemptKey, $ipAddress);

        return response()->json([
            'message' => 'Invalid credentials.',
        ], 401);
    }

    // Prevent deactivated accounts from signing in.
    if (! $user->is_active) {
        return response()->json([
            'message' => 'Your account has been deactivated. Please contact an administrator.',
        ], 403);
    }

    $this->loginAttempts->clearIdentifier($attemptKey);

    auth()->login($user);

    // Keep the previous IP for existing web login activity.
    $previousIp = $user->last_login_ip;

    // Preserve login activity information.
    $user->update([
        'last_login_at' => now(),
        'last_login_ip' => $ipAddress,
    ]);

    $isMobileClient = $request->header('X-Client') === 'mobile';

    /*
    |--------------------------------------------------------------------------
    | Mobile New-Device Detection
    |--------------------------------------------------------------------------
    |
    | Mobile installations use a persistent UUID instead of an IP address.
    |
    | First installation:
    |   Register without notifying.
    |
    | Previously registered installation:
    |   Update last-seen time without notifying.
    |
    | New additional installation:
    |   Send a new-device notification.
    |
    | Older mobile versions without a device_id do not trigger
    | unreliable IP-based notifications.
    |
    */

    if ($isMobileClient) {
        $installationId = $request->input('device_id');

        if (
            is_string($installationId) &&
            $installationId !== ''
        ) {
            try {
                $isNewInstallation = app(
                    \App\Services\LoginDeviceInstallationService::class
                )->register(
                    $user,
                    $installationId
                );

                if ($isNewInstallation) {
                    $this->notifications->notify(
                        $user,
                        'account_activity',
                        new AccountActivityNotification(
                            'New device sign-in',
                            'Your AlumniLink account was signed in on a new device.'
                        ),
                        'New device sign-in',
                        'Your AlumniLink account was signed in on a new device.'
                    );
                }
            } catch (\Throwable $exception) {
                // Device tracking must never prevent a valid login.
                \Illuminate\Support\Facades\Log::warning(
                    'Login device tracking failed.',
                    [
                        'user_id' => $user->id,
                        'exception' => $exception::class,
                    ]
                );
            }
        }
    } elseif (
        $previousIp !== null &&
        $previousIp !== $ipAddress
    ) {
        /*
        | Preserve the existing sign-in activity alert for web logins.
        | This reports a changed network location, not a verified
        | physical device change.
        */

        $this->notifications->notify(
            $user,
            'account_activity',
            new AccountActivityNotification(
                'New sign-in to your account',
                'Your account was just signed in to from a new location.'
            ),
            'New sign-in',
            'Your account was just signed in to from a new location.'
        );
    }

    // Preserve existing browser Remember Me functionality.
    if ($remember) {
        $devices->issue($user, $request);
    }

    // Preserve existing mobile Sanctum token handling.
    $token = null;

    if (
        $request->expectsJson() &&
        $request->header('X-Client') === 'mobile' &&
        ! $request->hasHeader('X-Requested-With')
    ) {
        $mobileTokensToDelete = $user->tokens()
            ->where('name', 'mobile')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get(['id'])
            ->skip(self::MAX_MOBILE_TOKENS - 1)
            ->pluck('id');

        if ($mobileTokensToDelete->isNotEmpty()) {
            $user->tokens()
                ->whereIn('id', $mobileTokensToDelete)
                ->delete();
        }

        $token = $user->createToken(
            'mobile',
            ['mobile']
        )->plainTextToken;
    }

    return response()->json([
        'message' => 'Login successful.',
        'user' => $this->userResponse($user),
        'token' => $token,
    ]);
}

    public function register(StoreRegistrationRequest $request): JsonResponse
    {
        $schoolId = (int) $request->input('school_id');

        DB::transaction(function () use ($request) {
            $alumni = new Alumni;
            $alumni->fill([
                'first_name' => $request->input('first_name'),
                'middle_name' => $request->input('middle_name'),
                'last_name' => $request->input('last_name'),
                'suffix' => $request->input('suffix'),
                'graduation_year' => $request->input('graduation_year'),
                'section_strand' => $request->input('section_strand'),
                'gender' => $request->input('gender'),
                'birthdate' => $request->input('birthdate'),
                'address' => $request->input('address'),
                'student_id' => $request->input('student_id'),
                'contact_number' => $request->input('contact_number'),
                'employment_status' => $request->input('employment_status'),
                'company_name' => $request->input('company_name'),
                'position_in_company' => $request->input('position_in_company'),
                // Provisional: not yet visible outside the approval-review
                // endpoints until an admin confirms or re-links it.
                'confirmed_at' => null,
            ]);
            $alumni->school_id = $request->input('school_id');
            $alumni->created_by = null;
            $alumni->save();

            $user = new User;
            $user->fill([
                'email' => $request->input('email'),
                'username' => $request->input('username'),
                'password' => $request->input('password'),
            ]);
            $user->role = UserRole::Alumni;
            $user->account_status = AccountStatus::Pending;
            $user->school_id = $request->input('school_id');
            $user->alumni_id = $alumni->id;
            $user->save();
        });

        $this->dispatchPendingApprovalCreated($schoolId);

        return response()->json([
            'message' => 'Registration submitted successfully. Your account is pending admin approval.',
        ], 201);
    }

    public function resubmit(ResubmitRegistrationRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->account_status, [AccountStatus::Pending, AccountStatus::Rejected], true)) {
            return response()->json(['message' => 'Your account is already approved.'], 422);
        }

        $alumni = Alumni::find($user->alumni_id);

        $updates = $request->only([
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'graduation_year',
            'section_strand',
            'gender',
            'birthdate',
            'address',
            'student_id',
            'contact_number',
            'employment_status',
            'company_name',
            'position_in_company',
        ]);

        if ($alumni) {
            $alumni->fill($updates);
            if ($request->filled('school_id')) {
                // F16 deliberately retains the existing resubmission workflow;
                // the school change remains an explicit, validated assignment.
                $alumni->school_id = $request->input('school_id');
            }
            $alumni->save();
        }

        $userUpdates = $request->only(['email', 'username']);
        $user->fill($userUpdates);
        if ($request->filled('school_id')) {
            $user->school_id = $request->input('school_id');
        }
        $user->role = UserRole::Alumni;
        $user->account_status = AccountStatus::Pending;
        $user->rejection_reason = null;
        $user->save();

        $this->dispatchPendingApprovalCreated((int) $user->school_id);

        return response()->json([
            'message' => 'Your registration has been resubmitted for review.',
            'user' => $this->userResponse($user->refresh()),
        ]);
    }

    /**
     * Realtime updates improve the admin experience but must not prevent a
     * valid registration or resubmission when the local broadcast server is
     * unavailable.
     */
    private function dispatchPendingApprovalCreated(int $schoolId): void
    {
        try {
            PendingApprovalCreated::dispatch($schoolId);
        } catch (BroadcastException) {
            Log::warning('Could not broadcast the pending approval update.', [
                'school_id' => $schoolId,
            ]);
        }
    }

    public function completeProfile(CompleteAlumniProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->is_active) {
            return response()->json(['message' => 'Your account has been deactivated. Please contact your school administrator.'], 403);
        }

        if ($user->role !== UserRole::Alumni || $user->account_status !== AccountStatus::Approved || $user->alumni_id !== null) {
            return response()->json(['message' => 'Profile completion is not applicable to this account.'], 422);
        }

        $profile = $request->validated();

        DB::transaction(function () use ($user, $profile) {
            // No approval step left to gate this on: an already-Approved
            // account completing its profile creates a CONFIRMED record.
            $alumni = new Alumni;
            $alumni->fill(Arr::except($profile, ['school_id']));
            $alumni->confirmed_at = now();
            $alumni->school_id = $user->school_id ?? $profile['school_id'];
            $alumni->created_by = null;
            $alumni->updated_by = $user->id;
            $alumni->save();

            // A first-time completion may choose the school; once an application
            // already has one, do not let the completion payload move it.
            if ($user->school_id === null) {
                $user->school_id = $profile['school_id'];
            }
            $user->alumni_id = $alumni->id;
            $user->save();
        });

        ActivityLog::log(
            $user->id,
            'alumni.profile_completed',
            User::class,
            $user->id,
            "User '{$user->name}' completed their alumni profile",
            null,
            $request->ip(),
        );

        return response()->json([
            'message' => 'Your alumni details have been saved.',
            'user' => $this->userResponse($user->refresh()),
        ]);
    }

    public function logout(Request $request, RememberedDeviceService $devices): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $cookie = $request->cookie(RememberedDeviceService::COOKIE_NAME);
            $devices->revokeFromCookie($user, is_string($cookie) ? $cookie : null);

            $token = $request->user()->currentAccessToken();
            if ($token && ! $token instanceof TransientToken) {
                $token->delete();
            }

            if ($request->hasSession()) {
                auth()->guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
        }

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function forgot(ResetPasswordRequest $request, PasswordResetTokenService $tokens): JsonResponse
    {
        $email = $request->input('email');

        $user = User::where('email', $email)->first();

        if ($user) {
            $token = $tokens->issue($email);
            $resetUrl = $tokens->buildResetUrl($email, $token);
            $user->notify(new PasswordResetNotification($resetUrl));
        }

        return response()->json([
            'message' => 'If an account with that email exists, a password reset link has been sent.',
        ]);
    }

    public function reset(NewPasswordRequest $request, UserPasswordService $passwordService): JsonResponse
    {
        $email = $request->input('email');
        $plainToken = $request->input('token');
        $invalidResetMessage = ['message' => 'Invalid or expired reset token.'];

        $reset = DB::table('password_resets')->where('email', $email)->first();

        if (! $reset || ! Hash::check($plainToken, $reset->token)) {
            return response()->json($invalidResetMessage, 400);
        }

        $createdAt = strtotime((string) $reset->created_at);
        if ($createdAt < strtotime('-60 minutes')) {
            DB::table('password_resets')->where('email', $email)->delete();

            return response()->json($invalidResetMessage, 400);
        }

        $user = User::where('email', $email)->first();
        if ($user) {
            $passwordService->change($user, $request->input('password'));
        }

        DB::table('password_resets')->where('email', $email)->delete();

        return response()->json(['message' => 'Password reset successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json($this->userResponse($user));
    }

    public function changePassword(ChangePasswordRequest $request, UserPasswordService $passwordService): JsonResponse
    {
        $user = $request->user();
        $passwordService->change(
            $user,
            $request->input('new_password'),
            $request->input('current_password'),
        );

        return response()->json(['message' => 'Password changed successfully.']);
    }

    public function approvalStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->account_status === AccountStatus::Approved) {
            return response()->json(['message' => 'Your account is approved.'], 200);
        }

        return response()->json([
            'status' => $user->account_status,
            'submitted_at' => $user->created_at,
            'rejection_reason' => $user->account_status === AccountStatus::Rejected ? $user->rejection_reason : null,
        ]);
    }

    private function userResponse(User $user): array
    {
        $user->loadMissing(['school', 'alumni']);
        $alumni = $user->alumni;

        $photo = $alumni ? $alumni->profile_photo : $user->profile_photo;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'username' => $user->username,
            'role' => $user->role,
            'account_status' => $user->account_status,
            'rejection_reason' => $user->account_status === AccountStatus::Rejected ? $user->rejection_reason : null,
            'school_id' => $user->school_id,
            // Both frontends expect `school` on the auth user object.
            'school' => $user->school ? ['id' => $user->school->id, 'name' => $user->school->name] : null,
            'alumni_id' => $user->alumni_id,
            // Distinguishes an alumnus whose record is archived (link intact, deactivated)
            // from one who never completed a profile — both otherwise look identical.
            'alumni_archived' => $user->alumniRecordArchived(),
            // All personal/identity data lives on the linked alumni record —
            // present (nested) even while unconfirmed, so an applicant can
            // see their own submitted details before an admin reviews them.
            'alumni' => $alumni ? [
                'id' => $alumni->id,
                'first_name' => $alumni->first_name,
                'middle_name' => $alumni->middle_name,
                'last_name' => $alumni->last_name,
                'suffix' => $alumni->suffix,
                'graduation_year' => $alumni->graduation_year,
                'section_strand' => $alumni->section_strand,
                'gender' => $alumni->gender?->value,
                'birthdate' => $alumni->birthdate?->toDateString(),
                'address' => $alumni->address,
                'student_id' => $alumni->student_id,
                'contact_number' => $alumni->contact_number,
                'employment_status' => $alumni->employment_status,
                'company_name' => $alumni->company_name,
                'position_in_company' => $alumni->position_in_company,
                'confirmed_at' => $alumni->confirmed_at?->toIso8601String(),
            ] : null,
            'photo_url' => $photo ? '/storage/'.$photo : null,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}

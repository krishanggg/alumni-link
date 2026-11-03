<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\Alumni;
use App\Models\AlumniAuditLog;
use App\Models\User;
use App\Notifications\AccountActivityNotification;
use Illuminate\Support\Facades\DB;

class ApprovalService
{
    public function __construct(
        private readonly NotificationDispatchService $notifications = new NotificationDispatchService(new ExpoPushService),
    ) {}

    /**
     * Approves a pending alumni registration. The registration already
     * created a provisional Alumni row (confirmed_at null) linked via
     * users.alumni_id at registration time — approval either CONFIRMS that
     * row in place (optionally applying admin overrides), or discovers it
     * duplicates an already-confirmed record elsewhere and RE-LINKS
     * users.alumni_id to that record, soft-deleting the abandoned
     * provisional row. Both branches run in a single transaction so a
     * failure partway through never leaves a half-approved user.
     *
     * @param  array<string, mixed>  $attributes
     *
     * @throws BusinessRuleException
     */
    public function approve(User $user, array $attributes, ?int $actorId): void
    {
        DB::transaction(function () use ($user, $attributes, $actorId) {
            $alumniId = $this->resolveAlumniId($user, $attributes, $actorId);

            $user->account_status = AccountStatus::Approved;
            $user->alumni_id = $alumniId;
            $user->rejection_reason = null;
            $user->save();
        });

        $this->notifications->notify(
            $user,
            'account_activity',
            new AccountActivityNotification('Your registration was approved', 'Your alumni registration has been approved. You now have full access to your account.'),
            'Registration approved',
            'Your alumni registration has been approved.',
        );
    }

    public function reject(User $user, ?string $reason): void
    {
        $user->account_status = AccountStatus::Rejected;
        $user->rejection_reason = $reason;
        $user->save();

        $this->notifications->notify(
            $user,
            'account_activity',
            new AccountActivityNotification('Your registration was not approved', $reason ? "Your alumni registration was not approved. Reason: {$reason}" : 'Your alumni registration was not approved.'),
            'Registration update',
            'Your alumni registration was not approved.',
        );
    }

    /**
     * Per spec: a possible duplicate is scoped by matching graduation_year +
     * school_id (hard filters), with a fuzzy name match on top. Without a
     * graduation_year, the signal is too weak to search on, so the check is
     * skipped rather than returning noise. Only confirmed records can match —
     * the pending user's own provisional row (or any other unconfirmed row)
     * is never a valid duplicate target.
     *
     * @return array<int, array<string, mixed>>
     */
    public function findDuplicates(User $user): array
    {
        $applicant = $user->alumni;

        if (! $applicant || ! $applicant->graduation_year) {
            return [];
        }

        $firstName = $applicant->first_name ?? '';
        $lastName = $applicant->last_name ?? '';

        return Alumni::query()
            ->confirmed()
            ->whereNull('deleted_at')
            ->where('id', '!=', $user->alumni_id)
            ->where('school_id', $applicant->school_id)
            ->where('graduation_year', $applicant->graduation_year)
            ->where(function ($query) use ($firstName, $lastName) {
                if ($firstName !== '') {
                    $query->where('first_name', 'like', "%{$firstName}%");
                }

                if ($lastName !== '') {
                    $query->orWhere('last_name', 'like', "%{$lastName}%");
                }
            })
            ->limit(5)
            ->get()
            ->map(fn (Alumni $alumni) => [
                'id' => $alumni->id,
                'first_name' => $alumni->first_name,
                'middle_name' => $alumni->middle_name,
                'last_name' => $alumni->last_name,
                'suffix' => $alumni->suffix,
                'graduation_year' => $alumni->graduation_year,
                'section_strand' => $alumni->section_strand,
                'student_id' => $alumni->student_id,
            ])
            ->toArray();
    }

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws BusinessRuleException
     */
    private function resolveAlumniId(User $user, array $attributes, ?int $actorId): ?int
    {
        if (! empty($attributes['alumni_id'])) {
            return $this->linkExistingAlumni($user, (int) $attributes['alumni_id'], $actorId);
        }

        return $this->confirmAlumni($user, $attributes, $actorId);
    }

    /**
     * Discovers the provisional row is a duplicate of an already-confirmed
     * record elsewhere: re-links users.alumni_id to that confirmed record,
     * soft-deletes the abandoned provisional row, and writes a `superseded`
     * audit entry recording both ids.
     *
     * @throws BusinessRuleException
     */
    private function linkExistingAlumni(User $user, int $alumniId, ?int $actorId): int
    {
        $target = Alumni::find($alumniId);

        if (! $target || $target->school_id !== $user->school_id) {
            throw new BusinessRuleException('The alumni record must belong to the registration school.', 403);
        }

        if (! $target->confirmed_at) {
            throw new BusinessRuleException('The alumni record must already be confirmed to link to it.', 422);
        }

        $existingUser = User::where('alumni_id', $target->id)->where('id', '!=', $user->id)->first();
        if ($existingUser) {
            throw new BusinessRuleException('This alumni record is already linked to another user.', 422);
        }

        $supersededId = $user->alumni_id;

        if ($supersededId && $supersededId !== $target->id) {
            $provisional = Alumni::find($supersededId);
            $provisional?->delete();

            AlumniAuditLog::create([
                'alumni_id' => $target->id,
                'user_id' => $actorId,
                'action' => 'superseded',
                'changes' => ['superseded_alumni_id' => $supersededId, 'target_alumni_id' => $target->id],
                'created_at' => now(),
            ]);
        }

        return $target->id;
    }

    /**
     * Confirms the provisional Alumni row created at registration time in
     * place — applying any admin overrides on top of what the applicant
     * submitted — rather than creating a new row.
     *
     * @param  array<string, mixed>  $attributes
     *
     * @throws BusinessRuleException
     */
    private function confirmAlumni(User $user, array $attributes, ?int $actorId): int
    {
        if (! $user->alumni_id) {
            throw new BusinessRuleException('This registration has no alumni record to confirm.', 422);
        }

        $alumni = Alumni::findOrFail($user->alumni_id);

        $overrides = array_filter([
            'first_name' => $attributes['first_name'] ?? null,
            'middle_name' => $attributes['middle_name'] ?? null,
            'last_name' => $attributes['last_name'] ?? null,
            'suffix' => $attributes['suffix'] ?? null,
            'graduation_year' => $attributes['graduation_year'] ?? null,
            'section_strand' => $attributes['section_strand'] ?? null,
            'gender' => $attributes['gender'] ?? null,
            'birthdate' => $attributes['birthdate'] ?? null,
            'address' => $attributes['address'] ?? null,
            'student_id' => $attributes['student_id'] ?? null,
            'contact_number' => $attributes['contact_number'] ?? null,
        ], fn ($value) => $value !== null);

        foreach (['employment_status', 'company_name', 'position_in_company'] as $field) {
            if (array_key_exists($field, $attributes)) {
                $overrides[$field] = $attributes[$field];
            }
        }

        $alumni->fill($overrides);
        $alumni->confirmed_at = now();
        $alumni->updated_by = $actorId;
        $alumni->save();

        return $alumni->id;
    }
}

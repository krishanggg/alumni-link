<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountStatus;
use App\Enums\ReportLifecycleStatus;
use App\Enums\ReportVisibility;
use App\Enums\UserRole;
use App\Models\Report;
use App\Models\User;
use App\Notifications\ReportCompletedNotification;
use Illuminate\Database\Eloquent\Builder;

class PublishedReportNotificationService
{
    public function __construct(
        private readonly NotificationDispatchService $notifications
    ) {}

    /**
     * Notify approved alumni who match a published report's filters.
     *
     * Recipients must:
     * - Have an approved alumni account.
     * - Have a linked, confirmed alumni record.
     * - Belong to the report's school, if school-scoped.
     * - Match every configured optional filter.
     * - Have Report Completion notifications enabled.
     *
     * Notification preferences are checked by
     * NotificationDispatchService.
     */
    public function notifyEligibleAlumni(Report $report): void
    {
        // Never notify alumni about private or archived reports.
        if (
            $report->visibility !== ReportVisibility::Published ||
            $report->lifecycle_status !== ReportLifecycleStatus::Active
        ) {
            return;
        }

        $filters = $report->filters ?? [];

        $recipients = User::query()
            ->where('role', UserRole::Alumni)
            ->where('account_status', AccountStatus::Approved)
            ->whereNotNull('alumni_id')

            // Match the existing report's school visibility.
            ->when(
                $report->school_id !== null,
                fn (Builder $query) => $query->where(
                    'school_id',
                    $report->school_id
                )
            )

            // Match the report's configured alumni filters.
            ->whereHas('alumni', function (Builder $query) use (
                $filters,
                $report
            ): void {
                $query
                    ->confirmed()
                    ->whereNull('deleted_at');

                if ($report->school_id !== null) {
                    $query->where(
                        'school_id',
                        $report->school_id
                    );
                }

                if (!empty($filters['graduation_year_from'])) {
                    $query->where(
                        'graduation_year',
                        '>=',
                        $filters['graduation_year_from']
                    );
                }

                if (!empty($filters['graduation_year_to'])) {
                    $query->where(
                        'graduation_year',
                        '<=',
                        $filters['graduation_year_to']
                    );
                }

                if (!empty($filters['section'])) {
                    $query->where(
                        'section_strand',
                        $filters['section']
                    );
                }

                if (!empty($filters['gender'])) {
                    $query->where(
                        'gender',
                        $filters['gender']
                    );
                }
            });

        // Process recipients in batches to limit memory usage.
        $recipients->chunkById(100, function ($users) use ($report): void {
            foreach ($users as $user) {
                $this->notifications->notify(
                    $user,
                    'report_completion',
                    new ReportCompletedNotification($report),
                    'New report available',
                    'Your school published a new report matching your alumni information: '
                        .$report->title,
                );
            }
        });
    }
}
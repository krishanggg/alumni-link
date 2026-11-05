<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $table = 'notification_preferences';

    protected $fillable = [
        'user_id', 'account_activity', 'alumni_record_updates',
        'system_announcements', 'report_completion', 'feedback',
    ];

    public const DEFAULTS = [
        'account_activity' => true,
        'alumni_record_updates' => true,
        'system_announcements' => true,
        'report_completion' => true,
        'feedback' => true,
    ];

    public function casts(): array
    {
        return [
            'account_activity' => 'boolean',
            'alumni_record_updates' => 'boolean',
            'system_announcements' => 'boolean',
            'report_completion' => 'boolean',
            'feedback' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Single gate every send site checks before dispatching a notification,
     * so the preference check lives in one place instead of being
     * re-implemented per trigger point.
     */
    public static function allows(User $user, string $category): bool
    {
        $prefs = self::firstOrCreate(['user_id' => $user->id], self::DEFAULTS);

        return (bool) $prefs->{$category};
    }
}

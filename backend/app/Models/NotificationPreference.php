<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $table = 'notification_preferences';

    protected $fillable = [
        'user_id', 'account_activity', 'alumni_record_updates',
        'system_announcements', 'report_completion', 'feedback',
        'administrative_notices',
    ];

    public const DEFAULTS = [
        'account_activity' => true,
        'alumni_record_updates' => true,
        'system_announcements' => true,
        'report_completion' => true,
        'feedback' => true,
        'administrative_notices' => true,
    ];

    /**
     * Feedback threads are an admin-only workflow, so alumni start with that
     * category disabled while admin accounts keep it enabled.
     *
     * @return array<string, bool>
     */
    public static function defaultsFor(User $user): array
    {
        $defaults = self::DEFAULTS;

        if ($user->role === UserRole::Alumni) {
            $defaults['feedback'] = false;
            $defaults['administrative_notices'] = false;
        }

        return $defaults;
    }

    public function casts(): array
    {
        return [
            'account_activity' => 'boolean',
            'alumni_record_updates' => 'boolean',
            'system_announcements' => 'boolean',
            'report_completion' => 'boolean',
            'feedback' => 'boolean',
            'administrative_notices' => 'boolean',
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
        $prefs = self::firstOrCreate(['user_id' => $user->id], self::defaultsFor($user));

        return (bool) $prefs->{$category};
    }
}

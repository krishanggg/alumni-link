<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class LoginDeviceInstallationService
{
    /**
     * Record a successful login from an app installation.
     *
     * Returns true only when:
     * - This installation has never been used by the account, and
     * - The account already has another registered installation.
     *
     * The first registered installation establishes the baseline
     * and does not trigger a new-device notification.
     */
    public function register(
        User $user,
        string $installationId
    ): bool {
        return DB::transaction(function () use (
            $user,
            $installationId
        ): bool {

            // Serialize device registration for this account.
            User::query()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Store a hash, not the installation ID itself.
            $installationHash = hash(
                'sha256',
                $installationId
            );

            $existingDevice = DB::table(
                'login_device_installations'
            )
                ->where('user_id', $user->id)
                ->where(
                    'installation_id_hash',
                    $installationHash
                )
                ->first();

            // This installation has already signed in.
            if ($existingDevice !== null) {
                DB::table('login_device_installations')
                    ->where('id', $existingDevice->id)
                    ->update([
                        'last_seen_at' => now(),
                        'updated_at' => now(),
                    ]);

                return false;
            }

            // Determine whether this account has another
            // installation registered previously.
            $hasPreviousInstallation = DB::table(
                'login_device_installations'
            )
                ->where('user_id', $user->id)
                ->exists();

            // Register this installation.
            DB::table('login_device_installations')
                ->insert([
                    'user_id' => $user->id,
                    'installation_id_hash' => $installationHash,
                    'last_seen_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            // Only a genuinely new, additional installation
            // should trigger a notification.
            return $hasPreviousInstallation;

        }, 3);
    }
}
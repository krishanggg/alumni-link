<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('users')->where('role', 'super_admin')->exists()) {
            return;
        }

        $password = config('superadmin.password');

        if (! app()->environment(['local', 'testing'])
            && (blank($password) || strlen((string) $password) < 12 || $password === 'Admin123!')) {
            throw new RuntimeException(
                'SUPER_ADMIN_PASSWORD is missing or too weak outside local/testing. '
                .'Set a private password of at least 12 characters before seeding.'
            );
        }

        DB::table('users')->insert([
            'email' => config('superadmin.email'),
            'username' => config('superadmin.username'),
            'password' => Hash::make($password),
            'role' => 'super_admin',
            'account_status' => 'approved',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

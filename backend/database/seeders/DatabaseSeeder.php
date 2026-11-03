<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(SuperAdminSeeder::class);

        // Sample/demo data (schools, alumni, admins, etc.) is seeded once —
        // schools existing is the cheapest signal, since every other seeder
        // in the local/testing chain depends on schools already being there.
        if (DB::table('schools')->exists()) {
            return;
        }

        if (app()->environment('testing')) {
            $this->call([
                SchoolSeeder::class,
                AdminUserSeeder::class,
            ]);

            return;
        }

        if (app()->environment('local') && env('RUN_DEVELOPMENT_SEEDERS', true)) {
            $this->call(DevelopmentSeeder::class);
        }
    }
}

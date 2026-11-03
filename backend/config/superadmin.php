<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Initial Super Admin Account
    |--------------------------------------------------------------------------
    |
    | Read by Database\Seeders\SuperAdminSeeder, which is the only seeder
    | that runs outside local/testing (see DatabaseSeeder). The password
    | default below is only ever used in local/testing — the seeder refuses
    | to seed it unchanged anywhere else, so production deployments must set
    | SUPER_ADMIN_PASSWORD.
    |
    */

    'name' => env('SUPER_ADMIN_NAME', 'System Admin'),
    'email' => env('SUPER_ADMIN_EMAIL', 'admin@alumnilink.local'),
    'username' => env('SUPER_ADMIN_USERNAME', 'admin'),
    'password' => env('SUPER_ADMIN_PASSWORD', 'Admin123!'),

];

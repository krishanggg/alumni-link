<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_device_installations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // SHA-256 hash of the mobile installation identifier.
            $table->char('installation_id_hash', 64);

            $table->timestamp('last_seen_at')->nullable();

            $table->timestamps();

            // Each installation is registered only once per account.
            $table->unique(
                ['user_id', 'installation_id_hash'],
                'login_device_installations_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_device_installations');
    }
};
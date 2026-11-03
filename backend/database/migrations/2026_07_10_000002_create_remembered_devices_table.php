<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('remembered_devices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('token_hash', 255);
            // Retained only for ROTATION_GRACE_SECONDS after a rotation, so that
            // parallel requests issued before the rotation still authenticate.
            $table->string('previous_token_hash', 255)->nullable();
            $table->timestamp('rotated_at')->nullable();
            $table->string('device_name', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            // Absolute expiry, set at issue and never extended by rotation.
            $table->timestamp('expires_at');

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id', 'remembered_devices_user_idx');
            $table->index('expires_at', 'remembered_devices_expires_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('remembered_devices');
    }
};

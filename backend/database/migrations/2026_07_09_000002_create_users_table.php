<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('email', 255)->unique();
            $table->string('username', 100)->unique();
            $table->string('password', 255);
            $table->enum('role', ['super_admin', 'school_admin', 'alumni'])->default('alumni');
            $table->enum('account_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->unsignedBigInteger('alumni_id')->nullable();
            $table->unsignedBigInteger('school_id')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('remember_token_hash', 255)->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('school_id', 'users_school_id_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};

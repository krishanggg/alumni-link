<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alumni_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('alumni_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->enum('action', ['created', 'updated', 'deleted', 'restored', 'permanently_deleted']);
            $table->json('changes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('alumni_id')->references('id')->on('alumni')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->index('alumni_id', 'alumni_audit_logs_alumni_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alumni_audit_logs');
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback_threads', function (Blueprint $table) {
            $table->id();
            $table->string('subject', 150);
            $table->foreignId('school_id')->constrained('schools')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->enum('status', ['open', 'resolved'])->default('open');
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('last_message_at')->nullable();
            // Exactly one Super Admin and one creating School Admin exist per v1 thread.
            $table->timestamp('school_admin_last_read_at')->nullable();
            $table->timestamp('super_admin_last_read_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('school_id', 'feedback_threads_school_idx');
            $table->index('created_by', 'feedback_threads_creator_idx');
            $table->index('status', 'feedback_threads_status_idx');
            $table->index('last_message_at', 'feedback_threads_last_message_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_threads');
    }
};

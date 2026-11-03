<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['event', 'general', 'closure']);
            $table->string('title', 100);
            $table->text('message');
            $table->dateTime('target_date')->nullable();
            $table->unsignedBigInteger('school_id')->nullable();
            $table->boolean('target_all_batches')->default(false);
            $table->boolean('show_as_modal')->default(false);
            $table->enum('status', ['draft', 'published', 'expired', 'archived'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();

            $table->foreign('school_id')->references('id')->on('schools')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
            $table->index('status', 'announcements_status_idx');
            $table->index('type', 'announcements_type_idx');
            $table->index('school_id', 'announcements_school_idx');
            $table->index('target_date', 'announcements_target_date_idx');
            $table->index('published_at', 'announcements_published_at_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};

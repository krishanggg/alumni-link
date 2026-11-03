<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcement_batches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('announcement_id');
            $table->year('graduation_year');
            $table->unique(['announcement_id', 'graduation_year'], 'unique_announcement_batch');

            $table->foreign('announcement_id')->references('id')->on('announcements')->onDelete('cascade');
            $table->index('announcement_id', 'announcement_batches_announcement_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_batches');
    }
};

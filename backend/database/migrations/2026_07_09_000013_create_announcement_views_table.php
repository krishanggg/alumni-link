<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcement_views', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('announcement_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamp('viewed_at')->useCurrent();

            $table->unique(['announcement_id', 'user_id'], 'unique_announcement_view');
            $table->foreign('announcement_id')->references('id')->on('announcements')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('announcement_id', 'announcement_views_announcement_idx');
            $table->index('user_id', 'announcement_views_user_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_views');
    }
};

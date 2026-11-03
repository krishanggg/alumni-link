<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Marks an alumni row confirmed (visible everywhere) vs provisional
     * (created at registration time, invisible outside the approval-review
     * endpoints until an admin confirms or re-links it). Existing rows are
     * backfilled to their creation time since there is no production data to
     * reconcile — every row that exists today was, by definition, already
     * treated as confirmed.
     */
    public function up(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            $table->timestamp('confirmed_at')->nullable()->after('profile_photo');
        });

        DB::table('alumni')->whereNull('confirmed_at')->update(['confirmed_at' => DB::raw('created_at')]);

        Schema::table('alumni', function (Blueprint $table) {
            $table->index('confirmed_at', 'alumni_confirmed_at_idx');
        });
    }

    public function down(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            $table->dropIndex('alumni_confirmed_at_idx');
            $table->dropColumn('confirmed_at');
        });
    }
};

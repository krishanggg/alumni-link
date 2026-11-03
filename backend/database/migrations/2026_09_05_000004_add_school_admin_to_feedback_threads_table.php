<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('feedback_threads', function (Blueprint $table) {
            $table->foreignId('school_admin_id')
                ->nullable()
                ->after('created_by')
                ->constrained('users')
                ->restrictOnDelete();
            $table->index('school_admin_id', 'feedback_threads_school_admin_idx');
        });

        $schoolAdminIds = DB::table('users')
            ->where('role', 'school_admin')
            ->pluck('id');

        if ($schoolAdminIds->isNotEmpty()) {
            DB::table('feedback_threads')
                ->whereNull('school_admin_id')
                ->whereIn('created_by', $schoolAdminIds)
                ->update(['school_admin_id' => DB::raw('created_by')]);
        }
    }

    public function down(): void
    {
        Schema::table('feedback_threads', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_admin_id');
        });
    }
};

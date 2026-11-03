<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `superseded` records the re-link branch of approval: the pending user's
     * provisional alumni row turned out to duplicate an already-confirmed
     * record elsewhere, so `users.alumni_id` is re-pointed to that confirmed
     * record and the abandoned provisional row is soft-deleted. `changes`
     * records both the old (superseded) and new (target) alumni ids.
     */
    public function up(): void
    {
        $values = ['created', 'updated', 'deleted', 'restored', 'permanently_deleted', 'superseded'];

        if (DB::getDriverName() === 'mysql') {
            $list = "'".implode("', '", $values)."'";
            DB::statement("ALTER TABLE alumni_audit_logs MODIFY action ENUM({$list}) NOT NULL");
        } else {
            Schema::table('alumni_audit_logs', function (Blueprint $table) use ($values) {
                $table->enum('action', $values)->change();
            });
        }
    }

    public function down(): void
    {
        $values = ['created', 'updated', 'deleted', 'restored', 'permanently_deleted'];

        DB::table('alumni_audit_logs')->where('action', 'superseded')->delete();

        if (DB::getDriverName() === 'mysql') {
            $list = "'".implode("', '", $values)."'";
            DB::statement("ALTER TABLE alumni_audit_logs MODIFY action ENUM({$list}) NOT NULL");
        } else {
            Schema::table('alumni_audit_logs', function (Blueprint $table) use ($values) {
                $table->enum('action', $values)->change();
            });
        }
    }
};

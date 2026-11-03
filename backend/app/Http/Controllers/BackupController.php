<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BackupResource;
use App\Models\ActivityLog;
use App\Models\Backup;
use App\Services\BackupService;
use App\Services\DashboardCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class BackupController extends Controller
{
    private const RESTORE_FAILURE_MESSAGE = 'Restore failed. Stop using the system and contact support before retrying.';

    public function __construct(
        private readonly BackupService $backupService,
        private readonly DashboardCacheService $dashboardCacheService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Backup::class);

        $backups = Backup::with('creator')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['backups' => BackupResource::collection($backups)]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Backup::class);

        $backup = $this->backupService->create($request->user()?->id);

        ActivityLog::log(
            userId: $request->user()?->id,
            action: 'backup.created',
            subjectType: Backup::class,
            subjectId: $backup->id,
            description: "Backup {$backup->filename} created",
            ipAddress: $request->ip(),
        );

        return response()->json([
            'message' => 'Backup created successfully.',
            'backup' => new BackupResource($backup),
        ], 201);
    }

    public function download(Request $request, Backup $backup): BinaryFileResponse
    {
        $this->authorize('download', $backup);

        $path = $this->backupService->downloadPath($backup);

        return response()->download($path, $backup->filename);
    }

    public function destroy(Request $request, Backup $backup): JsonResponse
    {
        $this->authorize('delete', $backup);

        $filename = $backup->filename;
        $backupId = $backup->id;

        $this->backupService->delete($backup);

        ActivityLog::log(
            userId: $request->user()?->id,
            action: 'backup.deleted',
            subjectType: Backup::class,
            subjectId: $backupId,
            description: "Backup {$filename} deleted",
            ipAddress: $request->ip(),
        );

        return response()->json(['message' => 'Backup deleted.']);
    }

    public function restore(Request $request, Backup $backup): JsonResponse
    {
        $this->authorize('restore', $backup);

        if ($request->input('confirmation') !== 'RESTORE') {
            return response()->json(['message' => 'Confirmation text must be RESTORE.'], 422);
        }

        ActivityLog::log(
            userId: $request->user()?->id,
            action: 'backup.restore.started',
            subjectType: Backup::class,
            subjectId: $backup->id,
            description: "Restore initiated from {$backup->filename}",
            ipAddress: $request->ip(),
        );

        try {
            $this->backupService->restore($backup);

            $this->invalidateAllSessions();
            $this->dashboardCacheService->forget();

            ActivityLog::log(
                userId: $request->user()?->id,
                action: 'backup.restore.completed',
                subjectType: Backup::class,
                subjectId: $backup->id,
                description: "Restore from {$backup->filename} completed",
                ipAddress: $request->ip(),
            );

            return response()->json([
                'message' => 'Restore completed. All sessions have been invalidated. Please log in again.',
                'redirect' => '/login',
            ]);
        } catch (Throwable $e) {
            ActivityLog::log(
                userId: $request->user()?->id,
                action: 'backup.restore.failed',
                subjectType: Backup::class,
                subjectId: $backup->id,
                description: "Restore from {$backup->filename} failed",
                metadata: ['error' => 'backup failed'],
                ipAddress: $request->ip(),
            );
            Log::error('Backup restore failed.', [
                'backup_id' => $backup->id,
                'exception' => $e,
            ]);

            return response()->json([
                'message' => self::RESTORE_FAILURE_MESSAGE,
            ], 500);
        }
    }

    private function invalidateAllSessions(): void
    {
        if (config('session.driver') === 'database') {
            DB::table('sessions')->delete();
        }

        DB::table('personal_access_tokens')->delete();
        DB::table('remembered_devices')->delete();
        DB::table('password_resets')->delete();
    }
}

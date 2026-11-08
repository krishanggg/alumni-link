<?php

declare(strict_types=1);

use App\Http\Controllers\AlumniController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DirectoryController;
use App\Http\Controllers\FeedbackThreadController;
use App\Http\Controllers\NotificationPreferenceController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PushTokenController;
use App\Http\Controllers\RememberedDeviceController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/system/health', function () {
    try {
        DB::connection()->getPdo()->query('SELECT 1');
    } catch (Throwable) {
        return response()->json([
            'status' => 'error',
            'application' => 'ok',
            'database' => 'unavailable',
        ], 503);
    }

    return response()->json([
        'status' => 'ok',
        'application' => 'ok',
        'database' => 'ok',
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
    Route::post('/forgot', [AuthController::class, 'forgot'])->middleware('throttle:auth-sensitive');
    Route::post('/reset', [AuthController::class, 'reset'])->middleware('throttle:auth-sensitive');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/password', [AuthController::class, 'changePassword']);
        Route::post('/resubmit', [AuthController::class, 'resubmit'])->middleware('throttle:auth-sensitive');
        Route::post('/complete-profile', [AuthController::class, 'completeProfile']);
        Route::get('/approval-status', [AuthController::class, 'approvalStatus']);
    });
});

Route::prefix('schools')->group(function () {
    Route::get('/active', [SchoolController::class, 'active']);

    Route::middleware(['auth:sanctum', 'role.super_admin'])->group(function () {
        Route::get('/', [SchoolController::class, 'index']);
        Route::post('/', [SchoolController::class, 'store']);
        Route::get('/{school}', [SchoolController::class, 'show']);
        Route::put('/{school}', [SchoolController::class, 'update']);
        Route::patch('/{school}/status', [SchoolController::class, 'toggleStatus']);
        Route::delete('/{school}', [SchoolController::class, 'destroy']);
        Route::post('/{school}/logo', [SchoolController::class, 'uploadLogo']);
    });
});

Route::middleware(['auth:sanctum', 'role.super_admin'])->prefix('users')->group(function () {
    Route::get('/', [UserController::class, 'index']);
    Route::post('/', [UserController::class, 'store']);
    Route::get('/{user}', [UserController::class, 'show']);
    Route::put('/{user}', [UserController::class, 'update']);
    Route::patch('/{user}/status', [UserController::class, 'toggleStatus']);
    Route::delete('/{user}', [UserController::class, 'destroy']);
    Route::post('/{user}/reset-password', [UserController::class, 'resetPassword']);
    Route::post('/{user}/set-password', [UserController::class, 'setPassword']);
    Route::post('/{user}/link-alumni', [UserController::class, 'linkAlumni']);
    Route::delete('/{user}/unlink-alumni', [UserController::class, 'unlinkAlumni']);
    Route::get('/{user}/activity', [UserController::class, 'activity']);
});

Route::prefix('alumni')->group(function () {
    Route::middleware(['auth:sanctum', 'role.alumni.approved'])->group(function () {
        Route::put('/profile', [AlumniController::class, 'updateProfile']);
        Route::post('/profile/photo', [AlumniController::class, 'uploadProfilePhoto']);
    });

    Route::middleware(['auth:sanctum', 'role.admin'])->group(function () {
        Route::get('/duplicates', [AlumniController::class, 'duplicates']);
        Route::get('/email-availability', [AlumniController::class, 'checkEmailAvailability']);
        Route::get('/search', [SearchController::class, 'admin'])->middleware('throttle:search');
        Route::get('/suggest', [SearchController::class, 'adminSuggest']);
        Route::get('/filters', [SearchController::class, 'filters']);
        Route::get('/', [AlumniController::class, 'index']);
        Route::post('/', [AlumniController::class, 'store']);
        Route::get('/{alumnus}', [AlumniController::class, 'show']);
        Route::put('/{alumnus}', [AlumniController::class, 'update']);
        Route::delete('/{alumnus}', [AlumniController::class, 'destroy']);
        Route::patch('/{id}/restore', [AlumniController::class, 'restore']);
        Route::delete('/{id}/force', [AlumniController::class, 'forceDelete']);
        Route::post('/{alumnus}/photo', [AlumniController::class, 'uploadPhoto']);
        Route::delete('/{alumnus}/photo', [AlumniController::class, 'deletePhoto']);
    });
});

Route::prefix('batches')->group(function () {
    Route::middleware(['auth:sanctum', 'role.admin'])->group(function () {
        Route::get('/compare', [BatchController::class, 'compare']);
    });

    Route::middleware(['auth:sanctum', 'role.admin.or.alumni.approved'])->group(function () {
        Route::get('/', [BatchController::class, 'index']);
        Route::get('/{year}/stats', [BatchController::class, 'stats']);
        Route::get('/{year}', [BatchController::class, 'show'])->whereNumber('year');
    });

    Route::middleware(['auth:sanctum', 'role.admin'])->group(function () {
        Route::get('/{year}/notes', [BatchController::class, 'getNote'])->whereNumber('year');
        Route::put('/{year}/notes', [BatchController::class, 'notes'])->whereNumber('year');
        Route::get('/{year}/export', [BatchController::class, 'export'])
            ->middleware('throttle:exports')
            ->whereNumber('year');
    });
});

Route::prefix('announcements')->group(function () {
    Route::middleware(['auth:sanctum', 'role.alumni.approved'])->group(function () {
        Route::get('/active', [AnnouncementController::class, 'active']);
        Route::get('/mine', [AnnouncementController::class, 'mine']);
        Route::post('/{announcement}/viewed', [AnnouncementController::class, 'markViewed']);
    });

    Route::middleware(['auth:sanctum', 'role.admin'])->group(function () {
        Route::get('/batches', [AnnouncementController::class, 'batches']);
        Route::get('/', [AnnouncementController::class, 'index']);
        Route::post('/', [AnnouncementController::class, 'store']);
        Route::get('/{announcement}', [AnnouncementController::class, 'show']);
        Route::put('/{announcement}', [AnnouncementController::class, 'update']);
        Route::delete('/{announcement}', [AnnouncementController::class, 'destroy']);
        Route::patch('/{announcement}/publish', [AnnouncementController::class, 'publish']);
        Route::patch('/{announcement}/unpublish', [AnnouncementController::class, 'unpublish']);
        Route::patch('/{announcement}/expire', [AnnouncementController::class, 'expire']);
        Route::patch('/{announcement}/archive', [AnnouncementController::class, 'archive']);
        Route::patch('/{announcement}/restore', [AnnouncementController::class, 'restoreFromArchive']);
    });
});

Route::prefix('feedback')->middleware(['auth:sanctum', 'role.admin'])->group(function () {
    Route::get('/unread-count', [FeedbackThreadController::class, 'unreadCount']);
    Route::get('/recipients', [FeedbackThreadController::class, 'recipients']);
    Route::get('/', [FeedbackThreadController::class, 'index']);
    Route::post('/', [FeedbackThreadController::class, 'store']);
    Route::get('/{thread}', [FeedbackThreadController::class, 'show'])->whereNumber('thread');
    Route::post('/{thread}/messages', [FeedbackThreadController::class, 'reply'])->whereNumber('thread');
    Route::patch('/{thread}/resolve', [FeedbackThreadController::class, 'resolve'])->whereNumber('thread');
    Route::patch('/{thread}/reopen', [FeedbackThreadController::class, 'reopen'])->whereNumber('thread');
    Route::post('/{thread}/read', [FeedbackThreadController::class, 'markRead'])->whereNumber('thread');
});

Route::prefix('dashboard')->group(function () {
    Route::middleware(['auth:sanctum', 'role.admin'])->group(function () {
        Route::get('/admin', [DashboardController::class, 'admin']);
        Route::get('/stats', [DashboardController::class, 'stats']);
    });

    Route::middleware(['auth:sanctum', 'role.alumni.approved'])->group(function () {
        Route::get('/alumni', [DashboardController::class, 'alumni']);
    });
});

Route::prefix('reports')->group(function () {
    // Literal-segment routes must be registered before the `/{report}` wildcard routes below,
    // otherwise e.g. GET /reports/published is matched by /{report} first and 404s on model binding.
    Route::middleware(['auth:sanctum', 'role.admin'])->group(function () {
        Route::get('/types', [ReportController::class, 'types']);
        Route::post('/generate', [ReportController::class, 'generate'])->middleware('throttle:reports-generate');
        Route::post('/preview', [ReportController::class, 'preview']);
        Route::post('/preview/pdf', [ReportController::class, 'previewPdf'])->middleware('throttle:reports-generate');
        Route::get('/history', [ReportController::class, 'history']);
        Route::get('/stats/summary', [ReportController::class, 'statsSummary']);
    });

    Route::middleware(['auth:sanctum', 'role.alumni.approved'])->group(function () {
        Route::get('/published', [ReportController::class, 'published']);
    });

    // Admin can download any report; approved alumni may download published/active/school-visible reports only.
    Route::middleware(['auth:sanctum', 'role.admin.or.alumni.approved'])->group(function () {
        Route::get('/{report}/download', [ReportController::class, 'download']);
        Route::get('/{report}/preview', [ReportController::class, 'previewFile']);
    });

    Route::middleware(['auth:sanctum', 'role.admin'])->group(function () {
        Route::get('/{report}', [ReportController::class, 'show']);
        Route::patch('/{report}/publish', [ReportController::class, 'publish']);
        Route::patch('/{report}/unpublish', [ReportController::class, 'unpublish']);
        Route::patch('/{report}/archive', [ReportController::class, 'archive']);
        Route::patch('/{report}/restore', [ReportController::class, 'restore']);
        Route::delete('/{report}', [ReportController::class, 'destroy']);
    });
});

Route::prefix('directory')->group(function () {
    Route::middleware(['auth:sanctum', 'role.admin.or.alumni.approved'])->group(function () {
        Route::get('/stats', [DirectoryController::class, 'stats']);
        Route::get('/sections', [DirectoryController::class, 'sections']);
        Route::get('/search', [SearchController::class, 'directory'])->middleware('throttle:search');
        Route::get('/suggest', [SearchController::class, 'directorySuggest'])->middleware('throttle:search');
        Route::get('/filters', [SearchController::class, 'filters']);
        Route::get('/', [DirectoryController::class, 'index']);
        Route::get('/{alumnus}', [DirectoryController::class, 'show']);
    });
});

Route::middleware(['auth:sanctum', 'role.admin'])->prefix('approvals')->group(function () {
    Route::get('/alumni', [ApprovalController::class, 'index']);
    Route::get('/alumni/{user}', [ApprovalController::class, 'show']);
    Route::post('/alumni/{user}/approve', [ApprovalController::class, 'approve']);
    Route::post('/alumni/{user}/reject', [ApprovalController::class, 'reject']);
});

Route::middleware(['auth:sanctum', 'role.admin.or.alumni.approved'])->prefix('profile')->group(function () {
    Route::get('/', [ProfileController::class, 'show']);
    Route::put('/', [ProfileController::class, 'update']);
    Route::put('/password', [ProfileController::class, 'changePassword']);
    Route::post('/photo', [ProfileController::class, 'uploadPhoto']);
    Route::delete('/photo', [ProfileController::class, 'deletePhoto']);

    Route::get('/sessions', [SessionController::class, 'index']);
    Route::delete('/sessions', [SessionController::class, 'destroyAll']);
    Route::delete('/sessions/{id}', [SessionController::class, 'destroy']);

    Route::get('/notifications', [NotificationPreferenceController::class, 'show']);
    Route::put('/notifications', [NotificationPreferenceController::class, 'update']);

    Route::get('/remembered-devices', [RememberedDeviceController::class, 'index']);
    Route::delete('/remembered-devices/{id}', [RememberedDeviceController::class, 'destroy']);
    Route::delete('/remembered-devices', [RememberedDeviceController::class, 'destroyAll']);
});

// Push-token management is limited to the authenticated user's own device
// tokens, but must also work for pending applicants so rejection notices can
// reach a phone before approval. Keep these routes outside the approved-only
// profile group; no other profile endpoint is opened to pending accounts.
Route::middleware('auth:sanctum')->prefix('profile')->group(function () {
    Route::post('/push-tokens', [PushTokenController::class, 'store']);
    Route::delete('/push-tokens', [PushTokenController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'role.super_admin'])->prefix('system')->group(function () {
    Route::get('/info', [SystemController::class, 'info']);
    Route::get('/activity-logs', [SystemController::class, 'activityLogs']);
    Route::get('/activity-logs/actions', [SystemController::class, 'activityLogActions']);
    Route::get('/activity-logs/users', [SystemController::class, 'activityLogUsers']);
    Route::get('/activity-logs/export', [SystemController::class, 'exportActivityLogs'])->middleware('throttle:exports');
});

Route::middleware(['auth:sanctum', 'role.super_admin'])->prefix('backups')->group(function () {
    Route::get('/', [BackupController::class, 'index']);
    Route::post('/', [BackupController::class, 'store']);
    Route::get('/{backup}/download', [BackupController::class, 'download']);
    Route::delete('/{backup}', [BackupController::class, 'destroy']);
    Route::post('/{backup}/restore', [BackupController::class, 'restore']);
});

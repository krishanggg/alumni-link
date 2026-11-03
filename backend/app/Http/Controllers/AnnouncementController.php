<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AnnouncementStatus;
use App\Http\Requests\Announcement\MineAnnouncementRequest;
use App\Http\Requests\Announcement\StoreAnnouncementRequest;
use App\Http\Requests\Announcement\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Services\AnnouncementService;
use App\Support\Pagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function __construct(
        private readonly AnnouncementService $announcementService,
    ) {}

    public function active(Request $request): JsonResponse
    {
        $this->authorize('viewActive', Announcement::class);

        ['announcements' => $announcements, 'unviewed_count' => $unviewedCount] = $this->announcementService->active($request->user());

        return response()->json([
            'announcements' => AnnouncementResource::collection($announcements),
            'unviewed_count' => $unviewedCount,
        ]);
    }

    public function mine(MineAnnouncementRequest $request): JsonResponse
    {
        $this->authorize('viewActive', Announcement::class);

        $perPage = Pagination::clampPerPage((int) $request->input('per_page', 15), 15);
        $announcements = $this->announcementService->mine($request->user(), $request->validated('type'), $perPage, $request->validated('q'));

        if ($announcements === null) {
            return response()->json(['announcements' => []]);
        }

        return response()->json([
            'announcements' => AnnouncementResource::collection($announcements)->resolve(),
            'current_page' => $announcements->currentPage(),
            'last_page' => $announcements->lastPage(),
            'per_page' => $announcements->perPage(),
            'total' => $announcements->total(),
        ]);
    }

    public function batches(Request $request): JsonResponse
    {
        $this->authorize('batches', Announcement::class);

        $schoolId = $request->filled('school_id') ? (int) $request->input('school_id') : null;
        $years = $this->announcementService->batchYears($request->user(), $schoolId);

        return response()->json($years);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Announcement::class);

        $results = $this->announcementService->list($request->all(), $request->user());

        return response()->json(
            $results instanceof LengthAwarePaginator
                ? AnnouncementResource::collection($results)->response()->getData(true)
                : $this->collectionResource($results, AnnouncementResource::class),
        );
    }

    public function show(Announcement $announcement): JsonResponse
    {
        $this->authorize('view', $announcement);

        $announcement->load(['batches', 'school', 'creator']);

        return response()->json(new AnnouncementResource($announcement));
    }

    public function store(StoreAnnouncementRequest $request): JsonResponse
    {
        $this->authorize('create', Announcement::class);

        $attributes = $request->safe()->except(['target_batches']);
        $targetAllBatches = $request->boolean('target_all_batches');
        $targetBatches = $request->input('target_batches', []);

        $announcement = $this->announcementService->create($attributes, $targetAllBatches, $targetBatches, $request->user());

        if ($announcement->status === AnnouncementStatus::Published) {
            ActivityLog::log(
                $request->user()?->id,
                'announcement.published',
                Announcement::class,
                $announcement->id,
                "Announcement '{$announcement->title}' published",
                null,
                $request->ip(),
            );
        }

        return response()->json(new AnnouncementResource($announcement->load(['batches', 'school', 'creator'])), 201);
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('update', $announcement);

        $attributes = $request->safe()->except(['target_batches']);
        $targetAllBatches = $request->boolean('target_all_batches');
        $targetBatches = $request->input('target_batches', []);

        $announcement = $this->announcementService->update($announcement, $attributes, $targetAllBatches, $targetBatches, $request->user());

        return response()->json(new AnnouncementResource($announcement->fresh(['batches', 'school', 'creator'])));
    }

    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('delete', $announcement);

        $title = $announcement->title;
        $announcement->delete();

        ActivityLog::log(
            $request->user()?->id,
            'announcement.deleted',
            Announcement::class,
            null,
            "Announcement '{$title}' deleted",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Announcement deleted.']);
    }

    public function publish(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('publish', $announcement);

        $this->announcementService->publish($announcement);

        ActivityLog::log(
            $request->user()?->id,
            'announcement.published',
            Announcement::class,
            $announcement->id,
            "Announcement '{$announcement->title}' published",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Published.']);
    }

    public function unpublish(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('unpublish', $announcement);

        $this->announcementService->unpublish($announcement);

        ActivityLog::log(
            $request->user()?->id,
            'announcement.unpublished',
            Announcement::class,
            $announcement->id,
            "Announcement '{$announcement->title}' unpublished",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Unpublished.']);
    }

    public function expire(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('expire', $announcement);

        $this->announcementService->expire($announcement);

        ActivityLog::log(
            $request->user()?->id,
            'announcement.expired',
            Announcement::class,
            $announcement->id,
            "Announcement '{$announcement->title}' expired",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Expired.']);
    }

    public function archive(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('archive', $announcement);

        $wasPublished = $this->announcementService->archive($announcement, $request->user()?->id);

        ActivityLog::log(
            $request->user()?->id,
            'announcement.archived',
            Announcement::class,
            $announcement->id,
            $wasPublished
                ? "Announcement '{$announcement->title}' archived and withdrawn from alumni"
                : "Announcement '{$announcement->title}' archived",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Archived.']);
    }

    public function restoreFromArchive(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('restoreFromArchive', $announcement);

        $this->announcementService->restoreFromArchive($announcement, $request->user()?->id);

        ActivityLog::log(
            $request->user()?->id,
            'announcement.restored',
            Announcement::class,
            $announcement->id,
            "Announcement '{$announcement->title}' restored from archive",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'Restored.']);
    }

    public function markViewed(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('markViewed', $announcement);

        $this->announcementService->markViewed($announcement, $request->user()?->id);

        return response()->json(['message' => 'Marked as viewed.']);
    }
}

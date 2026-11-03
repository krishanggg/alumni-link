<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Feedback\ListFeedbackThreadRequest;
use App\Http\Requests\Feedback\ReplyFeedbackMessageRequest;
use App\Http\Requests\Feedback\StoreFeedbackThreadRequest;
use App\Http\Resources\FeedbackRecipientResource;
use App\Http\Resources\FeedbackThreadResource;
use App\Models\ActivityLog;
use App\Models\FeedbackThread;
use App\Models\User;
use App\Services\FeedbackThreadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackThreadController extends Controller
{
    public function __construct(
        private readonly FeedbackThreadService $feedbackThreadService,
    ) {}

    public function index(ListFeedbackThreadRequest $request): JsonResponse
    {
        $this->authorize('viewAny', FeedbackThread::class);

        $threads = $this->feedbackThreadService->list($request->validated(), $request->user());

        return response()->json(FeedbackThreadResource::collection($threads)->response()->getData(true));
    }

    public function recipients(Request $request): JsonResponse
    {
        $this->authorize('recipients', FeedbackThread::class);

        $recipients = User::query()
            ->with('school')
            ->where('role', 'school_admin')
            ->where('is_active', true)
            ->orderBy('username')
            ->get();

        return response()->json(['data' => FeedbackRecipientResource::collection($recipients)]);
    }

    public function show(Request $request, FeedbackThread $thread): JsonResponse
    {
        $this->authorize('view', $thread);

        $thread = $this->feedbackThreadService->get($thread->id, $request->user());

        return response()->json(new FeedbackThreadResource($thread));
    }

    public function store(StoreFeedbackThreadRequest $request): JsonResponse
    {
        $this->authorize('create', FeedbackThread::class);

        $thread = $this->feedbackThreadService->create($request->validated(), $request->user());

        ActivityLog::log(
            $request->user()->id,
            'feedback.thread_created',
            FeedbackThread::class,
            $thread->id,
            "Feedback thread '{$thread->subject}' created",
            null,
            $request->ip(),
        );

        return response()->json(new FeedbackThreadResource($thread), 201);
    }

    public function reply(ReplyFeedbackMessageRequest $request, FeedbackThread $thread): JsonResponse
    {
        $this->authorize('reply', $thread);

        $thread = $this->feedbackThreadService->reply($thread, $request->validated('body'), $request->user());

        ActivityLog::log(
            $request->user()->id,
            'feedback.message_sent',
            FeedbackThread::class,
            $thread->id,
            "Reply sent in feedback thread '{$thread->subject}'",
            null,
            $request->ip(),
        );

        return response()->json(new FeedbackThreadResource($thread));
    }

    public function resolve(Request $request, FeedbackThread $thread): JsonResponse
    {
        $this->authorize('resolve', $thread);

        $thread = $this->feedbackThreadService->markResolved($thread, $request->user());

        ActivityLog::log(
            $request->user()->id,
            'feedback.thread_resolved',
            FeedbackThread::class,
            $thread->id,
            "Feedback thread '{$thread->subject}' resolved",
            null,
            $request->ip(),
        );

        return response()->json(new FeedbackThreadResource($thread));
    }

    public function reopen(Request $request, FeedbackThread $thread): JsonResponse
    {
        $this->authorize('reopen', $thread);

        $thread = $this->feedbackThreadService->reopen($thread, $request->user());

        ActivityLog::log(
            $request->user()->id,
            'feedback.thread_reopened',
            FeedbackThread::class,
            $thread->id,
            "Feedback thread '{$thread->subject}' reopened",
            null,
            $request->ip(),
        );

        return response()->json(new FeedbackThreadResource($thread));
    }

    public function markRead(Request $request, FeedbackThread $thread): JsonResponse
    {
        $this->authorize('markRead', $thread);

        $this->feedbackThreadService->markRead($thread, $request->user());

        return response()->json(['message' => 'Feedback thread marked as read.']);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $this->authorize('viewAny', FeedbackThread::class);

        return response()->json([
            'unread_count' => $this->feedbackThreadService->unreadCount($request->user()),
        ]);
    }
}

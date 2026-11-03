<?php

declare(strict_types=1);

use App\Models\FeedbackThread;
use App\Models\User;
use App\Policies\FeedbackThreadPolicy;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('feedback.thread.{thread}', function (User $user, FeedbackThread $thread): bool {
    return app(FeedbackThreadPolicy::class)->view($user, $thread);
});

Broadcast::channel('feedback.inbox.{userId}', function (User $user, int $userId): bool {
    return $user->isAdmin() && $user->id === $userId;
});

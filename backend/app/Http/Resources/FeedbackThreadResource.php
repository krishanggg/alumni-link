<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\FeedbackMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

class FeedbackThreadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $latestMessage = $this->latestMessageForResource();
        $viewer = $request->user();
        $readAt = $viewer?->isSuperAdmin()
            ? $this->super_admin_last_read_at
            : $this->school_admin_last_read_at;

        return [
            'id' => $this->id,
            'subject' => $this->subject,
            'status' => $this->status,
            'school' => $this->whenLoaded('school', fn () => [
                'id' => $this->school->id,
                'name' => $this->school->name,
            ]),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'school_admin' => $this->schoolAdminForResource(),
            'resolved_by' => $this->whenLoaded('resolver', fn () => $this->resolver?->name),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'last_message_at' => $this->last_message_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'unread' => $viewer !== null
                && $latestMessage instanceof FeedbackMessage
                && ($readAt === null || $latestMessage->created_at?->gt($readAt))
                && $latestMessage->sender_id !== $viewer->id,
            'messages' => FeedbackMessageResource::collection($this->whenLoaded('messages')),
        ];
    }

    private function latestMessageForResource(): ?FeedbackMessage
    {
        if ($this->relationLoaded('latestMessage')) {
            return $this->latestMessage;
        }

        if ($this->relationLoaded('messages')) {
            /** @var Collection<int, FeedbackMessage> $messages */
            $messages = $this->messages;

            return $messages->last();
        }

        return null;
    }

    private function schoolAdminForResource(): ?array
    {
        $schoolAdmin = $this->relationLoaded('schoolAdmin') ? $this->schoolAdmin : null;

        if ($schoolAdmin === null && $this->relationLoaded('creator') && $this->creator?->isSchoolAdmin()) {
            $schoolAdmin = $this->creator;
        }

        if ($schoolAdmin === null) {
            return null;
        }

        return [
            'id' => $schoolAdmin->id,
            'name' => $schoolAdmin->name,
            'role' => $schoolAdmin->role,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Covers the "account activity" preference category: password changes and
 * sign-ins from an unrecognized IP. One class with a subject/message pair
 * rather than one per sub-event, since both are the same shape of message.
 */
class AccountActivityNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $subjectLine,
        private readonly string $message,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $notifiable->loadMissing(['school', 'alumni']);

        return (new MailMessage)
            ->subject($this->subjectLine)
            ->view('emails.account_activity', [
                'subject' => $this->subjectLine,
                'heading' => $this->subjectLine,
                'firstName' => $notifiable->alumni?->first_name ?? $notifiable->name,
                'bodyMessage' => $this->message,
                'schoolName' => $notifiable->school?->name,
                'schoolLogoUrl' => $notifiable->school?->logo ? url('/storage/'.$notifiable->school->logo) : null,
            ]);
    }
}

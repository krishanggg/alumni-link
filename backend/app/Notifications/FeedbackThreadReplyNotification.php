<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\FeedbackThread;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class FeedbackThreadReplyNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly FeedbackThread $thread,
        private readonly bool $isNewThread = false,
        private readonly ?string $statusChange = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $notifiable->loadMissing(['school', 'alumni']);
        $subject = $this->subject();
        $statusMessage = $this->statusChange === null ? null : $this->statusChange;

        return (new MailMessage)
            ->subject($subject)
            ->view('emails.feedback_thread_reply', [
                'subject' => $subject,
                'heading' => $this->heading(),
                'firstName' => $notifiable->alumni?->first_name ?? $notifiable->name,
                'threadSubject' => $this->thread->subject,
                'messageIntro' => $this->messageIntro(),
                'statusMessage' => $statusMessage,
                'feedbackUrl' => rtrim((string) (config('app.frontend_url') ?: config('app.url')), '/').'/feedback?conversation='.$this->thread->id,
                'schoolName' => $notifiable->school?->name,
                'schoolLogoUrl' => $notifiable->school?->logo ? url('/storage/'.$notifiable->school->logo) : null,
            ]);
    }

    private function subject(): string
    {
        if ($this->statusChange === 'resolved') {
            return 'Feedback resolved: '.$this->thread->subject;
        }

        if ($this->statusChange === 'reopened') {
            return 'Feedback reopened: '.$this->thread->subject;
        }

        return ($this->isNewThread ? 'New message in Feedback: ' : 'New reply on Feedback: ').$this->thread->subject;
    }

    private function heading(): string
    {
        if ($this->statusChange === 'resolved') {
            return 'Feedback Conversation Resolved';
        }

        if ($this->statusChange === 'reopened') {
            return 'Feedback Conversation Reopened';
        }

        return $this->isNewThread ? 'New Feedback Message' : 'New Feedback Reply';
    }

    private function messageIntro(): string
    {
        if ($this->statusChange !== null) {
            return '';
        }

        return $this->isNewThread ? 'new message in' : 'new reply on';
    }
}

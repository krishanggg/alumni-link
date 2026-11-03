<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AlumniRecordUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<int, string>  $changedFields
     */
    public function __construct(private readonly array $changedFields) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $notifiable->loadMissing(['school', 'alumni']);

        return (new MailMessage)
            ->subject('Your alumni record was updated')
            ->view('emails.alumni_record_updated', [
                'subject' => 'Your alumni record was updated',
                'heading' => 'Record Updated',
                'firstName' => $notifiable->alumni?->first_name ?? $notifiable->name,
                'changedFields' => $this->changedFields,
                'schoolName' => $notifiable->school?->name,
                'schoolLogoUrl' => $notifiable->school?->logo ? url('/storage/'.$notifiable->school->logo) : null,
            ]);
    }
}

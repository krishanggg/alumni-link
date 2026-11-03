<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SystemAnnouncementNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly Announcement $announcement) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $notifiable->loadMissing(['school', 'alumni']);

        return (new MailMessage)
            ->subject('New announcement: '.$this->announcement->title)
            ->view('emails.system_announcement', [
                'subject' => 'New announcement: '.$this->announcement->title,
                'heading' => 'New Announcement',
                'firstName' => $notifiable->alumni?->first_name ?? $notifiable->name,
                'announcementTitle' => $this->announcement->title,
                'announcementMessage' => $this->announcement->message,
                'schoolName' => $notifiable->school?->name,
                'schoolLogoUrl' => $notifiable->school?->logo ? url('/storage/'.$notifiable->school->logo) : null,
            ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Report;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReportCompletedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly Report $report) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $notifiable->loadMissing(['school', 'alumni']);

        return (new MailMessage)
            ->subject('Report ready: '.$this->report->title)
            ->view('emails.report_completed', [
                'subject' => 'Report ready: '.$this->report->title,
                'heading' => 'Report Ready',
                'firstName' => $notifiable->alumni?->first_name ?? $notifiable->name,
                'reportTitle' => $this->report->title,
                'schoolName' => $notifiable->school?->name,
                'schoolLogoUrl' => $notifiable->school?->logo ? url('/storage/'.$notifiable->school->logo) : null,
            ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdministrativeChangeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $schoolName,
        private readonly string $summary,
        private readonly string $actorName,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("An administrative change was made for {$this->schoolName}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Super Admin {$this->actorName} made a change affecting {$this->schoolName}.")
            ->line($this->summary)
            ->line('This is an administrative activity notice.');
    }
}

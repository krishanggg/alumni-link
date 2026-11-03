<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Security-critical, so this is never gated by the recipient's
 * notification preferences — unlike the other four categories, a user who
 * requested a reset must receive it regardless of their toggle state.
 */
class PasswordResetNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly string $resetUrl) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $notifiable->loadMissing(['school', 'alumni']);

        return (new MailMessage)
            ->subject('Reset your password')
            ->view('emails.password_reset', [
                'subject' => 'Reset your password',
                'heading' => 'Reset Your Password',
                'firstName' => $notifiable->alumni?->first_name ?? $notifiable->name,
                'resetUrl' => $this->resetUrl,
                'schoolName' => $notifiable->school?->name,
                'schoolLogoUrl' => $notifiable->school?->logo ? url('/storage/'.$notifiable->school->logo) : null,
            ]);
    }
}

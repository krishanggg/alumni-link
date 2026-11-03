<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent when an administrator sets a new password for an account and chooses
 * to email it. Deliberately NOT queued: the plaintext password would
 * otherwise sit in the jobs table until the worker picks it up. Security-
 * critical, so never gated by notification preferences.
 */
class PasswordSetByAdminNotification extends Notification
{
    public function __construct(private readonly string $newPassword) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $notifiable->loadMissing(['school', 'alumni']);

        return (new MailMessage)
            ->subject('Your password has been changed')
            ->view('emails.password_set_by_admin', [
                'subject' => 'Your password has been changed',
                'heading' => 'Your Password Was Changed',
                'firstName' => $notifiable->alumni?->first_name ?? $notifiable->name,
                'newPassword' => $this->newPassword,
                'loginUrl' => rtrim((string) (config('app.frontend_url') ?: config('app.url')), '/').'/login',
                'schoolName' => $notifiable->school?->name,
                'schoolLogoUrl' => $notifiable->school?->logo ? url('/storage/'.$notifiable->school->logo) : null,
            ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationPreferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'account_activity' => 'sometimes|boolean',
            'alumni_record_updates' => 'sometimes|boolean',
            'system_announcements' => 'sometimes|boolean',
            'report_completion' => 'sometimes|boolean',
            'feedback' => 'sometimes|boolean',
            'administrative_notices' => 'sometimes|boolean',
        ];
    }
}

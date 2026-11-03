<?php

declare(strict_types=1);

namespace App\Http\Requests\Announcement;

use Illuminate\Foundation\Http\FormRequest;

class StoreAnnouncementRequest extends FormRequest
{
    public function rules(): array
    {
        $yearMax = date('Y');

        return [
            'type' => 'required|in:event,general,closure',
            'title' => 'required|string|max:100',
            'message' => 'required|string|max:1000',
            'target_date' => 'required_if:type,event|nullable|date|after:now',
            'school_id' => 'nullable|exists:schools,id',
            'target_all_batches' => 'boolean',
            'target_batches' => 'required_unless:target_all_batches,true|array',
            'target_batches.*' => "integer|min:1900|max:{$yearMax}",
            'show_as_modal' => 'boolean',
            'status' => 'required|in:draft,published',
        ];
    }
}

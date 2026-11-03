<?php

declare(strict_types=1);

namespace App\Http\Requests\Feedback;

use Illuminate\Foundation\Http\FormRequest;

class ListFeedbackThreadRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'string', 'in:open,resolved,all'],
            'q' => ['sometimes', 'string', 'max:200'],
            'school_id' => ['sometimes', 'integer', 'exists:schools,id'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer'],
        ];
    }
}

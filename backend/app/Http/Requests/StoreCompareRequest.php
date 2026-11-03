<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompareRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'years' => 'required|array|min:2|max:5',
            'years.*' => 'required|integer|min:1900|max:'.(date('Y') + 1),
            'school_id' => 'nullable|integer|exists:schools,id',
        ];
    }
}

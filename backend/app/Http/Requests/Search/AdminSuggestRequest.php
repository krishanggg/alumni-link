<?php

declare(strict_types=1);

namespace App\Http\Requests\Search;

use App\Policies\AlumniPolicy;
use Illuminate\Foundation\Http\FormRequest;

class AdminSuggestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(AlumniPolicy::class)->suggestAdmin($this->user());
    }

    public function rules(): array
    {
        return [
            'q' => 'required|string|min:2|max:100',
            'unlinked_only' => 'sometimes|boolean',
        ];
    }
}

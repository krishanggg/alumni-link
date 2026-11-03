<?php

declare(strict_types=1);

namespace App\Http\Requests\Search;

use App\Policies\AlumniPolicy;
use Illuminate\Foundation\Http\FormRequest;

class DirectorySuggestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(AlumniPolicy::class)->suggestDirectory($this->user());
    }

    public function rules(): array
    {
        return [
            'q' => 'required|string|min:2|max:100',
        ];
    }
}

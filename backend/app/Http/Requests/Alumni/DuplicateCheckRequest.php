<?php

declare(strict_types=1);

namespace App\Http\Requests\Alumni;

use App\Policies\AlumniPolicy;
use Illuminate\Foundation\Http\FormRequest;

class DuplicateCheckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(AlumniPolicy::class)->create($this->user());
    }

    public function rules(): array
    {
        return [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'graduation_year' => 'nullable|integer',
            'school_id' => 'nullable|integer',
        ];
    }
}

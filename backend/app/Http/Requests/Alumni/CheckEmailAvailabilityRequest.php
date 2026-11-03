<?php

declare(strict_types=1);

namespace App\Http\Requests\Alumni;

use App\Policies\AlumniPolicy;
use Illuminate\Foundation\Http\FormRequest;

class CheckEmailAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(AlumniPolicy::class)->create($this->user());
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|max:255',
            'exclude_id' => 'nullable|integer',
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\School;

use App\Rules\PhilippineSchoolPhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSchoolRequest extends FormRequest
{
    public function rules(): array
    {
        $schoolId = $this->route('school')?->id;

        return [
            'name' => "required|string|max:255|unique:schools,name,{$schoolId}",
            'address' => 'nullable|string|max:500',
            'contact_number' => ['nullable', new PhilippineSchoolPhoneNumber],
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
        ];
    }
}

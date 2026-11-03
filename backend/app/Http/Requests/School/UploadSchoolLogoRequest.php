<?php

declare(strict_types=1);

namespace App\Http\Requests\School;

use App\Policies\SchoolPolicy;
use Illuminate\Foundation\Http\FormRequest;

class UploadSchoolLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(SchoolPolicy::class)->update($this->user(), $this->route('school'));
    }

    public function rules(): array
    {
        return [
            'logo' => 'required|image|mimes:jpeg,png|max:5120',
        ];
    }
}

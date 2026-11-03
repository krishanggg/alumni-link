<?php

declare(strict_types=1);

namespace App\Http\Requests\Alumni;

use App\Policies\AlumniPolicy;
use Illuminate\Foundation\Http\FormRequest;

class UploadProfilePhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && app(AlumniPolicy::class)->updateProfile($this->user());
    }

    public function rules(): array
    {
        return [
            'photo' => 'required|image|mimes:jpeg,png|max:5120',
        ];
    }
}

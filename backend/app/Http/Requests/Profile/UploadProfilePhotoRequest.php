<?php

declare(strict_types=1);

namespace App\Http\Requests\Profile;

use App\Policies\AlumniPolicy;
use Illuminate\Foundation\Http\FormRequest;

class UploadProfilePhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && app(AlumniPolicy::class)->uploadOwnPhoto($this->user());
    }

    public function rules(): array
    {
        return [
            'photo' => 'required|image|mimes:jpeg,png|max:5120',
        ];
    }
}

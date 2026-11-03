<?php

declare(strict_types=1);

namespace App\Http\Requests\Alumni;

use App\Policies\AlumniPolicy;
use Illuminate\Foundation\Http\FormRequest;

class UploadAlumniPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(AlumniPolicy::class)->update($this->user(), $this->route('alumnus'));
    }

    public function rules(): array
    {
        return [
            'photo' => 'required|image|mimes:jpeg,png|max:5120',
        ];
    }
}

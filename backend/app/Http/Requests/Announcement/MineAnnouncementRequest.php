<?php

declare(strict_types=1);

namespace App\Http\Requests\Announcement;

use App\Enums\AnnouncementType;
use App\Models\Announcement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class MineAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewActive', Announcement::class);
    }

    /**
     * `per_page` is deliberately absent: it is clamped to 1..100 in the
     * controller rather than rejected, which is the contract the existing
     * pagination tests lock in. An out-of-range page size is a client mistake
     * worth absorbing, where an unknown `type` is worth surfacing.
     */
    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'string', 'in:'.implode(',', array_column(AnnouncementType::cases(), 'value'))],
            'q' => ['sometimes', 'string', 'max:200'],
        ];
    }
}

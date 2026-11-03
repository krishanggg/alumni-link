<?php

declare(strict_types=1);

namespace App\Http\Requests\Report;

use App\Enums\ReportType;
use App\Models\Report;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class PublishedReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewPublished', Report::class);
    }

    /**
     * `per_page` is clamped in the controller rather than validated here, to
     * match `AnnouncementController::mine()` — an out-of-range page size is
     * absorbed, an unknown `report_type` is rejected.
     */
    public function rules(): array
    {
        return [
            'report_type' => ['sometimes', 'string', 'in:'.implode(',', ReportType::values())],
        ];
    }
}

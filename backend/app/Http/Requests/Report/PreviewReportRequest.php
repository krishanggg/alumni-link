<?php

declare(strict_types=1);

namespace App\Http\Requests\Report;

use App\Enums\Gender;
use App\Enums\ReportType;
use App\Models\Report;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class PreviewReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('preview', Report::class);
    }

    public function rules(): array
    {
        return [
            'report_type' => 'required|in:'.implode(',', ReportType::values()),
            'filters' => 'nullable|array',
            'filters.graduation_year_from' => 'nullable|integer',
            'filters.graduation_year_to' => 'nullable|integer',
            'filters.section' => 'nullable|string',
            'filters.gender' => 'nullable|in:'.implode(',', array_column(Gender::cases(), 'value')),
            'filters.school_id' => 'nullable|integer|exists:schools,id',
        ];
    }
}

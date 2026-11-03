<?php

declare(strict_types=1);

namespace App\Http\Requests\Report;

use App\Enums\Gender;
use App\Enums\ReportFormat;
use App\Enums\ReportType;
use App\Models\Report;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class GenerateReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('generate', Report::class);
    }

    public function rules(): array
    {
        return [
            'report_type' => 'required|in:'.implode(',', ReportType::values()),
            'title' => 'nullable|string|max:255',
            'format' => 'nullable|in:'.implode(',', array_column(ReportFormat::cases(), 'value')),
            'filters' => 'nullable|array',
            'filters.graduation_year_from' => 'nullable|integer',
            'filters.graduation_year_to' => 'nullable|integer',
            'filters.section' => 'nullable|string',
            'filters.gender' => 'nullable|in:'.implode(',', array_column(Gender::cases(), 'value')),
            'filters.school_id' => 'nullable|integer|exists:schools,id',
        ];
    }
}

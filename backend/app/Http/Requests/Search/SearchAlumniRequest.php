<?php

declare(strict_types=1);

namespace App\Http\Requests\Search;

use Illuminate\Foundation\Http\FormRequest;

class SearchAlumniRequest extends FormRequest
{
    public function rules(): array
    {
        $yearMax = date('Y');

        return [
            'status' => 'nullable|in:active,archived,all',
            'q' => 'nullable|string|min:2|max:100',
            'school_id' => 'nullable|integer|exists:schools,id',
            'graduation_year' => 'nullable|array',
            'graduation_year.*' => "integer|min:1900|max:{$yearMax}",
            'section' => 'nullable|array',
            'section.*' => 'string|max:100',
            'gender' => 'nullable|in:male,female',
            'sort_by' => 'nullable|in:name_asc,name_desc,year_asc,year_desc,date_asc,date_desc',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ];
    }
}

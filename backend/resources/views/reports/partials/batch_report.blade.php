@php
    $alumni = collect($data['alumni'] ?? []);
@endphp
@include('reports.partials._masthead')

<div class="report-headline">Batch Report</div>

@include('reports.partials._meta_strip', [
    'left' => ['label' => 'Report Date', 'value' => now()->format('F j, Y')],
    'right' => ['label' => 'Members', 'value' => number_format($alumni->count()).' alumni'],
])

<table class="roster-table">
    <thead>
        <tr>
            <th class="roster-col-name">Name</th>
            <th class="roster-col-year">Year</th>
            <th class="roster-col-section">Section</th>
        </tr>
    </thead>
    <tbody>
        @foreach($alumni as $i => $alum)
            <tr>
                <td class="roster-name"><span class="roster-index">{{ str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) }}</span> &nbsp; {{ trim(($alum['first_name'] ?? '').' '.($alum['last_name'] ?? '')) }}</td>
                <td class="roster-year">{{ $alum['graduation_year'] ?? '—' }}</td>
                <td class="roster-section">{{ $alum['section_strand'] ?? '—' }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

@if (! empty($data['truncation_note']))
    <div class="report-truncation-note">{{ $data['truncation_note'] }}</div>
@endif

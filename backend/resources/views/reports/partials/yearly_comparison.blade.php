@php
    $rows = collect($data);
    $totalAcrossYears = $rows->sum('total');
    $peakRow = $rows->sortByDesc('total')->first();
    $years = $rows->pluck('graduation_year');
    $coverage = $years->isNotEmpty()
        ? ($years->min() == $years->max() ? "Class of {$years->min()}" : "{$years->min()}–{$years->max()}")
        : 'No batches on record';
@endphp
@include('reports.partials._masthead')

<div class="report-headline">Yearly Comparison</div>

@include('reports.partials._meta_strip', [
    'left' => ['label' => 'Report Date', 'value' => now()->format('F j, Y')],
    'right' => ['label' => 'Batches', 'value' => $coverage],
])

<table class="stat-row"><tr>
    <td class="stat-cell">
        <div class="stat-box stat-box-fill">
            <div class="stat-figure">{{ number_format($totalAcrossYears) }}</div>
            <div class="stat-caption">Total Across Years</div>
        </div>
    </td>
    @if($peakRow)
        <td class="stat-gap"></td>
        <td class="stat-cell">
            <div class="stat-box">
                <div class="stat-figure">{{ $peakRow['graduation_year'] }}</div>
                <div class="stat-caption">Peak Year &middot; {{ number_format($peakRow['total']) }}</div>
            </div>
        </td>
    @endif
</tr></table>

<div class="section-band"><table class="section-band-table"><tr><td class="section-band-cell">Alumni per Graduation Year</td></tr></table></div>

@if(! empty($charts['yearly_bar']))
    <div class="bar-chart"><img src="{{ $charts['yearly_bar'] }}" alt=""></div>
    <table class="bar-labels">
        <tr>
            @foreach($rows as $row)
                <td>{{ $row['graduation_year'] }}</td>
            @endforeach
        </tr>
    </table>
@endif

<table class="roster-table">
    <thead>
        <tr>
            <th class="roster-col-name">Graduation Year</th>
            <th class="roster-col-section">Total</th>
        </tr>
    </thead>
    <tbody>
        @foreach($rows as $row)
            <tr>
                <td class="roster-name">{{ $row['graduation_year'] }}</td>
                <td class="roster-section">{{ number_format($row['total']) }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

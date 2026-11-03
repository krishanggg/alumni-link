@php
    $batches = collect($data['batches'] ?? []);
    $half = (int) ceil($batches->count() / 2);
    $batchLeft = $batches->slice(0, $half)->keys()->values();
    $batchRight = $batches->slice($half)->keys()->values();
    $batchRows = max($batchLeft->count(), $batchRight->count());
    $maxBatch = $batches->max() ?: 1;
    $batchBarWidth = fn (int $year) => max(4, (int) round($batches[$year] / $maxBatch * 130));
    $years = $batches->keys();
    $coverage = $years->isNotEmpty()
        ? ($years->min() == $years->max() ? "Class of {$years->min()}" : "{$years->min()}–{$years->max()}")
        : 'No batches on record';
@endphp
@include('reports.partials._masthead')

<div class="report-headline">Alumni Summary</div>

@include('reports.partials._meta_strip', [
    'left' => ['label' => 'Report Date', 'value' => now()->format('F j, Y')],
    'right' => ['label' => 'Batches', 'value' => $coverage],
])

<table class="stat-row stat-row-triple"><tr>
    <td class="stat-cell">
        <div class="stat-box stat-box-fill">
            <div class="stat-figure">{{ number_format($data['total'] ?? 0) }}</div>
            <div class="stat-caption">Total Alumni</div>
        </div>
    </td>
    <td class="stat-cell">
        <div class="stat-box">
            <div class="stat-figure">{{ number_format($data['active'] ?? 0) }}</div>
            <div class="stat-caption">Active Records</div>
        </div>
    </td>
    <td class="stat-cell stat-cell-last">
        <div class="stat-box">
            <div class="stat-figure stat-figure-muted">{{ number_format($data['archived'] ?? 0) }}</div>
            <div class="stat-caption">Archived</div>
        </div>
    </td>
</tr></table>

<div class="section-band"><table class="section-band-table"><tr><td class="section-band-cell">Gender Distribution</td></tr></table></div>
@include('reports.partials._gender_pie', ['data' => $data, 'charts' => $charts, 'centered' => true])

<div class="section-band"><table class="section-band-table"><tr><td class="section-band-cell">Batch Breakdown</td></tr></table></div>
<table class="batch-grid">
    @for($i = 0; $i < $batchRows; $i++)
        <tr>
            @if($batchLeft->has($i))
                @php $year = $batchLeft[$i]; @endphp
                <td class="batch-year">{{ $year }}</td>
                <td class="batch-bar-cell"><div class="batch-bar-track"><div class="batch-bar-fill" style="width: {{ $batchBarWidth($year) }}px;"></div></div></td>
                <td class="batch-count">{{ number_format($batches[$year]) }}</td>
            @else
                <td class="batch-year"></td>
                <td class="batch-bar-cell"></td>
                <td class="batch-count"></td>
            @endif
            <td class="batch-gap"></td>
            @if($batchRight->has($i))
                @php $year = $batchRight[$i]; @endphp
                <td class="batch-year">{{ $year }}</td>
                <td class="batch-bar-cell"><div class="batch-bar-track"><div class="batch-bar-fill" style="width: {{ $batchBarWidth($year) }}px;"></div></div></td>
                <td class="batch-count">{{ number_format($batches[$year]) }}</td>
            @else
                <td class="batch-year"></td>
                <td class="batch-bar-cell"></td>
                <td class="batch-count"></td>
            @endif
        </tr>
    @endfor
</table>

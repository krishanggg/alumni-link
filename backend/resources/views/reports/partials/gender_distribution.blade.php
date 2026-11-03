@include('reports.partials._masthead')

<div class="report-headline">Gender Distribution</div>

@include('reports.partials._meta_strip', [
    'left' => ['label' => 'Report Date', 'value' => now()->format('F j, Y')],
])

<div class="section-band"><table class="section-band-table"><tr><td class="section-band-cell">Distribution</td></tr></table></div>
@include('reports.partials._gender_pie', ['data' => $data, 'charts' => $charts, 'large' => true])

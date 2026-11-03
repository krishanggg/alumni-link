<table class="masthead"><tr>
    <td class="masthead-seal">@include('reports.partials._seal', ['school' => $school])</td>
    <td class="masthead-text">
        <div class="masthead-school">{{ $school->name ?? 'All Schools' }}</div>
    </td>
</tr></table>
<div class="masthead-rule-1"></div>
<div class="masthead-rule-2"></div>

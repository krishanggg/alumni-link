@php
    $male = collect($data['gender'] ?? [])->get('male', 0);
    $female = collect($data['gender'] ?? [])->get('female', 0);
    $genderTotal = $male + $female;
    $malePct = $genderTotal > 0 ? round($male / $genderTotal * 100) : 0;
    $femalePct = $genderTotal > 0 ? round($female / $genderTotal * 100) : 0;
    $large = $large ?? false;
    $centered = $centered ?? false;
@endphp
<table class="chart-row{{ $large ? ' chart-row-lg' : '' }}{{ $centered ? ' chart-row-centered' : '' }}">
    <tr>
        <td class="donut-cell{{ $large ? ' donut-cell-lg' : '' }}">
            <div class="donut{{ $large ? ' donut-lg' : '' }}">
                @if(! empty($charts['gender_pie']))
                    <img src="{{ $charts['gender_pie'] }}" class="donut-img{{ $large ? ' donut-img-lg' : '' }}" alt="">
                @endif
                {{-- A single-cell table with vertical-align:middle handles true
                     centering of the hole-overlay text, the same technique the
                     seal already relies on — line-height-based top offsets on
                     absolutely positioned divs proved unreliable here (embedded
                     TTF vertical metrics don't line up with the CSS box the way
                     a browser's default font would). --}}
                <table class="donut-overlay{{ $large ? ' donut-overlay-lg' : '' }}"><tr><td>
                    <div class="donut-hole-text{{ $large ? ' donut-hole-text-lg' : '' }}">
                        <div class="donut-figure{{ $large ? ' donut-figure-lg' : '' }}">{{ number_format($genderTotal) }}</div>
                        <div class="donut-caption{{ $large ? ' donut-caption-lg' : '' }}">Alumni</div>
                    </div>
                </td></tr></table>
            </div>
        </td>
        <td class="legend-cell{{ $large ? ' legend-cell-lg' : '' }}{{ $centered ? ' legend-cell-centered' : '' }}">
            @if($large)
                {{-- Large variant: a negative-margin nudge (the technique the
                     standard-size legend uses) turned out to have almost no
                     effect at this size/row-height — tested two data points
                     60px apart and the rendered position barely moved,
                     unlike every other case in this file where that
                     technique responds predictably. Wrapping in a
                     single-cell outer table with vertical-align:middle and
                     an explicit height (the same reliable pattern used for
                     the seal and the donut hole text) sidesteps it
                     entirely instead of chasing another unpredictable
                     margin quirk. --}}
                <table class="legend-outer-lg"><tr><td class="legend-outer-td-lg">
                <div class="legend-nudge-lg">
            @else
                <div class="legend-wrap">
            @endif
                <table class="legend-table{{ $large ? ' legend-table-lg' : '' }}">
                    <tr class="legend-row">
                        <td class="legend-swatch-cell"><span class="legend-swatch" style="background:#2d75b4;"></span></td>
                        <td class="legend-label">Male</td>
                        <td class="legend-value">{{ number_format($male) }}</td>
                        <td class="legend-pct">{{ $malePct }}%</td>
                    </tr>
                    <tr class="legend-row">
                        <td class="legend-swatch-cell"><span class="legend-swatch" style="background:#9aa1b1;"></span></td>
                        <td class="legend-label">Female</td>
                        <td class="legend-value">{{ number_format($female) }}</td>
                        <td class="legend-pct">{{ $femalePct }}%</td>
                    </tr>
                    <tr class="legend-row legend-row-total">
                        <td></td>
                        <td class="legend-label">Total</td>
                        <td class="legend-value">{{ number_format($genderTotal) }}</td>
                        <td class="legend-pct">100%</td>
                    </tr>
                </table>
            @if($large)
                </div>
                </td></tr></table>
            @else
                </div>
            @endif
        </td>
    </tr>
</table>

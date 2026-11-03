@php
    $logoPath = $school && $school->logo
        ? \Illuminate\Support\Facades\Storage::disk('public')->path($school->logo)
        : null;
    $hasLogo = $logoPath && file_exists($logoPath);
@endphp
{{-- Flat navy disc with a thin ring — the seal container itself is a plain
     div (never a <table>) because border-radius is silently ignored on
     table elements in dompdf; the inner single-cell table only handles
     true vertical centering of its content. --}}
<div class="seal">
    <div class="seal-ring"></div>
    <table><tr><td>
        @if($hasLogo)
            <img src="{{ $logoPath }}" class="seal-logo" alt="">
        @else
            {{-- App-wide SchoolSeal brand mark (web/src/components/shared/icons/SchoolSeal.tsx),
                 used as the generic placeholder wherever a school has no logo uploaded yet.
                 dompdf doesn't render inline <svg> or <img src="*.svg"> (verified — both come
                 up blank/broken despite php-svg-lib being present), so this is a pre-rendered
                 PNG (transparent, white glyph, exported at 1024x1024 for crisp downscaling)
                 instead of the live SVG. --}}
            <img src="{{ resource_path('images/system-seal-mark.png') }}" class="seal-mark" alt="">
        @endif
    </td></tr></table>
</div>

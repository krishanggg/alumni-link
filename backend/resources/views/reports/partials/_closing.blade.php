@php
    $bandLeft = $school->name ?? 'All Schools';
    $contactLine = $school
        ? collect([$school->address, $school->contact_number, $school->email, $school->website])->filter()->implode(' &middot; ')
        : '';
    $noticeLeft = $contactLine !== '' ? $contactLine : 'Confidential &mdash; contains alumni personal data.';
@endphp
{{-- Fixed elements anchor to the @page margin box regardless of DOM
     position, so these bands repeat identically on every page — the same
     technique the v1 footer already relied on. The completion line (rules
     + "End of Report") and the "Page X / Y" label are intentionally NOT
     here — they're drawn per-page by ReportService::storeReportFile()'s
     Canvas::page_script() callback, which is the only mechanism that knows
     the real page number/count and can conditionally render "last page
     only" content (see the CSS comment above .closing-band for the
     geometry it targets). --}}
<div class="closing-band">
    <table class="closing-band-table"><tr>
        <td class="closing-band-left">{{ strtoupper($bandLeft) }}</td>
    </tr></table>
</div>
<div class="closing-accent"></div>
<div class="closing-notice">
    <table class="closing-notice-table"><tr>
        <td class="closing-notice-left">{!! $noticeLeft !!}</td>
        <td class="closing-notice-right">{{ now('Asia/Manila')->format('F j, Y \a\t g:i A') }}</td>
    </tr></table>
</div>

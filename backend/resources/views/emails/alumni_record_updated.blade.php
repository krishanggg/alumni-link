@extends('emails.layout')

@section('content')
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    Hello {{ $firstName }},
</p>
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    An administrator updated your alumni record. Sign in to your account to review the current details.
</p>
@if(!empty($changedFields))
<p style="margin:0; font-size:13px; line-height:1.6; color:#9aa1b1;">
    Fields updated: {{ implode(', ', $changedFields) }}
</p>
@endif
@endsection

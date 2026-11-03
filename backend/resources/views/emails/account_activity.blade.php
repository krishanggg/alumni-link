@extends('emails.layout')

@section('content')
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    Hello {{ $firstName }},
</p>
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    {{ $bodyMessage }}
</p>
<p style="margin:0; font-size:13px; line-height:1.6; color:#9aa1b1;">
    If this wasn't you, please contact your school administrator immediately.
</p>
@endsection

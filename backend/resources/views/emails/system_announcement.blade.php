@extends('emails.layout')

@section('content')
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    Hello {{ $firstName }},
</p>
<p style="margin:0 0 8px 0; font-size:15px; font-weight:bold; color:#2d75b4;">
    {{ $announcementTitle }}
</p>
<p style="margin:0; font-size:14px; line-height:1.6; color:#444750;">
    {{ $announcementMessage }}
</p>
@endsection

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $subject ?? config('app.name') }}</title>
</head>
<body style="margin:0; padding:0; background:#f7f9fb; font-family: Georgia, 'Times New Roman', serif; color:#191c1e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fb; padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border:1px solid #c4c6d1; border-radius:2px; max-width:560px; width:100%;">
    <tr>
        <td style="background:#23598b; padding:20px 28px; border-radius:2px 2px 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    @if(!empty($schoolLogoUrl))
                    <td width="44" style="vertical-align:middle;">
                        <img src="{{ $schoolLogoUrl }}" width="32" height="32" alt="" style="border-radius:50%; display:block;">
                    </td>
                    @endif
                    <td style="vertical-align:middle; color:#ffffff; font-size:16px; font-weight:bold; letter-spacing:0.3px;">
                        {{ $schoolName ?? 'AlumniLink' }}
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td style="padding:32px 28px 8px 28px;">
            <h1 style="margin:0 0 16px 0; font-size:20px; color:#2d75b4;">{{ $heading }}</h1>
            @yield('content')
        </td>
    </tr>
    <tr>
        <td style="padding:24px 28px 28px 28px;">
            <hr style="border:none; border-top:1px solid #dfe3ea; margin:0 0 16px 0;">
            <p style="margin:0; font-size:12px; color:#9aa1b1; font-style:italic;">
                This is an automated message from {{ $schoolName ?? 'AlumniLink' }}. Please do not reply to this email.
            </p>
        </td>
    </tr>
</table>
</td></tr>
</table>
</body>
</html>

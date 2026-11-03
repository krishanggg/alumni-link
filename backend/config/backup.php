<?php

declare(strict_types=1);

return [
    // Apache/PHP does not inherit the interactive user's PATH reliably on
    // Windows. Blank values use the WAMP-aware resolver in BackupService.
    'mysql_dump_path' => env('MYSQLDUMP_PATH', ''),
    'mysql_path' => env('MYSQL_PATH', ''),
];

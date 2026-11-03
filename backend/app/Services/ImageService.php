<?php

declare(strict_types=1);

namespace App\Services;

use finfo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ImageService
{
    private const MAX_WIDTH = 800;

    private const MAX_HEIGHT = 800;

    private const JPEG_QUALITY = 85;

    private const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

    /**
     * @param  bool  $cropToSquare  Center-crop to a square before scaling. Correct for
     *                              avatars, which always render in a circular frame; wrong
     *                              for logos, where cropping would discard part of a wordmark.
     */
    public function processUpload(
        UploadedFile $file,
        string $directory = 'photos',
        string $disk = 'public',
        string $field = 'photo',
        bool $cropToSquare = true,
    ): string {
        $realMime = $this->detectRealMimeType($file);

        if (! in_array($realMime, self::ALLOWED_MIME_TYPES, true)) {
            $extension = $file->getClientOriginalExtension();
            throw ValidationException::withMessages([
                $field => ["Invalid image type. Allowed: JPEG, PNG. Detected: {$realMime} (.{$extension})"],
            ]);
        }

        $manager = new ImageManager(Driver::class);
        $image = $manager->decodePath($file->getRealPath());

        if ($cropToSquare) {
            $image->coverDown(self::MAX_WIDTH, self::MAX_HEIGHT);
        } else {
            $image->scaleDown(self::MAX_WIDTH, self::MAX_HEIGHT);
        }

        $extension = $realMime === 'image/jpeg' ? 'jpeg' : 'png';
        $encoded = $image->encodeUsingFileExtension($extension, quality: self::JPEG_QUALITY);

        $filename = $directory.'/'.uniqid().'_'.time().'.'.$extension;
        Storage::disk($disk)->put($filename, (string) $encoded);

        return $filename;
    }

    public function detectRealMimeType(UploadedFile $file): string
    {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $realMime = $finfo->file($file->getRealPath());

        return $realMime !== false ? $realMime : 'application/octet-stream';
    }
}

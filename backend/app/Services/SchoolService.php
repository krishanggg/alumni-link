<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Alumni;
use App\Models\FeedbackThread;
use App\Models\School;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SchoolService
{
    public function __construct(
        private readonly ImageService $imageService,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): School
    {
        return School::create($attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(School $school, array $attributes): School
    {
        $school->update($attributes);

        return $school;
    }

    public function toggleStatus(School $school): School
    {
        $school->update(['is_active' => ! $school->is_active]);

        return $school;
    }

    /**
     * @throws BusinessRuleException
     */
    public function delete(School $school): void
    {
        $alumniCount = Alumni::where('school_id', $school->id)->count();

        if ($alumniCount > 0) {
            throw new BusinessRuleException(
                "Cannot delete: {$alumniCount} alumni are assigned to this school. Deactivate instead.",
                422,
            );
        }

        $batchNoteCount = DB::table('batch_notes')
            ->where('school_id', $school->id)
            ->count();
        $feedbackThreadCount = FeedbackThread::withTrashed()
            ->where('school_id', $school->id)
            ->count();

        if ($batchNoteCount > 0 || $feedbackThreadCount > 0) {
            throw new BusinessRuleException(
                'Cannot delete: batch notes or feedback conversations are still linked to this school. Deactivate instead.',
                422,
            );
        }

        $school->delete();
    }

    public function uploadLogo(School $school, UploadedFile $file): School
    {
        $path = $this->imageService->processUpload($file, 'logos', 'public', 'logo', cropToSquare: false);

        $oldLogo = $school->logo;

        $school->update(['logo' => $path]);

        if ($oldLogo) {
            Storage::disk('public')->delete($oldLogo);
        }

        return $school;
    }
}

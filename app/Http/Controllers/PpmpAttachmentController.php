<?php

namespace App\Http\Controllers;

use App\Models\Ppmp;
use App\Models\PpmpAttachment;
use App\Models\PpmpItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PpmpAttachmentController extends Controller
{
    public function store(
        Request $request,
        Ppmp $ppmp,
        PpmpItem $item
    ): RedirectResponse {
        abort_unless(
            $item->ppmp_id === $ppmp->id,
            404
        );

        $this->ensureEditable(
            $request,
            $ppmp
        );

        $validated =
            $request->validate([
                'attachment' => [
                    'required',

                    File::types([
                        'pdf',
                        'doc',
                        'docx',
                        'xls',
                        'xlsx',
                        'jpg',
                        'jpeg',
                        'png',
                    ])
                        ->max('20mb'),
                ],
            ]);

        $file =
            $validated['attachment'];

        /*
         * Laravel generates a random safe filename.
         */
        $path = $file->store(
            "ppmps/{$ppmp->id}/items/{$item->id}",
            'local'
        );

        $item->attachments()->create([
            'ppmp_id' =>
                $ppmp->id,

            'document_type' =>
                'supporting_document',

            'original_name' =>
                $file
                    ->getClientOriginalName(),

            'stored_name' =>
                basename($path),

            'file_path' =>
                $path,

            'mime_type' =>
                $file->getMimeType(),

            'file_size' =>
                $file->getSize(),

            'uploaded_by' =>
                $request->user()->id,
        ]);

        return back()->with(
            'success',
            'Supporting document uploaded successfully.'
        );
    }

    public function download(
        Request $request,
        Ppmp $ppmp,
        PpmpAttachment $attachment
    ): StreamedResponse {
        abort_unless(
            $attachment->ppmp_id
                === $ppmp->id,
            404
        );

        $this->ensureCanView(
            $request,
            $ppmp
        );

        abort_unless(
            Storage::disk('local')
                ->exists(
                    $attachment->file_path
                ),
            404
        );

        return Storage::disk('local')
            ->download(
                $attachment->file_path,
                $attachment->original_name
            );
    }

    public function destroy(
        Request $request,
        Ppmp $ppmp,
        PpmpAttachment $attachment
    ): RedirectResponse {
        abort_unless(
            $attachment->ppmp_id
                === $ppmp->id,
            404
        );

        $this->ensureEditable(
            $request,
            $ppmp
        );

        Storage::disk('local')
            ->delete(
                $attachment->file_path
            );

        $attachment->delete();

        return back()->with(
            'success',
            'Supporting document deleted.'
        );
    }

    private function ensureCanView(
        Request $request,
        Ppmp $ppmp
    ): void {
        $user = $request->user();

        abort_unless(
            $user->can(
                'ppmps.view-all'
            )
            || (
                $user->can(
                    'ppmps.view-own'
                )
                && $user->office_id
                    === $ppmp->office_id
            ),
            403
        );
    }

    private function ensureEditable(
        Request $request,
        Ppmp $ppmp
    ): void {
        $user = $request->user();

        abort_unless(
            $user->hasRole(
                'ppmp-coordinator'
            )
            && $user->can(
                'ppmps.update-own'
            )
            && $user->office_id
                === $ppmp->office_id
            && $ppmp->isEditable(),
            403
        );
    }
}

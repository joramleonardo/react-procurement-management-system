<?php

namespace App\Http\Controllers;

use App\Models\Ppmp;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\ValidationException;
use Throwable;

class PpmpWorkflowController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {
    }

    /**
     * Submit a Draft PPMP for offline review.
     */
    public function submit(
        Request $request,
        Ppmp $ppmp
    ): RedirectResponse {
        $this->ensureCoordinatorOwnsPpmp(
            $request,
            $ppmp
        );

        if ($ppmp->status !== 'draft') {
            return back()->withErrors([
                'workflow' =>
                    'Only Draft PPMPs may be submitted for review.',
            ]);
        }

        $this->validateReadyForSubmission(
            $ppmp
        );

        DB::transaction(function () use (
            $request,
            $ppmp
        ): void {
            $oldStatus = $ppmp->status;

            $ppmp->forceFill([
                'status' => 'submitted',
                'submitted_at' => now(),
                'returned_at' => null,
                'remarks' => null,
                'updated_by' =>
                    $request->user()->id,
            ])->save();

            $ppmp->statusHistories()->create([
                'from_status' => $oldStatus,
                'to_status' => 'submitted',
                'action' => 'submit',
                'remarks' =>
                    'PPMP submitted for review.',
                'action_by' =>
                    $request->user()->id,
                'acted_at' => now(),
            ]);

            $this->auditLogService->record(
                module: 'ppmp',
                action: 'ppmp-submitted',
                subject: $ppmp,
                description:
                    "{$ppmp->ppmp_no} was submitted for review.",
                oldValues: [
                    'status' => $oldStatus,
                ],
                newValues: [
                    'status' => 'submitted',
                ],
                request: $request
            );
        });

        return back()->with(
            'success',
            "{$ppmp->ppmp_no} was submitted for review."
        );
    }

    /**
     * Resubmit a PPMP that was returned for revision.
     */
    public function resubmit(
        Request $request,
        Ppmp $ppmp
    ): RedirectResponse {
        $this->ensureCoordinatorOwnsPpmp(
            $request,
            $ppmp
        );

        abort_unless(
            $request->user()->can(
                'ppmps.resubmit'
            ),
            403
        );

        if (
            $ppmp->status !==
            'returned_for_revision'
        ) {
            return back()->withErrors([
                'workflow' =>
                    'Only PPMPs returned for revision may be resubmitted.',
            ]);
        }

        $this->validateReadyForSubmission(
            $ppmp
        );

        DB::transaction(function () use (
            $request,
            $ppmp
        ): void {
            $oldStatus = $ppmp->status;

            $ppmp->forceFill([
                'status' => 'submitted',
                'submitted_at' => now(),
                'returned_at' => null,
                'remarks' => null,
                'updated_by' =>
                    $request->user()->id,
            ])->save();

            $ppmp->statusHistories()->create([
                'from_status' => $oldStatus,
                'to_status' => 'submitted',
                'action' => 'resubmit',
                'remarks' =>
                    'Revised PPMP resubmitted for review.',
                'action_by' =>
                    $request->user()->id,
                'acted_at' => now(),
            ]);

            $this->auditLogService->record(
                module: 'ppmp',
                action: 'ppmp-resubmitted',
                subject: $ppmp,
                description:
                    "{$ppmp->ppmp_no} was resubmitted after revision.",
                oldValues: [
                    'status' => $oldStatus,
                ],
                newValues: [
                    'status' => 'submitted',
                ],
                request: $request
            );
        });

        return back()->with(
            'success',
            "{$ppmp->ppmp_no} was resubmitted for review."
        );
    }

    /**
     * GSPS returns a submitted PPMP for revision.
     */
    public function returnForRevision(
        Request $request,
        Ppmp $ppmp
    ): RedirectResponse {
        abort_unless(
            $request->user()->can(
                'ppmps.return'
            ),
            403
        );

        if ($ppmp->status !== 'submitted') {
            return back()->withErrors([
                'workflow' =>
                    'Only submitted PPMPs may be returned for revision.',
            ]);
        }

        $validated = $request->validate([
            'remarks' => [
                'required',
                'string',
                'min:5',
                'max:5000',
            ],
        ], [
            'remarks.required' =>
                'Please provide the reason for returning the PPMP.',
        ]);

        DB::transaction(function () use (
            $request,
            $ppmp,
            $validated
        ): void {
            $oldStatus = $ppmp->status;

            $ppmp->forceFill([
                'status' =>
                    'returned_for_revision',

                'returned_at' => now(),

                'remarks' =>
                    $validated['remarks'],

                'updated_by' =>
                    $request->user()->id,
            ])->save();

            $ppmp->statusHistories()->create([
                'from_status' => $oldStatus,

                'to_status' =>
                    'returned_for_revision',

                'action' =>
                    'return_for_revision',

                'remarks' =>
                    $validated['remarks'],

                'action_by' =>
                    $request->user()->id,

                'acted_at' => now(),
            ]);

            $this->auditLogService->record(
                module: 'ppmp',
                action:
                    'ppmp-returned-for-revision',

                subject: $ppmp,

                description:
                    "{$ppmp->ppmp_no} was returned for revision.",

                oldValues: [
                    'status' => $oldStatus,
                ],

                newValues: [
                    'status' =>
                        'returned_for_revision',

                    'remarks' =>
                        $validated['remarks'],
                ],

                request: $request
            );
        });

        return back()->with(
            'success',
            "{$ppmp->ppmp_no} was returned to the end user for revision."
        );
    }

    /**
     * GSPS records the real-life approval and uploads
     * the scanned approved PPMP.
     */
    public function approve(
        Request $request,
        Ppmp $ppmp
    ): RedirectResponse {
        abort_unless(
            $request->user()->can(
                'ppmps.approve'
            )
            && $request->user()->can(
                'ppmps.upload-approved-copy'
            ),
            403
        );

        if ($ppmp->status !== 'submitted') {
            return back()->withErrors([
                'workflow' =>
                    'Only submitted PPMPs may be approved.',
            ]);
        }

        $validated = $request->validate([
            'approved_ppmp' => [
                'required',

                File::types([
                    'pdf',
                    'jpg',
                    'jpeg',
                    'png',
                ])->max('20mb'),
            ],
        ], [
            'approved_ppmp.required' =>
                'Please upload the scanned approved PPMP.',
        ]);

        $file =
            $validated['approved_ppmp'];

        $path = $file->store(
            "ppmps/{$ppmp->id}/approved",
            'local'
        );

        try {
            DB::transaction(function () use (
                $request,
                $ppmp,
                $file,
                $path
            ): void {
                $oldStatus =
                    $ppmp->status;

                /*
                 * Remove an older approved copy
                 * if one somehow already exists.
                 */
                $oldApprovedCopies =
                    $ppmp->attachments()
                        ->where(
                            'document_type',
                            'approved_ppmp'
                        )
                        ->get();

                foreach (
                    $oldApprovedCopies
                    as $oldCopy
                ) {
                    Storage::disk('local')
                        ->delete(
                            $oldCopy->file_path
                        );

                    $oldCopy->delete();
                }

                $ppmp->attachments()->create([
                    'ppmp_item_id' => null,

                    'document_type' =>
                        'approved_ppmp',

                    'original_name' =>
                        $file
                            ->getClientOriginalName(),

                    'stored_name' =>
                        basename($path),

                    'file_path' => $path,

                    'mime_type' =>
                        $file->getMimeType(),

                    'file_size' =>
                        $file->getSize(),

                    'uploaded_by' =>
                        $request->user()->id,
                ]);

                $ppmp->forceFill([
                    'status' => 'approved',

                    'approved_at' => now(),

                    'approved_by' =>
                        $request->user()->id,

                    'remarks' => null,

                    'updated_by' =>
                        $request->user()->id,
                ])->save();

                $ppmp->statusHistories()
                    ->create([
                        'from_status' =>
                            $oldStatus,

                        'to_status' =>
                            'approved',

                        'action' =>
                            'approve',

                        'remarks' =>
                            'Approved PPMP recorded and scanned approved copy uploaded.',

                        'action_by' =>
                            $request->user()
                                ->id,

                        'acted_at' =>
                            now(),
                    ]);

                $this->auditLogService
                    ->record(
                        module: 'ppmp',

                        action:
                            'ppmp-approved',

                        subject: $ppmp,

                        description:
                            "{$ppmp->ppmp_no} was approved.",

                        oldValues: [
                            'status' =>
                                $oldStatus,
                        ],

                        newValues: [
                            'status' =>
                                'approved',

                            'approved_by' =>
                                $request
                                    ->user()
                                    ->id,

                            'approved_at' =>
                                $ppmp
                                    ->approved_at,
                        ],

                        request: $request
                    );
            });
        } catch (Throwable $exception) {
            Storage::disk('local')
                ->delete($path);

            throw $exception;
        }

        return back()->with(
            'success',
            "{$ppmp->ppmp_no} was approved successfully."
        );
    }

    /**
     * Validate whether the PPMP contains enough
     * information for formal submission.
     */
    private function validateReadyForSubmission(
        Ppmp $ppmp
    ): void {
        $ppmp->loadMissing('items');

        $errors = [];

        if ($ppmp->items->isEmpty()) {
            $errors['items'] =
                'At least one procurement item is required.';
        }

        if (
            blank(
                $ppmp->prepared_by_name
            )
        ) {
            $errors['prepared_by_name'] =
                'Prepared By name is required before submission.';
        }

        if (
            blank(
                $ppmp->prepared_by_position
            )
        ) {
            $errors['prepared_by_position'] =
                'Prepared By position is required before submission.';
        }

        if (
            blank(
                $ppmp->submitted_by_name
            )
        ) {
            $errors['submitted_by_name'] =
                'Division Chief / Head is required before submission.';
        }

        if (
            blank(
                $ppmp->submitted_by_position
            )
        ) {
            $errors['submitted_by_position'] =
                'Division Chief / Head position is required before submission.';
        }

        foreach (
            $ppmp->items
            as $index => $item
        ) {
            $row = $index + 1;

            $requiredFields = [
                'description_objective' =>
                    'General Description and Objective',

                'project_type' =>
                    'Project Type',

                'quantity_size' =>
                    'Quantity and Size',

                'recommended_mode_of_procurement' =>
                    'Recommended Mode of Procurement',

                'procurement_start_month' =>
                    'Start of Procurement Activity',

                'procurement_end_month' =>
                    'End of Procurement Activity',

                'expected_delivery_month' =>
                    'Expected Delivery / Implementation Period',

                'source_of_funds' =>
                    'Source of Funds',
            ];

            foreach (
                $requiredFields
                as $field => $label
            ) {
                if (blank($item->{$field})) {
                    $errors[
                        "items.{$index}.{$field}"
                    ] =
                        "Item {$row}: {$label} is required.";
                }
            }

            if (
                (float)
                    $item->estimated_budget
                <= 0
            ) {
                $errors[
                    "items.{$index}.estimated_budget"
                ] =
                    "Item {$row}: Estimated Budget must be greater than zero.";
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages(
                $errors
            );
        }
    }

    private function ensureCoordinatorOwnsPpmp(
        Request $request,
        Ppmp $ppmp
    ): void {
        $user = $request->user();

        abort_unless(
            $user->hasRole(
                'ppmp-coordinator'
            )
            && $user->office_id
                === $ppmp->office_id,
            403
        );

        abort_unless(
            $user->can(
                'ppmps.submit'
            )
            || $user->can(
                'ppmps.resubmit'
            ),
            403
        );
    }
}

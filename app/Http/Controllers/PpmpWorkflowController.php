<?php

namespace App\Http\Controllers;

use App\Models\Ppmp;
use App\Models\PpmpSeries;
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

        DB::transaction(function () use (
            $request,
            $ppmp
        ): void {
            $lockedPpmp =
                $this->lockPpmpForWorkflow(
                    $ppmp
                );

            if (
                $lockedPpmp->status !==
                'draft'
            ) {
                throw ValidationException::withMessages([
                    'workflow' =>
                        'This PPMP is no longer a Draft and cannot be submitted.',
                ]);
            }

            /*
             * Draft saving is intentionally permissive.
             * Formal workflow transitions are not.
             */
            $this->validateReadyForSubmission(
                $lockedPpmp
            );

            $oldStatus =
                $lockedPpmp->status;

            $lockedPpmp->forceFill([
                'status' => 'submitted',
                'submitted_at' => now(),
                'returned_at' => null,
                'remarks' => null,
                'updated_by' =>
                    $request->user()->id,
            ])->save();

            $lockedPpmp->statusHistories()
                ->create([
                    'from_status' =>
                        $oldStatus,

                    'to_status' =>
                        'submitted',

                    'action' =>
                        'submit',

                    'remarks' =>
                        'PPMP submitted for review.',

                    'action_by' =>
                        $request->user()->id,

                    'acted_at' =>
                        now(),
                ]);

            $this->auditLogService->record(
                module: 'ppmp',
                action: 'ppmp-submitted',
                subject: $lockedPpmp,
                description:
                    "{$lockedPpmp->ppmp_no} was submitted for review.",
                oldValues: [
                    'status' =>
                        $oldStatus,
                ],
                newValues: [
                    'status' =>
                        'submitted',
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

        DB::transaction(function () use (
            $request,
            $ppmp
        ): void {
            $lockedPpmp =
                $this->lockPpmpForWorkflow(
                    $ppmp
                );

            if (
                $lockedPpmp->status !==
                'returned_for_revision'
            ) {
                throw ValidationException::withMessages([
                    'workflow' =>
                        'This PPMP is no longer in Returned for Revision status.',
                ]);
            }

            $this->validateReadyForSubmission(
                $lockedPpmp
            );

            $oldStatus =
                $lockedPpmp->status;

            $lockedPpmp->forceFill([
                'status' => 'submitted',
                'submitted_at' => now(),
                'returned_at' => null,
                'remarks' => null,
                'updated_by' =>
                    $request->user()->id,
            ])->save();

            $lockedPpmp->statusHistories()
                ->create([
                    'from_status' =>
                        $oldStatus,

                    'to_status' =>
                        'submitted',

                    'action' =>
                        'resubmit',

                    'remarks' =>
                        'Revised PPMP resubmitted for review.',

                    'action_by' =>
                        $request->user()->id,

                    'acted_at' =>
                        now(),
                ]);

            $this->auditLogService->record(
                module: 'ppmp',
                action: 'ppmp-resubmitted',
                subject: $lockedPpmp,
                description:
                    "{$lockedPpmp->ppmp_no} was resubmitted after revision.",
                oldValues: [
                    'status' =>
                        $oldStatus,
                ],
                newValues: [
                    'status' =>
                        'submitted',
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
     * Cancel/withdraw a Draft or Submitted PPMP.
     */
    public function cancel(
        Request $request,
        Ppmp $ppmp
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            ($user->hasRole('ppmp-coordinator') && $user->office_id === $ppmp->office_id)
            || $user->can('ppmps.view-all'),
            403
        );

        abort_unless(
            $user->can('ppmps.cancel') || $user->hasRole('ppmp-coordinator'),
            403,
            'You do not have permission to cancel this PPMP.'
        );

        if (! in_array($ppmp->status, ['draft', 'submitted'], true)) {
            return back()->withErrors([
                'workflow' => 'Only Draft or Submitted PPMPs may be cancelled.',
            ]);
        }

        DB::transaction(function () use (
            $request,
            $ppmp
        ): void {
            $lockedPpmp = Ppmp::query()
                ->whereKey($ppmp->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($lockedPpmp->status, ['draft', 'submitted'], true)) {
                throw ValidationException::withMessages([
                    'workflow' => 'This PPMP is no longer in a cancellable status.',
                ]);
            }

            $oldStatus = $lockedPpmp->status;

            $lockedPpmp->forceFill([
                'status' => 'cancelled',
                'remarks' => $request->input('remarks') ?: 'PPMP cancelled by user.',
                'updated_by' => $request->user()->id,
            ])->save();

            $lockedPpmp->statusHistories()->create([
                'from_status' => $oldStatus,
                'to_status' => 'cancelled',
                'action' => 'cancel',
                'remarks' => $request->input('remarks') ?: 'PPMP was cancelled / withdrawn.',
                'action_by' => $request->user()->id,
                'acted_at' => now(),
            ]);

            $this->auditLogService->record(
                module: 'ppmp',
                action: 'ppmp-cancelled',
                subject: $lockedPpmp,
                description: "{$lockedPpmp->ppmp_no} was cancelled.",
                oldValues: [
                    'status' => $oldStatus,
                ],
                newValues: [
                    'status' => 'cancelled',
                ],
                request: $request
            );
        });

        return back()->with(
            'success',
            "{$ppmp->ppmp_no} was cancelled."
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
            $lockedPpmp =
                Ppmp::query()
                    ->whereKey(
                        $ppmp->id
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

            if (
                $lockedPpmp->status !==
                'submitted'
            ) {
                throw ValidationException::withMessages([
                    'workflow' =>
                        'This PPMP is no longer in Submitted status.',
                ]);
            }

            $oldStatus =
                $lockedPpmp->status;

            $lockedPpmp->forceFill([
                'status' =>
                    'returned_for_revision',

                'returned_at' => now(),

                'remarks' =>
                    $validated['remarks'],

                'updated_by' =>
                    $request->user()->id,
            ])->save();

            $lockedPpmp->statusHistories()
                ->create([
                    'from_status' =>
                        $oldStatus,

                    'to_status' =>
                        'returned_for_revision',

                    'action' =>
                        'return_for_revision',

                    'remarks' =>
                        $validated['remarks'],

                    'action_by' =>
                        $request->user()->id,

                    'acted_at' =>
                        now(),
                ]);

            $this->auditLogService->record(
                module: 'ppmp',
                action:
                    'ppmp-returned-for-revision',
                subject: $lockedPpmp,
                description:
                    "{$lockedPpmp->ppmp_no} was returned for revision.",
                oldValues: [
                    'status' =>
                        $oldStatus,
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

        /*
         * Check the PPMP before accepting the uploaded scan.
         * The same validation is repeated inside the locked
         * transaction below for defense in depth.
         */
        $this->validateReadyForSubmission(
            $ppmp
        );

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
                $lockedPpmp =
                    $this->lockPpmpForWorkflow(
                        $ppmp
                    );

                if (
                    $lockedPpmp->status !==
                    'submitted'
                ) {
                    throw ValidationException::withMessages([
                        'workflow' =>
                            'This PPMP is no longer in Submitted status and cannot be approved.',
                    ]);
                }

                /*
                 * Revalidate after the PPMP + PPMP Series
                 * records have been locked.
                 */
                $this->validateReadyForSubmission(
                    $lockedPpmp
                );

                $oldStatus =
                    $lockedPpmp->status;

                /*
                 * Indicative No. 1 establishes the permanent
                 * PPMP-series original budget once approved.
                 */
                if (
                    $lockedPpmp->isFirstIndicative()
                    && $lockedPpmp->series
                ) {
                    $lockedPpmp->series->update([
                        'original_budget' =>
                            $lockedPpmp->total_budget,

                        'updated_by' =>
                            $request->user()->id,
                    ]);
                }

                /*
                 * Remove an older approved copy
                 * if one somehow already exists.
                 */
                $oldApprovedCopies =
                    $lockedPpmp->attachments()
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

                $lockedPpmp->attachments()
                    ->create([
                        'ppmp_item_id' => null,

                        'document_type' =>
                            'approved_ppmp',

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

                $lockedPpmp->forceFill([
                    'status' =>
                        'approved',

                    'approved_at' =>
                        now(),

                    'approved_by' =>
                        $request->user()->id,

                    'remarks' =>
                        null,

                    'updated_by' =>
                        $request->user()->id,
                ])->save();

                $lockedPpmp->statusHistories()
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
                            $request->user()->id,

                        'acted_at' =>
                            now(),
                    ]);

                $this->auditLogService
                    ->record(
                        module: 'ppmp',
                        action:
                            'ppmp-approved',
                        subject:
                            $lockedPpmp,
                        description:
                            "{$lockedPpmp->ppmp_no} was approved.",
                        oldValues: [
                            'status' =>
                                $oldStatus,
                        ],
                        newValues: [
                            'status' =>
                                'approved',

                            'approved_by' =>
                                $request->user()->id,

                            'approved_at' =>
                                $lockedPpmp->approved_at,
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
     * Lock the PPMP and its series before a formal workflow
     * transition. Item records cannot normally be edited once
     * the PPMP is Submitted, but the lock also protects against
     * two simultaneous workflow requests.
     */
    private function lockPpmpForWorkflow(
        Ppmp $ppmp
    ): Ppmp {
        $lockedPpmp =
            Ppmp::query()
                ->with([
                    'items.details',
                ])
                ->whereKey(
                    $ppmp->id
                )
                ->lockForUpdate()
                ->firstOrFail();

        if (
            $lockedPpmp->ppmp_series_id !==
            null
        ) {
            $series =
                PpmpSeries::query()
                    ->whereKey(
                        $lockedPpmp
                            ->ppmp_series_id
                    )
                    ->lockForUpdate()
                    ->first();

            if ($series) {
                $lockedPpmp->setRelation(
                    'series',
                    $series
                );
            }
        }

        return $lockedPpmp;
    }

    /**
     * Validate whether the PPMP contains enough information
     * for Submit, Resubmit, or Approve.
     *
     * Save Draft remains permissive. These requirements are
     * intentionally enforced only during formal transitions.
     */
    private function validateReadyForSubmission(
        Ppmp $ppmp
    ): void {
        $ppmp->loadMissing([
            'series',
            'items.details',
        ]);

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

        $computedPpmpTotalCents =
            0;

        foreach (
            $ppmp->items
            as $index => $item
        ) {
            $row =
                $index + 1;

            /*
             * Parent-level PPMP fields.
             *
             * Item Nos. 2 and 3 are no longer validated from
             * ppmp_items.project_type / quantity_size because
             * they now live in ppmp_item_details.
             */
            $requiredFields = [
                'description_objective' =>
                    'General Description and Objective',

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
                if (
                    blank(
                        $item->{$field}
                    )
                ) {
                    $errors[
                        "items.{$index}.{$field}"
                    ] =
                        "Item {$row}: {$label} is required.";
                }
            }

            $details =
                $item->details
                    ->filter(
                        fn ($detail) =>
                            $this->detailHasContent(
                                $detail
                            )
                    )
                    ->values();

            if ($details->isEmpty()) {
                $errors[
                    "items.{$index}.details"
                ] =
                    "Item {$row}: At least one Project Type / Quantity and Size entry is required.";
            }

            $detailsWithAmount =
                0;

            $detailAmountTotalCents =
                0;

            foreach (
                $details
                as $detailIndex =>
                    $detail
            ) {
                $detailRow =
                    $detailIndex + 1;

                if (
                    blank(
                        $detail->project_type
                    )
                ) {
                    $errors[
                        "items.{$index}.details.{$detailIndex}.project_type"
                    ] =
                        "Item {$row}, Project / Requirement {$detailRow}: Project Type is required.";
                }

                if (
                    $detail->quantity ===
                    null
                    || $detail->quantity ===
                    ''
                    || ! is_numeric(
                        $detail->quantity
                    )
                    || (float)
                        $detail->quantity <=
                        0
                ) {
                    $errors[
                        "items.{$index}.details.{$detailIndex}.quantity"
                    ] =
                        "Item {$row}, Project / Requirement {$detailRow}: Quantity must be greater than zero.";
                }

                if (
                    blank(
                        $detail->unit
                    )
                ) {
                    $errors[
                        "items.{$index}.details.{$detailIndex}.unit"
                    ] =
                        "Item {$row}, Project / Requirement {$detailRow}: Unit is required.";
                }

                if (
                    blank(
                        $detail->item_description
                    )
                ) {
                    $errors[
                        "items.{$index}.details.{$detailIndex}.item_description"
                    ] =
                        "Item {$row}, Project / Requirement {$detailRow}: Item / Requirement description is required.";
                }

                if (
                    $detail->estimated_amount !==
                    null
                    && $detail->estimated_amount !==
                    ''
                ) {
                    $detailsWithAmount++;

                    $amountCents =
                        $this->moneyToCents(
                            $detail
                                ->estimated_amount
                        );

                    if (
                        $amountCents <= 0
                    ) {
                        $errors[
                            "items.{$index}.details.{$detailIndex}.estimated_amount"
                        ] =
                            "Item {$row}, Project / Requirement {$detailRow}: Estimated Amount must be greater than zero.";
                    }

                    $detailAmountTotalCents +=
                        $amountCents;
                }
            }

            $detailCount =
                $details->count();

            /*
             * Individual costing is all-or-none.
             */
            if (
                $detailsWithAmount > 0
                && $detailsWithAmount <
                    $detailCount
            ) {
                foreach (
                    $details
                    as $detailIndex =>
                        $detail
                ) {
                    if (
                        $detail->estimated_amount ===
                        null
                        || $detail->estimated_amount ===
                        ''
                    ) {
                        $errors[
                            "items.{$index}.details.{$detailIndex}.estimated_amount"
                        ] =
                            "Item {$row}: Enter an Estimated Amount for every Project / Requirement entry, or leave all individual amounts blank and use the fallback budget.";
                    }
                }
            }

            $itemBudgetCents =
                $this->moneyToCents(
                    $item->estimated_budget
                );

            /*
             * Item No. 10 must be a positive resolved budget
             * before the PPMP can enter a formal workflow.
             */
            if (
                $itemBudgetCents <= 0
            ) {
                $errors[
                    "items.{$index}.estimated_budget"
                ] =
                    "Item {$row}: Item No. 10 Estimated Budget / Authorized Budgetary Allocation must be greater than zero before submission.";
            }

            /*
             * When every detail has an individual amount,
             * Item No. 10 must exactly equal their sum.
             */
            if (
                $detailCount > 0
                && $detailsWithAmount ===
                    $detailCount
                && $itemBudgetCents !==
                    $detailAmountTotalCents
            ) {
                $errors[
                    "items.{$index}.estimated_budget"
                ] =
                    "Item {$row}: Item No. 10 must equal the sum of all individual Project / Requirement estimated amounts (₱"
                    .number_format(
                        $detailAmountTotalCents / 100,
                        2
                    )
                    .').';
            }

            $computedPpmpTotalCents +=
                $itemBudgetCents;
        }

        $storedPpmpTotalCents =
            $this->moneyToCents(
                $ppmp->total_budget
            );

        if (
            $storedPpmpTotalCents !==
            $computedPpmpTotalCents
        ) {
            $errors['total_budget'] =
                'The stored PPMP total does not match the sum of Item No. 10 budgets. Please save the PPMP again before continuing.';
        }

        /*
         * Indicative No. 2 and later must always equal the
         * permanent budget established by Indicative No. 1.
         */
        if (
            ! $ppmp->isFirstIndicative()
        ) {
            if (
                $ppmp->series ===
                null
            ) {
                $errors['workflow'] =
                    'PPMP series information is missing.';
            } else {
                $originalBudgetCents =
                    $this->moneyToCents(
                        $ppmp->series
                            ->original_budget
                    );

                if (
                    $computedPpmpTotalCents !==
                    $originalBudgetCents
                ) {
                    $errors['total_budget'] =
                        'This Indicative revision must retain the original PPMP budget of ₱'
                        .number_format(
                            $originalBudgetCents / 100,
                            2
                        )
                        .'. The current total is ₱'
                        .number_format(
                            $computedPpmpTotalCents / 100,
                            2
                        )
                        .'.';
                }
            }
        }

        /*
         * A later revision may never reduce or remove a logical
         * procurement item below cumulative APPROVED PR use.
         */
        $this->appendHistoricalUtilizationErrors(
            $ppmp,
            $errors
        );

        if ($errors !== []) {
            throw ValidationException::withMessages(
                $errors
            );
        }
    }

    /**
     * Determine whether a structured Item No. 2 + Item No. 3
     * row contains user data.
     */
    private function detailHasContent(
        mixed $detail
    ): bool {
        return filled(
            $detail->project_type ?? null
        )
            || filled(
                $detail->quantity ?? null
            )
            || filled(
                $detail->unit ?? null
            )
            || filled(
                $detail->item_description ?? null
            )
            || filled(
                $detail->size_specification ?? null
            )
            || filled(
                $detail->estimated_amount ?? null
            );
    }

    /**
     * Protect approved Purchase Request utilization across
     * every historical PPMP version in the same series.
     *
     * @param array<string, string> $errors
     */
    private function appendHistoricalUtilizationErrors(
        Ppmp $ppmp,
        array &$errors
    ): void {
        if (
            $ppmp->ppmp_series_id ===
            null
        ) {
            return;
        }

        $currentAllocationByLineage =
            [];

        $currentIndexByLineage =
            [];

        $labelByLineage =
            [];

        foreach (
            $ppmp->items
            as $index => $item
        ) {
            if (
                blank(
                    $item->lineage_uuid
                )
            ) {
                $errors[
                    "items.{$index}.lineage_uuid"
                ] =
                    'This PPMP item is missing lineage tracking information.';

                continue;
            }

            $lineageUuid =
                (string)
                $item->lineage_uuid;

            $currentAllocationByLineage[
                $lineageUuid
            ] =
                (
                    $currentAllocationByLineage[
                        $lineageUuid
                    ]
                    ?? 0
                )
                + $this->moneyToCents(
                    $item->estimated_budget
                );

            $currentIndexByLineage[
                $lineageUuid
            ] =
                $index;

            $labelByLineage[
                $lineageUuid
            ] =
                trim(
                    (string)
                    $item
                        ->description_objective
                ) !== ''
                    ? (string)
                        $item
                            ->description_objective
                    : "PPMP Item #{$item->id}";
        }

        /*
         * Include lineages from older versions too. This is what
         * lets us detect a utilized item that was removed entirely
         * from the current revision.
         */
        $historicalLineages =
            DB::table(
                'ppmp_items'
            )
                ->join(
                    'ppmps',
                    'ppmps.id',
                    '=',
                    'ppmp_items.ppmp_id'
                )
                ->where(
                    'ppmps.ppmp_series_id',
                    $ppmp->ppmp_series_id
                )
                ->whereNull(
                    'ppmps.deleted_at'
                )
                ->whereNotNull(
                    'ppmp_items.lineage_uuid'
                )
                ->pluck(
                    'ppmp_items.lineage_uuid'
                )
                ->map(
                    fn ($value) =>
                        (string) $value
                )
                ->filter()
                ->unique()
                ->values()
                ->all();

        if (
            $historicalLineages ===
            []
        ) {
            return;
        }

        $utilizationRows =
            DB::table(
                'purchase_request_items'
            )
                ->join(
                    'purchase_requests',
                    'purchase_requests.id',
                    '=',
                    'purchase_request_items.purchase_request_id'
                )
                ->join(
                    'ppmp_items',
                    'ppmp_items.id',
                    '=',
                    'purchase_request_items.ppmp_item_id'
                )
                ->where(
                    'purchase_requests.status',
                    'approved'
                )
                ->whereNull(
                    'purchase_requests.deleted_at'
                )
                ->whereIn(
                    'ppmp_items.lineage_uuid',
                    $historicalLineages
                )
                ->selectRaw(
                    'ppmp_items.lineage_uuid AS lineage_uuid, '
                    .'SUM(purchase_request_items.total_cost) AS utilized_total'
                )
                ->groupBy(
                    'ppmp_items.lineage_uuid'
                )
                ->get();

        foreach (
            $utilizationRows
            as $row
        ) {
            $lineageUuid =
                (string)
                $row->lineage_uuid;

            $utilizedCents =
                $this->moneyToCents(
                    $row->utilized_total
                );

            if (
                $utilizedCents <= 0
            ) {
                continue;
            }

            $currentAllocationCents =
                $currentAllocationByLineage[
                    $lineageUuid
                ]
                ?? 0;

            if (
                $currentAllocationCents >=
                $utilizedCents
            ) {
                continue;
            }

            $label =
                $labelByLineage[
                    $lineageUuid
                ]
                ?? 'A procurement item from an earlier PPMP version';

            $message =
                "{$label} cannot be allocated below its cumulative approved PR utilization of ₱"
                .number_format(
                    $utilizedCents / 100,
                    2
                )
                .'. The current allocation is ₱'
                .number_format(
                    $currentAllocationCents / 100,
                    2
                )
                .'.';

            if (
                array_key_exists(
                    $lineageUuid,
                    $currentIndexByLineage
                )
            ) {
                $itemIndex =
                    $currentIndexByLineage[
                        $lineageUuid
                    ];

                $errors[
                    "items.{$itemIndex}.estimated_budget"
                ] =
                    $message;
            } else {
                $errors['items'] =
                    $message
                    .' The utilized item cannot be removed from this Indicative revision.';
            }
        }
    }

    /**
     * Convert a monetary DECIMAL value into integer cents.
     * No floating-point math is used for PPMP budgets.
     */
    private function moneyToCents(
        mixed $value
    ): int {
        $amount =
            trim(
                str_replace(
                    ',',
                    '',
                    (string) (
                        $value
                        ?? '0'
                    )
                )
            );

        if ($amount === '') {
            return 0;
        }

        $parts =
            explode(
                '.',
                $amount,
                2
            );

        $whole =
            preg_replace(
                '/\D/',
                '',
                $parts[0]
                    ?? '0'
            );

        $decimal =
            preg_replace(
                '/\D/',
                '',
                $parts[1]
                    ?? ''
            );

        $decimal =
            str_pad(
                substr(
                    $decimal,
                    0,
                    2
                ),
                2,
                '0'
            );

        return (
            ((int) (
                $whole !== ''
                    ? $whole
                    : '0'
            )) * 100
        ) + (int) $decimal;
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

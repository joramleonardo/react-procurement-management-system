<?php

namespace App\Http\Controllers;

use App\Models\Ppmp;
use App\Models\PpmpSeries;
use App\Models\PurchaseRequestItem;
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
            $ppmp,
            'ppmps.submit'
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

        $this->validateVersionIntegrity(
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
            $ppmp,
            'ppmps.resubmit'
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

        $this->validateVersionIntegrity(
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

        /*
         * Defense-in-depth: the PPMP itself must still
         * satisfy all submission/versioning rules before
         * GSPS can record the offline approval.
         */
        $this->validateReadyForSubmission(
            $ppmp
        );

        $this->validateVersionIntegrity(
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

                if (
                    $lockedPpmp->ppmp_series_id ===
                    null
                ) {
                    throw ValidationException::withMessages([
                        'workflow' =>
                            'PPMP series information is missing.',
                    ]);
                }

                $series =
                    PpmpSeries::query()
                        ->whereKey(
                            $lockedPpmp->ppmp_series_id
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                $lockedPpmp->setRelation(
                    'series',
                    $series
                );

                $this->validateReadyForSubmission(
                    $lockedPpmp
                );

                $this->validateVersionIntegrity(
                    $lockedPpmp
                );

                $oldStatus =
                    $lockedPpmp->status;

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

                $lockedPpmp->attachments()->create([
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

                /*
                 * Indicative No. 1 establishes the permanent
                 * Original PPMP Budget at approval. Later
                 * revisions may never change this amount.
                 */
                if (
                    $lockedPpmp->isFirstIndicative()
                ) {
                    $series->forceFill([
                        'fiscal_year' =>
                            $lockedPpmp->fiscal_year,

                        'original_budget' =>
                            $lockedPpmp->total_budget,

                        'updated_by' =>
                            $request->user()->id,
                    ])->save();
                }

                $lockedPpmp->forceFill([
                    'status' => 'approved',

                    'approved_at' => now(),

                    'approved_by' =>
                        $request->user()->id,

                    'remarks' => null,

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

                        subject: $lockedPpmp,

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
                                $request
                                    ->user()
                                    ->id,

                            'approved_at' =>
                                $lockedPpmp
                                    ->approved_at,

                            'original_budget' =>
                                $series
                                    ->original_budget,
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
                $this->moneyToCents(
                    $item->estimated_budget
                ) <= 0
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

    /**
     * Validate versioning business rules before
     * Submit, Resubmit, and Approve.
     */
    private function validateVersionIntegrity(
        Ppmp $ppmp
    ): void {
        $ppmp->loadMissing([
            'series',
            'items',
        ]);

        if (
            $ppmp->series ===
            null
        ) {
            throw ValidationException::withMessages([
                'workflow' =>
                    'PPMP series information is missing.',
            ]);
        }

        /*
         * Indicative No. 2 and succeeding revisions must
         * retain EXACTLY the permanent Original PPMP Budget.
         */
        if (
            $ppmp->isIndicative()
            && ! $ppmp->isFirstIndicative()
        ) {
            $currentTotalCents =
                $this->moneyToCents(
                    $ppmp->total_budget
                );

            $originalBudgetCents =
                $this->moneyToCents(
                    $ppmp->series->original_budget
                );

            if (
                $currentTotalCents !==
                $originalBudgetCents
            ) {
                throw ValidationException::withMessages([
                    'workflow' =>
                        'Indicative No. '
                        .$ppmp->indicative_no
                        .' cannot proceed because its total budget must exactly match the Original PPMP Budget of ₱'
                        .number_format(
                            $originalBudgetCents / 100,
                            2
                        )
                        .'. Current total: ₱'
                        .number_format(
                            $currentTotalCents / 100,
                            2
                        )
                        .'.',
                ]);
            }
        }

        if (
            $ppmp->isIndicative()
        ) {
            $this->validateCurrentLineageUtilization(
                $ppmp
            );
        }
    }

    /**
     * Ensure historical APPROVED PR utilization remains
     * covered by the current PPMP version.
     */
    private function validateCurrentLineageUtilization(
        Ppmp $ppmp
    ): void {
        if (
            $ppmp->ppmp_series_id ===
            null
        ) {
            throw ValidationException::withMessages([
                'workflow' =>
                    'PPMP series information is missing.',
            ]);
        }

        $ppmp->loadMissing('items');

        $currentAllocationByLineage = [];
        $currentLabelByLineage = [];

        foreach (
            $ppmp->items
            as $item
        ) {
            if (
                blank($item->lineage_uuid)
            ) {
                throw ValidationException::withMessages([
                    'workflow' =>
                        'One or more PPMP items are missing lineage tracking information. Please have the PPMP record reviewed before continuing.',
                ]);
            }

            $lineageUuid =
                (string) $item->lineage_uuid;

            $currentAllocationByLineage[$lineageUuid] =
                ($currentAllocationByLineage[$lineageUuid] ?? 0)
                + $this->moneyToCents(
                    $item->estimated_budget
                );

            $currentLabelByLineage[$lineageUuid] =
                trim((string) $item->description_objective) !== ''
                    ? (string) $item->description_objective
                    : "PPMP Item #{$item->id}";
        }

        /*
         * Include every lineage ever used in this series so
         * a historically utilized item cannot disappear from
         * a later revision and bypass the protection.
         */
        $seriesLineages =
            DB::table('ppmp_items')
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
                ->where(
                    'ppmp_items.lineage_uuid',
                    '<>',
                    ''
                )
                ->pluck(
                    'ppmp_items.lineage_uuid'
                )
                ->unique()
                ->values()
                ->all();

        if (
            $seriesLineages === []
        ) {
            return;
        }

        $approvedUtilization =
            $this->approvedPrUtilizationByLineage(
                $seriesLineages
            );

        foreach (
            $approvedUtilization
            as $lineageUuid => $utilizedCents
        ) {
            if (
                $utilizedCents <= 0
            ) {
                continue;
            }

            $currentAllocationCents =
                $currentAllocationByLineage[$lineageUuid]
                ?? 0;

            if (
                $currentAllocationCents >=
                $utilizedCents
            ) {
                continue;
            }

            $label =
                $currentLabelByLineage[$lineageUuid]
                ?? 'A procurement item removed from the current revision';

            throw ValidationException::withMessages([
                'workflow' =>
                    "\"{$label}\" cannot proceed because its current allocation is ₱"
                    .number_format(
                        $currentAllocationCents / 100,
                        2
                    )
                    .' while its cumulative historical approved PR utilization is ₱'
                    .number_format(
                        $utilizedCents / 100,
                        2
                    )
                    .'.',
            ]);
        }
    }

    /**
     * Return cumulative APPROVED PR utilization keyed by
     * PPMP item lineage UUID.
     *
     * @param array<int, string> $lineageUuids
     * @return array<string, int>
     */
    private function approvedPrUtilizationByLineage(
        array $lineageUuids
    ): array {
        if (
            $lineageUuids === []
        ) {
            return [];
        }

        $rows =
            PurchaseRequestItem::query()
                ->selectRaw(
                    'ppmp_items.lineage_uuid AS lineage_uuid, '
                    .'SUM(purchase_request_items.total_cost) AS utilized_total'
                )
                ->join(
                    'ppmp_items',
                    'ppmp_items.id',
                    '=',
                    'purchase_request_items.ppmp_item_id'
                )
                ->join(
                    'purchase_requests',
                    'purchase_requests.id',
                    '=',
                    'purchase_request_items.purchase_request_id'
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
                    $lineageUuids
                )
                ->groupBy(
                    'ppmp_items.lineage_uuid'
                )
                ->get();

        $result = [];

        foreach (
            $rows
            as $row
        ) {
            $lineageUuid =
                (string) $row->lineage_uuid;

            if (
                $lineageUuid === ''
            ) {
                continue;
            }

            $result[$lineageUuid] =
                $this->moneyToCents(
                    $row->utilized_total
                );
        }

        return $result;
    }

    /**
     * Convert a DECIMAL/string monetary amount to cents.
     */
    private function moneyToCents(
        mixed $value
    ): int {
        $amount =
            trim(
                str_replace(
                    ',',
                    '',
                    (string) ($value ?? '0')
                )
            );

        if (
            $amount === ''
        ) {
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
                $parts[0] ?? '0'
            );

        $decimal =
            preg_replace(
                '/\D/',
                '',
                $parts[1] ?? ''
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
            ((int) ($whole !== '' ? $whole : '0')) * 100
        ) + (int) $decimal;
    }

    private function ensureCoordinatorOwnsPpmp(
        Request $request,
        Ppmp $ppmp,
        string $permission
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
                $permission
            ),
            403
        );
    }
}

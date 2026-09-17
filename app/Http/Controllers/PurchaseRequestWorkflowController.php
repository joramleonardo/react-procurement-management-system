<?php

namespace App\Http\Controllers;

use App\Models\Ppmp;
use App\Models\PpmpItem;
use App\Models\PpmpSeries;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestAttachment;
use App\Models\PurchaseRequestItem;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseRequestWorkflowController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {
    }

    /**
     * Submit a Draft Purchase Request for GSPS review.
     */
    public function submit(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): RedirectResponse {
        $this->ensureCoordinatorOwnsPr(
            $request,
            $purchaseRequest
        );

        abort_unless(
            $request->user()->can('prs.submit'),
            403,
            'You do not have permission to submit Purchase Requests.'
        );

        if ($purchaseRequest->status !== 'draft') {
            return back()->withErrors([
                'workflow' => 'Only Draft Purchase Requests may be submitted for review.',
            ]);
        }

        DB::transaction(function () use (
            $request,
            $purchaseRequest
        ): void {
            $lockedPr = $this->lockPrForWorkflow($purchaseRequest);

            if ($lockedPr->status !== 'draft') {
                throw ValidationException::withMessages([
                    'workflow' => 'This Purchase Request is no longer a Draft and cannot be submitted.',
                ]);
            }

            $this->validateReadyForSubmission($lockedPr);

            $oldStatus = $lockedPr->status;

            $lockedPr->forceFill([
                'status' => 'submitted',
                'submitted_at' => now(),
                'returned_at' => null,
                'remarks' => null,
                'updated_by' => $request->user()->id,
            ])->save();

            $lockedPr->statusHistories()->create([
                'from_status' => $oldStatus,
                'to_status' => 'submitted',
                'action' => 'submit',
                'remarks' => 'Purchase Request submitted for GSPS review.',
                'action_by' => $request->user()->id,
                'acted_at' => now(),
            ]);

            $this->auditLogService->record(
                module: 'purchase-request',
                action: 'pr-submitted',
                subject: $lockedPr,
                description: "{$lockedPr->pr_no} was submitted for review.",
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
            "{$purchaseRequest->pr_no} was submitted for review."
        );
    }

    /**
     * Resubmit a Purchase Request that was returned for revision.
     */
    public function resubmit(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): RedirectResponse {
        $this->ensureCoordinatorOwnsPr(
            $request,
            $purchaseRequest
        );

        abort_unless(
            $request->user()->can('prs.resubmit'),
            403,
            'You do not have permission to resubmit Purchase Requests.'
        );

        if ($purchaseRequest->status !== 'returned_for_revision') {
            return back()->withErrors([
                'workflow' => 'Only Purchase Requests returned for revision may be resubmitted.',
            ]);
        }

        DB::transaction(function () use (
            $request,
            $purchaseRequest
        ): void {
            $lockedPr = $this->lockPrForWorkflow($purchaseRequest);

            if ($lockedPr->status !== 'returned_for_revision') {
                throw ValidationException::withMessages([
                    'workflow' => 'This Purchase Request is no longer in Returned for Revision status.',
                ]);
            }

            $this->validateReadyForSubmission($lockedPr);

            $oldStatus = $lockedPr->status;

            $lockedPr->forceFill([
                'status' => 'submitted',
                'submitted_at' => now(),
                'returned_at' => null,
                'remarks' => null,
                'updated_by' => $request->user()->id,
            ])->save();

            $lockedPr->statusHistories()->create([
                'from_status' => $oldStatus,
                'to_status' => 'submitted',
                'action' => 'resubmit',
                'remarks' => 'Revised Purchase Request resubmitted for review.',
                'action_by' => $request->user()->id,
                'acted_at' => now(),
            ]);

            $this->auditLogService->record(
                module: 'purchase-request',
                action: 'pr-resubmitted',
                subject: $lockedPr,
                description: "{$lockedPr->pr_no} was resubmitted after revision.",
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
            "{$purchaseRequest->pr_no} was resubmitted for review."
        );
    }

    /**
     * GSPS returns a submitted Purchase Request for revision.
     */
    public function returnForRevision(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): RedirectResponse {
        abort_unless(
            $request->user()->can('prs.return'),
            403,
            'You do not have permission to return Purchase Requests.'
        );

        if ($purchaseRequest->status !== 'submitted') {
            return back()->withErrors([
                'workflow' => 'Only submitted Purchase Requests may be returned for revision.',
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
            'remarks.required' => 'Please provide the reason for returning the Purchase Request.',
        ]);

        DB::transaction(function () use (
            $request,
            $purchaseRequest,
            $validated
        ): void {
            $lockedPr = $this->lockPrForWorkflow($purchaseRequest);

            if ($lockedPr->status !== 'submitted') {
                throw ValidationException::withMessages([
                    'workflow' => 'This Purchase Request is no longer in Submitted status.',
                ]);
            }

            $oldStatus = $lockedPr->status;

            $lockedPr->forceFill([
                'status' => 'returned_for_revision',
                'returned_at' => now(),
                'remarks' => $validated['remarks'],
                'updated_by' => $request->user()->id,
            ])->save();

            $lockedPr->statusHistories()->create([
                'from_status' => $oldStatus,
                'to_status' => 'returned_for_revision',
                'action' => 'return_for_revision',
                'remarks' => $validated['remarks'],
                'action_by' => $request->user()->id,
                'acted_at' => now(),
            ]);

            $this->auditLogService->record(
                module: 'purchase-request',
                action: 'pr-returned-for-revision',
                subject: $lockedPr,
                description: "{$lockedPr->pr_no} was returned for revision.",
                oldValues: [
                    'status' => $oldStatus,
                ],
                newValues: [
                    'status' => 'returned_for_revision',
                    'remarks' => $validated['remarks'],
                ],
                request: $request
            );
        });

        return back()->with(
            'success',
            "{$purchaseRequest->pr_no} was returned to the requester for revision."
        );
    }

    /**
     * GSPS records approval and uploads the scanned approved PR copy.
     */
    public function approve(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): RedirectResponse {
        abort_unless(
            $request->user()->can('prs.approve')
            && $request->user()->can('prs.upload-approved-copy'),
            403,
            'You do not have permission to approve Purchase Requests.'
        );

        if ($purchaseRequest->status !== 'submitted') {
            return back()->withErrors([
                'workflow' => 'Only submitted Purchase Requests may be approved.',
            ]);
        }

        $this->validateReadyForSubmission($purchaseRequest);

        $validated = $request->validate([
            'approved_pr' => [
                'required',
                File::types([
                    'pdf',
                    'jpg',
                    'jpeg',
                    'png',
                ])->max('20mb'),
            ],
        ], [
            'approved_pr.required' => 'Please upload the scanned approved Purchase Request.',
        ]);

        $file = $validated['approved_pr'];

        $path = $file->store(
            "purchase-requests/{$purchaseRequest->id}/approved",
            'local'
        );

        try {
            DB::transaction(function () use (
                $request,
                $purchaseRequest,
                $file,
                $path
            ): void {
                $lockedPr = $this->lockPrForWorkflow($purchaseRequest);

                if ($lockedPr->status !== 'submitted') {
                    throw ValidationException::withMessages([
                        'workflow' => 'This Purchase Request is no longer in Submitted status and cannot be approved.',
                    ]);
                }

                $this->validateReadyForSubmission($lockedPr);

                $oldStatus = $lockedPr->status;

                /*
                 * Remove older approved copies if any exist.
                 */
                $oldApprovedCopies = $lockedPr->attachments()
                    ->where('document_type', 'approved_pr')
                    ->get();

                foreach ($oldApprovedCopies as $oldCopy) {
                    Storage::disk('local')->delete($oldCopy->file_path);
                    $oldCopy->delete();
                }

                $lockedPr->attachments()->create([
                    'document_type' => 'approved_pr',
                    'original_name' => $file->getClientOriginalName(),
                    'stored_name' => basename($path),
                    'file_path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'uploaded_by' => $request->user()->id,
                ]);

                $lockedPr->forceFill([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approval_recorded_by' => $request->user()->id,
                    'remarks' => null,
                    'updated_by' => $request->user()->id,
                ])->save();

                /*
                 * Official Budget Lock & Recalculation:
                 * Synchronize approved PR totals across ppmp_items, ppmps, and ppmp_series.
                 */
                $this->recalculateApprovedBudgetTotals(
                    $lockedPr,
                    $request->user()->id
                );

                $lockedPr->statusHistories()->create([
                    'from_status' => $oldStatus,
                    'to_status' => 'approved',
                    'action' => 'approve',
                    'remarks' => 'Approved Purchase Request recorded and scanned approved copy uploaded.',
                    'action_by' => $request->user()->id,
                    'acted_at' => now(),
                ]);

                $this->auditLogService->record(
                    module: 'purchase-request',
                    action: 'pr-approved',
                    subject: $lockedPr,
                    description: "{$lockedPr->pr_no} was approved and budget locked.",
                    oldValues: [
                        'status' => $oldStatus,
                    ],
                    newValues: [
                        'status' => 'approved',
                        'approved_at' => now()->toDateTimeString(),
                    ],
                    request: $request
                );
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }

        return back()->with(
            'success',
            "{$purchaseRequest->pr_no} was approved successfully."
        );
    }

    /**
     * Download an attachment (such as the scanned approved copy).
     */
    public function downloadAttachment(
        Request $request,
        PurchaseRequest $purchaseRequest,
        PurchaseRequestAttachment $attachment
    ): StreamedResponse {
        abort_unless(
            $attachment->purchase_request_id === $purchaseRequest->id,
            404
        );

        $user = $request->user();

        abort_unless(
            $user->can('prs.view-all')
            || (
                $user->can('prs.view-own')
                && $user->office_id !== null
                && $user->office_id === $purchaseRequest->office_id
            ),
            403,
            'You are not authorized to download this attachment.'
        );

        abort_unless(
            Storage::disk('local')->exists($attachment->file_path),
            404,
            'The requested file does not exist on disk.'
        );

        return Storage::disk('local')->download(
            $attachment->file_path,
            $attachment->original_name
        );
    }

    /**
     * Lock Purchase Request record with foreign relations.
     */
    private function lockPrForWorkflow(PurchaseRequest $pr): PurchaseRequest
    {
        return PurchaseRequest::query()
            ->whereKey($pr->id)
            ->with(['items.ppmpItem', 'ppmp.series'])
            ->lockForUpdate()
            ->firstOrFail();
    }

    /**
     * Ensure coordinator belongs to owning division.
     */
    private function ensureCoordinatorOwnsPr(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): void {
        $user = $request->user();

        if ($user->can('prs.view-all')) {
            return;
        }

        abort_unless(
            $user->office_id !== null
            && $user->office_id === $purchaseRequest->office_id,
            403,
            'You do not have permission to act on this Purchase Request.'
        );
    }

    /**
     * Validate whether the Purchase Request contains complete data
     * and does not exceed available budget before submit/approve.
     */
    public function validateReadyForSubmission(PurchaseRequest $purchaseRequest): void
    {
        $purchaseRequest->loadMissing([
            'items.ppmpItem',
            'ppmp.series',
        ]);

        $errors = [];

        if ($purchaseRequest->items->isEmpty()) {
            $errors['items'] = 'At least one item is required before submitting the Purchase Request.';
        }

        if (blank($purchaseRequest->purpose)) {
            $errors['purpose'] = 'Purpose is required before submission.';
        }

        if (blank($purchaseRequest->requested_by_name)) {
            $errors['requested_by_name'] = 'Requested By name is required before submission.';
        }

        if (blank($purchaseRequest->requested_by_designation)) {
            $errors['requested_by_designation'] = 'Requested By designation is required before submission.';
        }

        /*
         * Validate line item integrity and positive totals.
         */
        $totalPrCents = 0;
        $prItemTotalsByLineage = [];

        foreach ($purchaseRequest->items as $index => $item) {
            $row = $index + 1;

            if ((float) $item->quantity <= 0) {
                $errors["items.{$index}.quantity"] = "Item {$row}: Quantity must be greater than zero.";
            }

            if ((float) $item->unit_cost < 0) {
                $errors["items.{$index}.unit_cost"] = "Item {$row}: Unit cost cannot be negative.";
            }

            if ((float) $item->total_cost <= 0) {
                $errors["items.{$index}.total_cost"] = "Item {$row}: Total cost must be greater than zero.";
            }

            if (blank($item->item_description)) {
                $errors["items.{$index}.item_description"] = "Item {$row}: Item description is required.";
            }

            $itemCostCents = $this->moneyToCents($item->total_cost);
            $totalPrCents += $itemCostCents;

            if ($item->ppmpItem && filled($item->ppmpItem->lineage_uuid)) {
                $uuid = (string) $item->ppmpItem->lineage_uuid;
                $prItemTotalsByLineage[$uuid] = ($prItemTotalsByLineage[$uuid] ?? 0) + $itemCostCents;
            }
        }

        if ($totalPrCents <= 0) {
            $errors['total_amount'] = 'The Purchase Request must have a total amount greater than zero.';
        }

        /*
         * Check budget availability per PPMP item lineage:
         * Ensure (approved utilization from OTHER PRs + this PR) does not exceed the PPMP item's budget.
         */
        foreach ($prItemTotalsByLineage as $lineageUuid => $thisPrLineageCents) {
            $sourceItem = $purchaseRequest->ppmp->items()
                ->where('lineage_uuid', $lineageUuid)
                ->first();

            if (! $sourceItem) {
                continue;
            }

            $budgetCents = $this->moneyToCents($sourceItem->estimated_budget);

            // Other approved PRs (excluding current PR if already approved)
            $otherApprovedCents = (int) round(
                ((float) DB::table('purchase_request_items')
                    ->join('ppmp_items', 'ppmp_items.id', '=', 'purchase_request_items.ppmp_item_id')
                    ->join('purchase_requests', 'purchase_requests.id', '=', 'purchase_request_items.purchase_request_id')
                    ->where('purchase_requests.status', 'approved')
                    ->where('purchase_requests.id', '!=', $purchaseRequest->id)
                    ->whereNull('purchase_requests.deleted_at')
                    ->where('ppmp_items.lineage_uuid', $lineageUuid)
                    ->sum('purchase_request_items.total_cost')) * 100
            );

            if (($otherApprovedCents + $thisPrLineageCents) > $budgetCents) {
                $remainingCents = max(0, $budgetCents - $otherApprovedCents);
                $remainingFormatted = number_format($remainingCents / 100, 2);
                $errors["budget.{$lineageUuid}"] = "The requested amount for '{$sourceItem->description_objective}' exceeds the remaining item budget of ₱{$remainingFormatted}.";
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Recalculate and update approved PR totals across
     * ppmp_items, ppmps, and ppmp_series.
     */
    private function recalculateApprovedBudgetTotals(
        PurchaseRequest $approvedPr,
        int $userId
    ): void {
        $ppmp = $approvedPr->ppmp;

        if (! $ppmp) {
            return;
        }

        /*
         * 1. Update ppmp_items.approved_pr_amount for all items involved.
         */
        $ppmpItemIds = $approvedPr->items()
            ->pluck('ppmp_item_id')
            ->unique()
            ->filter();

        $lineageUuids = DB::table('ppmp_items')
            ->whereIn('id', $ppmpItemIds)
            ->pluck('lineage_uuid')
            ->unique()
            ->filter();

        foreach ($lineageUuids as $lineageUuid) {
            $utilized = DB::table('purchase_request_items')
                ->join('ppmp_items', 'ppmp_items.id', '=', 'purchase_request_items.ppmp_item_id')
                ->join('purchase_requests', 'purchase_requests.id', '=', 'purchase_request_items.purchase_request_id')
                ->where('purchase_requests.status', 'approved')
                ->whereNull('purchase_requests.deleted_at')
                ->where('ppmp_items.lineage_uuid', $lineageUuid)
                ->sum('purchase_request_items.total_cost');

            DB::table('ppmp_items')
                ->where('lineage_uuid', $lineageUuid)
                ->update([
                    'approved_pr_amount' => $utilized ?? 0,
                    'updated_at' => now(),
                ]);
        }

        /*
         * 2. Update ppmps.approved_pr_total for the source PPMP.
         */
        $ppmpApprovedTotal = DB::table('purchase_requests')
            ->where('ppmp_id', $ppmp->id)
            ->where('status', 'approved')
            ->whereNull('deleted_at')
            ->sum('total_amount');

        $ppmp->update([
            'approved_pr_total' => $ppmpApprovedTotal ?? 0,
            'updated_by' => $userId,
        ]);

        /*
         * 3. Update ppmp_series.approved_pr_total across the series.
         */
        if ($ppmp->ppmp_series_id) {
            $seriesApprovedTotal = DB::table('purchase_requests')
                ->join('ppmps', 'ppmps.id', '=', 'purchase_requests.ppmp_id')
                ->where('ppmps.ppmp_series_id', $ppmp->ppmp_series_id)
                ->where('purchase_requests.status', 'approved')
                ->whereNull('purchase_requests.deleted_at')
                ->sum('purchase_requests.total_amount');

            DB::table('ppmp_series')
                ->where('id', $ppmp->ppmp_series_id)
                ->update([
                    'approved_pr_total' => $seriesApprovedTotal ?? 0,
                    'updated_by' => $userId,
                    'updated_at' => now(),
                ]);
        }
    }

    private function moneyToCents(mixed $amount): int
    {
        if ($amount === null) {
            return 0;
        }

        $normalized = str_replace(',', '', (string) $amount);

        return (int) round(((float) $normalized) * 100);
    }
}


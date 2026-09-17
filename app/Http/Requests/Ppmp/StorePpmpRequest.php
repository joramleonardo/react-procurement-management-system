<?php

namespace App\Http\Requests\Ppmp;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePpmpRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->hasRole('ppmp-coordinator')
            && $user->can('ppmps.create')
            && $user->office_id !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'fiscal_year' => [
                'required',
                'integer',
                'min:2020',
                'max:'.(now()->year + 5),
            ],

            /*
             * plan_type is intentionally NOT accepted.
             *
             * New PPMPs created by a PPMP Coordinator
             * are always Indicative.
             */

            'prepared_by_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'prepared_by_position' => [
                'nullable',
                'string',
                'max:255',
            ],

            'submitted_by_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'submitted_by_position' => [
                'nullable',
                'string',
                'max:255',
            ],

            'items' => [
                'required',
                'array',
                'max:100',
            ],

            /*
             * Item No. 1
             */
            'items.*.description_objective' => [
                'nullable',
                'string',
                'max:5000',
            ],

            /*
             * Legacy compatibility fields.
             *
             * These remain temporarily while old PPMP
             * records are still supported.
             */
            'items.*.project_type' => [
                'nullable',
                'string',
                'max:100',
            ],

            'items.*.quantity_size' => [
                'nullable',
                'string',
                'max:1000',
            ],

            /*
             * Item No. 2 + Item No. 3
             *
             * Repeatable linked Project / Requirement
             * entries.
             */
            'items.*.details' => [
                'nullable',
                'array',
                'max:100',
            ],

            'items.*.details.*.project_type' => [
                'nullable',
                'string',
                'max:100',
            ],

            'items.*.details.*.quantity' => [
                'nullable',
                'numeric',
                'gt:0',
                'max:999999999999.999',
                'regex:/^\d{1,12}(\.\d{1,3})?$/',
            ],

            'items.*.details.*.unit' => [
                'nullable',
                'string',
                'max:100',
            ],

            'items.*.details.*.item_description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'items.*.details.*.size_specification' => [
                'nullable',
                'string',
                'max:5000',
            ],

            /*
             * Optional individual estimated amount.
             *
             * If one meaningful detail has an amount,
             * all meaningful details belonging to the
             * same PPMP item must also have an amount.
             */
            'items.*.details.*.estimated_amount' => [
                'nullable',
                'numeric',
                'gt:0',
                'max:9999999999999.99',
                'regex:/^\d{1,13}(\.\d{1,2})?$/',
            ],

            /*
             * Item No. 4
             */
            'items.*.recommended_mode_of_procurement' => [
                'nullable',
                'string',
                'max:150',
            ],

            /*
             * Item No. 5
             */
            'items.*.pre_procurement_conference' => [
                'required',
                'boolean',
            ],

            /*
             * Item Nos. 6 to 8
             */
            'items.*.procurement_start_month' => [
                'nullable',
                'regex:/^\d{4}-(0[1-9]|1[0-2])$/',
            ],

            'items.*.procurement_end_month' => [
                'nullable',
                'regex:/^\d{4}-(0[1-9]|1[0-2])$/',
            ],

            'items.*.expected_delivery_month' => [
                'nullable',
                'regex:/^\d{4}-(0[1-9]|1[0-2])$/',
            ],

            /*
             * Item No. 9
             */
            'items.*.source_of_funds' => [
                'nullable',
                'string',
                'max:150',
            ],

            /*
             * Item No. 10
             *
             * This is the resolved Estimated Budget /
             * Authorized Budgetary Allocation.
             *
             * PpmpController remains authoritative:
             *
             * - complete individual detail amounts
             *      => sum of detail estimated_amount
             *
             * - no individual detail amounts
             *      => fallback estimated budget
             */
            'items.*.estimated_budget' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999999.99',
                'regex:/^\d{1,13}(\.\d{1,2})?$/',
            ],

            /*
             * Item No. 11
             * Supporting Documents
             *
             * OPTIONAL.
             *
             * Zero, one, or multiple supporting
             * documents may be supplied.
             */
            'items.*.supporting_documents' => [
                'nullable',
                'array',
                'max:20',
            ],

            'items.*.supporting_documents.*' => [
                'file',
                'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png',
                'max:20480',
            ],

            /*
             * Item No. 12
             */
            'items.*.remarks' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ];
    }

    /**
     * Additional cross-field validation.
     */
    public function withValidator(
        Validator $validator
    ): void {
        $validator->after(
            function (
                Validator $validator
            ): void {
                $this->validateDetailCosting(
                    $validator
                );
            }
        );
    }

    /**
     * Individual costing rule:
     *
     * Allowed:
     *
     * A. All meaningful Item 2 + Item 3 entries
     *    contain an estimated amount.
     *
     * B. None of the meaningful entries contain
     *    an estimated amount, allowing the user
     *    to use the fallback Item No. 10 budget.
     *
     * Not allowed:
     *
     * C. Some entries have amounts while others
     *    are blank.
     */
    private function validateDetailCosting(
        Validator $validator
    ): void {
        $items =
            $this->input(
                'items',
                []
            );

        if (
            ! is_array(
                $items
            )
        ) {
            return;
        }

        foreach (
            $items as $itemIndex =>
                $item
        ) {
            if (
                ! is_array(
                    $item
                )
            ) {
                continue;
            }

            $details =
                $item['details']
                ?? [];

            if (
                ! is_array(
                    $details
                )
            ) {
                continue;
            }

            /*
             * Ignore completely blank placeholder
             * detail rows.
             */
            $meaningfulDetails = [];

            foreach (
                $details as $detailIndex =>
                    $detail
            ) {
                if (
                    ! is_array(
                        $detail
                    )
                ) {
                    continue;
                }

                if (
                    ! $this
                        ->detailHasContent(
                            $detail
                        )
                ) {
                    continue;
                }

                $meaningfulDetails[] = [
                    'index' =>
                        $detailIndex,

                    'detail' =>
                        $detail,
                ];
            }

            if (
                count(
                    $meaningfulDetails
                ) === 0
            ) {
                continue;
            }

            $withAmount = 0;

            $withoutAmount = [];

            foreach (
                $meaningfulDetails
                as $entry
            ) {
                $amount =
                    $entry['detail'][
                        'estimated_amount'
                    ]
                    ?? null;

                if (
                    $amount !== null
                    && $amount !== ''
                ) {
                    $withAmount++;

                    continue;
                }

                $withoutAmount[] =
                    $entry['index'];
            }

            /*
             * No individual amounts.
             *
             * Valid. The fallback estimated
             * budget may be used.
             */
            if (
                $withAmount === 0
            ) {
                continue;
            }

            /*
             * Every meaningful detail has
             * an individual amount.
             *
             * Valid.
             */
            if (
                $withAmount ===
                count(
                    $meaningfulDetails
                )
            ) {
                continue;
            }

            /*
             * Partial costing is invalid.
             */
            foreach (
                $withoutAmount
                as $detailIndex
            ) {
                $validator
                    ->errors()
                    ->add(
                        "items.{$itemIndex}.details.{$detailIndex}.estimated_amount",
                        'Enter an estimated amount for this entry, or leave all individual entry amounts blank and use the fallback estimated budget.'
                    );
            }

            $validator
                ->errors()
                ->add(
                    "items.{$itemIndex}.estimated_budget",
                    'Individual estimated amounts must be provided for all Project / Requirement entries or left blank for all entries.'
                );
        }
    }

    /**
     * Determine whether a repeatable Item 2 + Item 3
     * row contains meaningful user data.
     *
     * @param array<string, mixed> $detail
     */
    private function detailHasContent(
        array $detail
    ): bool {
        return filled(
            $detail[
                'project_type'
            ] ?? null
        )
            || filled(
                $detail[
                    'quantity'
                ] ?? null
            )
            || filled(
                $detail[
                    'unit'
                ] ?? null
            )
            || filled(
                $detail[
                    'item_description'
                ] ?? null
            )
            || filled(
                $detail[
                    'size_specification'
                ] ?? null
            )
            || filled(
                $detail[
                    'estimated_amount'
                ] ?? null
            );
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.max' =>
                'A PPMP may contain a maximum of 100 procurement items.',

            'items.*.details.max' =>
                'A procurement item may contain a maximum of 100 Project Type / Quantity and Size entries.',

            'items.*.details.*.quantity.numeric' =>
                'The quantity must be a valid number.',

            'items.*.details.*.quantity.gt' =>
                'The quantity must be greater than zero.',

            'items.*.details.*.quantity.max' =>
                'The quantity exceeds the maximum allowed value.',

            'items.*.details.*.quantity.regex' =>
                'The quantity may contain a maximum of three decimal places.',

            'items.*.details.*.estimated_amount.numeric' =>
                'The estimated amount must be a valid amount.',

            'items.*.details.*.estimated_amount.gt' =>
                'The estimated amount must be greater than zero.',

            'items.*.details.*.estimated_amount.max' =>
                'The estimated amount exceeds the maximum allowed value.',

            'items.*.details.*.estimated_amount.regex' =>
                'The estimated amount may contain a maximum of two decimal places.',

            'items.*.estimated_budget.numeric' =>
                'The estimated budget must be a valid amount.',

            'items.*.estimated_budget.min' =>
                'The estimated budget cannot be negative.',

            'items.*.estimated_budget.max' =>
                'The estimated budget exceeds the maximum allowed amount.',

            'items.*.estimated_budget.regex' =>
                'The estimated budget may contain a maximum of two decimal places.',

            /*
             * Item No. 11
             */
            'items.*.supporting_documents.array' =>
                'The supporting documents must be a valid file list.',

            'items.*.supporting_documents.max' =>
                'A procurement item may contain a maximum of 20 supporting documents.',

            'items.*.supporting_documents.*.file' =>
                'Each supporting document must be a valid file.',

            'items.*.supporting_documents.*.mimes' =>
                'Supporting documents must be PDF, Word, Excel, JPG, or PNG files.',

            'items.*.supporting_documents.*.max' =>
                'Each supporting document must not exceed 20 MB.',
        ];
    }
}

<?php

namespace App\Http\Requests\Ppmp;

use App\Models\Ppmp;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdatePpmpRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Ppmp $ppmp */
        $ppmp =
            $this->route(
                'ppmp'
            );

        $user =
            $this->user();

        return $user !== null
            && $user->hasRole(
                'ppmp-coordinator'
            )
            && $user->can(
                'ppmps.update-own'
            )
            && $user->office_id ===
                $ppmp->office_id
            && $ppmp->isEditable();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Ppmp $ppmp */
        $ppmp =
            $this->route(
                'ppmp'
            );

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
             * The coordinator cannot convert an
             * Indicative PPMP into Final.
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
             * Existing PPMP item ID.
             *
             * The item must belong to the exact
             * PPMP currently being edited.
             */
            'items.*.id' => [
                'nullable',
                'integer',

                Rule::exists(
                    'ppmp_items',
                    'id'
                )->where(
                    fn ($query) =>
                        $query->where(
                            'ppmp_id',
                            $ppmp->id
                        )
                ),
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
             */
            'items.*.details' => [
                'nullable',
                'array',
                'max:100',
            ],

            /*
             * Existing child detail ID.
             *
             * It must belong to the exact PPMP item
             * being edited.
             */
            'items.*.details.*.id' => [
                'nullable',
                'integer',

                function (
                    string $attribute,
                    mixed $value,
                    \Closure $fail
                ): void {
                    if (
                        $value === null
                        || $value === ''
                    ) {
                        return;
                    }

                    if (
                        ! preg_match(
                            '/^items\.(\d+)\.details\.\d+\.id$/',
                            $attribute,
                            $matches
                        )
                    ) {
                        $fail(
                            'The selected procurement detail is invalid.'
                        );

                        return;
                    }

                    $itemIndex =
                        (int)
                        $matches[1];

                    $parentItemId =
                        $this->input(
                            "items.{$itemIndex}.id"
                        );

                    if (
                        empty(
                            $parentItemId
                        )
                    ) {
                        $fail(
                            'An existing procurement detail cannot be attached to a new PPMP item.'
                        );

                        return;
                    }

                    $exists =
                        DB::table(
                            'ppmp_item_details'
                        )
                            ->where(
                                'id',
                                $value
                            )
                            ->where(
                                'ppmp_item_id',
                                $parentItemId
                            )
                            ->exists();

                    if (
                        ! $exists
                    ) {
                        $fail(
                            'The selected procurement detail does not belong to this PPMP item.'
                        );
                    }
                },
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
             * These represent only NEW documents
             * being uploaded during editing.
             *
             * Existing supporting documents remain
             * untouched if this field is empty.
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
     * Individual costing must be either:
     *
     * - complete for every meaningful detail; or
     * - blank for every meaningful detail.
     *
     * Partial individual costing is not allowed.
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
             * Fallback Item No. 10 may be used.
             */
            if (
                $withAmount === 0
            ) {
                continue;
            }

            /*
             * Complete individual costing.
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
             * Partial individual costing.
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
                'A procurement item may contain a maximum of 20 new supporting documents.',

            'items.*.supporting_documents.*.file' =>
                'Each supporting document must be a valid file.',

            'items.*.supporting_documents.*.mimes' =>
                'Supporting documents must be PDF, Word, Excel, JPG, or PNG files.',

            'items.*.supporting_documents.*.max' =>
                'Each supporting document must not exceed 20 MB.',
        ];
    }
}

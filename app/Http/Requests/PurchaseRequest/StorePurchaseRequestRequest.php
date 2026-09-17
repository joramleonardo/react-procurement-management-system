<?php

namespace App\Http\Requests\PurchaseRequest;

use App\Models\Ppmp;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePurchaseRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Ppmp|null $ppmp */
        $ppmp =
            $this->route(
                'ppmp'
            );

        $user =
            $this->user();

        if (
            ! $user
            || ! $ppmp
        ) {
            return false;
        }

        return $user->hasRole(
            'ppmp-coordinator'
        )
            && $user->can(
                'prs.create'
            )
            && $user->office_id ===
                $ppmp->office_id
            && $ppmp->status ===
                'approved';
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
            'action' => [
                'nullable',
                'string',
                Rule::in(['draft', 'submit']),
            ],

            'entity_name' => [
                'required',
                'string',
                'max:255',
            ],

            'fund_cluster' => [
                'nullable',
                'string',
                'max:100',
            ],

            'responsibility_center_code' => [
                'nullable',
                'string',
                'max:100',
            ],

            /*
             * Draft creation remains permissive enough
             * to match the current PR workflow.
             */
            'pr_date' => [
                'nullable',
                'date',
            ],

            'purpose' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'requested_by_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'requested_by_designation' => [
                'nullable',
                'string',
                'max:255',
            ],

            'approved_by_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'approved_by_designation' => [
                'nullable',
                'string',
                'max:255',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            /*
             * Exact historical PPMP parent item.
             *
             * It must belong to the PPMP route that
             * the Purchase Request is being created from.
             */
            'items.*.ppmp_item_id' => [
                'required',
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
             * Exact historical Item No. 2 + Item No. 3
             * child requirement.
             *
             * The cross-field validator below also checks
             * that this child belongs to the submitted
             * ppmp_item_id and exact PPMP version.
             */
            'items.*.ppmp_item_detail_id' => [
                'required',
                'integer',
                'exists:ppmp_item_details,id',
            ],

            'items.*.stock_property_no' => [
                'nullable',
                'string',
                'max:100',
            ],

            'items.*.unit' => [
                'nullable',
                'string',
                'max:100',
            ],

            'items.*.item_description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'items.*.quantity' => [
                'nullable',
                'numeric',
                'gt:0',
                'max:999999999999.999',
                'regex:/^\d{1,12}(\.\d{1,3})?$/',
            ],

            'items.*.unit_cost' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999999.99',
                'regex:/^\d{1,13}(\.\d{1,2})?$/',
            ],
        ];
    }

    public function withValidator(
        Validator $validator
    ): void {
        $validator->after(
            function (
                Validator $validator
            ): void {
                $this->validateExactPpmpDetails(
                    $validator
                );
            }
        );
    }

    /**
     * Prevent request manipulation such as:
     *
     * ppmp_item_id        = parent from PPMP A
     * ppmp_item_detail_id = child belonging to another
     *                       parent or another PPMP version.
     */
    private function validateExactPpmpDetails(
        Validator $validator
    ): void {
        /** @var Ppmp|null $ppmp */
        $ppmp =
            $this->route(
                'ppmp'
            );

        if (! $ppmp) {
            return;
        }

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
            $items as $index =>
                $item
        ) {
            if (
                ! is_array(
                    $item
                )
            ) {
                continue;
            }

            $parentId =
                $item[
                    'ppmp_item_id'
                ] ?? null;

            $detailId =
                $item[
                    'ppmp_item_detail_id'
                ] ?? null;

            /*
             * Let the normal required/integer/exists
             * rules report missing or malformed values.
             */
            if (
                ! is_numeric(
                    $parentId
                )
                || ! is_numeric(
                    $detailId
                )
            ) {
                continue;
            }

            $validPair =
                DB::table(
                    'ppmp_item_details'
                )
                    ->join(
                        'ppmp_items',
                        'ppmp_items.id',
                        '=',
                        'ppmp_item_details.ppmp_item_id'
                    )
                    ->where(
                        'ppmp_item_details.id',
                        (int) $detailId
                    )
                    ->where(
                        'ppmp_item_details.ppmp_item_id',
                        (int) $parentId
                    )
                    ->where(
                        'ppmp_items.ppmp_id',
                        $ppmp->id
                    )
                    ->exists();

            if (
                ! $validPair
            ) {
                $validator
                    ->errors()
                    ->add(
                        "items.{$index}.ppmp_item_detail_id",
                        'The selected PPMP requirement does not belong to the selected PPMP item.'
                    );
            }
        }

        if ($this->input('action') === 'submit') {
            if (blank($this->input('purpose'))) {
                $validator->errors()->add('purpose', 'Purpose is required before submitting for review.');
            }

            if (blank($this->input('requested_by_name'))) {
                $validator->errors()->add('requested_by_name', 'Requested By name is required before submitting for review.');
            }

            if (blank($this->input('requested_by_designation'))) {
                $validator->errors()->add('requested_by_designation', 'Requested By designation is required before submitting for review.');
            }
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' =>
                'Add at least one Purchase Request item.',

            'items.min' =>
                'Add at least one Purchase Request item.',

            'items.max' =>
                'A Purchase Request may contain a maximum of 100 items.',

            'items.*.ppmp_item_id.required' =>
                'Select the source PPMP item.',

            'items.*.ppmp_item_id.exists' =>
                'The selected PPMP item does not belong to this approved PPMP.',

            'items.*.ppmp_item_detail_id.required' =>
                'Select the exact PPMP Project / Requirement entry.',

            'items.*.ppmp_item_detail_id.exists' =>
                'The selected PPMP Project / Requirement entry is invalid.',

            'items.*.quantity.numeric' =>
                'The quantity must be a valid number.',

            'items.*.quantity.gt' =>
                'The quantity must be greater than zero.',

            'items.*.quantity.regex' =>
                'The quantity may contain a maximum of three decimal places.',

            'items.*.unit_cost.numeric' =>
                'The unit cost must be a valid amount.',

            'items.*.unit_cost.min' =>
                'The unit cost cannot be negative.',

            'items.*.unit_cost.regex' =>
                'The unit cost may contain a maximum of two decimal places.',
        ];
    }
}

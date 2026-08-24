<?php

namespace App\Http\Requests\PurchaseRequest;

use App\Models\Ppmp;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Ppmp|null $ppmp */
        $ppmp = $this->route('ppmp');

        $user = $this->user();

        return $user !== null
            && $ppmp !== null
            && $user->hasRole('ppmp-coordinator')
            && $user->can('prs.create')
            && $user->office_id === $ppmp->office_id
            && $ppmp->status === 'approved';
    }

    public function rules(): array
    {
        /** @var Ppmp $ppmp */
        $ppmp = $this->route('ppmp');

        return [
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
                'max:999999999',
            ],

            'items.*.unit_cost' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999999.99',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'items.min' =>
                'Add at least one Purchase Request item.',

            'items.*.ppmp_item_id.required' =>
                'Please select the PPMP item that will fund this PR item.',

            'items.*.ppmp_item_id.exists' =>
                'The selected PPMP item does not belong to this PPMP.',

            'items.*.quantity.gt' =>
                'Quantity must be greater than zero.',

            'items.*.unit_cost.numeric' =>
                'Unit Cost must be a valid amount.',
        ];
    }
}

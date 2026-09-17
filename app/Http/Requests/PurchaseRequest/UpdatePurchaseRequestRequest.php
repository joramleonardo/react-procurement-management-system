<?php

namespace App\Http\Requests\PurchaseRequest;

use App\Models\PurchaseRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdatePurchaseRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var PurchaseRequest|null $purchaseRequest */
        $purchaseRequest = $this->route('purchaseRequest');
        $user = $this->user();

        if (! $user || ! $purchaseRequest) {
            return false;
        }

        return $user->can('prs.update-own')
            && $purchaseRequest->isEditable()
            && (
                $user->can('prs.view-all')
                || $user->office_id === $purchaseRequest->office_id
            );
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var PurchaseRequest $purchaseRequest */
        $purchaseRequest = $this->route('purchaseRequest');

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
                Rule::exists('ppmp_items', 'id')->where(
                    fn ($query) => $query->where('ppmp_id', $purchaseRequest->ppmp_id)
                ),
            ],

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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->validateExactPpmpDetails($validator);
        });
    }

    /**
     * Prevent request manipulation such as:
     * ppmp_item_id        = parent from PPMP A
     * ppmp_item_detail_id = child belonging to another parent or another PPMP version.
     */
    private function validateExactPpmpDetails(Validator $validator): void
    {
        /** @var PurchaseRequest|null $purchaseRequest */
        $purchaseRequest = $this->route('purchaseRequest');

        if (! $purchaseRequest) {
            return;
        }

        $items = $this->input('items', []);

        if (! is_array($items)) {
            return;
        }

        foreach ($items as $index => $item) {
            if (! is_array($item)) {
                continue;
            }

            $parentId = $item['ppmp_item_id'] ?? null;
            $detailId = $item['ppmp_item_detail_id'] ?? null;

            if (! is_numeric($parentId) || ! is_numeric($detailId)) {
                continue;
            }

            $validPair = DB::table('ppmp_item_details')
                ->join('ppmp_items', 'ppmp_items.id', '=', 'ppmp_item_details.ppmp_item_id')
                ->where('ppmp_item_details.id', (int) $detailId)
                ->where('ppmp_item_details.ppmp_item_id', (int) $parentId)
                ->where('ppmp_items.ppmp_id', (int) $purchaseRequest->ppmp_id)
                ->exists();

            if (! $validPair) {
                $validator->errors()->add(
                    "items.{$index}.ppmp_item_detail_id",
                    'The selected PPMP requirement does not belong to the selected PPMP item for this Purchase Request.'
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
}


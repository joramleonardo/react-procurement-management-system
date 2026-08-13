<?php

namespace App\Http\Requests\Ppmp;

use App\Models\Ppmp;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePpmpRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Ppmp $ppmp */
        $ppmp = $this->route('ppmp');

        $user = $this->user();

        return $user !== null
            && $user->hasRole('ppmp-coordinator')
            && $user->can('ppmps.update-own')
            && $user->office_id === $ppmp->office_id
            && $ppmp->isEditable();
    }

    public function rules(): array
    {
        /** @var Ppmp $ppmp */
        $ppmp = $this->route('ppmp');

        return [
            'fiscal_year' => [
                'required',
                'integer',
                'min:2020',
                'max:'.(now()->year + 5),
            ],

            'plan_type' => [
                'required',
                Rule::in([
                    'indicative',
                    'final',
                ]),
            ],

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

            'items.*.description_objective' => [
                'nullable',
                'string',
                'max:5000',
            ],

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

            'items.*.recommended_mode_of_procurement' => [
                'nullable',
                'string',
                'max:150',
            ],

            'items.*.pre_procurement_conference' => [
                'required',
                'boolean',
            ],

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

            'items.*.source_of_funds' => [
                'nullable',
                'string',
                'max:150',
            ],

            'items.*.estimated_budget' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'items.*.remarks' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ];
    }
}

<?php

namespace App\Http\Requests\Ppmp;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
                'max:9999999999999.99',
            ],

            'items.*.remarks' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.max' =>
                'A PPMP may contain a maximum of 100 procurement items.',

            'items.*.estimated_budget.numeric' =>
                'The estimated budget must be a valid amount.',

            'items.*.estimated_budget.min' =>
                'The estimated budget cannot be negative.',
        ];
    }
}

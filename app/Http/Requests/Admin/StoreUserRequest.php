<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine whether the user can create accounts.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('users.create') ?? false;
    }

    /**
     * Prepare input values before validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'employee_id' => trim((string) $this->input('employee_id')),
            'username' => trim((string) $this->input('username')),
            'first_name' => trim((string) $this->input('first_name')),
            'middle_name' => trim((string) $this->input('middle_name')),
            'last_name' => trim((string) $this->input('last_name')),
            'suffix' => trim((string) $this->input('suffix')),
            'email' => strtolower(trim((string) $this->input('email'))),
            'position_title' => trim((string) $this->input('position_title')),
        ]);
    }

    /**
     * Get the validation rules.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'employee_id' => [
                'required',
                'string',
                'max:50',
                Rule::unique('users', 'employee_id'),
            ],

            'username' => [
                'required',
                'string',
                'min:3',
                'max:100',
                'alpha_dash',
                Rule::unique('users', 'username'),
            ],

            'first_name' => [
                'required',
                'string',
                'max:255',
            ],

            'middle_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'last_name' => [
                'required',
                'string',
                'max:255',
            ],

            'suffix' => [
                'nullable',
                'string',
                'max:20',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
            ],

            'office_id' => [
                'nullable',
                'integer',
                Rule::exists('offices', 'id')
                    ->where('is_active', true),
            ],

            'position_title' => [
                'nullable',
                'string',
                'max:150',
            ],

            'role' => [
                'required',
                'string',
                Rule::exists('roles', 'name')
                    ->where('guard_name', 'web'),
            ],

            'status' => [
                'required',
                Rule::in([
                    'pending',
                    'active',
                    'inactive',
                ]),
            ],

            'password' => [
                'required',
                'confirmed',
                Password::min(12)
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],

            'must_change_password' => [
                'required',
                'boolean',
            ],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'employee_id.unique' => 'This employee ID is already assigned.',
            'username.unique' => 'This username is already in use.',
            'username.alpha_dash' => 'The username may contain only letters, numbers, dashes, and underscores.',
            'email.unique' => 'This email address is already assigned.',
            'role.exists' => 'The selected role is invalid.',
            'office_id.exists' => 'The selected office is invalid or inactive.',
        ];
    }
}

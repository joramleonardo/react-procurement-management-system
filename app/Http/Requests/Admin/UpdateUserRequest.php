<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine whether the current user may update accounts.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('users.update') ?? false;
    }

    /**
     * Prepare submitted data before validation.
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
        /** @var User $user */
        $user = $this->route('user');

        return [
            'employee_id' => [
                'required',
                'string',
                'max:50',
                Rule::unique('users', 'employee_id')->ignore($user),
            ],

            'username' => [
                'required',
                'string',
                'min:3',
                'max:100',
                'alpha_dash',
                Rule::unique('users', 'username')->ignore($user),
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
                Rule::unique('users', 'email')->ignore($user),
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
                    'locked',
                ]),
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
            'employee_id.unique' =>
                'This employee ID is already assigned to another user.',

            'username.unique' =>
                'This username is already in use.',

            'username.alpha_dash' =>
                'The username may contain only letters, numbers, dashes, and underscores.',

            'email.unique' =>
                'This email address is already assigned to another user.',

            'office_id.exists' =>
                'The selected office is invalid or inactive.',

            'role.exists' =>
                'The selected role is invalid.',
        ];
    }
}

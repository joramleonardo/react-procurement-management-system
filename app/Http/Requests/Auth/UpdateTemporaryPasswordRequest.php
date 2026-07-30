<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateTemporaryPasswordRequest extends FormRequest
{
    /**
     * Only authenticated users may change their temporary password.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the password validation rules.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'current_password' => [
                'required',
                'string',
                'current_password:web',
            ],

            'password' => [
                'required',
                'string',
                'confirmed',
                'different:current_password',

                Password::min(12)
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
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
            'current_password.current_password' =>
                'The temporary password you entered is incorrect.',

            'password.different' =>
                'Your new password must be different from your temporary password.',

            'password.confirmed' =>
                'The new password confirmation does not match.',
        ];
    }

    /**
     * User-friendly validation attribute names.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'current_password' => 'temporary password',
            'password' => 'new password',
        ];
    }
}

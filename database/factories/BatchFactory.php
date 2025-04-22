<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Batch>
 */
class BatchFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $sites = collect(
            [
                'https://brightonresort.com/',
                'https://lineskis.com/',
                'https://www.apple.com/',
                'https://www.transitionbikes.com/',
            ]
        );

        return [
            'dev_url' => function () use ($sites) {
                return $sites->random();
            },
        ];
    }
}

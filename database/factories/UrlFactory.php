<?php

namespace Database\Factories;

use App\Models\Batch;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Url>
 */
class UrlFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'batch_id' => function () {
                if (Batch::count()) {
                    return Batch::inRandomOrder()->first()->id;
                }

                return Batch::factory()->create()->id;
            },
            'url' => fake()->url(),
            'redirect_to' => '',
            'addressed' => false,
        ];
    }
}

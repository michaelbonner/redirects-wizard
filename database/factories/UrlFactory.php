<?php

namespace Database\Factories;

use App\Models\Batch;
use App\Models\Url;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Url>
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

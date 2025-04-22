<?php

use App\Models\Batch;
use App\Models\Url;
use App\Models\User;
use Illuminate\Database\Seeder;

class BatchesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Batch::factory(10)->create()->each(function ($batch) {
            $faker = Faker\Factory::create();
            for ($i = 0; $i < 10; $i++) {
                Url::factory()->create([
                    'batch_id' => $batch->id,
                    'url' => $batch->dev_url.$faker->slug(),
                    'redirect_to' => $batch->dev_url.$faker->slug(),
                    'addressed' => $faker->boolean(),
                ]);
            }
        });
        User::factory()->create([
            'name' => 'Michael Bonner',
            'email' => 'mike@bootpackdigital.com',
        ]);
    }
}

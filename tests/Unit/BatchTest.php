<?php

namespace Tests\Unit;

use App\Models\Batch;
use App\Models\Url;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Tests\TestCase;

class BatchTest extends TestCase
{
    use DatabaseMigrations;

    /** @test */
    public function can_create()
    {
        $batch = factory(Batch::class)->create();
        $this->assertInstanceOf(Batch::class, $batch);
    }

    /** @test */
    public function can_get_urls()
    {
        $batch = factory(Batch::class)->create();
        factory(Url::class)->create([
            'batch_id' => $batch->id,
        ])->toArray();
        $this->assertInstanceOf(Url::class, $batch->urls->first());
    }
}

<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use App\Models\Batch;
use App\Models\Url;

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

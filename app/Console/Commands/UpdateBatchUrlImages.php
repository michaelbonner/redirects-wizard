<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Batch;
use Spatie\Browsershot\Browsershot;
use Carbon\Carbon;

class UpdateBatchUrlImages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'update:batchurlimages {--force}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch screenshots of batch urls';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        $this->info('Generating screenshots');
        $this->line('Go grab a coffee, this could take a while');
        if (!$this->option('force')) {
            $this->line('');
            $this->comment('To force a regeneration use the flag --force');
        }

        $this->line('');
        
        $batches = Batch::whereNotNull('dev_url')
            ->where('dev_url', '!=', '')
            ->select('dev_url')
            ->distinct()
            ->get();

        if (!$this->option('force')) {
            $not_fetching = $batches->filter(function ($batch, $i) {
                $image_path = storage_path(
                    '/app/public/' .
                    urlencode($batch->dev_url) .
                    '.jpg'
                );
                if (
                    !$this->option('force') &&
                    file_exists($image_path) &&
                    Carbon::createFromTimestamp(filemtime($image_path))
                        ->diffInMinutes(Carbon::now()) < 30
                ) {
                    return true;
                }
                return false;
            });
            $fetching = $batches->filter(function ($batch, $i) {
                $image_path = storage_path(
                    '/app/public/' .
                    urlencode($batch->dev_url) .
                    '.jpg'
                );
                if (
                    !$this->option('force') &&
                    file_exists($image_path) &&
                    Carbon::createFromTimestamp(filemtime($image_path))
                        ->diffInMinutes(Carbon::now()) < 30
                ) {
                    return false;
                }
                return true;
            });

            $this->table(
                [
                    'URLs to skip',
                ],
                $not_fetching->map(function ($item, $key) {
                    return ['url' => $item->dev_url];
                })
            );
        } else {
            $fetching = $batches;
        }
        
        $this->table(
            [
                'URLs to generate screenshots for',
            ],
            $fetching->map(function ($item, $key) {
                return ['url' => $item->dev_url];
            })
        );

        $this->line('');

        if (!$fetching->count()) {
            $this->info('Nothing to do');
            return true;
        }
        $bar = $this->output->createProgressBar($fetching->count());

        $fetching->each(function ($batch) use ($bar) {
            $image_path = storage_path(
                '/app/public/' .
                urlencode($batch->dev_url) .
                '.jpg'
            );
            
            $image = Browsershot::url($batch->dev_url)
                ->windowSize(1440, 900)
                ->setScreenshotType('jpeg', 70)
                ->waitUntilNetworkIdle()
                ->save($image_path);

            $bar->advance();
        });
        
        $bar->finish();

        $this->line('');
    }
}

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Batch;
use Spatie\Browsershot\Browsershot;
use Intervention\Image\Facades\Image;
use Carbon\Carbon;
use Spatie\Image\Manipulations;

class BatchDevUrlScreenshotController extends Controller
{
    public function show(Batch $batch)
    {
        if ($batch->dev_url) {
            $image_path = storage_path(
                '/app/public/' .
                urlencode($batch->dev_url) .
                '.jpg'
            );

            // return a cached version if it was created recently
            if (
                file_exists($image_path) &&
                Carbon::createFromTimestamp(filemtime($image_path))
                    ->diffInDays(Carbon::now()) < 1
            ) {
                $image = Image::make($image_path);
                return $image->response();
            }
            
            Browsershot::url($batch->dev_url)
                ->windowSize(1440, 900)
                ->setScreenshotType('jpeg', 70)
                ->save($image_path);

            $image = Image::make($image_path);
            return $image->response();
        }

        return response('');
    }
}

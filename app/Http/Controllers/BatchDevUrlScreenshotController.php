<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use Carbon\Carbon;
use Intervention\Image\Facades\Image;
use Spatie\Browsershot\Browsershot;
use Spatie\Image\Manipulations;

class BatchDevUrlScreenshotController extends Controller
{
    public function show(Batch $batch)
    {
        if ($batch->dev_url) {
            $image_path = storage_path(
                'app/public/' .
                    md5($batch->dev_url) .
                    '.jpg'
            );

            // return a cached version if it was created within 3 days
            if (
                file_exists($image_path) &&
                Carbon::createFromTimestamp(
                    filemtime($image_path)
                )->diffInDays(
                    Carbon::now()
                ) < 3
            ) {
                $image = Image::make($image_path);
                return $image->response();
            }

            Browsershot::url($batch->dev_url)
                ->setDelay(800)
                ->fit(Manipulations::FIT_CONTAIN, 360, 225)
                ->windowSize(1440, 900)
                ->save($image_path);

            $image = Image::make($image_path);
            return $image->response();
        }

        return response('');
    }
}

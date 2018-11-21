<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Batch extends Model
{
    use SoftDeletes;
    
    protected $guarded = [];

    public function urls()
    {
        return $this->hasMany(Url::class);
    }

    public function getDevUrlWithTrailingSlashAttribute()
    {
        return ends_with($this->dev_url, '/') ?
            $this->dev_url :
            $this->dev_url . '/';
    }

    public function getRemainingToAddressUrlsAttribute()
    {
        return $this->urls->filter(function ($url) {
            return !$url->addressed;
        });
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

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
        return Str::endsWith($this->dev_url, '/') ?
            $this->dev_url :
            $this->dev_url . '/';
    }

    public function getRemainingToAddressUrlsAttribute()
    {
        return $this->urls->filter(function ($url) {
            return !$url->addressed;
        });
    }

    public function getDevUrlPartsAttribute()
    {
        return parse_url($this->dev_url);
    }

    public function getHostAttribute()
    {
        return $this->devUrlParts ? $this->devUrlParts['host'] : null;
    }

    public function getHostWithoutWwwAttribute()
    {
        return Str::after($this->host, 'www.');
    }
}

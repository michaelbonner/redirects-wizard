<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Classes\UrlChecker;

class Url extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $appends = [
        'devUrl',
        'devRedirectUrl'
    ];

    protected $casts = [
        'http_response' => 'array',
    ];

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    public function checkAddressed()
    {
        $response = UrlChecker::check(
            $this->devUrl
        );
        if ($response) {
            $this->addressed = $response->status_code == 200;
            $this->http_response = $response;
            $this->save();
            return $this;
        } else {
            $this->addressed = false;
            $this->http_response = null;
            $this->save();
            return false;
        }
    }

    public function getDevUrlAttribute()
    {
        $current = parse_url($this->url);
        $dev = parse_url($this->batch->dev_url);
        $returnString = $dev['scheme'] . '://' . $dev['host'];
        $returnString .= $current['path'] ?? '';
        return $returnString;
    }

    public function getDevRedirectUrlAttribute()
    {
        $redirect = parse_url($this->redirect_to);
        $dev = parse_url($this->batch->dev_url);
        $returnString = $dev['scheme'] . '://' . $dev['host'];
        $returnString .= $redirect['path'] ?? '';
        return $returnString;
    }

    public function getUrlPathAttribute()
    {
        $parsed = parse_url($this->url);
        return substr($parsed['path'], 1);
    }

    public function getQueryStringAttribute()
    {
        $parsed = parse_url($this->url);
        return $parsed['query'] ?? '';
    }

    public function getRewritePatternAttribute()
    {
        if (!$this->urlPath) {
            return '(.*) ';
        }
        $return_string = '^';
        $return_string .= preg_quote(
            $this->urlPath,
            '/'
        );
        if (substr($return_string, -1) == '\/') {
            $return_string .= '?';
        }
        $return_string .= '$ ';
        return $return_string;
    }

    public function getRewriteAttribute()
    {
        $parsed = parse_url($this->url);
        $rule = '';
        if ($this->queryString) {
            $rule .= 'RewriteCond %{QUERY_STRING} ' . $this->queryString . "\n";
        }
        $rule .= 'RewriteRule ' .
            $this->rewritePattern .
            $this->devRedirectUrl .
            '? [R=301,NC,L]';

        $rule = str_replace($this->batch->devUrlWithTrailingSlash, '/', $rule);
        $rule = str_replace($this->batch->dev_url, '', $rule);
        $rule = str_replace('%20', "\ ", $rule);
        $rule = str_replace(' ? ', " /? ", $rule);

        return $rule;
    }
}

<?php

namespace App\Classes;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Exception\ServerException;
use GuzzleHttp\RequestOptions;

class UrlChecker
{
    public static function check(string $url)
    {
        return json_decode(json_encode(self::check_status($url)));
    }

    public static function check_status($url = '')
    {
        // First you configure Guzzle with redirect tracking and make a request
        $client = new Client([
            RequestOptions::ALLOW_REDIRECTS => [
                'max' => 5,
                'strict' => true,
                'referer' => true,
                'track_redirects' => true,
            ],
        ]);

        try {
            $res = $client->request('GET', $url, [
                'connect_timeout' => 10,
                'verify' => false,
                'headers' => [
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Encoding' => 'gzip, deflate',
                    'Accept-Language' => 'en-US,en;q=0.9',
                    'Cache-Control' => 'no-cache',
                    'Connection' => 'keep-alive',
                    'Host' => (parse_url($url))['host'],
                    'Pragma' => 'no-cache',
                    'Upgrade-Insecure-Requests' => '1',
                    'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
                ],
            ]);

            // retrieve Redirect URI history
            $redirectUriHistory = $res->getHeader('X-Guzzle-Redirect-History');
            array_unshift($redirectUriHistory, $url);

            return [
                'url' => $url,
                'status_code' => $res->getStatusCode(),
                'redirect_path' => $redirectUriHistory,
                'headers' => $res->getHeaders(),
            ];
        } catch (ClientException $e) {
            $res = $e->getResponse();

            return [
                'url' => $url,
                'status_code' => $res->getStatusCode(),
                'message' => $e->getMessage(),
                'headers' => $res->getHeaders(),
            ];
        } catch (ConnectException $e) {
            return [
                'url' => $url,
                'status_code' => 504,
                'message' => $e->getMessage(),
                'headers' => [],
            ];
        } catch (ServerException $e) {
            return [
                'url' => $url,
                'status_code' => 500,
                'message' => $e->getMessage(),
                'headers' => [],
            ];
        } catch (RequestException $e) {
            return [
                'url' => $url,
                'status_code' => 'Request Exception',
                'message' => $e->getMessage(),
                'headers' => [],
            ];
        }
    }
}

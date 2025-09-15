<?php

namespace App\Http\Controllers;

use App\Models\Url;
use Illuminate\Http\Request;

class UrlController extends Controller
{
    /**
     * Display the specified resource.
     *
     * @return \App\Models\Url
     */
    public function show(Url $url)
    {
        $url = $url->checkAddressed();

        return $url;
    }

    public function details($url)
    {
        return Url::find($url);
    }

    /**
     * Update the specified resource in storage.
     *
     * @return \App\Models\Url
     */
    public function update(Request $request, Url $url)
    {
        $url->update(
            $request->all()
        );

        return $url;
    }

    /**
     * Remove the specified resource from storage.
     *
     * @return array
     */
    public function destroy(Url $url)
    {
        $url->delete();

        return ['success' => true];
    }
}

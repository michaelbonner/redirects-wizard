<?php

namespace App\Http\Controllers;

use App\Http\Requests\BatchUpdateRequest;
use App\Models\Batch;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Contracts\View\View
     */
    public function index()
    {
        return view('batch.index', [
            'batches' => Batch::where('dev_url', '!=', '')
                ->whereNotNull('dev_url')
                ->where('user_id', auth()->user()->id)
                ->get()
                ->sortBy('hostWithoutWww'),
            'title' => 'Redirect Batches',
        ]);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $batch = Batch::create([
            'dev_url' => '',
            'user_id' => auth()->user()->id,
        ]);

        return redirect("/batch/{$batch->id}");
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @return \Illuminate\Contracts\View\View
     */
    public function edit(Batch $batch)
    {
        return view('batch.edit', [
            'batch' => $batch,
            'title' => $batch->dev_url.' Redirects',
            'urls' => $batch->urls()
                ->orderBy('addressed', 'ASC')
                ->orderBy('url')
                ->get(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \App\Models\Batch
     */
    public function update(BatchUpdateRequest $request, Batch $batch)
    {
        $batch->update(
            $request->all()
        );

        return $batch;
    }

    /**
     * Remove the specified resource from storage.
     *
     * @return string
     */
    public function destroy(Batch $batch)
    {
        return $batch->delete() ? 'Success' : 'Error';
    }
}

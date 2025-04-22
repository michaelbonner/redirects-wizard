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
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return view('batch.index', [
            'batches' => Batch::where('dev_url', '!=', '')
                ->whereNotNull('dev_url')
                ->get()
                ->sortBy('hostWithoutWww'),
            'title' => 'Redirect Batches',
        ]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $batch = Batch::create([
            'dev_url' => '',
        ]);

        return redirect('/batch/'.$batch->id);
    }

    /**
     * Display the specified resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function show(Batch $batch)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @return \Illuminate\Http\Response
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
     * @return \Illuminate\Http\Response
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
     * @return \Illuminate\Http\Response
     */
    public function destroy(Batch $batch)
    {
        return $batch->delete() ? 'Success' : 'Error';
    }
}

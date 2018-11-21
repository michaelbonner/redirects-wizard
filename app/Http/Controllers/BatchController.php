<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use Illuminate\Http\Request;
use App\Http\Requests\BatchUpdateRequest;

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
            'batches' => Batch::all()->sortBy('dev_url'),
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
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $batch = Batch::create([
            'dev_url' => ''
        ]);
        return redirect('/batch/' . $batch->id);
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Batch  $batch
     * @return \Illuminate\Http\Response
     */
    public function show(Batch $batch)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Models\Batch  $batch
     * @return \Illuminate\Http\Response
     */
    public function edit(Batch $batch)
    {
        return view('batch.edit', [
            'batch' => $batch,
            'title' => $batch->dev_url . ' Redirects',
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
     * @param  \App\Models\Batch  $batch
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
     * @param  \App\Models\Batch  $batch
     * @return \Illuminate\Http\Response
     */
    public function destroy(Batch $batch)
    {
        return $batch->delete() ? 'Success' : 'Error';
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with(['category', 'user']);

        if ($request->has('category_id')) {
            $query->where('expense_category_id', $request->category_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('expense_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('expense_date', '<=', $request->date_to);
        }

        $perPage = $request->get('per_page', 15);
        $expenses = $query->latest('expense_date')->paginate($perPage);

        return response()->json($expenses);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'expense_category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'description' => 'nullable|string',
            'receipt' => 'nullable|file|max:5120',
        ]);

        $validated['user_id'] = auth()->id();

        if ($request->hasFile('receipt')) {
            $validated['receipt_path'] = $request->file('receipt')->store('receipts', 'public');
        }

        $expense = Expense::create($validated);

        return response()->json($expense->load(['category', 'user']), 201);
    }

    public function show(Expense $expense)
    {
        return response()->json($expense->load(['category', 'user']));
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'expense_category_id' => 'exists:expense_categories,id',
            'amount' => 'numeric|min:0',
            'expense_date' => 'date',
            'description' => 'nullable|string',
            'receipt' => 'nullable|file|max:5120',
        ]);

        if ($request->hasFile('receipt')) {
            $validated['receipt_path'] = $request->file('receipt')->store('receipts', 'public');
        }

        $expense->update($validated);

        return response()->json($expense->load(['category', 'user']));
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return response()->json(['message' => 'Expense deleted successfully']);
    }

    public function report(Request $request)
    {
        $dateFrom = $request->get('date_from', now()->startOfMonth());
        $dateTo = $request->get('date_to', now()->endOfMonth());

        $expenses = Expense::with(['category', 'user'])
            ->whereBetween('expense_date', [$dateFrom, $dateTo])
            ->get();

        $totalAmount = $expenses->sum('amount');
        $byCategory = $expenses->groupBy('expense_category_id')->map(function ($items) {
            return [
                'category' => $items->first()->category->name,
                'total' => $items->sum('amount'),
                'count' => $items->count(),
            ];
        })->values();

        return response()->json([
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'total_amount' => $totalAmount,
            'total_expenses' => $expenses->count(),
            'by_category' => $byCategory,
            'expenses' => $expenses,
        ]);
    }
}

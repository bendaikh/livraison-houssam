@extends('invoices.layout')

@section('content')
    <table class="data">
        <thead>
            <tr>
                <th style="width: 4%;">N°</th>
                <th style="width: 18%;">Client</th>
                <th style="width: 14%;">Ville</th>
                <th style="width: 26%;">Produit</th>
                <th style="width: 8%;" class="text-center">Qté</th>
                <th style="width: 14%;" class="text-right">Montant collecté</th>
                <th style="width: 14%;" class="text-right">Commission</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $index => $row)
                <tr>
                    <td class="text-center">{{ str_pad($index + 1, 2, '0', STR_PAD_LEFT) }}</td>
                    <td>{{ $row['client_name'] }}</td>
                    <td>{{ $row['city'] }}</td>
                    <td>{{ $row['product'] }}</td>
                    <td class="text-center">{{ $row['quantity'] }}</td>
                    <td class="text-right">{{ number_format($row['order_amount'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                    <td class="text-right">{{ number_format($row['commission'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="summary-wrap">
        <div class="summary-box">
            <table>
                <tr>
                    <td class="label">Total commandes</td>
                    <td class="value">{{ $summary['total_orders'] }}</td>
                </tr>
                <tr>
                    <td class="label">Total collecté</td>
                    <td class="value">{{ number_format($summary['total_sales'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
                <tr>
                    <td class="label">Total commission</td>
                    <td class="value">{{ number_format($summary['total_earnings'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
                <tr>
                    <td class="label">Frais (commission)</td>
                    <td class="value">{{ number_format($summary['total_fees'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
                <tr class="total">
                    <td>Montant dû à l'admin</td>
                    <td class="text-right">{{ number_format($summary['final_amount'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
            </table>
        </div>
    </div>
@endsection

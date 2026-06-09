@extends('invoices.layout')

@section('content')
    <table class="data">
        <thead>
            <tr>
                <th style="width: 4%;">N°</th>
                <th style="width: 18%;">Client</th>
                <th style="width: 14%;">Ville</th>
                <th style="width: 28%;">Produit</th>
                <th style="width: 8%;" class="text-center">Qté</th>
                <th style="width: 12%;" class="text-right">Prix unitaire</th>
                <th style="width: 12%;" class="text-right">Montant total</th>
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
                    <td class="text-right">{{ number_format($row['unit_price'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                    <td class="text-right">{{ number_format($row['total_amount'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
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
                    <td class="label">Total Brut (Ventes)</td>
                    <td class="value">{{ number_format($summary['total_sales'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
                <tr>
                    <td class="label">Coût produits</td>
                    <td class="value">{{ number_format($summary['total_product_cost'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
                <tr>
                    <td class="label">Frais livraison</td>
                    <td class="value">{{ number_format($summary['total_delivery_cost'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
                <tr>
                    <td class="label">Frais COD (Commission)</td>
                    <td class="value">{{ number_format($summary['total_cod_fees'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
                <tr class="total">
                    <td>Montant net à payer</td>
                    <td class="text-right">{{ number_format($summary['final_amount'], 2, '.', ' ') }} {{ $currency_symbol }}</td>
                </tr>
            </table>
        </div>
    </div>
@endsection

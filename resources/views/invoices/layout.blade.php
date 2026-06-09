<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $invoice_number }} - {{ $role_label }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1f2937; line-height: 1.4; }
        .page { padding: 24px 28px; }
        .header { width: 100%; margin-bottom: 20px; }
        .header td { vertical-align: top; }
        .logo { max-height: 56px; max-width: 180px; margin-bottom: 6px; }
        .company-name { font-size: 22px; font-weight: bold; color: #111827; }
        .company-tagline { font-size: 10px; color: #2563eb; margin-top: 2px; }
        .company-contact { text-align: right; font-size: 10px; color: #4b5563; }
        .company-contact strong { display: block; color: #111827; font-size: 11px; margin-bottom: 4px; }
        .meta-box { margin-top: 16px; width: 100%; }
        .meta-box td { vertical-align: top; }
        .client-box { font-size: 11px; }
        .client-box strong { display: block; margin-bottom: 4px; font-size: 12px; }
        .invoice-meta { text-align: right; font-size: 11px; }
        .invoice-meta strong { color: #111827; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 18px; }
        table.data thead th {
            background: #e5e7eb;
            color: #374151;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 8px 6px;
            border: 1px solid #d1d5db;
            text-align: left;
        }
        table.data tbody td {
            padding: 7px 6px;
            border: 1px solid #e5e7eb;
            font-size: 10px;
            vertical-align: top;
        }
        table.data tbody tr:nth-child(even) td { background: #f9fafb; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .summary-wrap { margin-top: 18px; width: 100%; }
        .summary-box {
            width: 280px;
            margin-left: auto;
            border: 1px solid #d1d5db;
            background: #f9fafb;
        }
        .summary-box table { width: 100%; border-collapse: collapse; }
        .summary-box td { padding: 7px 10px; font-size: 10px; border-bottom: 1px solid #e5e7eb; }
        .summary-box tr:last-child td { border-bottom: none; }
        .summary-box .label { color: #4b5563; }
        .summary-box .value { text-align: right; font-weight: bold; color: #111827; }
        .summary-box .total td { background: #111827; color: #fff; font-size: 11px; font-weight: bold; }
        .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #9ca3af; }
        .period { font-size: 10px; color: #6b7280; margin-top: 4px; }
    </style>
</head>
<body>
<div class="page">
    <table class="header">
        <tr>
            <td style="width: 55%;">
                @if(!empty($logo_path) && file_exists($logo_path))
                    <img src="{{ $logo_path }}" class="logo" alt="Logo">
                @endif
                <div class="company-name">{{ $company_name }}</div>
                <div class="company-tagline">NOS PARTENAIRES NOTRE FORCE</div>
            </td>
            <td class="company-contact">
                <strong>{{ $company_name }}</strong>
                @if($company_phone) Tel: {{ $company_phone }}<br>@endif
                @if($company_email) Email: {{ $company_email }}<br>@endif
                @if($company_address) {{ $company_address }}@endif
            </td>
        </tr>
    </table>

    <table class="meta-box">
        <tr>
            <td class="client-box" style="width: 55%;">
                <strong>Client / Bénéficiaire</strong>
                {{ $entity_name }}<br>
                @if(!empty($entity_phone)) Tel: {{ $entity_phone }}<br>@endif
                @if(!empty($entity_email)) Email: {{ $entity_email }}@endif
            </td>
            <td class="invoice-meta">
                <strong>Facture N°:</strong> {{ $invoice_number }}<br>
                <strong>Date de facture:</strong> {{ \Carbon\Carbon::parse($generated_at)->format('d/m/Y') }}<br>
                <div class="period">
                    Période:
                    {{ \Carbon\Carbon::parse($period_start)->format('d/m/Y') }}
                    -
                    {{ \Carbon\Carbon::parse($period_end)->format('d/m/Y') }}
                </div>
            </td>
        </tr>
    </table>

    @yield('content')

    <div class="footer">
        Document généré automatiquement — {{ $company_name }}
    </div>
</div>
</body>
</html>

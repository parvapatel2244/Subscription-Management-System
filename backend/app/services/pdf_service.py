import io
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.models.invoice import Invoice
from app.models.quotation import Quotation

class PDFService:
    @staticmethod
    def generate_invoice_pdf(invoice: Invoice) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'InvoiceTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0369a1')
        )
        subtitle_style = ParagraphStyle(
            'InvoiceSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#64748b')
        )
        bold_style = ParagraphStyle(
            'BoldStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14
        )

        story = []

        # Header Table: Company info & Invoice Details
        header_data = [
            [
                Paragraph("<b>BRIGHTLOOP SOFTWARE</b><br/>Subscription Management Platform<br/>Email: billing@brightloop.io", subtitle_style),
                Paragraph(f"<b>INVOICE</b><br/><b>Invoice No:</b> {invoice.invoice_number}<br/><b>Date:</b> {invoice.invoice_date}<br/><b>Due Date:</b> {invoice.due_date}<br/><b>Status:</b> {invoice.status.upper()}", subtitle_style)
            ]
        ]
        header_table = Table(header_data, colWidths=[280, 240])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 15))

        # Customer Details
        cust = invoice.customer
        cust_info = f"<b>Bill To:</b><br/>{cust.company_name}<br/>Attn: {cust.contact_name}<br/>Email: {cust.email}"
        if cust.phone:
            cust_info += f"<br/>Phone: {cust.phone}"
        if cust.tax_number:
            cust_info += f"<br/>Tax/GSTIN: {cust.tax_number}"

        story.append(Paragraph(cust_info, subtitle_style))
        story.append(Spacer(1, 15))

        # Line Items Table
        line_data = [
            ["Item Description", "Qty", "Unit Price", "Discount", "Tax", "Total"]
        ]
        for line in invoice.lines:
            line_data.append([
                Paragraph(line.description_snapshot, styles['Normal']),
                str(line.quantity),
                f"{invoice.currency} {line.unit_price:.2f}",
                f"{invoice.currency} {line.discount_amount:.2f}",
                f"{invoice.currency} {line.tax_amount:.2f}",
                f"{invoice.currency} {line.line_total:.2f}"
            ])

        line_table = Table(line_data, colWidths=[200, 40, 70, 70, 60, 80])
        line_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ]))
        story.append(line_table)
        story.append(Spacer(1, 15))

        # Totals Summary
        summary_data = [
            ["Subtotal:", f"{invoice.currency} {invoice.subtotal:.2f}"],
            ["Discount Total:", f"-{invoice.currency} {invoice.discount_total:.2f}"],
            ["Tax Total:", f"+{invoice.currency} {invoice.tax_total:.2f}"],
            ["Grand Total:", f"{invoice.currency} {invoice.grand_total:.2f}"],
            ["Amount Paid:", f"{invoice.currency} {invoice.amount_paid:.2f}"],
            ["Balance Due:", f"{invoice.currency} {invoice.balance_due:.2f}"],
        ]
        summary_table = Table(summary_data, colWidths=[400, 120])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
            ('FONTNAME', (0, 5), (-1, 5), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 5), (-1, 5), colors.HexColor('#b91c1c') if invoice.balance_due > 0 else colors.HexColor('#15803d')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(summary_table)

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    @staticmethod
    def generate_quotation_pdf(quotation: Quotation) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        subtitle_style = ParagraphStyle(
            'QuotationSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#64748b')
        )

        story = []

        header_data = [
            [
                Paragraph("<b>BRIGHTLOOP SOFTWARE</b><br/>Subscription Quotation<br/>sales@brightloop.io", subtitle_style),
                Paragraph(f"<b>OFFICIAL QUOTATION</b><br/><b>Quotation No:</b> {quotation.quotation_number}<br/><b>Issue Date:</b> {quotation.issue_date}<br/><b>Expiry Date:</b> {quotation.expiry_date}<br/><b>Status:</b> {quotation.status.upper()}", subtitle_style)
            ]
        ]
        header_table = Table(header_data, colWidths=[280, 240])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 15))

        cust = quotation.customer
        cust_info = f"<b>Prepared For:</b><br/>{cust.company_name}<br/>Attn: {cust.contact_name}<br/>Email: {cust.email}"
        story.append(Paragraph(cust_info, subtitle_style))
        story.append(Spacer(1, 15))

        line_data = [
            ["Item Description", "Qty", "Unit Price", "Discount", "Tax", "Total"]
        ]
        for line in quotation.lines:
            line_data.append([
                Paragraph(line.description_snapshot, styles['Normal']),
                str(line.quantity),
                f"{quotation.currency} {line.unit_price:.2f}",
                f"{quotation.currency} {line.discount_amount:.2f}",
                f"{quotation.currency} {line.tax_amount:.2f}",
                f"{quotation.currency} {line.line_total:.2f}"
            ])

        line_table = Table(line_data, colWidths=[200, 40, 70, 70, 60, 80])
        line_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ]))
        story.append(line_table)
        story.append(Spacer(1, 15))

        summary_data = [
            ["Subtotal:", f"{quotation.currency} {quotation.subtotal:.2f}"],
            ["Discount Total:", f"-{quotation.currency} {quotation.discount_total:.2f}"],
            ["Tax Total:", f"+{quotation.currency} {quotation.tax_total:.2f}"],
            ["Grand Total:", f"{quotation.currency} {quotation.grand_total:.2f}"]
        ]
        summary_table = Table(summary_data, colWidths=[400, 120])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 3), (-1, 3), 11),
        ]))
        story.append(summary_table)

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes


from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional

def round_money(amount: Decimal, decimals: int = 2) -> Decimal:
    """Rounds a Decimal to standard money precision (2 decimal places) using ROUND_HALF_UP"""
    q = Decimal("0.01") if decimals == 2 else Decimal(f"0.{'0' * (decimals - 1)}1")
    return amount.quantize(q, rounding=ROUND_HALF_UP)

class FinancialCalculator:
    @staticmethod
    def calculate_line_item(
        unit_price: Decimal,
        quantity: int,
        discount_amount: Decimal = Decimal("0.00"),
        tax_rate: Decimal = Decimal("0.00"),
        is_tax_inclusive: bool = False
    ) -> Dict[str, Decimal]:
        """
        Calculates a single line item.
        Formulas:
        Line Subtotal = Quantity * Unit Price
        Taxable Amount = max(0, Line Subtotal - discount_amount)
        Tax = Taxable Amount * Tax Rate / 100 (if exclusive)
        Line Total = Taxable Amount + Tax
        """
        qty = Decimal(quantity)
        subtotal = round_money(unit_price * qty)
        discount = round_money(min(discount_amount, subtotal))
        net_amount = subtotal - discount

        if is_tax_inclusive:
            # Net amount includes tax: Tax = Net * Rate / (100 + Rate)
            if tax_rate > 0:
                tax = round_money(net_amount * tax_rate / (Decimal("100.0") + tax_rate))
                taxable_amount = net_amount - tax
                line_total = net_amount
            else:
                tax = Decimal("0.00")
                taxable_amount = net_amount
                line_total = net_amount
        else:
            taxable_amount = net_amount
            tax = round_money(taxable_amount * tax_rate / Decimal("100.0"))
            line_total = taxable_amount + tax

        return {
            "subtotal": subtotal,
            "discount_amount": discount,
            "taxable_amount": taxable_amount,
            "tax_amount": tax,
            "line_total": line_total
        }

    @staticmethod
    def calculate_document(
        lines: List[Dict[str, Any]],
        overall_discount: Optional[Dict[str, Any]] = None,
        is_tax_inclusive: bool = False
    ) -> Dict[str, Any]:
        """
        Aggregates calculated lines, applies document-level discount if any, and returns totals.
        """
        calc_lines = []
        raw_subtotal = Decimal("0.00")
        total_line_discount = Decimal("0.00")
        total_tax = Decimal("0.00")

        for line in lines:
            unit_price = Decimal(str(line.get("unit_price", 0)))
            quantity = int(line.get("quantity", 1))
            discount = Decimal(str(line.get("discount_amount", 0)))
            tax_rate = Decimal(str(line.get("tax_rate", 0)))

            res = FinancialCalculator.calculate_line_item(
                unit_price=unit_price,
                quantity=quantity,
                discount_amount=discount,
                tax_rate=tax_rate,
                is_tax_inclusive=is_tax_inclusive
            )
            raw_subtotal += res["subtotal"]
            total_line_discount += res["discount_amount"]
            total_tax += res["tax_amount"]
            calc_lines.append({**line, **res})

        # Apply overall discount if applicable
        document_discount = Decimal("0.00")
        if overall_discount:
            disc_type = overall_discount.get("discount_type", "percentage")
            disc_val = Decimal(str(overall_discount.get("value", 0)))
            eligible_subtotal = max(Decimal("0.00"), raw_subtotal - total_line_discount)
            
            if disc_type == "percentage":
                document_discount = round_money(eligible_subtotal * disc_val / Decimal("100.0"))
            else:
                document_discount = round_money(min(disc_val, eligible_subtotal))

        total_discount = total_line_discount + document_discount
        net_subtotal = max(Decimal("0.00"), raw_subtotal - total_discount)
        grand_total = net_subtotal + total_tax

        return {
            "lines": calc_lines,
            "subtotal": raw_subtotal,
            "discount_total": total_discount,
            "tax_total": total_tax,
            "grand_total": grand_total
        }

    @staticmethod
    def calculate_invoice_balance(grand_total: Decimal, successful_payments_total: Decimal) -> Dict[str, Any]:
        """
        Balance Due = Invoice Total - Allocated Successful Payments
        Returns balance_due and invoice status string.
        """
        paid = round_money(successful_payments_total)
        total = round_money(grand_total)
        balance = round_money(max(Decimal("0.00"), total - paid))

        if balance == Decimal("0.00") and total > Decimal("0.00"):
            status = "paid"
        elif paid > Decimal("0.00") and balance > Decimal("0.00"):
            status = "partially_paid"
        else:
            status = "confirmed"

        return {
            "amount_paid": paid,
            "balance_due": balance,
            "status": status
        }


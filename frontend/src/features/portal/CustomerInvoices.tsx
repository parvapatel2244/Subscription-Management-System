import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Invoice } from '../../types';
import { Badge } from '../../components/common/Badge';
import {
  FileText,
  Download,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Calendar,
  Lock,
  Loader2,
} from 'lucide-react';

export const CustomerInvoices: React.FC = () => {
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['my-invoices'],
    queryFn: () => api.get<Invoice[]>('/api/v1/invoices'),
  });

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      setDownloadingId(invoice.id);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/invoices/${invoice.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice PDF.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Error downloading PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRazorpayPayment = async (invoice: Invoice) => {
    setErrorMessage('');
    setSuccessMessage('');
    setPayingId(invoice.id);

    try {
      // 1. Create order on backend
      const orderData = await api.post<any>('/payments/online/create-order', {
        invoice_id: invoice.id,
      });

      if (typeof (window as any).Razorpay === 'undefined') {
        throw new Error('Razorpay Checkout SDK is still loading. Please retry in a few seconds.');
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount, // in paise
        currency: orderData.currency,
        name: 'Brightloop Software',
        description: `Payment for Invoice ${orderData.invoice_number}`,
        order_id: orderData.order_id,
        prefill: {
          name: orderData.customer_name,
          email: orderData.customer_email,
        },
        theme: {
          color: '#4f46e5',
        },
        handler: async (response: any) => {
          try {
            // 3. Verify on backend
            await api.post('/payments/online/verify', {
              invoice_id: invoice.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setSuccessMessage(
              `Payment of ₹${Number(invoice.balance_due).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })} processed successfully! Payment Ref: ${response.razorpay_payment_id}`
            );
            queryClient.invalidateQueries({ queryKey: ['my-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['my-payments'] });
          } catch (verifyErr: any) {
            setErrorMessage(verifyErr.message || 'Payment signature verification failed.');
          } finally {
            setPayingId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setPayingId(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setErrorMessage(`Payment failed: ${response.error?.description || 'Transaction declined'}`);
        setPayingId(null);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate payment gateway.');
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices & Billing History</h1>
        <p className="text-sm text-gray-500">
          Review generated tax invoices, verify itemized charges, and pay online with Razorpay
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading invoices...</div>
      ) : (Array.isArray(invoices) ? invoices : []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No invoices issued</h3>
          <p className="text-sm text-gray-500 mt-1">
            Invoices generated for your subscription cycles will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Invoice #</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Dates</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Total</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Balance Due</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(Array.isArray(invoices) ? invoices : []).map((inv) => {
                const canPay =
                  ['confirmed', 'partially_paid', 'overdue'].includes(inv.status) &&
                  Number(inv.balance_due) > 0;

                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      <div>Issued: {inv.invoice_date}</div>
                      <div className="flex items-center gap-1 font-medium text-gray-700 mt-0.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        Due: {inv.due_date}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ₹{Number(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {Number(inv.balance_due) > 0 ? (
                        <span className="font-bold text-amber-600">
                          ₹
                          {Number(inv.balance_due).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">₹0.00 (Settled)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant={
                          inv.status === 'paid'
                            ? 'success'
                            : inv.status === 'overdue'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPdf(inv)}
                          disabled={downloadingId === inv.id}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
                          title="Download PDF Invoice"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          PDF
                        </button>

                        {canPay && (
                          <button
                            onClick={() => handleRazorpayPayment(inv)}
                            disabled={payingId === inv.id}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                          >
                            {payingId === inv.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                Opening...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Pay with Razorpay
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


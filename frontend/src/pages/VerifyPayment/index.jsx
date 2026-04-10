import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { formatCurrency } from '@/lib/utils';
import { env } from '@/config/env';
import { Card, CardContent } from '@/components/ui/Card';

export default function VerifyPayment() {
  const { transactionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await axios.get(`${env.API_URL}/api/v1/qr/verify-receipt/${transactionId}`);
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Verification failed. This receipt may be invalid or counterfeit.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [transactionId]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-primary font-bold text-xl tracking-tight mb-6">
            Fin<span className="text-primary-foreground bg-primary px-1 rounded ml-0.5">Sync</span>
          </Link>
          <h1 className="text-2xl font-bold">Payment Verification</h1>
          <p className="text-muted-foreground text-sm mt-1">Official FinSync digital receipt verification</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="font-medium animate-pulse">Verifying cryptographic receipt...</p>
            </CardContent>
          </Card>
        ) : error || !data ? (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="border-destructive/30 overflow-hidden shadow-sm shadow-destructive/10">
               <div className="h-2 bg-destructive w-full" />
               <CardContent className="p-8 text-center space-y-6">
                  <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-destructive mb-2">Invalid Receipt</h2>
                    <p className="text-muted-foreground">{error}</p>
                  </div>
               </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="border-success/30 overflow-hidden shadow-sm shadow-success/10 bg-white">
               <div className="h-2 bg-success w-full" />
               <CardContent className="p-8">
                   <div className="text-center mb-8">
                      <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-success" />
                      </div>
                      <h2 className="text-2xl font-bold text-success">Verified Original</h2>
                      <p className="text-sm flex items-center justify-center gap-1 text-muted-foreground mt-1">
                         <ShieldCheck className="w-4 h-4 text-success" />
                         <span>Secure transaction on {new Date(data.date).toLocaleDateString()}</span>
                      </p>
                   </div>

                   <div className="rounded-xl bg-gray-50 border border-border p-6 mb-8 text-center">
                       <p className="text-sm font-medium text-muted-foreground mb-1">Transfer Amount</p>
                       <p className="text-4xl font-black text-gray-900 tracking-tight">
                         {formatCurrency(data.amount, data.currency)}
                       </p>
                       <span className="inline-block px-3 py-1 bg-success/10 text-success font-semibold text-xs rounded-full mt-3 uppercase tracking-wider">
                         {data.status}
                       </span>
                   </div>

                   <div className="space-y-4">
                       <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Sender</span>
                          <span className="font-semibold text-base">{data.senderName}</span>
                          <span className="text-sm text-muted-foreground">{data.senderAccount}</span>
                       </div>
                       
                       <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Receiver</span>
                          <span className="font-semibold text-base">{data.receiverName}</span>
                          <span className="text-sm text-muted-foreground">{data.receiverAccount}</span>
                       </div>

                       <div className="flex flex-col pt-4 border-t border-border">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Transaction ID</span>
                          <span className="font-mono text-sm break-all">{data.transactionId}</span>
                       </div>
                   </div>
               </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="text-center mt-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2">
             <ArrowLeft className="w-4 h-4" /> Go to FinSync Home
          </Link>
        </div>
      </div>
    </div>
  );
}

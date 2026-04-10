import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight, ArrowRight, ArrowLeft, Search,
  CheckCircle2, AlertCircle, Loader2, Shield,
  User, Send, Copy, Clock, Calendar, Repeat,
  Info, Wallet, Globe, XCircle, QrCode
} from 'lucide-react';
import QRScannerModal from '@/components/common/QRScannerModal';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import OTPInput from '@/components/ui/OTPInput';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { transferAPI, accountAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, maskAccountNumber, cn } from '@/lib/utils';
import { toast } from 'sonner';

// =================== STEP INDICATOR ===================
function TransferSteps({ currentStep }) {
  const steps = ['Details', 'Confirm', 'OTP', 'Success'];
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              animate={{
                scale: i === currentStep ? 1.1 : 1,
                backgroundColor:
                  i < currentStep
                    ? 'var(--primary)'
                    : i === currentStep
                    ? 'var(--primary)'
                    : 'var(--muted)',
              }}
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                i <= currentStep ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {i < currentStep ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </motion.div>
            <span className="text-[10px] text-muted-foreground mt-1 hidden sm:block">
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'w-8 sm:w-16 h-0.5 mx-1 rounded transition-colors',
                i < currentStep ? 'bg-primary' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// =================== TRANSFER HISTORY MINI ===================
function TransferHistoryMini({ transfers }) {
  if (!transfers || transfers.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Transfers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {transfers.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    'h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
                    t.status === 'completed'
                      ? 'bg-success/10'
                      : t.status === 'failed'
                      ? 'bg-destructive/10'
                      : 'bg-warning/10'
                  )}
                >
                  {t.status === 'completed' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : t.status === 'failed' ? (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-warning" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    {formatCurrency(t.amount, t.from_currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  t.status === 'completed'
                    ? 'success'
                    : t.status === 'failed'
                    ? 'destructive'
                    : 'warning'
                }
                className="text-[9px] capitalize"
              >
                {t.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =================== MAIN TRANSFER PAGE ===================
export default function Transfers() {
  const { user } = useAuthStore();

  // Step: 0=Details, 1=Confirm, 2=OTP, 3=Success
  const [step, setStep] = useState(0);

  // Accounts
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Form state
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('Transfer');

  // Verification
  const [recipient, setRecipient] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Transfer initiation
  const [transferData, setTransferData] = useState(null);
  const [initiating, setInitiating] = useState(false);
  const [initiateError, setInitiateError] = useState('');

  // OTP
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Result
  const [result, setResult] = useState(null);

  // History
  const [transfers, setTransfers] = useState([]);

  // Fetch accounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, histRes] = await Promise.all([
          accountAPI.getAll(),
          transferAPI.getHistory({ limit: 5 }),
        ]);
        if (accRes.data.success) {
          const active = (accRes.data.data.accounts || []).filter(
            (a) => a.status === 'active'
          );
          setAccounts(active);
          if (active.length > 0) {
            const def = active.find((a) => a.is_default) || active[0];
            setFromAccountId(def.id);
          }
        }
        if (histRes.data.success) {
          setTransfers(histRes.data.data.transfers || []);
        }
      } catch { /* ignore */ }
      setAccountsLoading(false);
    };
    fetchData();
  }, []);

  const selectedFromAccount = accounts.find((a) => a.id === fromAccountId);

  // Verify recipient
  const handleVerifyRecipient = async () => {
    if (!toAccountNumber.trim()) {
      setVerifyError('Enter account number');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    setRecipient(null);

    try {
      const { data } = await transferAPI.verifyRecipient({
        account_number: toAccountNumber.trim(),
      });
      if (data.success) {
        setRecipient(data.data.recipient);
        toast.success('Recipient verified successfully!');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Recipient not found';
      setVerifyError(errMsg);
      toast.error(errMsg);
    } finally {
      setVerifying(false);
    }
  };

  // Validate and go to confirm
  const handleProceedToConfirm = () => {
    setInitiateError('');
    if (!fromAccountId) { setInitiateError('Select a source account'); return; }
    if (!recipient) { setInitiateError('Verify recipient first'); return; }
    if (!amount || parseFloat(amount) <= 0) { setInitiateError('Enter a valid amount'); return; }
    if (selectedFromAccount && parseFloat(amount) > Number(selectedFromAccount.balance)) {
      setInitiateError(
        `Insufficient balance. Available: ${formatCurrency(selectedFromAccount.balance, selectedFromAccount.currency)}`
      );
      return;
    }
    setStep(1);
  };

  // Initiate transfer
  const handleInitiateTransfer = async () => {
    setInitiating(true);
    setInitiateError('');

    try {
      const { data } = await transferAPI.initiate({
        from_account_id: fromAccountId,
        to_account_number: toAccountNumber.trim(),
        amount: parseFloat(amount),
        note: note || undefined,
        category,
      });

      if (data.success) {
        setTransferData(data.data);
        setStep(2);
        startResendCooldown();
        toast.info('OTP sent to your email for verification.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Transfer failed';
      setInitiateError(errMsg);
      toast.error(errMsg);
    } finally {
      setInitiating(false);
    }
  };

  // Confirm with OTP
  const handleConfirmTransfer = async () => {
    if (otp.length !== 6) { setOtpError('Enter all 6 digits'); return; }
    setConfirming(true);
    setOtpError('');

    try {
      const { data } = await transferAPI.confirm({
        transfer_id: transferData.transfer_id,
        otp,
      });

      if (data.success) {
        setResult(data.data);
        setStep(3);
        toast.success('Transfer completed successfully!');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid OTP';
      setOtpError(errMsg);
      toast.error(errMsg);
    } finally {
      setConfirming(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown((p) => {
        if (p <= 1) { clearInterval(t); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  // Reset form
  const handleNewTransfer = () => {
    setStep(0);
    setToAccountNumber('');
    setAmount('');
    setNote('');
    setRecipient(null);
    setTransferData(null);
    setResult(null);
    setOtp('');
    setOtpError('');
    setInitiateError('');
    setVerifyError('');
  };

  // Copy reference
  const copyRef = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Reference copied to clipboard!');
  };

  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <FadeInView>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Transfer Money</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Send money to any FinSync account instantly
          </p>
        </div>
      </FadeInView>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Transfer Area */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <TransferSteps currentStep={step} />

            <AnimatePresence mode="wait">
              {/* ========== STEP 0: DETAILS ========== */}
              {step === 0 && (
                <motion.div
                  key="details"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {/* From Account */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Account</label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {accounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setFromAccountId(acc.id)}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer',
                            fromAccountId === acc.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30'
                          )}
                        >
                          <Wallet className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium capitalize truncate">
                              {acc.account_type?.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(acc.balance, acc.currency)} •{' '}
                              {acc.masked_number || maskAccountNumber(acc.account_number)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {accounts.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No active accounts found
                      </p>
                    )}
                  </div>

                  {/* To Account */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recipient Account Number</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. FS12345678"
                        value={toAccountNumber}
                        onChange={(e) => {
                          setToAccountNumber(e.target.value);
                          setRecipient(null);
                          setVerifyError('');
                        }}
                        icon={Search}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setIsScannerOpen(true)}
                        className="p-3"
                        title="Scan QR Code"
                      >
                        <QrCode className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleVerifyRecipient}
                        isLoading={verifying}
                        disabled={!toAccountNumber.trim()}
                      >
                        Verify
                      </Button>
                    </div>
                    {verifyError && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-destructive flex items-center gap-1"
                      >
                        <AlertCircle className="h-3 w-3" /> {verifyError}
                      </motion.p>
                    )}
                  </div>

                  {/* Verified Recipient Card */}
                  <AnimatePresence>
                    {recipient && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl border border-success/30 bg-success/5 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                            {recipient.avatar_url ? (
                              <img
                                src={recipient.avatar_url}
                                alt=""
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-success" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{recipient.name}</p>
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {recipient.account_number} •{' '}
                              <span className="capitalize">
                                {recipient.account_type?.replace('_', ' ')}
                              </span>{' '}
                              • {recipient.currency}
                            </p>
                            {recipient.is_self && (
                              <Badge variant="warning" className="text-[9px] mt-1">
                                Own Account
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Amount */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="Amount"
                      type="number"
                      placeholder={formatCurrency(0, selectedFromAccount?.currency || user?.preferred_currency || 'USD').replace(/[0-9.,\s]/g, '') + '0.00'}
                      icon={null}
                      prefix={<span className="text-muted-foreground font-bold text-xs">{(selectedFromAccount?.currency || user?.preferred_currency || 'USD') === 'USD' ? '$' : (selectedFromAccount?.currency || user?.preferred_currency || 'USD')}</span>}
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setInitiateError(''); }}
                      min="0.01"
                      step="0.01"
                    />
                    <Input
                      label="Note (optional)"
                      type="text"
                      placeholder="e.g. Rent payment"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  {/* Currency conversion info */}
                  {recipient &&
                    selectedFromAccount &&
                    selectedFromAccount.currency !== recipient.currency && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-accent">
                        <Info className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Sending from{' '}
                          <span className="font-medium text-foreground">
                            {selectedFromAccount.currency}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium text-foreground">
                            {recipient.currency}
                          </span>
                          . Exchange rate will be applied automatically.
                        </p>
                      </div>
                    )}

                  {/* Error */}
                  <AnimatePresence>
                    {initiateError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
                      >
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <p className="text-sm text-destructive">{initiateError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    variant="glow"
                    size="lg"
                    className="w-full group"
                    onClick={handleProceedToConfirm}
                    disabled={!recipient || !amount || !fromAccountId}
                  >
                    Review Transfer
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              )}

              {/* ========== STEP 1: CONFIRM ========== */}
              {step === 1 && (
                <motion.div
                  key="confirm"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold">Confirm Transfer</h3>
                    <p className="text-sm text-muted-foreground">
                      Please review the details below
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
                    {/* Amount */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Sending</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(parseFloat(amount), selectedFromAccount?.currency)}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      {/* From */}
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">From</p>
                        <p className="text-sm font-medium capitalize">
                          {selectedFromAccount?.account_type?.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {maskAccountNumber(selectedFromAccount?.account_number)}
                        </p>
                      </div>

                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </div>

                      {/* To */}
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">To</p>
                        <p className="text-sm font-medium">{recipient?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {recipient?.account_number}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 pt-3 border-t border-border">
                      {[
                        { label: 'From Currency', value: selectedFromAccount?.currency },
                        { label: 'To Currency', value: recipient?.currency },
                        ...(note ? [{ label: 'Note', value: note }] : []),
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {initiateError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
                      >
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <p className="text-sm text-destructive">{initiateError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => { setStep(0); setInitiateError(''); }}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button
                      variant="glow"
                      size="lg"
                      className="flex-1 group"
                      onClick={handleInitiateTransfer}
                      isLoading={initiating}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Send & Verify
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* QR Scanner Modal */}
              <QRScannerModal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                onScan={(data) => {
                  setIsScannerOpen(false);
                  if (data?.account) {
                     setToAccountNumber(data.account);
                     // Automatically verify the scanned account
                     setTimeout(() => {
                         document.getElementById('verify-btn-hidden')?.click();
                     }, 300);
                  } else {
                     toast.error('Invalid QR code format');
                  }
                }}
              />

              {/* Hidden button for triggering verification after scan */}
              <button id="verify-btn-hidden" className="hidden" onClick={handleVerifyRecipient}></button>

              {/* ========== STEP 2: OTP ========== */}
              {step === 2 && (
                <motion.div
                  key="otp"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                      className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
                    >
                      <Shield className="h-7 w-7 text-primary" />
                    </motion.div>
                    <h3 className="text-lg font-bold">Verify Transfer</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter the 6-digit code sent to your email
                    </p>
                    <p className="text-xs text-primary">{user?.email}</p>
                  </div>

                  {/* Fraud warning */}
                  {transferData?.fraud_warning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-lg bg-warning/10 border border-warning/20"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-warning">Security Notice</p>
                          {transferData.fraud_warning.alerts?.map((a, i) => (
                            <p key={i} className="text-xs text-muted-foreground mt-0.5">
                              • {a}
                            </p>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <OTPInput
                    length={6}
                    value={otp}
                    onChange={setOtp}
                    error={otpError}
                    disabled={confirming}
                  />

                  <Button
                    variant="glow"
                    size="lg"
                    className="w-full"
                    onClick={handleConfirmTransfer}
                    isLoading={confirming}
                    disabled={otp.length !== 6}
                  >
                    Confirm Transfer
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Didn't receive code?{' '}
                      {resendCooldown > 0 ? (
                        <span className="text-primary">Resend in {resendCooldown}s</span>
                      ) : (
                        <button
                          onClick={() => {
                            handleInitiateTransfer();
                            startResendCooldown();
                          }}
                          className="text-primary hover:underline font-medium cursor-pointer"
                        >
                          Resend OTP
                        </button>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => { setStep(1); setOtp(''); setOtpError(''); }}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    ← Back to review
                  </button>
                </motion.div>
              )}

              {/* ========== STEP 3: SUCCESS ========== */}
              {step === 3 && result && (
                <motion.div
                  key="success"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="text-center space-y-6"
                >
                  {/* Success animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                    }}
                    className="mx-auto h-20 w-20 rounded-full bg-success/10 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                    >
                      <CheckCircle2 className="h-10 w-10 text-success" />
                    </motion.div>
                  </motion.div>

                  <div>
                    <h3 className="text-2xl font-bold mb-1">Transfer Successful! 🎉</h3>
                    <p className="text-muted-foreground text-sm">
                      Your money has been sent successfully
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-3xl font-bold text-success">
                    {formatCurrency(result.amount, result.from_currency)}
                  </div>

                  {/* Receipt QR Code */}
                  {result.transfer_id && (
                     <div className="mt-6 flex flex-col items-center">
                       <p className="text-sm font-medium mb-3">Payment Receipt QR</p>
                       <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm inline-block">
                         <QRCodeSVG 
                           value={`${window.location.origin}/verify-payment/${result.transfer_id}`} 
                           size={160} 
                           level="M" 
                         />
                       </div>
                       <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                         Show this QR code to the receiver to verify the payment
                       </p>
                     </div>
                  )}

                  {/* Conversion */}
                  {result.exchange_rate && (
                    <p className="text-sm text-muted-foreground">
                      ≈ {formatCurrency(result.converted_amount, result.to_currency)}
                      <span className="text-xs ml-1">(Rate: {result.exchange_rate})</span>
                    </p>
                  )}

                  {/* Reference */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-left">
                    {[
                      { label: 'Reference ID', value: result.reference_id, copyable: true },
                      { label: 'Status', value: result.status },
                      {
                        label: 'Date',
                        value: new Date(result.timestamp).toLocaleString(),
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium capitalize">{item.value}</span>
                          {item.copyable && (
                            <button
                              onClick={() => copyRef(item.value)}
                              className="p-1 rounded hover:bg-muted transition-colors"
                              title="Copy"
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={handleNewTransfer}
                    >
                      New Transfer
                    </Button>
                    <Button
                      variant="glow"
                      size="lg"
                      className="flex-1"
                      onClick={() => (window.location.href = '/dashboard')}
                    >
                      Dashboard
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Sidebar — Recent Transfers */}
        <div className="space-y-4">
          <FadeInView delay={0.2}>
            <TransferHistoryMini transfers={transfers} />
          </FadeInView>

          {/* Info card */}
          <FadeInView delay={0.3}>
            <Card className="bg-accent/30 border-primary/10">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Transfer Info</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• OTP required for every transfer</li>
                    <li>• Cross-currency auto-conversion</li>
                    <li>• Fraud detection active</li>
                    <li>• Transfers are instant</li>
                  </ul>
                </div>
              </div>
            </Card>
          </FadeInView>
        </div>
      </div>
    </div>
  );
}